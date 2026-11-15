use std::io::Write;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::ffmpeg::{self, FfmpegError};
use crate::sources;

static RECORDING_PROCESS: Lazy<Mutex<Option<Child>>> = Lazy::new(|| Mutex::new(None));

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureRegion {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartRecordingRequest {
    pub mode: String, // display | window | region
    pub fps: u32,
    pub display_id: Option<u32>,
    pub window_id: Option<u32>,
    pub region: Option<CaptureRegion>,
    pub show_cursor: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingStarted {
    pub output_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenshotRequest {
    pub mode: String, // display | window | region
    pub display_id: Option<u32>,
    pub window_id: Option<u32>,
    pub region: Option<CaptureRegion>,
    pub show_cursor: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenshotTaken {
    pub output_path: String,
}

#[derive(Debug, thiserror::Error)]
pub enum RecorderError {
    #[error("{0}")]
    Message(String),
    #[error(transparent)]
    Ffmpeg(#[from] FfmpegError),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Sources(#[from] sources::SourcesError),
}

impl Serialize for RecorderError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

fn recordings_dir() -> Result<std::path::PathBuf, RecorderError> {
    let home = dirs::home_dir()
        .ok_or_else(|| RecorderError::Message("Home directory introuvable".into()))?;
    let dir = home.join("Movies").join("Lugus");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn screenshots_dir() -> Result<std::path::PathBuf, RecorderError> {
    let base = dirs::picture_dir().or_else(|| {
        dirs::home_dir().map(|home| {
            // macOS FR affiche « Images », le dossier système reste souvent Pictures.
            let images = home.join("Images");
            if images.is_dir() {
                images
            } else {
                home.join("Pictures")
            }
        })
    });
    let base = base.ok_or_else(|| RecorderError::Message("Dossier Images introuvable".into()))?;
    let dir = base.join("Lugus");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn resolve_capture(
    request: &StartRecordingRequest,
) -> Result<(u32, Option<CaptureRegion>, u32, u32), RecorderError> {
    let displays = sources::list_displays()?;
    if displays.is_empty() {
        return Err(RecorderError::Message("Aucun écran détecté".into()));
    }

    match request.mode.as_str() {
        "display" => {
            let display = if let Some(id) = request.display_id {
                displays
                    .iter()
                    .find(|d| d.id == id)
                    .cloned()
                    .ok_or_else(|| RecorderError::Message("Écran introuvable".into()))?
            } else {
                displays
                    .into_iter()
                    .find(|d| d.is_main)
                    .unwrap_or_else(|| unreachable!())
            };
            Ok((display.ffmpeg_index, None, display.width, display.height))
        }
        "window" => {
            let window_id = request
                .window_id
                .ok_or_else(|| RecorderError::Message("Fenêtre non sélectionnée".into()))?;
            let windows = sources::list_windows()?;
            let window = windows
                .into_iter()
                .find(|w| w.id == window_id)
                .ok_or_else(|| RecorderError::Message("Fenêtre introuvable".into()))?;

            // Associer la fenêtre à l'écran qui la contient (coin supérieur gauche)
            let display = displays
                .iter()
                .find(|d| {
                    let dx = d.x;
                    let dy = d.y;
                    // d.width/height are pixels; bounds x/y from CGDisplay are in points
                    let dw = (d.width as f64 / d.scale).round() as i32;
                    let dh = (d.height as f64 / d.scale).round() as i32;
                    window.x >= dx
                        && window.y >= dy
                        && window.x < dx + dw
                        && window.y < dy + dh
                })
                .cloned()
                .or_else(|| displays.iter().find(|d| d.is_main).cloned())
                .ok_or_else(|| RecorderError::Message("Écran introuvable pour la fenêtre".into()))?;

            let scale = display.scale;
            let rel_x = ((window.x - display.x) as f64 * scale).round().max(0.0) as u32;
            let rel_y = ((window.y - display.y) as f64 * scale).round().max(0.0) as u32;
            let width = ((window.width as f64 * scale).round() as u32).max(2);
            let height = ((window.height as f64 * scale).round() as u32).max(2);

            // Dimensions paires pour H.264
            let width = width & !1;
            let height = height & !1;

            Ok((
                display.ffmpeg_index,
                Some(CaptureRegion {
                    x: rel_x & !1,
                    y: rel_y & !1,
                    width,
                    height,
                }),
                display.width,
                display.height,
            ))
        }
        "region" => {
            let region = request
                .region
                .clone()
                .ok_or_else(|| RecorderError::Message("Zone non définie".into()))?;
            let display = if let Some(id) = request.display_id {
                displays
                    .iter()
                    .find(|d| d.id == id)
                    .cloned()
                    .ok_or_else(|| RecorderError::Message("Écran introuvable".into()))?
            } else {
                displays
                    .into_iter()
                    .find(|d| d.is_main)
                    .ok_or_else(|| RecorderError::Message("Écran principal introuvable".into()))?
            };

            let width = region.width.max(2) & !1;
            let height = region.height.max(2) & !1;
            Ok((
                display.ffmpeg_index,
                Some(CaptureRegion {
                    x: region.x & !1,
                    y: region.y & !1,
                    width,
                    height,
                }),
                display.width,
                display.height,
            ))
        }
        other => Err(RecorderError::Message(format!("Mode inconnu : {other}"))),
    }
}

fn find_screen_device_index(ffmpeg_screen_n: u32) -> Result<u32, RecorderError> {
    // Liste les devices avfoundation et trouve "Capture screen N"
    let ffmpeg = ffmpeg::find_binary("ffmpeg")?;
    let output = Command::new(ffmpeg)
        .args(["-f", "avfoundation", "-list_devices", "true", "-i", ""])
        .output()?;

    let stderr = String::from_utf8_lossy(&output.stderr);
    let needle = format!("Capture screen {ffmpeg_screen_n}");
    for line in stderr.lines() {
        if line.contains(&needle) {
            // Ex: [AVFoundation indev @ ...] [1] Capture screen 0
            if let Some(start) = line.find('[') {
                let rest = &line[start + 1..];
                if let Some(end) = rest.find(']') {
                    if let Ok(index) = rest[..end].parse::<u32>() {
                        // Skip non-numeric labels like "AVFoundation..."
                        if rest[..end].chars().all(|c| c.is_ascii_digit()) {
                            return Ok(index);
                        }
                    }
                }
            }
            // Fallback: second bracket
            let parts: Vec<_> = line.match_indices('[').collect();
            if parts.len() >= 2 {
                let start = parts[1].0 + 1;
                if let Some(end) = line[start..].find(']') {
                    if let Ok(index) = line[start..start + end].parse::<u32>() {
                        return Ok(index);
                    }
                }
            }
        }
    }

    // Fallback fréquent : device video index 1 = Capture screen 0
    Ok(1 + ffmpeg_screen_n)
}

#[tauri::command]
pub async fn start_recording(
    app: AppHandle,
    request: StartRecordingRequest,
) -> Result<RecordingStarted, RecorderError> {
    {
        let guard = RECORDING_PROCESS
            .lock()
            .map_err(|_| RecorderError::Message("Lock enregistrement".into()))?;
        if guard.is_some() {
            return Err(RecorderError::Message(
                "Un enregistrement est déjà en cours".into(),
            ));
        }
    }

    let fps = match request.fps {
        24 | 30 | 60 | 120 => request.fps,
        _ => 60,
    };

    let (screen_n, region, dw, dh) = resolve_capture(&request)?;
    let device_index = find_screen_device_index(screen_n)?;

    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let output_path = recordings_dir()?.join(format!("recording-{stamp}.mov"));
    let output = output_path.to_string_lossy().to_string();

    let ffmpeg = ffmpeg::find_binary("ffmpeg")?;
    let input = format!("{device_index}:none");

    // Masquer l’overlay avant la capture : avfoundation ignore contentProtected
    // et enregistrerait sinon le cadre / le dim de la zone.
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.hide();
    }
    std::thread::sleep(std::time::Duration::from_millis(150));

    let mut args: Vec<String> = vec![
        "-y".into(),
        "-hide_banner".into(),
        "-loglevel".into(),
        "error".into(),
        "-f".into(),
        "avfoundation".into(),
        "-framerate".into(),
        fps.to_string(),
        "-capture_cursor".into(),
        if request.show_cursor { "1" } else { "0" }.into(),
        "-i".into(),
        input,
    ];

    if let Some(region) = region.as_ref() {
        // Normalise d’abord à la résolution native de l’écran (évite le « zoom »
        // Retina quand avfoundation capture en points).
        args.extend(["-vf".into(), crop_filter(dw, dh, region)]);
    }

    // Capture rapide en VideoToolbox, on convertira après
    let bitrate = match fps {
        120 => "40M",
        60 => "25M",
        _ => "16M",
    };

    args.extend([
        "-c:v".into(),
        "h264_videotoolbox".into(),
        "-b:v".into(),
        bitrate.into(),
        "-realtime".into(),
        "true".into(),
        "-prio_speed".into(),
        "true".into(),
        "-r".into(),
        fps.to_string(),
        "-an".into(),
        output.clone(),
    ]);

    let mut child = match Command::new(ffmpeg)
        .args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(child) => child,
        Err(e) => {
            restore_main_after_picker(&app);
            return Err(RecorderError::Io(e));
        }
    };

    // Petit délai pour détecter un échec immédiat (permissions, etc.)
    std::thread::sleep(std::time::Duration::from_millis(400));
    match child.try_wait()? {
        Some(status) => {
            let mut err = String::new();
            if let Some(mut stderr) = child.stderr.take() {
                use std::io::Read;
                let _ = stderr.read_to_string(&mut err);
            }
            restore_main_after_picker(&app);
            return Err(RecorderError::Message(format!(
                "Échec du démarrage de l’enregistrement (code {:?}). Vérifie l’autorisation Enregistrement d’écran dans Réglages Système. {err}",
                status.code()
            )));
        }
        None => {}
    }

    {
        let mut guard = RECORDING_PROCESS
            .lock()
            .map_err(|_| RecorderError::Message("Lock enregistrement".into()))?;
        *guard = Some(child);
    }

    let _ = app.emit(
        "recording-started",
        &RecordingStarted {
            output_path: output.clone(),
        },
    );

    Ok(RecordingStarted {
        output_path: output,
    })
}

#[tauri::command]
pub async fn stop_recording(app: AppHandle) -> Result<String, RecorderError> {
    let mut child = {
        let mut guard = RECORDING_PROCESS
            .lock()
            .map_err(|_| RecorderError::Message("Lock enregistrement".into()))?;
        guard
            .take()
            .ok_or_else(|| RecorderError::Message("Aucun enregistrement en cours".into()))?
    };

    // Quitter proprement FFmpeg
    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(b"q");
        let _ = stdin.flush();
    }

    let status = child.wait()?;
    if !status.success() {
        // q peut parfois renvoyer un code non-zéro si déjà fermé — on tolère
        if status.code() != Some(0) && status.code() != Some(255) {
            // Continue : le fichier peut quand même être utilisable
        }
    }

    // Réafficher l’app seulement après l’arrêt de la capture.
    restore_main_after_picker(&app);

    Ok("ok".into())
}

#[tauri::command]
pub fn is_recording() -> bool {
    RECORDING_PROCESS
        .lock()
        .ok()
        .map(|g| g.is_some())
        .unwrap_or(false)
}

fn crop_filter(dw: u32, dh: u32, region: &CaptureRegion) -> String {
    format!(
        "scale={dw}:{dh}:flags=lanczos,crop={}:{}:{}:{}",
        region.width, region.height, region.x, region.y
    )
}

#[tauri::command]
pub async fn take_screenshot(
    app: AppHandle,
    request: ScreenshotRequest,
) -> Result<ScreenshotTaken, RecorderError> {
    {
        let guard = RECORDING_PROCESS
            .lock()
            .map_err(|_| RecorderError::Message("Lock enregistrement".into()))?;
        if guard.is_some() {
            return Err(RecorderError::Message(
                "Impossible de capturer pendant un enregistrement".into(),
            ));
        }
    }

    let capture_req = StartRecordingRequest {
        mode: request.mode,
        fps: 30,
        display_id: request.display_id,
        window_id: request.window_id,
        region: request.region,
        show_cursor: request.show_cursor,
    };
    let (screen_n, region, dw, dh) = resolve_capture(&capture_req)?;
    let device_index = find_screen_device_index(screen_n)?;

    // Masquer l’overlay pour ne pas l’inclure dans la capture.
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.hide();
    }
    std::thread::sleep(std::time::Duration::from_millis(120));

    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let output_path = screenshots_dir()?.join(format!("screenshot-{stamp}.png"));
    let output = output_path.to_string_lossy().to_string();

    let ffmpeg = ffmpeg::find_binary("ffmpeg")?;
    let input = format!("{device_index}:none");

    let mut args: Vec<String> = vec![
        "-y".into(),
        "-hide_banner".into(),
        "-loglevel".into(),
        "error".into(),
        "-f".into(),
        "avfoundation".into(),
        "-framerate".into(),
        "30".into(),
        "-capture_cursor".into(),
        if request.show_cursor { "1" } else { "0" }.into(),
        "-i".into(),
        input,
        "-frames:v".into(),
        "1".into(),
    ];

    if let Some(region) = region.as_ref() {
        args.extend(["-vf".into(), crop_filter(dw, dh, region)]);
    }

    args.push(output.clone());

    let result = Command::new(ffmpeg)
        .args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .output();

    restore_main_after_picker(&app);

    match result {
        Ok(out) if out.status.success() => Ok(ScreenshotTaken {
            output_path: output,
        }),
        Ok(out) => {
            let err = String::from_utf8_lossy(&out.stderr);
            Err(RecorderError::Message(format!(
                "Échec de la capture d’écran. Vérifie l’autorisation Enregistrement d’écran. {err}"
            )))
        }
        Err(e) => {
            Err(RecorderError::Message(format!(
                "Échec de la capture d’écran : {e}"
            )))
        }
    }
}

fn restore_main_after_picker(app: &AppHandle) {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        // Pas de set_focus : conserve le comportement NSPanel non-activant.
    }
    // Repose le panel fullscreen / all-spaces après hide (screenshot / picker).
    let _ = crate::recorder_panel::set_recorder_panel_mode(app.clone(), true);
}

#[tauri::command]
pub async fn open_region_picker(app: AppHandle, display_id: Option<u32>) -> Result<(), RecorderError> {
    if let Some(existing) = app.get_webview_window("region-picker") {
        let _ = existing.close();
    }

    let displays = sources::list_displays()?;
    let display = if let Some(id) = display_id {
        displays
            .into_iter()
            .find(|d| d.id == id)
            .ok_or_else(|| RecorderError::Message("Écran introuvable".into()))?
    } else {
        displays
            .into_iter()
            .find(|d| d.is_main)
            .ok_or_else(|| RecorderError::Message("Écran principal introuvable".into()))?
    };

    let point_w = (display.width as f64 / display.scale).round() as f64;
    let point_h = (display.height as f64 / display.scale).round() as f64;

    // Masquer l’overlay recorder : sinon le picker s’ouvre derrière et bloque le dessin.
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.hide();
    }

    let url = WebviewUrl::App(
        format!(
            "index.html?displayId={}&scale={}",
            display.id, display.scale
        )
        .into(),
    );
    let window = match WebviewWindowBuilder::new(&app, "region-picker", url)
        .title("")
        .transparent(true)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .closable(false)
        .devtools(false)
        .inner_size(point_w, point_h)
        .position(display.x as f64, display.y as f64)
        .visible(true)
        .focused(true)
        .build()
    {
        Ok(window) => window,
        Err(e) => {
            restore_main_after_picker(&app);
            return Err(RecorderError::Message(format!(
                "Impossible d’ouvrir le sélecteur : {e}"
            )));
        }
    };

    let _ = window.set_ignore_cursor_events(false);
    let _ = window.set_always_on_top(true);
    let _ = window.set_focus();
    crate::macos_overlay::apply_overlay_chrome_with_role(
        &window,
        true,
        crate::macos_overlay::OverlayRole::Picker,
    )
    .map_err(|e| {
        restore_main_after_picker(&app);
        RecorderError::Message(e)
    })?;
    Ok(())
}

#[tauri::command]
pub async fn close_region_picker(app: AppHandle) -> Result<(), RecorderError> {
    if let Some(window) = app.get_webview_window("region-picker") {
        let _ = window.close();
    }
    restore_main_after_picker(&app);
    Ok(())
}

#[tauri::command]
pub async fn confirm_region(
    app: AppHandle,
    region: CaptureRegion,
    display_id: u32,
    scale: f64,
) -> Result<(), RecorderError> {
    // Les coords arrivent en CSS pixels de l'overlay → convertir en pixels device
    let physical = CaptureRegion {
        x: (region.x as f64 * scale).round().max(0.0) as u32,
        y: (region.y as f64 * scale).round().max(0.0) as u32,
        width: (region.width as f64 * scale).round().max(2.0) as u32,
        height: (region.height as f64 * scale).round().max(2.0) as u32,
    };

    #[derive(Serialize, Clone)]
    #[serde(rename_all = "camelCase")]
    struct Payload {
        region: CaptureRegion,
        display_id: u32,
        scale: f64,
    }

    let _ = app.emit(
        "region-selected",
        &Payload {
            region: physical,
            display_id,
            scale,
        },
    );

    if let Some(window) = app.get_webview_window("region-picker") {
        let _ = window.close();
    }
    restore_main_after_picker(&app);

    Ok(())
}
