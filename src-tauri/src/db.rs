use std::{collections::HashMap, path::PathBuf, time::{Duration, SystemTime}};

use crate::temp_models::{BackendState, Image, ImageMetadata, ImageDimensions};
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
        .prepare("SELECT id, embedding, path, size, name, created_at, modified_at, width, height FROM images")
        .map_err(|e| e.to_string())?;

    let row_iter = stmt.query_map([], |row| {
        let embedding_bytes: Vec<u8> = row.get(1)?;
        let embedding_floats: Vec<f32> = embedding_bytes
            .chunks_exact(4)
            .map(|chunk| f32::from_le_bytes(chunk.try_into().unwrap()))
            .collect();
        let path_str: String = row.get(2)?;

        let created_secs: u64 = row.get(5).unwrap_or(0);
        let modified_secs: u64 = row.get(6).unwrap_or(0);
        let width: u32 = row.get(7).unwrap_or(0);
        let height: u32 = row.get(8).unwrap_or(0);

        let date_created = SystemTime::UNIX_EPOCH + Duration::from_secs(created_secs);
        let date_modified = SystemTime::UNIX_EPOCH + Duration::from_secs(modified_secs);

        Ok(Image {
            id: row.get(0)?,
            meta: ImageMetadata {
                date_created,
                date_modified,
                size: row.get(3)?,
                dimensions: ImageDimensions { width, height },
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
            name TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT 0,
            modified_at INTEGER NOT NULL DEFAULT 0,
            width INTEGER NOT NULL DEFAULT 0,
            height INTEGER NOT NULL DEFAULT 0
        )",
        [],
    ).map_err(|e| e.to_string())?;

    let temp_transaction = conn.transaction().map_err(|e| e.to_string())?;

    {
        let mut stmt = temp_transaction
            .prepare(
                "INSERT OR REPLACE INTO images (id, embedding, size, path, name, created_at, modified_at, width, height)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            )
            .map_err(|e| e.to_string())?;

        for (id, image) in album_cache.iter() {
            let empty_vec = Vec::new();
            let emb_slice = image.embedding.as_deref().unwrap_or(&empty_vec);
            let bytes: &[u8] = bytemuck::cast_slice(emb_slice);
            let path_str = image.path.to_string_lossy().to_string();

            let created_secs = image
                .meta
                .date_created
                .duration_since(SystemTime::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);

            let modified_secs = image
                .meta
                .date_modified
                .duration_since(SystemTime::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);

            stmt.execute(params![
                id,
                bytes,
                image.meta.size,
                path_str,
                image.name,
                created_secs,
                modified_secs,
                image.meta.dimensions.width,
                image.meta.dimensions.height
            ])
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