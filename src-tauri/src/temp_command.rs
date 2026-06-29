use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Arc;
use tokio::task;

use crate::{
    cosine_sim::compute_sim,
    db::{create_albumn, load_albumn},
    preprocessing::{find_image_paths, merge_image_and_embeddings, preprocess_album},
    temp_models::{AlbumView, BackendState, ImageOrder, ImageView},
};

// Sends a single row instance
#[tauri::command]
pub async fn lazy_load_data_single(
    id: u64,
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<ImageView, String> {
    let temp = lazy_load_data_single_inner(id, &state).await?;

    Ok(temp)
}

pub async fn lazy_load_data_single_inner(
    id: u64,
    state: &BackendState,
) -> Result<ImageView, String> {
    let cache_guard = state.workspace_cache.lock().map_err(|e| e.to_string())?;

    let current_album = cache_guard.as_ref().ok_or("Err".to_string())?;
    let cache = current_album.album.as_ref().ok_or("Err".to_string())?;

    let temp_image = cache
        .get(&id)
        .ok_or("Unable to find id in cache".to_string())?;
    Ok(ImageView {
        id: temp_image.id,
        meta: temp_image.meta.clone(),
        name: temp_image.name.clone(),
        path: temp_image.path.clone(),
    })
}

// Sends a batch list of ids and batch loads data for them
#[tauri::command]
pub async fn lazy_load_data(
    ids: Vec<u64>,
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<Vec<ImageView>, String> {
    let temp = lazy_load_data_inner(ids, state.inner()).await?;

    Ok(temp)
}

// it might be necessary for this to be in blocking but maybe not
// since it only reads from the cache
pub async fn lazy_load_data_inner(
    ids: Vec<u64>,
    state: &BackendState,
) -> Result<Vec<ImageView>, String> {
    // aquire lock and get the cache from BackendState
    let cache_guard = state.workspace_cache.lock().map_err(|e| e.to_string())?;
    let mut vec_views: Vec<ImageView> = Vec::new();

    if let Some(current_album) = cache_guard.as_ref() {
        if let Some(cache) = current_album.album.as_ref() {
            for id in ids {
                if let Some(image) = cache.get(&id) {
                    vec_views.push(ImageView {
                        id: image.id,
                        meta: image.meta.clone(),
                        name: image.name.clone(),
                        path: image.path.clone(),
                    });
                }
            }
        }
    }

    Ok(vec_views)
}

// Creates new workspace
#[tauri::command]
pub async fn create_workspace(
    target: &str,
    album_name: String,
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<(), String> {
    let target_owned = target.to_string();
    let state = state.inner().clone();

    tokio::task::spawn_blocking(move || create_workspace_inner(&target_owned, album_name, &state))
        .await
        .map_err(|e| e.to_string())?
}

fn create_workspace_inner(
    target: &str,
    album_name: String,
    state: &BackendState,
) -> Result<(), String> {
    // 1.) Process image album and cache
    // first preprocess
    // Then embed
    // Then store the cache

    // 2.) Use cache to write to workspace
    // take the cached rep from memory
    // write to sqlite file

    // All of this can be on the same blocking thread
    // and the tauri command would just await it

    // Also if want to emit messages like what stage it is at
    // then apphandle is close send and sync so you can pass around like
    // hot potato around threads of execution
    let path: &Path = Path::new(target);
    let thumbnail_path = state
        .local_thumbnail_storage_path
        .as_ref()
        .ok_or("Temp error".to_string())?;
    let valid_image_paths: Vec<PathBuf> = find_image_paths(path);
    let id_counter = AtomicI64::new(0); // each workspace creation needs new auto inc id counter

    let prepared = preprocess_album(valid_image_paths, thumbnail_path, &id_counter)?;
    let (images, tensors) = prepared.into_iter().unzip();

    state.create_vision_model()?;

    let vm_guard = state.vision_model.lock().map_err(|e| e.to_string())?;
    let embeddings: Vec<Vec<f32>> = vm_guard.as_ref().unwrap().embed_batch_list(tensors)?;
    
    drop(vm_guard);
    state.delete_vision_model()?;

    // Merge uncomplete Image with embeddings to complete the list of Img
    let cache = merge_image_and_embeddings(images, embeddings).map_err(|e| e.to_string())?;

    // set the active cache to newly created map
    state.set_active_cache(cache)?;

    // call db functions for this create album
    // Reads from the BE cache
    create_albumn(album_name, state)?;

    Ok(())
}

// Should call with teh workspace name and then load from sqlite
#[tauri::command]
pub async fn load_workspace(
    target: &str,
    album_name: String,
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<(), String> {
    // similar process but would need to call a function to load from sqlite file
    // pass down the specific workspace to choose
    // that function will then load and cache from backend
    let target_owned = target.to_string();
    let state = state.inner().clone(); // Arc clone

    tokio::task::spawn_blocking(move || load_workspace_inner(&target_owned, album_name, &state))
        .await
        .map_err(|e| e.to_string())?
}

fn load_workspace_inner(
    target: &str,
    album_name: String,
    state: &BackendState,
) -> Result<(), String> {
    // Similar to create_workspace_inner
    // just load from sqlite to the cache and then ret ok when process is done

    load_albumn(album_name, state)?;

    Ok(())
}

#[tauri::command]
pub async fn delete_workspace(
    album_name: String,
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<(), String> {
    let state = state.inner().clone();
    tokio::task::spawn_blocking(move || delete_workspace_inner(&album_name, &state))
        .await
        .map_err(|e| e.to_string())?
}

fn delete_workspace_inner(album_name: &str, state: &BackendState) -> Result<(), String> {
    let db_file = state
        .local_db_storage_path
        .as_ref()
        .ok_or("DB storage path not set".to_string())?
        .join(format!("{}.db", album_name));

    if db_file.exists() {
        std::fs::remove_file(&db_file).map_err(|e| e.to_string())?;
    }

    // TODO: also clean up thumbnails for this workspace later

    Ok(())
}

// goes into db file place and gets the workspace + descriptions return to user
#[tauri::command]
pub async fn find_workspaces(
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<Vec<AlbumView>, String> {
    let state = state.inner().clone();
    tokio::task::spawn_blocking(move || find_workspaces_inner(&state))
        .await
        .map_err(|e| e.to_string())?
}

fn find_workspaces_inner(state: &BackendState) -> Result<Vec<AlbumView>, String> {
    let db_path = state
        .local_db_storage_path
        .as_ref()
        .ok_or("DB storage path not set".to_string())?;

    let entries = std::fs::read_dir(db_path).map_err(|e| e.to_string())?;

    let mut albums: Vec<AlbumView> = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.extension().and_then(|e| e.to_str()) == Some("db") {
            let name = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();

            albums.push(AlbumView {
                name,
                description: String::new(), // TODO: read from sidecar json if exists
                path,
            });
        }
    }

    Ok(albums)
}

// This one will just be text based query
#[tauri::command]
pub async fn process_query(
    user_query: String,
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<Vec<ImageOrder>, String> {
    let state = state.inner().clone();

    tokio::task::spawn_blocking(move || process_query_inner(user_query, &state))
        .await
        .map_err(|e| e.to_string())?
}

pub fn process_query_inner(
    user_query: String,
    state: &BackendState,
) -> Result<Vec<ImageOrder>, String> {
    state.create_text_model()?;
    state.create_tokenizer()?;

    let tokenizer_guard = state.tokenizer.lock().map_err(|e| e.to_string())?;
    let tokenizer = tokenizer_guard
        .as_ref()
        .ok_or("Tokenizer not initialized".to_string())?;

    let tm_guard = state.text_model.lock().map_err(|e| e.to_string())?;
    let tm = tm_guard
        .as_ref()
        .ok_or("Text model not initialized".to_string())?;

    let (user_embedding_tokenized, mask) = tokenizer.tokenize_input(&user_query)?;
    let user_embedding = tm.embed_single(user_embedding_tokenized, mask)?;

    let ret = compute_sim(user_embedding, state)?;

    Ok(ret)
}

// For finding images similar to given image
#[tauri::command]
pub async fn process_query_image() -> Result<(), String> {
    Ok(())
}
