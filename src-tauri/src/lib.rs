mod commands;

use commands::watch::WatcherMap;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WatcherMap::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::file::read_tail,
            commands::watch::start_watch,
            commands::watch::stop_watch,
            commands::search::search_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
