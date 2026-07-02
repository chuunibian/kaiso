use std::{collections::HashMap, path::PathBuf, time::SystemTime};

use crate::temp_models::{BackendState, Image, ImageMetadata};
use rusqlite::{params, Connection};

// This will load from sqlite file
// it will load everythign and ppulat the current backend cache
pub fn load_albumn(
    album_name: String,
    state: &BackendState,
) -> Result<(), String> {
    let temp_album_db_path = state
        .local_db_storage_path
        .as_ref()
        .unwrap()
        .join(format!("{}.db", album_name));

    let conn = Connection::open(&temp_album_db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, embedding, path, size, name FROM images")
        .map_err(|e| e.to_string())?;

    let row_iter = stmt.query_map([], |row| {
        let embedding_bytes: Vec<u8> = row.get(1)?;
        // let embedding_floats: Vec<f32> = bytemuck::cast_slice(&embedding_bytes).to_vec();\
        let embedding_floats: Vec<f32> = embedding_bytes
    .chunks_exact(4)
    .map(|chunk| f32::from_le_bytes(chunk.try_into().unwrap()))
    .collect();
        let path_str: String = row.get(2)?;

        Ok(Image {
            id: row.get(0)?,
            meta: ImageMetadata {
                date_created: SystemTime::UNIX_EPOCH,
                size: row.get(3)?,
                date_modified: SystemTime::UNIX_EPOCH,
            },
            embedding: Some(embedding_floats),
            name: row.get(4)?,
            path: PathBuf::from(path_str),
        })
    }).map_err(|e| e.to_string())?;

    let mut temp_cache: HashMap<u64, Image> = HashMap::new();

    for res in row_iter {
        let image = res.map_err(|e| e.to_string())?;
        temp_cache.insert(image.id, image);
    }

    state.set_active_cache(temp_cache)?;
    
    Ok(())
}

// Creates an albumn record
// this includes creating the db file from the images
// The BackendState cache should already be filled at this point
pub fn create_albumn(
    album_name: String,
    state: &BackendState,
) -> Result<(), String> {
    let temp_album_db_path = state
        .local_db_storage_path
        .as_ref()
        .unwrap()
        .join(format!("{}.db", album_name));

    let mut conn =
        Connection::open(&temp_album_db_path).map_err(|e| format!("Failed to open DB: {}", e))?;

    let wc_guard = state
        .workspace_cache
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;
    let album_cache = wc_guard
        .as_ref()
        .unwrap()
        .album
        .as_ref()
        .unwrap(); // later change unwrap to error handling

    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;  
         PRAGMA cache_size = 10000;",
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY,
            embedding BLOB NOT NULL,
            size INTEGER NOT NULL,
            path TEXT NOT NULL,
            name TEXT NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;

    let temp_transaction = conn.transaction().map_err(|e| e.to_string())?;

    {
        let mut stmt = temp_transaction
            .prepare(
                "INSERT OR REPLACE INTO images (id, embedding, size, path, name)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            )
            .map_err(|e| e.to_string())?;

        for (id, image) in album_cache.iter() {
            let empty_vec = Vec::new();
            let emb_slice = image.embedding.as_deref().unwrap_or(&empty_vec);
            let bytes: &[u8] = bytemuck::cast_slice(emb_slice);
            let path_str = image.path.to_string_lossy().to_string();
            stmt.execute(params![id, bytes, image.meta.size, path_str, image.name])
                .map_err(|e| e.to_string())?;
        }
    }

    temp_transaction.commit().map_err(|e| e.to_string())?;

    Ok(())
}

// // For a given albumn insert a singular row
pub fn insert_singular_image() {
}


// Create sync functions for when user wants to detect changes in an albumn
// and append to a workspace