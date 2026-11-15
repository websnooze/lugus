mod converter;
mod ffmpeg;
mod macos_overlay;
mod recorder;
mod recorder_panel;
mod sources;

use tauri::WindowEvent;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::Builder::new().build());

    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(tauri_nspanel::init());
    }

    builder
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Fermer la fenêtre principale = masquer (l’app reste via le tray).
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            converter::check_ffmpeg,
            converter::probe_video,
            converter::suggest_output_path,
            converter::convert_video,
            converter::cancel_conversion,
            sources::list_displays,
            sources::list_windows,
            recorder::start_recording,
            recorder::stop_recording,
            recorder::is_recording,
            recorder::take_screenshot,
            recorder::open_region_picker,
            recorder::close_region_picker,
            recorder::confirm_region,
            macos_overlay::set_macos_overlay_mode,
            recorder_panel::set_recorder_panel_mode,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
