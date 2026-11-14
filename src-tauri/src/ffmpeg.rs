use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum FfmpegError {
    #[error("FFmpeg introuvable. Installez-le avec Homebrew : brew install ffmpeg")]
    NotFound,
    #[error("FFprobe a échoué : {0}")]
    ProbeFailed(String),
    #[error("Conversion annulée")]
    Cancelled,
    #[error("Conversion échouée : {0}")]
    ConversionFailed(String),
    #[error("Fichier introuvable : {0}")]
    FileNotFound(String),
    #[error("Format non supporté : {0}")]
    UnsupportedFormat(String),
    #[error("IO : {0}")]
    Io(#[from] std::io::Error),
}

impl Serialize for FfmpegError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    pub path: String,
    pub name: String,
    pub duration: f64,
    pub width: u32,
    pub height: u32,
    pub size_bytes: u64,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionProgress {
    pub percent: f64,
    pub time_secs: f64,
    pub speed: Option<String>,
}

pub fn find_binary(name: &str) -> Result<PathBuf, FfmpegError> {
    let candidates = [
        format!("/opt/homebrew/bin/{name}"),
        format!("/usr/local/bin/{name}"),
        format!("/usr/bin/{name}"),
    ];

    for path in candidates {
        let p = PathBuf::from(&path);
        if p.exists() {
            return Ok(p);
        }
    }

    let output = Command::new("which").arg(name).output();
    if let Ok(output) = output {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Ok(PathBuf::from(path));
            }
        }
    }

    Err(FfmpegError::NotFound)
}

pub fn check_ffmpeg() -> Result<String, FfmpegError> {
    let ffmpeg = find_binary("ffmpeg")?;
    let output = Command::new(&ffmpeg)
        .arg("-version")
        .output()
        .map_err(|_| FfmpegError::NotFound)?;

    if !output.status.success() {
        return Err(FfmpegError::NotFound);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let version = stdout
        .lines()
        .next()
        .unwrap_or("ffmpeg")
        .trim()
        .to_string();

    Ok(version)
}

pub fn probe_video(path: &str) -> Result<VideoInfo, FfmpegError> {
    let input = Path::new(path);
    if !input.exists() {
        return Err(FfmpegError::FileNotFound(path.to_string()));
    }

    let ffprobe = find_binary("ffprobe")?;
    let output = Command::new(ffprobe)
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            path,
        ])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(FfmpegError::ProbeFailed(stderr.trim().to_string()));
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| FfmpegError::ProbeFailed(e.to_string()))?;

    let duration = json["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);

    let size_bytes = json["format"]["size"]
        .as_str()
        .and_then(|s| s.parse::<u64>().ok())
        .or_else(|| std::fs::metadata(path).ok().map(|m| m.len()))
        .unwrap_or(0);

    let streams = json["streams"].as_array().cloned().unwrap_or_default();
    let video_stream = streams.iter().find(|s| s["codec_type"] == "video");
    let audio_stream = streams.iter().find(|s| s["codec_type"] == "audio");

    let width = video_stream
        .and_then(|s| s["width"].as_u64())
        .unwrap_or(0) as u32;
    let height = video_stream
        .and_then(|s| s["height"].as_u64())
        .unwrap_or(0) as u32;

    let video_codec = video_stream
        .and_then(|s| s["codec_name"].as_str())
        .map(str::to_string);
    let audio_codec = audio_stream
        .and_then(|s| s["codec_name"].as_str())
        .map(str::to_string);

    let name = input
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("video")
        .to_string();

    Ok(VideoInfo {
        path: path.to_string(),
        name,
        duration,
        width,
        height,
        size_bytes,
        video_codec,
        audio_codec,
    })
}

fn vt_bitrate(quality: &str, high: &str, balanced: &str, small: &str) -> String {
    match quality {
        "high" => high.into(),
        "small" => small.into(),
        _ => balanced.into(),
    }
}

fn push_videotoolbox_encoder(
    args: &mut Vec<String>,
    codec: &str,
    bitrate: String,
    extra: &[(&str, &str)],
) {
    args.extend([
        "-c:v".into(),
        codec.into(),
        "-b:v".into(),
        bitrate,
        "-allow_sw".into(),
        "1".into(),
        "-realtime".into(),
        "0".into(),
        "-prio_speed".into(),
        "true".into(),
        "-threads".into(),
        "0".into(),
        "-c:a".into(),
        "aac".into(),
        "-b:a".into(),
        "160k".into(),
    ]);

    for (key, value) in extra {
        args.push((*key).into());
        args.push((*value).into());
    }
}

pub fn build_ffmpeg_args(
    input: &str,
    output: &str,
    format: &str,
    quality: &str,
) -> Result<Vec<String>, FfmpegError> {
    // Décodage GPU VideoToolbox avant -i, puis encode accéléré.
    let mut args = vec![
        "-y".into(),
        "-hide_banner".into(),
        "-hwaccel".into(),
        "videotoolbox".into(),
        "-i".into(),
        input.into(),
        "-progress".into(),
        "pipe:1".into(),
        "-nostats".into(),
    ];

    let crf = match quality {
        "high" => "20",
        "small" => "32",
        _ => "26",
    };

    // VP9: cpu-used plus élevé = beaucoup plus rapide
    let vp9_cpu = match quality {
        "high" => "4",
        "small" => "8",
        _ => "6",
    };

    match format {
        "mp4" => {
            push_videotoolbox_encoder(
                &mut args,
                "h264_videotoolbox",
                vt_bitrate(quality, "8M", "4M", "2M"),
                &[("-movflags", "+faststart")],
            );
        }
        "hevc" => {
            push_videotoolbox_encoder(
                &mut args,
                "hevc_videotoolbox",
                vt_bitrate(quality, "6M", "3M", "1.5M"),
                &[("-tag:v", "hvc1"), ("-movflags", "+faststart")],
            );
        }
        "mov" => {
            push_videotoolbox_encoder(
                &mut args,
                "h264_videotoolbox",
                vt_bitrate(quality, "8M", "4M", "2M"),
                &[],
            );
        }
        "mkv" => {
            // Même encodeur hardware que MP4 — nettement plus rapide que libx264
            push_videotoolbox_encoder(
                &mut args,
                "h264_videotoolbox",
                vt_bitrate(quality, "8M", "4M", "2M"),
                &[],
            );
        }
        "webm" => {
            args.extend([
                "-c:v".into(),
                "libvpx-vp9".into(),
                "-crf".into(),
                crf.into(),
                "-b:v".into(),
                "0".into(),
                "-row-mt".into(),
                "1".into(),
                "-threads".into(),
                "0".into(),
                "-deadline".into(),
                "good".into(),
                "-cpu-used".into(),
                vp9_cpu.into(),
                "-c:a".into(),
                "libopus".into(),
                "-b:a".into(),
                "128k".into(),
            ]);
        }
        "gif" => {
            let scale = match quality {
                "high" => "640",
                "small" => "240",
                _ => "400",
            };
            let fps = match quality {
                "high" => "12",
                "small" => "8",
                _ => "10",
            };
            // Filtre unique (évite le double-pass palettegen coûteux)
            args.extend([
                "-vf".into(),
                format!("fps={fps},scale={scale}:-1:flags=fast_bilinear"),
                "-an".into(),
                "-threads".into(),
                "0".into(),
            ]);
        }
        "mp3" => {
            // Pas besoin de décodage vidéo GPU
            args = vec![
                "-y".into(),
                "-hide_banner".into(),
                "-i".into(),
                input.into(),
                "-progress".into(),
                "pipe:1".into(),
                "-nostats".into(),
                "-vn".into(),
                "-c:a".into(),
                "libmp3lame".into(),
                "-q:a".into(),
                match quality {
                    "high" => "0",
                    "small" => "5",
                    _ => "2",
                }
                .into(),
                "-threads".into(),
                "0".into(),
            ];
        }
        other => return Err(FfmpegError::UnsupportedFormat(other.to_string())),
    }

    args.push(output.into());
    Ok(args)
}

pub fn parse_progress_line(line: &str, duration: f64) -> Option<ConversionProgress> {
    // -progress pipe:1 emits key=value lines; out_time_ms is most useful
    if let Some(ms_str) = line.strip_prefix("out_time_ms=") {
        let ms: f64 = ms_str.trim().parse().ok()?;
        let time_secs = ms / 1_000_000.0;
        let percent = if duration > 0.0 {
            ((time_secs / duration) * 100.0).clamp(0.0, 99.5)
        } else {
            0.0
        };
        return Some(ConversionProgress {
            percent,
            time_secs,
            speed: None,
        });
    }

    if let Some(speed) = line.strip_prefix("speed=") {
        return Some(ConversionProgress {
            percent: 0.0,
            time_secs: 0.0,
            speed: Some(speed.trim().to_string()),
        });
    }

    None
}

pub fn default_output_path(input: &str, format: &str) -> String {
    let path = Path::new(input);
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let parent = path.parent().unwrap_or_else(|| Path::new("."));

    let ext = match format {
        "hevc" => "mp4",
        other => other,
    };

    parent
        .join(format!("{stem}-converted.{ext}"))
        .to_string_lossy()
        .to_string()
}
