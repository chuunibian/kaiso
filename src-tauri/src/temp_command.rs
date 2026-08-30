use crate::errors::AppError;
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
pub async fn get_default_ids(state: tauri::State<'_, Arc<BackendState>>) -> Result<Vec<ImageOrder>, AppError> {
    let temp = get_default_ids_inner(state.inner())?;
    Ok(temp)
}

pub fn get_default_ids_inner(state: &BackendState) -> Result<Vec<ImageOrder>, AppError>{
    let cache_guard = state.workspace_cache.lock()?;
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
) -> Result<ImageView, AppError> {
    let temp = lazy_load_data_single_inner(id, &state).await?;

    Ok(temp)
}

pub async fn lazy_load_data_single_inner(
    id: u64,
    state: &BackendState,
) -> Result<ImageView, AppError> {
    let cache_guard = state.workspace_cache.lock()?;

    let current_album = cache_guard.as_ref().ok_or_else(|| AppError::CustomError("Err".to_string()))?;
    let cache = current_album.album.as_ref().ok_or_else(|| AppError::CustomError("Err".to_string()))?;

    let temp_image = cache
        .get(&id)
        .ok_or_else(|| AppError::CustomError("Unable to find id in cache".to_string()))?;
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
) -> Result<Vec<ImageView>, AppError> {
    let temp = lazy_load_data_inner(ids, state.inner()).await?;

    Ok(temp)
}

// it might be necessary for this to be in blocking but maybe not
// since it only reads from the cache
pub async fn lazy_load_data_inner(
    ids: Vec<u64>,
    state: &BackendState,
) -> Result<Vec<ImageView>, AppError> {
    // aquire lock and get the cache from BackendState
    let cache_guard = state.workspace_cache.lock()?;
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
) -> Result<String, AppError> {
    let target_owned = target.to_string();
    let state = state.inner().clone();
    let app = app.clone();

    tokio::task::spawn_blocking(move || create_workspace_inner(&target_owned, album_name, album_description, &state, &app))
        .await??;

    Ok("done".to_string())
}

fn create_workspace_inner(
    target: &str,
    album_name: String,
    album_description: String,
    state: &BackendState,
    app: &AppHandle,
) -> Result<(), AppError> {

    let path: &Path = Path::new(target);
    let thumbnail_path = state
        .local_thumbnail_storage_path
        .as_ref()
        .ok_or_else(|| AppError::CustomError("Temp error".to_string()))?;

    emit_utility(app, "create-workspace", "Scanning for valid image paths...")?;
    let valid_image_paths: Vec<PathBuf> = find_image_paths(path);
    let id_counter = AtomicI64::new(0); // each workspace creation needs new auto inc id counter

    emit_utility(app, "create-workspace", "Preprocessing images...")?;
    let preproc_start = std::time::Instant::now();
    create_thumbnail_dir(&thumbnail_path, &album_name)?; // create the thumbnail dir for new workspace
    let prepared = preprocess_album(valid_image_paths, thumbnail_path, &album_name, &id_counter)?;
    let preproc_duration = preproc_start.elapsed();
    let (images, tensors) = prepared.into_iter().unzip();

    state.create_vision_model()?;

    emit_utility(app, "create-workspace", "Embedding images...")?;
    let vm_guard = state.vision_model.lock()?;
    let inference_start = std::time::Instant::now();
    let embeddings: Vec<Vec<f32>> = vm_guard.as_ref().ok_or_else(|| AppError::CustomError("Vision model not loaded".to_string()))?.embed_batch_list_with_progress(tensors, app)?;
    let inference_duration = inference_start.elapsed();

    // Drop lock release vm and then delete vm as not needed
    drop(vm_guard);
    state.delete_vision_model()?;

    // Merge uncomplete Image with embeddings to complete the list of Img
    let cache = merge_image_and_embeddings(images, embeddings)?;

    // set the active cache to newly created map
    state.set_active_cache(cache)?;

    // call db functions for this create album
    // Reads from the BE cache
    emit_utility(app, "create-workspace", "Creating workspace in database...")?;
    create_albumn(album_name.clone(), state)?;

    // create the album in the json file
    emit_utility(app, "create-workspace", "Finalizing workspace...")?;
    add_album_to_json_file(album_name.clone(), album_description, target.to_string(), std::time::SystemTime::now(), state)?;

    Ok(())
}

pub fn emit_utility<T: Serialize + Clone>(
    app: &AppHandle,
    event_name: &str,
    payload: T,
) -> Result<(), AppError> {
    app.emit(event_name, payload)?;
    Ok(())
}

// Should call with teh workspace name and then load from sqlite
#[tauri::command]
pub async fn load_workspace(
    album_name: String,
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<(), AppError> {
    // similar process but would need to call a function to load from sqlite file
    // pass down the specific workspace to choose
    // that function will then load and cache from backend
    let state = state.inner().clone(); // Arc clone

    tokio::task::spawn_blocking(move || load_workspace_inner(album_name, &state))
    .await??;
    Ok(())
}

// TODO this function needs to also maybe give a default list of ordered ids for when the user did not query but still want ot show images
fn load_workspace_inner(album_name: String, state: &BackendState) -> Result<(), AppError> {
    // Similar to create_workspace_inner
    // just load from sqlite to the cache and then ret ok when process is done

    load_albumn(album_name, state)?;

    Ok(())
}


#[tauri::command]
pub async fn delete_workspace(
    album_name: String,
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<(), AppError> {
    let state = state.inner().clone();
    tokio::task::spawn_blocking(move || delete_workspace_inner(&album_name, &state))
        .await??;
    Ok(())
}

fn delete_workspace_inner(album_name: &str, state: &BackendState) -> Result<(), AppError> {
    clean_workspace_db_file(album_name, state)?;
    clean_workspace_thumbnail(album_name, state)?;
    remove_workspace_json(album_name, state)?;

    Ok(())
}

pub fn remove_workspace_json(album_name: &str, state: &BackendState) -> Result<(), AppError> {
    let db_path = state
        .local_db_storage_path
        .as_ref()
        .ok_or_else(|| AppError::CustomError("DB storage path not set".to_string()))?;

    let json_path = db_path.join("workspaces.json");
    let albums_temp: Vec<JsonAlbum> = load_workspace_json(&json_path)?;

    let mut updated_albums: Vec<JsonAlbum> = Vec::new();
    for album in albums_temp {
        if album.name != album_name {
            updated_albums.push(album);
        }
    }

    write_workspace_json(&json_path, updated_albums)?;

    Ok(())
}


fn clean_workspace_db_file(album_name: &str, state: &BackendState) -> Result<(), AppError> {
    let db_file = state
        .local_db_storage_path
        .as_ref()
        .ok_or_else(|| AppError::CustomError("DB storage path not set".to_string()))?
        .join(format!("{}.db", album_name));

    if db_file.exists() {
        std::fs::remove_file(&db_file)?;
    }

    Ok(())
}

fn clean_workspace_thumbnail(album_name: &str, state: &BackendState) -> Result<(), AppError> {
    let thumbnail_path = state
        .local_thumbnail_storage_path
        .as_ref()
        .ok_or_else(|| AppError::CustomError("Thumbnail storage path not set".to_string()))?;

    let thumbnail_folder = thumbnail_path.join(format!("{}", album_name));
    if thumbnail_folder.exists() {
        std::fs::remove_dir_all(&thumbnail_folder)?;
    }

    Ok(())
}

// This one will just be text based query
#[tauri::command]
pub async fn process_query(
    user_query: String,
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<Vec<ImageOrder>, AppError> {
    let state = state.inner().clone();

    tokio::task::spawn_blocking(move || process_query_inner(user_query, &state))
        .await?
}

pub fn process_query_inner(
    user_query: String,
    state: &BackendState,
) -> Result<Vec<ImageOrder>, AppError> {
    state.create_text_model()?;
    state.create_tokenizer()?;

    let tokenizer_guard = state.tokenizer.lock()?;
    let tokenizer = tokenizer_guard
        .as_ref()
        .ok_or_else(|| AppError::CustomError("Tokenizer not initialized".to_string()))?;

    let tm_guard = state.text_model.lock()?;
    let tm = tm_guard
        .as_ref()
        .ok_or_else(|| AppError::CustomError("Text model not initialized".to_string()))?;

    let (user_embedding_tokenized, mask) = tokenizer.tokenize_input(&user_query)?;
    let user_embedding = tm.embed_single(user_embedding_tokenized, mask)?;

    let ret = compute_sim(user_embedding, state)?;

    Ok(ret)
}

// For finding images similar to given image
#[tauri::command]
pub async fn process_query_image() -> Result<(), AppError> {
    Ok(())
}

// goes into db file place and gets the workspace + descriptions return to user
// Will return an ordered vec of albumview ready for the frontendd to load
#[tauri::command]
pub async fn find_workspaces(
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<Vec<AlbumView>, AppError> {
    let state = state.inner().clone();
    tokio::task::spawn_blocking(move || find_workspaces_inner(&state))
        .await?
}

fn find_workspaces_inner(state: &BackendState) -> Result<Vec<AlbumView>, AppError> {
    let db_path = state
        .local_db_storage_path
        .as_ref()
        .ok_or_else(|| AppError::CustomError("DB storage path not set".to_string()))?;

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
fn load_workspace_json(path: &Path) -> Result<Vec<JsonAlbum>, AppError> {
    let contents = fs::read_to_string(path)?;
    let trimmed = contents.trim();
    if trimmed == "{}" || trimmed == "[]" || trimmed.is_empty() {
        return Ok(Vec::new());
    }
    let albums: Vec<JsonAlbum> = serde_json::from_str(&contents)?;

    Ok(albums)
}

// Writes the json file utility use
fn write_workspace_json(path: &Path, albums: Vec<JsonAlbum>) -> Result<(), AppError> {
    let contents = serde_json::to_string(&albums)?;
    fs::write(path, contents)?;

    Ok(())
}

// add or edit an albums description
#[tauri::command]
pub async fn add_album_description(
    album_name: String,
    description: String,
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<(), AppError> {
    let state = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        add_album_description_inner(&album_name, &description, &state)
    })
    .await?
}

pub fn add_album_description_inner(
    album_name: &str,
    description: &str,
    state: &BackendState,
) -> Result<(), AppError> {
    let db_path = state
        .local_db_storage_path
        .as_ref()
        .ok_or_else(|| AppError::CustomError("DB storage path not set".to_string()))?;

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

// TODO in future always add as sorted insertion to keep it sorted via date or name or soemthign else
// although not neeeded
pub fn add_album_to_json_file(album_name: String, album_description: String, root_path: String, album_date: SystemTime, state: &BackendState) -> Result<(), AppError>{
    let db_path = state
        .local_db_storage_path
        .as_ref()
        .ok_or_else(|| AppError::CustomError("DB storage path not set".to_string()))?;

    let json_path = db_path.join("workspaces.json");
    let mut albums_temp: Vec<JsonAlbum> = load_workspace_json(&json_path)?;

    albums_temp.push(JsonAlbum {
        name: album_name,
        description: album_description,
        date: album_date,
        root_path,
    });
    write_workspace_json(&json_path, albums_temp)?;

    Ok(())
}

// TODO
// change the album name in the json file utility func
pub fn edit_album_name_json_file(album_name: String, new_album_name: String, state: &BackendState) -> Result<(), AppError> {
    
    Ok(())
}

#[tauri::command]
pub async fn delete_album_description(
    album_name: String,
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<(), AppError> {
    let state = state.inner().clone();
    tokio::task::spawn_blocking(move || delete_album_description_inner(&album_name, &state))
        .await?
}

// deletes an album description only
pub fn delete_album_description_inner(
    album_name: &str,
    state: &BackendState,
) -> Result<(), AppError> {
    let db_path = state
        .local_db_storage_path
        .as_ref()
        .ok_or_else(|| AppError::CustomError("DB storage path not set".to_string()))?;

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

// basically will change album name in db file, thumbnail file, 
// Add this in later !!

// #[tauri::command]
// pub async fn change_album_name() -> Result<(), String> {

// }

// fn change_album_name_inner() -> Result<> {

// }

// fn change_db_file_name() -> Result<()> {
    
// }

// fn change_thumbnail_folder_name() -> Result<()> {
    
// }

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// TODO these functions drive actiosn that can be done for selected items
// needs to do them based off the backend id actions
// #[tauri::command]
// pub async fn delete_id_action() -> Result<> {

// }


// pub async fn delete_id_action_batch() -> Result<> {

// }
