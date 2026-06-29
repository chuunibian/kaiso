use exif;
use serde::{Deserialize, Serialize};
use std::num::ParseIntError;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    // lib errors
    #[error("Rustqlite error: {0}")]
    RustqliteError(#[from] rusqlite::Error),

    #[error("File system error: {0}")]
    FileSystemError(#[from] std::io::Error),

    #[error("Date parse int error: {0}")]
    ParseIntError(#[from] ParseIntError),

    #[error("Tauri error: {0}")]
    TauriError(#[from] tauri::Error),

    #[error("ONNX Runtime error: {0}")]
    OrtError(#[from] ort::Error),

    #[error("Tokenizer error: {0}")]
    TokenizerError(#[from] tokenizers::Error),

    #[error("Image error: {0}")]
    ImageError(#[from] image::ImageError),

    #[error("Exif error: {0}")]
    ExifError(#[from] exif::Error),

    #[error("Image resize error: {0}")]
    ResizeError(#[from] fast_image_resize::ResizeError),

    #[error("Ndarray shape error: {0}")]
    NdarrayShapeError(#[from] ndarray::ShapeError),

    #[error("Tokio join error: {0}")]
    TokioJoinError(#[from] tokio::task::JoinError),

    #[error("Serde JSON error: {0}")]
    SerdeJsonError(#[from] serde_json::Error),

    // Manual errs
    #[error("General error: {0}")]
    GeneralLogicalErr(String),

    #[error("Database error: {0}")]
    DatabaseGeneralErr(String),

    #[error("App startup error: {0}")]
    StartupError(String),

    #[error("Custom error: {0}")]
    CustomError(String), // this is custom error so no #from thus need to manually throw instead of using ?

    #[error("Internal error: {0}")]
    AnyhowError(String),
}

// Obj for error sent to frontend
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackendError {
    pub user_error_string_desc: String,
    pub library_generated_error_desc: String,
    pub err_code: u32,
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        let resp = match self {
            AppError::GeneralLogicalErr(str) => BackendError {
                user_error_string_desc: str.to_string(),
                library_generated_error_desc: "N/A".to_string(),
                err_code: 1,
            },
            AppError::RustqliteError(e) => BackendError {
                user_error_string_desc: "N/A".to_string(),
                library_generated_error_desc: e.to_string(),
                err_code: 2,
            },
            AppError::FileSystemError(e) => BackendError {
                user_error_string_desc: "N/A".to_string(),
                library_generated_error_desc: e.to_string(),
                err_code: 3,
            },
            AppError::StartupError(str) => BackendError {
                user_error_string_desc: str.to_string(),
                library_generated_error_desc: "N/A".to_string(),
                err_code: 4,
            },
            AppError::CustomError(str) => BackendError {
                user_error_string_desc: str.to_string(),
                library_generated_error_desc: "N/A".to_string(),
                err_code: 5,
            },
            AppError::DatabaseGeneralErr(str) => BackendError {
                user_error_string_desc: str.to_string(),
                library_generated_error_desc: "N/A".to_string(),
                err_code: 6,
            },
            AppError::ParseIntError(e) => BackendError {
                user_error_string_desc: "N/A".to_string(),
                library_generated_error_desc: e.to_string(),
                err_code: 8,
            },
            AppError::TauriError(e) => BackendError {
                user_error_string_desc: "N/A".to_string(),
                library_generated_error_desc: e.to_string(),
                err_code: 9,
            },
            AppError::OrtError(e) => BackendError {
                user_error_string_desc: "N/A".to_string(),
                library_generated_error_desc: e.to_string(),
                err_code: 10,
            },
            AppError::TokenizerError(e) => BackendError {
                user_error_string_desc: "N/A".to_string(),
                library_generated_error_desc: e.to_string(),
                err_code: 11,
            },
            AppError::ImageError(e) => BackendError {
                user_error_string_desc: "N/A".to_string(),
                library_generated_error_desc: e.to_string(),
                err_code: 12,
            },
            AppError::ExifError(e) => BackendError {
                user_error_string_desc: "N/A".to_string(),
                library_generated_error_desc: e.to_string(),
                err_code: 13,
            },
            AppError::ResizeError(e) => BackendError {
                user_error_string_desc: "N/A".to_string(),
                library_generated_error_desc: e.to_string(),
                err_code: 14,
            },
            AppError::NdarrayShapeError(e) => BackendError {
                user_error_string_desc: "N/A".to_string(),
                library_generated_error_desc: e.to_string(),
                err_code: 15,
            },
            AppError::TokioJoinError(e) => BackendError {
                user_error_string_desc: "N/A".to_string(),
                library_generated_error_desc: e.to_string(),
                err_code: 16,
            },
            AppError::SerdeJsonError(e) => BackendError {
                user_error_string_desc: "N/A".to_string(),
                library_generated_error_desc: e.to_string(),
                err_code: 17,
            },
            AppError::AnyhowError(str) => BackendError {
                user_error_string_desc: str.to_string(),
                library_generated_error_desc: "N/A".to_string(),
                err_code: 18,
            },
        };

        return resp.serialize(serializer);
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::AnyhowError(err.to_string())
    }
}
