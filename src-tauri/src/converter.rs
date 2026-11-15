use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use once_cell::sync::Lazy;
use serde::Deserialize;
use tauri::{AppHandle, Emitter};

use crate::ffmpeg::{
    self, build_ffmpeg_args_for, convert_image_with_sips, default_output_path, parse_progress_line,
    prepare_sips_input, uses_sips_encode, ConversionProgress, FfmpegError, VideoInfo,
};

static ACTIVE_PROCESS: Lazy<Mutex<Option<Child>>> = Lazy::new(|| Mutex::new(None));
static CANCELLED: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertRequest {
    pub input_path: String,
    pub output_path: Option<String>,
    pub format: String,
    pub quality: String,
}

#[tauri::command]
pub fn check_ffmpeg() -> Result<String, FfmpegError> {
    ffmpeg::check_ffmpeg()
}

#[tauri::command]
pub fn probe_video(path: String) -> Result<VideoInfo, FfmpegError> {
    ffmpeg::probe_video(&path)
}

#[tauri::command]
pub fn suggest_output_path(input_path: String, format: String) -> String {
    default_output_path(&input_path, &format)
}

#[tauri::command]
pub fn cancel_conversion() -> Result<(), String> {
    CANCELLED.store(true, Ordering::SeqCst);

    let mut guard = ACTIVE_PROCESS
        .lock()
        .map_err(|_| "Impossible de verrouiller le processus".to_string())?;

    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }

    Ok(())
}

#[tauri::command]
pub async fn convert_video(
    app: AppHandle,
    request: ConvertRequest,
) -> Result<String, FfmpegError> {
    CANCELLED.store(false, Ordering::SeqCst);

    let info = ffmpeg::probe_video(&request.input_path)?;
    let output = request
        .output_path
        .unwrap_or_else(|| default_output_path(&request.input_path, &request.format));
    let duration = if info.kind == "image" {
        1.0
    } else {
        info.duration
    };
    let media_kind = info.kind.clone();
    let format = request.format.clone();
    let quality = request.quality.clone();
    let input = request.input_path.clone();

    let result = tauri::async_runtime::spawn_blocking(move || {
        // HEIC / HEIF / JP2 : ImageIO via sips (FFmpeg n’a pas le muxer heif ici).
        if uses_sips_encode(&format) {
            return run_sips_conversion(app, &input, &output, &format, &quality, duration);
        }

        let ffmpeg_bin = ffmpeg::find_binary("ffmpeg")?;
        let args = build_ffmpeg_args_for(&input, &output, &format, &quality, &media_kind)?;
        run_conversion(app, ffmpeg_bin, args, output, duration)
    })
    .await
    .map_err(|e| FfmpegError::ConversionFailed(e.to_string()))?;

    result
}

fn run_sips_conversion(
    app: AppHandle,
    input: &str,
    output: &str,
    format: &str,
    quality: &str,
    duration: f64,
) -> Result<String, FfmpegError> {
    let _ = app.emit(
        "conversion-progress",
        &ConversionProgress {
            percent: 15.0,
            time_secs: 0.0,
            speed: Some("sips".into()),
        },
    );

    let (sips_input, cleanup) = prepare_sips_input(input)?;
    let input_str = sips_input.to_string_lossy().to_string();

    let result = convert_image_with_sips(&input_str, output, format, quality);

    if cleanup {
        let _ = std::fs::remove_file(&sips_input);
    }

    result?;

    if CANCELLED.load(Ordering::SeqCst) {
        let _ = std::fs::remove_file(output);
        return Err(FfmpegError::Cancelled);
    }

    let _ = app.emit(
        "conversion-progress",
        &ConversionProgress {
            percent: 100.0,
            time_secs: duration,
            speed: Some("1x".into()),
        },
    );

    Ok(output.to_string())
}

fn run_conversion(
    app: AppHandle,
    ffmpeg_bin: std::path::PathBuf,
    args: Vec<String>,
    output: String,
    duration: f64,
) -> Result<String, FfmpegError> {
    let mut child = Command::new(&ffmpeg_bin)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| FfmpegError::ConversionFailed("stdout indisponible".into()))?;

    {
        let mut guard = ACTIVE_PROCESS
            .lock()
            .map_err(|_| FfmpegError::ConversionFailed("lock process".into()))?;
        *guard = Some(child);
    }

    let app_progress = app.clone();
    let progress_handle = thread::spawn(move || {
        let reader = BufReader::new(stdout);
        let mut last_speed: Option<String> = None;

        for line in reader.lines().flatten() {
            if CANCELLED.load(Ordering::SeqCst) {
                break;
            }

            if let Some(mut progress) = parse_progress_line(&line, duration) {
                if progress.speed.is_some() {
                    last_speed = progress.speed.clone();
                } else if let Some(speed) = &last_speed {
                    progress.speed = Some(speed.clone());
                }

                if progress.percent > 0.0 || progress.time_secs > 0.0 {
                    let _ = app_progress.emit("conversion-progress", &progress);
                }
            }
        }
    });

    let status = loop {
        if CANCELLED.load(Ordering::SeqCst) {
            let _ = progress_handle.join();
            return Err(FfmpegError::Cancelled);
        }

        let maybe_status = {
            let mut guard = ACTIVE_PROCESS
                .lock()
                .map_err(|_| FfmpegError::ConversionFailed("lock process".into()))?;

            match guard.as_mut() {
                Some(child) => child.try_wait()?,
                None => {
                    let _ = progress_handle.join();
                    return Err(FfmpegError::Cancelled);
                }
            }
        };

        if let Some(status) = maybe_status {
            let mut guard = ACTIVE_PROCESS
                .lock()
                .map_err(|_| FfmpegError::ConversionFailed("lock process".into()))?;
            *guard = None;
            break status;
        }

        thread::sleep(Duration::from_millis(120));
    };

    let _ = progress_handle.join();

    if CANCELLED.load(Ordering::SeqCst) {
        return Err(FfmpegError::Cancelled);
    }

    if !status.success() {
        return Err(FfmpegError::ConversionFailed(format!(
            "code de sortie {:?}",
            status.code()
        )));
    }

    let _ = app.emit(
        "conversion-progress",
        &ConversionProgress {
            percent: 100.0,
            time_secs: duration,
            speed: Some("1x".into()),
        },
    );

    Ok(output)
}
