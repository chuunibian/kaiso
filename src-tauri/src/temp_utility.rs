use crate::errors::AppError;

// add component to check thumbnails space usage
pub fn check_thumbnail_space() -> Result<(), AppError> {
    Ok(())
}

// returns total amount of db space used
pub fn check_db_space() -> Result<(), AppError> {
    Ok(())
}


pub fn get_local_db_storage_path() -> Result<(), AppError> {
    Ok(())
}

pub fn get_local_thumbnail_storage_path() -> Result<(), AppError> {
    Ok(())
}