// iterate through the backend state cache
// either use for loop or .map to push the results into the return vec
// not much clone needed
// use the simid for cosine
// then after you sort

// !! Note it is inefficeint to iterate over the hashmap it is much worse than a vec
// maybe we can change datastrucutres to isolate the embedding + id determine score and sort and map it back?
// overall iterating through a hashmap might be bad????
use crate::temp_models::{BackendState, ImageOrder};
use simsimd::SpatialSimilarity;

pub fn compute_sim(
    target_embedding: Vec<f32>,
    state: &BackendState,
) -> Result<Vec<ImageOrder>, String> {
    let mut ordering_ret = Vec::new();
    let cache_guard = state.workspace_cache.lock().map_err(|e| e.to_string())?;

    let Some(curr_album) = cache_guard.as_ref() else {
        return Err("No cache in backend".to_string());
    };

    let Some(cache) = curr_album.album.as_ref() else {
        return Err("No album cache in backend".to_string());
    };

    // for this part in the future need to add error checks
    for (id, image) in cache.iter() {
        // skip images that haven't been embedded yet
        let Some(emb) = image.embedding.as_deref() else {
            continue;
        };

        let dist = f32::cosine(&target_embedding, emb).expect("vectors must be of same length");
        let sim = 1.0 - dist as f32;
        ordering_ret.push(ImageOrder {
            id: *id,
            confidence_score: sim,
        });
    }
    // highest similarity first
    ordering_ret.sort_by(|a, b| {
        b.confidence_score
            .partial_cmp(&a.confidence_score)
            .unwrap()
    });

    Ok(ordering_ret)
}

