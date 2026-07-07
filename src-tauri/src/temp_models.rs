use serde::{Deserialize, Serialize, Serializer};
use std::cmp::Reverse;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::SystemTime;

use crate::embedding_temp::{AppTokenizer, ClipTextModel, ClipVisionModel};

// BackendState is managed by Tauri as Arc<BackendState> (see lib.rs)
// This lets blocking threads clone the Arc and call methods on BackendState directly.
// Arc answers "who owns it?" — everyone who has a clone, freed when the LAST one drops.
// Mutex answers "who can use it?" — only one thread at a time.

// Tauri state struct
pub struct BackendState {
    pub workspace_cache: Mutex<Option<CurrentAlbum>>, // Important, represents the backend cache of current queried album

    pub local_appdata_path: Option<PathBuf>, // root of appdata store
    pub local_thumbnail_storage_path: Option<PathBuf>,
    pub local_db_storage_path: Option<PathBuf>,
    pub resource_path: Option<PathBuf>, // path to bundled resources dir (models, tokenizer)

    pub current_workspace: Mutex<String>, // user picked workspace set it so backend can know

    pub vision_model: Mutex<Option<ClipVisionModel>>,
    pub text_model: Mutex<Option<ClipTextModel>>,
    pub tokenizer: Mutex<Option<AppTokenizer>>,
}

impl BackendState {
    // Can replace or place a cache to the state
    pub fn set_active_cache(&self, cache: HashMap<u64, Image>) -> Result<(), String> {
        let mut wc = self.workspace_cache.lock().map_err(|e| e.to_string())?;
        *wc = Some(CurrentAlbum {
            album: Some(cache),
            flag: true,
        });

        Ok(())
    }

    pub fn set_current_workspace(&self, workspace: String) -> Result<(), String> {
        let mut cw = self.current_workspace.lock().map_err(|e| e.to_string())?;
        *cw = workspace;
        Ok(())
    }

    pub fn create_tokenizer(&self) -> Result<(), String> {
        let res = self.resource_path.as_ref().ok_or("Resource path not set".to_string())?;
        let tok_path = res.join("models").join("tokenizer.json");
        let mut tok = self.tokenizer.lock().map_err(|e| e.to_string())?;
        if tok.is_none() {
            *tok = Some(
                AppTokenizer::new(tok_path.to_str().ok_or("Invalid tokenizer path")?).map_err(|e| e.to_string())?,
            );
        }
        Ok(())
    }

    pub fn delete_tokenizer(&self) -> Result<(), String> {
        let mut tok = self.tokenizer.lock().map_err(|e| e.to_string())?;
        *tok = None;
        Ok(())
    }

    pub fn create_vision_model(&self) -> Result<(), String> {
        let res = self.resource_path.as_ref().ok_or("Resource path not set".to_string())?;
        let model_path = res.join("models").join("vision_model.onnx");
        let mut vm = self.vision_model.lock().map_err(|e| e.to_string())?;
        if vm.is_none() {
            *vm = Some(
                ClipVisionModel::new(model_path.to_str().ok_or("Invalid vision model path")?)
                    .map_err(|e| e.to_string())?,
            );
        };
        Ok(())
    }

    pub fn create_text_model(&self) -> Result<(), String> {
        let res = self.resource_path.as_ref().ok_or("Resource path not set".to_string())?;
        let model_path = res.join("models").join("text_model.onnx");
        let mut tm = self.text_model.lock().map_err(|e| e.to_string())?;
        if tm.is_none() {
            *tm = Some(
                ClipTextModel::new(model_path.to_str().ok_or("Invalid text model path")?)
                    .map_err(|e| e.to_string())?,
            );
        };
        Ok(())
    }

    pub fn delete_vision_model(&self) -> Result<(), String> {
        let mut tm = self.vision_model.lock().map_err(|e| e.to_string())?;
        *tm = None;
        Ok(())
    }

    pub fn delete_text_model(&self) -> Result<(), String> {
        let mut tm = self.text_model.lock().map_err(|e| e.to_string())?;
        *tm = None;
        Ok(())
    }
}

// reprents the backend cache object for an albumn
// should be the backend representation of the rows of the stuff stord in sqlite
pub struct CurrentAlbum {
    // The backend state should have this as an item
    pub album: Option<HashMap<u64, Image>>,
    // flag to determine if currently filled or not
    pub flag: bool,
}

// Backend struct for an image row
pub struct Image {
    pub id: u64, // uneeded technically
    pub meta: ImageMetadata,
    pub embedding: Option<Vec<f32>>,
    pub name: String,
    pub path: PathBuf,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageMetadata {
    pub date_created: SystemTime,
    pub size: u64,
    pub date_modified: SystemTime,
}

// Specifically for Image stuf to send to FE when lazy loaded
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageView {
    pub id: u64,
    pub meta: ImageMetadata,
    pub name: String,
    pub path: PathBuf,
    // thumbnail path constructed in frontend
    // confidence score will be sent via ImageOrder
}

// For when frontend queries it sends a list of ImageOrder to rechange the order
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageOrder {
    pub id: u64,
    pub confidence_score: f32,
}

// Used for going into db file and going out of db file
pub struct ImageDBRecord {
    pub id: u64,
    pub embedding: Vec<f32>,
    pub paths: Vec<String>,
    pub size: u64,
    pub name: String,
}

// utility use
impl From<ImageDBRecord> for Image {
    fn from(r: ImageDBRecord) -> Self {
        Image {
            id: r.id,
            meta: ImageMetadata {
                date_created: SystemTime::UNIX_EPOCH, // not stored yet
                size: r.size,
                date_modified: SystemTime::UNIX_EPOCH,
            },
            embedding: Some(r.embedding),
            name: r.name,
            path: PathBuf::from(r.paths.into_iter().next().unwrap_or_default()),
        }
    }
}

// Specifically for sending info of workspace to frontend
// So scan storage folders and return them
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AlbumView {
    pub name: String,
    pub description: String,
    pub path: PathBuf,
    pub date: SystemTime,
}

// just for putting in and out of json file
#[derive(Serialize, Deserialize)]
pub struct JsonAlbum {
    pub name: String,
    pub description: String,
    pub date: SystemTime,
    pub root_path: String,
}

#[derive(Serialize, Clone)]
struct LogEntry {
    level: LogLevel,
    message: String,
    timestamp: i64,
    context: Option<String>,
}

#[derive(Serialize, Clone)]
pub enum LogLevel {
    INFO,
    WARN,
    ERROR,
}

#[derive(Clone, serde::Serialize)]
pub struct Progress {
    pub done: usize,
    pub total: usize,
}
