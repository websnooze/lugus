mod converter;
mod ffmpeg;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
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
        .invoke_handler(tauri::generate_handler![
            converter::check_ffmpeg,
            converter::probe_video,
            converter::suggest_output_path,
            converter::convert_video,
            converter::cancel_conversion,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
