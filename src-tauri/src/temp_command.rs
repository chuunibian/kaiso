// claude diff test
use crate::errors::AppError;
use crate::temp_models::{JsonAlbum, Progress};
use ndarray::Array4;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicI64;
use std::sync::Arc;
use std::time::SystemTime;
use tauri::{AppHandle, Emitter};


// Temp CLIP stuff

// This function will be a function that frontend can call to basically pass in ids of img
// to basically run the blips on score it and it returns map of list to blip scoring back to frontend in
// case it needed to use it
// these just return the clip score 
#[tauri::command]
pub async fn rerank_batch_image( ids: Vec<u64>, state: tauri::State<'_, Arc<BackendState>>) -> Result<Vec<f32>, AppError> {

    todo!()

}

fn rerank_batch_image_inner(ids: Vec<u64>, state: &BackendState) -> Result<Vec<f32>, AppError> {
   
    todo!()
}

// Same as above but this is just for single id doing the same proces, return a pair
#[tauri::command]
pub async fn rerank_single_image( id: u64, state: tauri::State<'_, Arc<BackendState>>) -> Result<f32, AppError> {

    todo!()

}

fn rerank_single_image_inner(id: u64, state: &BackendState) -> Result<f32, AppError> {

       todo!()

}


// Takes in view of vec of image order (ids)
// returns ids mapped to its filepath as given from cache 
// utility function

pub fn get_file_paths_from_ids_from_cache(ids: &Vec<ImageOrder>, state: &BackendState) -> Result<Vec<(u64, PathBuf)>, AppError> {
    let cache_guard = state.workspace_cache.lock()?;

    let current_album = cache_guard.as_ref().ok_or_else(|| AppError::CustomError("Workspace Cache not set in backend".to_string()))?;
    let cache = current_album.album.as_ref().ok_or_else(|| AppError::CustomError("Workspace Cache not set in backend".to_string()))?;

    let file_paths: Vec<(u64, PathBuf)> = ids
        .into_iter()
        .filter_map(|pair| {
            // get the path from the cache keyed by the id
            cache.get(&pair.id).map(|image| (pair.id, image.path.clone())) // return the id + path from closure
        })
        .collect();

    Ok(file_paths)
}

// Current one using for MVP
// FE will call 2 stages on FE side first the clip query side and 

// after callign process query it will call this
// this function needs to receive a list of ids that frontend wants to reorder (since BE doesn tknow the ordering for each query since it never saves it)
// it also needs to get score assoc with id in order for backend to do "all the work" and only have FE just change that block ordering
// so this can either return a full list or list of ordered pairs that frontend requested.
// I think the return sorted list of ordered pairs is better and basically just let the frontend merge it back in 

#[tauri::command]
pub async fn hybrid_process_query_decoupled(reranking_query: String, rerank_pairs: Vec<ImageOrder>, state: tauri::State<'_, Arc<BackendState>>, app: tauri::AppHandle) -> Result<Vec<ImageOrder>, AppError> {
    let state = state.inner().clone();
    let app = app.clone();

    tokio::task::spawn_blocking(move || hybrid_process_query_decoupled_inner(reranking_query, rerank_pairs, &state, &app))
    .await?
}


fn hybrid_process_query_decoupled_inner(reranking_query: String, rerank_pairs: Vec<ImageOrder>, state: &BackendState, app: &AppHandle) -> Result<Vec<ImageOrder>, AppError> {
    // This function psuedo process is:
    // create BLIP Models
    // for each imageorder in vec
    // do the preprocessing
    // run it through the blip vision batch
    // get those results run it throuhg the blip itm head to get list of those scores
    // zip and iterate through the vec imord and the scores and add it to it
    // sort the vec by scores which should be changed
    // return that new to FE to merge in
    state.create_blip_vision_model()?;
    state.create_blip_itm_model()?;
    state.create_blip_tokenizer()?;

    // tokenize the input
    // get the mask
    let blip_tok_guard = state.BLIPtokenizer.lock()?;
    let blip_tok = blip_tok_guard.as_ref().ok_or_else(|| AppError::CustomError("BLIP Tokenizer not initialized".to_string()))?;
    let (tokenized, mask) = blip_tok.tokenize_input(&reranking_query)?;

    let file_paths: Vec<(u64, PathBuf)> = get_file_paths_from_ids_from_cache(&rerank_pairs, state)?;
    let tensors: Vec<(u64, Array4<f32>)> = preprocess_images_blip(file_paths)?;

    let blip_vm_guard = state.BLIPvision_model.lock()?;
    let vision_embeddings = blip_vm_guard
        .as_ref()
        .ok_or_else(|| AppError::CustomError("BLIP Vision Model not loaded".to_string()))?
        .encode_batch_with_progress(tensors, app)?;

    let blip_itmh_guard = state.BLIPitm_model.lock()?;
    let scores = blip_itmh_guard
        .as_ref()
        .ok_or_else(|| AppError::CustomError("BLIP ITM Model not loaded".to_string()))?
        .itm_match_batch(vision_embeddings, tokenized, mask)?;

    let score_deltas: HashMap<u64, f32> = scores
        .into_iter()
        .map(|(id, (no_match, matched))| (id, matched - no_match))
        .collect();

    let mut reranked: Vec<ImageOrder> = rerank_pairs;
    for pair in reranked.iter_mut() {
        if let Some(delta) = score_deltas.get(&pair.id) {
            pair.confidence_score = pair.confidence_score + delta;
        }
    }

    reranked.sort_by(|a,b| {
        b.confidence_score.partial_cmp(&a.confidence_score).unwrap()
    });

    Ok(reranked)
}


// process query but this will run the blip reranker
// this is non streaming so frontend will pause while it does the top n reranking to rereank top n
// this will call upon blip usage stuff
// This is able to be done since only returns the final in non staged matter 
// But user will be blocked when they input a search
// keep for the s&giggles
// #[tauri::command]
// pub async fn hybrid_process_query() -> Result<(), AppError> {

// }

// basically returns clip for the time being and then after all blip rerank done it reorders once
// so basically this func needs to return 2 things at diff times might not be good
// since one backend function is ret multiple thigns over time this eneds to be a channel 
// so this is diff
// NOT DO FOR NOW
// #[tauri::command]
// pub async fn hybrid_process_query_staged() -> Result<(), AppError> {

// }


// as blip goes through it reranks in a stream,ing way so updating frequently
// NOT DO FOR NOW
// #[tauri::command]
// pub async fn hybrid_process_query_streamed() -> Result<(), AppError> {

// }


use crate::{
    cosine_sim::compute_sim,
    db::{create_albumn, load_albumn},
    preprocessing::{find_image_paths, merge_image_and_embeddings, preprocess_album, preprocess_album_chunked, preprocess_images_blip, valid_path_chunking, create_thumbnail_dir},
    temp_models::{AlbumView, BackendState, Image, ImageOrder, ImageView},
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

// TODO
// in teh future do not have the .unzip()
// and the 2 diff accumulating vecs and this avoid needing to merge them back in the end for the caller
// just change downstream function signatures to make sure it is more in sync 
fn chunked_preprocess_indexing_wrapper(
    app: &AppHandle,
    chunked_paths: Vec<Vec<PathBuf>>,
    thumbnail_path: &PathBuf,
    album_name: &String,
    autoinc_counter: &AtomicI64,
    state: &BackendState,
) -> Result<(Vec<Image>, Vec<Vec<f32>>), AppError> {
    let mut embeddings: Vec<Vec<f32>> = Vec::new();
    let mut images_aggregation: Vec<Image> = Vec::new();
    let mut chunk_counter = 1;


    for chunk in chunked_paths {

        // Reset progress UI for the new chunk
        app.emit("embed-progress", Progress { done: 0, total: 0 })?;

        emit_utility(app, "create-workspace", format!("Preprocessing Chunk {chunk_counter}..."))?;
        let prepared = preprocess_album_chunked(chunk, thumbnail_path, album_name, autoinc_counter)?;
        let (images, tensors): (Vec<Image>, Vec<ndarray::Array4<f32>>) = prepared.into_iter().unzip();

        emit_utility(app, "create-workspace", format!("Embedding Chunk {chunk_counter}..."))?;
        let vm_guard = state.vision_model.lock()?;
        let temp: Vec<Vec<f32>> = vm_guard
            .as_ref()
            .ok_or_else(|| AppError::CustomError("Vision model not loaded".to_string()))?
            .embed_batch_list_with_progress(tensors, app)?;

        embeddings.extend(temp);
        images_aggregation.extend(images);
        chunk_counter += 1;
    }

    Ok((images_aggregation, embeddings))
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
        .ok_or_else(|| AppError::CustomError("Thumbnail path not set".to_string()))?;

    emit_utility(app, "create-workspace", "Scanning for valid image paths...")?;
    let valid_image_paths: Vec<PathBuf> = find_image_paths(path);
    let id_counter = AtomicI64::new(0);

    state.create_vision_model()?;
    create_thumbnail_dir(&thumbnail_path, &album_name)?;

    let chunked_paths: Vec<Vec<PathBuf>> = valid_path_chunking(valid_image_paths)?;

    let (images, embeddings) = chunked_preprocess_indexing_wrapper(
        app,
        chunked_paths,
        &thumbnail_path,
        &album_name,
        &id_counter,
        state,
    )?;

    state.delete_vision_model()?;

    let cache = merge_image_and_embeddings(images, embeddings)?;

    state.set_active_cache(cache)?;

    emit_utility(app, "create-workspace", "Creating workspace in database...")?;
    create_albumn(album_name.clone(), state)?;

    emit_utility(app, "create-workspace", "Finalizing workspace...")?;
    add_album_to_json_file(album_name.clone(), album_description, target.to_string(), std::time::SystemTime::now(), state)?;

    Ok(())
}

// the previous version of create workspace that was nonchunked
fn create_workspace_inner_nonchunked(
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
        .ok_or_else(|| AppError::CustomError("Thumbnail storage path not set".to_string()))?;

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
    let embeddings: Vec<Vec<f32>> = vm_guard.as_ref().unwrap().embed_batch_list_with_progress(tensors, app)?;
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

// TODO in the future use to determine if chunking process is needed 
// and will also return in the future the recommended chunk size if chunking is needed
// pub fn detect_chunking() -> Result<(), AppError> {

// }

// TODO for this function in the future will determine all relevant perforamcne metrics at one point in time
// used for profiling performance for indexing and etc
// new models structs should be crated for this
// pub fn sys_performance_metrics() -> Result<(), AppError> {

// }

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

fn load_workspace_inner(album_name: String, state: &BackendState) -> Result<(), AppError> {
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
    state.create_clip_tokenizer()?;

    let tokenizer_guard = state.CLIPtokenizer.lock()?;
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

// change the album name in the json file utility func
pub fn edit_album_name_json_file(album_name: &str, new_album_name: &str, state: &BackendState) -> Result<(), AppError> {
    let db_path = state
        .local_db_storage_path
        .as_ref()
        .ok_or_else(|| AppError::CustomError("DB storage path not set".to_string()))?;

    let json_path = db_path.join("workspaces.json");
    let mut albums_temp: Vec<JsonAlbum> = load_workspace_json(&json_path)?;

    for album in albums_temp.iter_mut() {
        if album.name == album_name {
            album.name = new_album_name.to_string();
        }
    }

    write_workspace_json(&json_path, albums_temp)?;

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

// basically will change album name in db file, thumbnail file, and the json record
#[tauri::command]
pub async fn change_album_name(
    album_name: String,
    new_album_name: String,
    state: tauri::State<'_, Arc<BackendState>>,
) -> Result<(), AppError> {
    let state = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        change_album_name_inner(&album_name, &new_album_name, &state)
    })
    .await?
}

fn change_album_name_inner(
    album_name: &str,
    new_album_name: &str,
    state: &BackendState,
) -> Result<(), AppError> {
    change_db_file_name(album_name, new_album_name, state)?;
    change_thumbnail_folder_name(album_name, new_album_name, state)?;
    edit_album_name_json_file(album_name, new_album_name, state)?;

    Ok(())
}

fn change_db_file_name(
    album_name: &str,
    new_album_name: &str,
    state: &BackendState,
) -> Result<(), AppError> {
    let db_path = state
        .local_db_storage_path
        .as_ref()
        .ok_or_else(|| AppError::CustomError("DB storage path not set".to_string()))?;

    let db_file = db_path.join(format!("{}.db", album_name));
    let new_db_file = db_path.join(format!("{}.db", new_album_name));

    if db_file.exists() {
        std::fs::rename(&db_file, &new_db_file)?;
    }

    Ok(())
}

fn change_thumbnail_folder_name(
    album_name: &str,
    new_album_name: &str,
    state: &BackendState,
) -> Result<(), AppError> {
    let thumbnail_path = state
        .local_thumbnail_storage_path
        .as_ref()
        .ok_or_else(|| AppError::CustomError("Thumbnail storage path not set".to_string()))?;

    let thumbnail_folder = thumbnail_path.join(format!("{}", album_name));
    let new_thumbnail_folder = thumbnail_path.join(format!("{}", new_album_name));

    if thumbnail_folder.exists() {
        std::fs::rename(&thumbnail_folder, &new_thumbnail_folder)?;
    }

    Ok(())
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// TODO these functions drive actiosn that can be done for selected items
// needs to do them based off the backend id actions
// #[tauri::command]
// pub async fn delete_id_action() -> Result<> {

// }


// pub async fn delete_id_action_batch() -> Result<> {

// }
