// iterate through the backend state cache
// either use for loop or .map to push the results into the return vec
// not much clone needed
// use the simid for cosine
// then after you sort

// !! Note it is inefficeint to iterate over the hashmap it is much worse than a vec
// maybe we can change datastrucutres to isolate the embedding + id determine score and sort and map it back?
// overall iterating through a hashmap might be bad????
use crate::errors::AppError;
use crate::temp_models::{BackendState, ImageOrder};
use simsimd::SpatialSimilarity;

pub fn compute_sim(
    target_embedding: Vec<f32>,
    state: &BackendState,
) -> Result<Vec<ImageOrder>, AppError> {
    let mut ordering_ret = Vec::new();
    let cache_guard = state.workspace_cache.lock()?;

    let Some(curr_album) = cache_guard.as_ref() else {
        return Err(AppError::CustomError("No cache in backend".to_string()));
    };

    let Some(cache) = curr_album.album.as_ref() else {
        return Err(AppError::CustomError("No album cache in backend".to_string()));
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


// So for blip rerank I believe there are 2 kinds for reranking top k
// one kind is to keep everythign within the k window unable to escape the k window when reranking
// the other is some sort of reranking math way that will acutally make things be heavily penalized if blip is low 
// penalized so hard that it might lower the score entirely making it out of the top k window and some other unchanged out of winodw
// score will replace it (this is like true score fusion) (naive way is to just sort everything again)
// I think for now I will make it not the true score fusion and make the changes only limited to that scoped top k window of the calculated clip scores
// this way we can treat the hyybrid scoring more naively 
// whatever the blip model outouts if it is just the philosophy that it is a number and how much it matches is quanitifed in an increasing way
// then the most navie way would just be addign that flat or statically to the clip scores within that window and then sorting that winodw to complete the reorderin 

// The output is raw logits of the itm head 
// the logits is 2 way classifiaction logit 
// index 0 is not matched and index 1 is matched
// can use diff sigmoid to find prob
// but since the i1 - i0 is monotic that can jus tbe used to add to the score to rerank (basically sort within that window leave the rest non touched) 

// For now this thing is not really used
// pub fn rerank_sim() -> Result<(), AppError> {

// }

