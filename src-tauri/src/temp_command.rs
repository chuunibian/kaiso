use crate::temp_models::JsonAlbum;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicI64;
use std::sync::Arc;
use std::time::SystemTime;
use tauri::{AppHandle, Emitter};

use crate::{
    cosine_sim::compute_sim,
    db::{create_albumn, load_albumn},
    preprocessing::{find_image_paths, merge_image_and_embeddings, preprocess_album, create_thumbnail_dir},
    temp_models::{AlbumView, BackendState, ImageOrder, ImageView},
};

// basically goes through the cache and returns default list of ids this is needed for general initial loading of img on FE
#[tauri::command]
pub async fn get_default_ids(state: tauri::State<'_, Arc<BackendState>>) -> Result<Vec<ImageOrder>, String> {
    // let state = state.inner().clone();

    // tokio::task::spawn_blocking(move || get_default_ids_inner(&state))
    //     .await
    //     .map_err(|e| e.to_string())?

    let temp = get_default_ids_inner(state.inner()).map_err(|e| e.to_string())?;
    Ok(temp)
}

pub fn get_default_ids_inner(state: &BackendState) -> Result<Vec<ImageOrder>, String>{
    let cache_guard = state.workspace_cache.lock().map_err(|e| e.to_string())?;
    let mut vec_views: Vec<ImageOrder> = Vec::new();

    if let Some(current_album) = cache_guard.as_ref() {
        if let Some(cache) = current_album.album.as_ref() {
            for id in cache.keys() {
                vec_views.push(ImageOrder {
                    id: *id,
                    confidence_score: 0.0, // 0 is default score 
                });
            }
        }
    }

    Ok(vec_views)
}

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


// TODO in future send in a custom struct that encapsulates the root path name and desc

#[tauri::command]
pub async fn create_workspace(
    target: &str,
    album_name: String,
    album_description: String,
    state: tauri::State<'_, Arc<BackendState>>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let target_owned = target.to_string();
    let state = state.inner().clone();
    let app = app.clone();

    tokio::task::spawn_blocking(move || create_workspace_inner(&target_owned, album_name, album_description, &state, &app))
        .await
        .map_err(|e| e.to_string())?;

    Ok("done".to_string())
}

fn create_workspace_inner(
    target: &str,
    album_name: String,
    album_description: String,
    state: &BackendState,
    app: &AppHandle,
) -> Result<(), String> {

    let path: &Path = Path::new(target);
    let thumbnail_path = state
        .local_thumbnail_storage_path
        .as_ref()
        .ok_or("Temp error".to_string())?;

    emit_utility(app, "create-workspace", "Scanning for valid image paths...")?;
    let valid_image_paths: Vec<PathBuf> = find_image_paths(path);
    let id_counter = AtomicI64::new(0); // each workspace creation needs new auto inc id counter

    emit_utility(app, "create-workspace", "Preprocessing images...")?;
    let preproc_start = std::time::Instant::now();
    create_thumbnail_dir(&thumbnail_path, &album_name)?; // create the thumbnail dir for new workspace
    let prepared = preprocess_album(valid_image_paths, thumbnail_path, &album_name, &id_counter)?;
    let preproc_duration = preproc_start.elapsed();
    println!("Preprocessing took: {:?}", preproc_duration);
    let (images, tensors) = prepared.into_iter().unzip();

    state.create_vision_model()?;

    emit_utility(app, "create-workspace", "Embedding images...")?;
    let vm_guard = state.vision_model.lock().map_err(|e| e.to_string())?;
    let inference_start = std::time::Instant::now();
    let embeddings: Vec<Vec<f32>> = vm_guard.as_ref().unwrap().embed_batch_list_with_progress(tensors, app)?;
    let inference_duration = inference_start.elapsed();
    println!("Inference took: {:?}", inference_duration);

    // Drop lock release vm and then delete vm as not needed
    drop(vm_guard);
    state.delete_vision_model()?;

    // Merge uncomplete Image with embeddings to complete the list of Img
    let cache = merge_image_and_embeddings(images, embeddings).map_err(|e| e.to_string())?;

    // set the active cache to newly created map
    state.set_active_cache(cache)?;

    // call db functions for this create album
    // Reads from the BE cache
    emit_utility(app, "create-workspace", "Creating workspace in database...")?;
    create_albumn(album_name.clone(), state)?;

    // create the album in the json file
    emit_utility(app, "create-workspace", "Finalizing workspace...")?;
    add_album_to_json_file(album_name.clone(), album_description, std::time::SystemTime::now(), state)?;

    Ok(())
}

pub fn emit_utility<T: Serialize + Clone>(
    app: &AppHandle,
    event_name: &str,
    payload: T,
) -> Result<(), String> {
    app.emit(event_name, payload).map_err(|e| e.to_string())
}

// Should call with teh workspace name and then load from sqlite
#[tauri::command]
pub async fn load_workspace(
    album_name: String,
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<(), String> {
    // similar process but would need to call a function to load from sqlite file
    // pass down the specific workspace to choose
    // that function will then load and cache from backend
    let state = state.inner().clone(); // Arc clone

    tokio::task::spawn_blocking(move || load_workspace_inner(album_name, &state))
    .await
    .map_err(|e| e.to_string())?
}

// TODO this function needs to also maybe give a default list of ordered ids for when the user did not query but still want ot show images
fn load_workspace_inner(album_name: String, state: &BackendState) -> Result<(), String> {
    // Similar to create_workspace_inner
    // just load from sqlite to the cache and then ret ok when process is done

    load_albumn(album_name, state)?;

    Ok(())
}


// For sync workspace with selected folders
// #[tauri::command]
// pub async fn sync_workspace(album_name: String, state: tauri::State<'_, Arc<BackendState>>) -> Result<(), String> {
//     let state = state.inner().clone();
//     tokio::task::spawn_blocking(move || sync_workspace_inner(album_name, &state))
//         .await
//         .map_err(|e| e.to_string())?
// }

// fn sync_workspace_inner(state: &BackendState) -> Result<(), String> {

    
//     Ok(())
// }

// Later on need to add util functions that take in list of changed images / missing images (paths) and then resync them to do something 


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
    clean_workspace_db_file(album_name, state);
    clean_workspace_thumbnail(album_name, state);

    Ok(())
}

fn clean_workspace_db_file(album_name: &str, state: &BackendState) -> Result<(), String> {
    let db_file = state
        .local_db_storage_path
        .as_ref()
        .ok_or("DB storage path not set".to_string())?
        .join(format!("{}.db", album_name));

    if db_file.exists() {
        std::fs::remove_file(&db_file).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn clean_workspace_thumbnail(album_name: &str, state: &BackendState) -> Result<(), String> {
    let thumbnail_path = state
        .local_thumbnail_storage_path
        .as_ref()
        .ok_or("Thumbnail storage path not set".to_string())?;

    let thumbnail_folder = thumbnail_path.join(format!("{}", album_name));
    if thumbnail_folder.exists() {
        std::fs::remove_dir_all(&thumbnail_folder).map_err(|e| e.to_string())?;
    }

    Ok(())
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

// goes into db file place and gets the workspace + descriptions return to user
// Will return an ordered vec of albumview ready for the frontendd to load
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

    let json_path = db_path.join("workspaces.json");

    let albums_temp: Vec<JsonAlbum> = load_workspace_json(&json_path)?;
    let mut albums: Vec<AlbumView> = Vec::new();

    for album in albums_temp {
        albums.push(AlbumView {
            name: album.name,
            description: album.description,
            path: PathBuf::from(album.root_path), // represents teh original root path
            date: album.date.clone(),
        })
    }

    albums.sort_by_key(|album| album.name.clone()); // sort alpha by name,

    Ok(albums)
}

// This function will given the json path load it in and return it ready
// utility function
fn load_workspace_json(path: &Path) -> Result<Vec<JsonAlbum>, String> {
    let contents = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let trimmed = contents.trim();
    if trimmed == "{}" || trimmed == "[]" || trimmed.is_empty() {
        return Ok(Vec::new());
    }
    let albums: Vec<JsonAlbum> = serde_json::from_str(&contents).map_err(|e| e.to_string())?;

    Ok(albums)
}

// Writes the json file utility use
fn write_workspace_json(path: &Path, albums: Vec<JsonAlbum>) -> Result<(), String> {
    let contents = serde_json::to_string(&albums).map_err(|e| e.to_string())?;
    fs::write(path, contents).map_err(|e| e.to_string())?;

    Ok(())
}

// basically will change album name in db file, thumbnail file, 
// #[tauri::command]
// pub async fn change_album_name() -> Result<(), String> {

// }

// fn change_album_name_inner() -> Result<> {

// }

// fn change_db_file_name() -> Result<()> {
    
// }

// fn change_thumbnail_folder_name() -> Result<()> {
    
// }

// add or edit
#[tauri::command]
pub async fn add_album_description(
    album_name: String,
    description: String,
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<(), String> {
    let state = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        add_album_description_inner(&album_name, &description, &state)
    })
    .await
    .map_err(|e| e.to_string())?
}

pub fn add_album_description_inner(
    album_name: &str,
    description: &str,
    state: &BackendState,
) -> Result<(), String> {
    let db_path = state
        .local_db_storage_path
        .as_ref()
        .ok_or("DB storage path not set".to_string())?;

    let json_path = db_path.join("workspaces.json");
    let mut albums_temp: Vec<JsonAlbum> = load_workspace_json(&json_path)?;

    for album in albums_temp.iter_mut() {
        if album.name == album_name {
            album.description = description.to_string();
        }
    }

    write_workspace_json(&json_path, albums_temp)?; // rewrite changes change ownership

    Ok(())
}

// TODO in future add the root path as arguement
pub fn add_album_to_json_file(album_name: String, album_description: String, album_date: SystemTime, state: &BackendState) -> Result<(), String>{
    let db_path = state
        .local_db_storage_path
        .as_ref()
        .ok_or("DB storage path not set".to_string())?;

    let json_path = db_path.join("workspaces.json");
    let mut albums_temp: Vec<JsonAlbum> = load_workspace_json(&json_path)?;

    albums_temp.push(JsonAlbum {
        name: album_name,
        description: album_description,
        date: album_date,
        root_path: "".to_string(),
    });
    write_workspace_json(&json_path, albums_temp)?;

    Ok(())
}

pub fn edit_album_name_json_file(album_name: String, new_album_name: String, state: &BackendState) -> Result<(), String> {
    
    Ok(())
}

#[tauri::command]
pub async fn delete_album_description(
    album_name: String,
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<(), String> {
    let state = state.inner().clone();
    tokio::task::spawn_blocking(move || delete_album_description_inner(&album_name, &state))
        .await
        .map_err(|e| e.to_string())?
}

pub fn delete_album_description_inner(
    album_name: &str,
    state: &BackendState,
) -> Result<(), String> {
    let db_path = state
        .local_db_storage_path
        .as_ref()
        .ok_or("DB storage path not set".to_string())?;

    let json_path = db_path.join("workspaces.json");
    let mut albums_temp: Vec<JsonAlbum> = load_workspace_json(&json_path)?;

    for album in albums_temp.iter_mut() {
        if album.name == album_name {
            album.description = "".to_string(); // empty string
        }
    }

    write_workspace_json(&json_path, albums_temp)?;

    Ok(())
}

// TODO these functions drive actiosn that can be done for selected items
// needs to do them based off the backend id actions
// #[tauri::command]
// pub async fn delete_id_action() -> Result<> {

// }


// pub async fn delete_id_action_batch() -> Result<> {

// }
