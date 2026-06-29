use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use crate::temp_models::BackendState;
use tauri::Manager;

mod cosine_sim;
mod db;
mod embedding_temp;
mod errors;
mod preprocessing;
mod temp_command;
mod temp_models;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // set up add storage path
            let local_appdata_path = app.path().app_local_data_dir().unwrap();

            let local_db_storage_path = local_appdata_path.join("tempdb");
            let local_thumbnail_storage_path = local_appdata_path.join("temp_thumbnails");
            let local_model_storage_path = local_appdata_path.join("models");

            let _ = std::fs::create_dir_all(&local_db_storage_path);
            let _ = std::fs::create_dir_all(&local_thumbnail_storage_path);
            

            // create json for description matching IF current one does not exist
            let descriptions_json_path = local_appdata_path.join("descriptions.json");
            match std::fs::File::create_new(&descriptions_json_path) {
                Ok(mut f) => {
                    use std::io::Write;
                    let _ = f.write_all(b"{}"); // start with empty JSON object
                }
                Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {} // do nothign on if alr there
                Err(e) => return Err(e.into()),
            }

            let state = Arc::new(BackendState {
                current_workspace: Mutex::new(String::new()), // represents the current workspace name
                local_appdata_path: Some(local_appdata_path.to_path_buf()),
                local_thumbnail_storage_path: Some(local_thumbnail_storage_path),
                local_db_storage_path: Some(local_db_storage_path),
                workspace_cache: Mutex::new(None),
                vision_model: Mutex::new(None),
                text_model: Mutex::new(None),
                tokenizer: Mutex::new(None),
            });

            app.manage(state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            temp_command::create_workspace,
            temp_command::load_workspace,
            temp_command::delete_workspace,
            temp_command::find_workspaces,
            temp_command::process_query,
            temp_command::process_query_image,
            temp_command::lazy_load_data,
            temp_command::lazy_load_data_single
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
