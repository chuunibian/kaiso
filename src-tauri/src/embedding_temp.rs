use ort::session::Session;
use std::sync::Mutex;
use tauri::AppHandle;
use crate::errors::AppError;
use crate::temp_command::emit_utility;
use crate::temp_models::Progress;


use ndarray::Array4;
use ort::{inputs, session::builder::GraphOptimizationLevel, value::TensorRef};

use tokenizers::Tokenizer;
use tokenizers::{PaddingParams, PaddingStrategy, TruncationParams};

// CLIP related stuff //
pub struct ClipVisionModel {
    model_path: String,
    model: Option<Mutex<Session>>,
}

pub struct ClipTextModel {
    model_path: String,
    model: Option<Mutex<Session>>,
}
pub struct CLIPTokenizer {
    tokenizer: Option<Tokenizer>,
    tokenizer_path: String,
}

pub struct CLIPNumericalDefaults {
    CLIP_SIZE: u32,
    CLIP_MEAN: [f32; 3],
    CLIP_STD: [f32; 3],
}

impl Default for CLIPNumericalDefaults {
    fn default() -> Self {
        Self {
            CLIP_SIZE: 224,
            CLIP_MEAN: [0.48145466, 0.4578275, 0.40821073],
            CLIP_STD: [0.26862954, 0.26130258, 0.27577711],
        }
    }
}

// BLIP related stuff //

pub struct BLIPVisionEncoder {
    model_path: String,
    model: Option<Mutex<Session>>,
}

pub struct BLIPitmHead {
    model_path: String,
    model: Option<Mutex<Session>>,
}

pub struct BLIPTokenizer {
    tokenizer: Option<Tokenizer>,
    tokenizer_path: String,
}

pub struct BLIPNumericalDefaults {
    BLIP_SIZE: u32,
    BLIP_MEAN: [f32; 3],
    BLIP_STD: [f32; 3],
}

impl Default for BLIPNumericalDefaults {
    fn default() -> Self {
        Self {
            BLIP_SIZE: 384,
            BLIP_MEAN: [0.48145466, 0.4578275, 0.40821073],
            BLIP_STD: [0.26862954, 0.26130258, 0.27577711],
        }
    }
}


impl BLIPTokenizer {
    // this is bert wordpiece not clip's bpe
    // blip_itm_base_coco/tokenizer.json
    pub fn new(tokenizer_path: &str) -> Result<Self, AppError> {
        let mut temp_tokenzier = Tokenizer::from_file(tokenizer_path)?;

        // for truncation ti is 35 not clip's 77
        temp_tokenzier.with_truncation(Some(TruncationParams {
            max_length: 35,
            ..Default::default()
        }))?;

        Ok(Self {
            tokenizer: Some(temp_tokenzier),
            tokenizer_path: tokenizer_path.to_string(),
        })
    }

    pub fn delete_tokenizer(&mut self) {
        self.tokenizer = None;
    }

    pub fn tokenize_input(&self, input: &str) -> Result<(Vec<i64>, Vec<i64>), AppError> {
        let tokenizer = self
            .tokenizer
            .as_ref()
            .ok_or_else(|| AppError::CustomError("Tokenizer not loaded".to_string()))?;
        let encoding = tokenizer.encode(input, true)?;
        let ids: Vec<i64> = encoding.get_ids().iter().map(|&i| i as i64).collect();
        let mask: Vec<i64> = encoding
            .get_attention_mask()
            .iter()
            .map(|&m| m as i64)
            .collect();

        Ok((ids, mask))
    }
}

/////////////////////////////////////////////////////////////

impl CLIPTokenizer {
    pub fn new(tokenizer_path: &str) -> Result<Self, AppError> {
        let mut temp_tokenzier = Tokenizer::from_file(tokenizer_path)?;

        // For padding
        temp_tokenzier.with_padding(Some(PaddingParams {
            strategy: PaddingStrategy::Fixed(77),
            ..Default::default()
        }));

        // for truncation
        temp_tokenzier.with_truncation(Some(TruncationParams {
            max_length: 77,
            ..Default::default()
        }))?;

        Ok(Self {
            tokenizer: Some(temp_tokenzier),
            tokenizer_path: tokenizer_path.to_string(),
        })
    }

    pub fn delete_tokenizer(&mut self) {
        self.tokenizer = None;
    }

    pub fn tokenize_input(&self, input: &str) -> Result<(Vec<i64>, Vec<i64>), AppError> {
        let tokenizer = self
            .tokenizer
            .as_ref()
            .ok_or_else(|| AppError::CustomError("Tokenizer not loaded".to_string()))?;
        let encoding = tokenizer.encode(input, true)?;
        let ids: Vec<i64> = encoding.get_ids().iter().map(|&i| i as i64).collect();
        let mask: Vec<i64> = encoding
            .get_attention_mask()
            .iter()
            .map(|&m| m as i64)
            .collect();

        Ok((ids, mask))
    }
}

impl ClipVisionModel {
    pub fn new(model_path: &str) -> Result<Self, AppError> {
        let model = Session::builder()?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_intra_threads(8)?
            .commit_from_file(model_path)?;

        Ok(Self {
            model_path: model_path.to_string(),
            model: Some(Mutex::new(model)),
        })
    }

    pub fn unload_model(&mut self) {
        self.model = None;
    }

    pub fn embed_single(&self, tensor: Array4<f32>) -> Result<Vec<f32>, AppError> {
        let model_opt = self.model.as_ref().ok_or_else(|| AppError::CustomError("Model not loaded".to_string()))?;
        let mut model_guard = model_opt.lock()?;

        let output = model_guard
            .run(inputs![
                "pixel_values" => TensorRef::from_array_view((
                    tensor.shape(),
                    tensor.as_slice().ok_or_else(|| AppError::CustomError("Invalid tensor slice".to_string()))?
                )).map_err(|e| AppError::OrtError(e.to_string()))?,
            ])?;

        let output = output["image_embeds"]
            .try_extract_array::<f32>()?
            .into_owned();

        Ok(output.into_raw_vec())
    }

    // takes in preprocessed tensor list and then returns list of embeddings.
    pub fn embed_batch_list(&self, tensor_list: Vec<Array4<f32>>) -> Result<Vec<Vec<f32>>, AppError> {
        let model_opt = self.model.as_ref().ok_or_else(|| AppError::CustomError("Model not loaded".to_string()))?;
        let mut model_guard = model_opt.lock()?;

        let embedding_vectors: Vec<Vec<f32>> = tensor_list
            .into_iter()
            .map(|t| {
                let outputs = model_guard
                    .run(inputs![
                        "pixel_values" => TensorRef::from_array_view((
                            t.shape(),
                            t.as_slice().unwrap()
                        )).unwrap(),
                    ])
                    .unwrap();

                let output = outputs["image_embeds"]
                    .try_extract_array::<f32>()
                    .unwrap()
                    .into_owned();

                output.into_raw_vec()
            })
            .collect();

        Ok(embedding_vectors)
    }

    // takes in preprocessed tensor list and then returns list of embeddings.
    // also updates UI with progress
    pub fn embed_batch_list_with_progress(&self, tensor_list: Vec<Array4<f32>>, app: &AppHandle) -> Result<Vec<Vec<f32>>, AppError> {
        let model_opt = self.model.as_ref().ok_or_else(|| AppError::CustomError("Model not loaded".to_string()))?;
        let mut model_guard = model_opt.lock()?;
        let mut counter = 0; // counter for app emit
        let total_tensors = tensor_list.len(); // send over the total amount of stuff to embed

        let embedding_vectors: Vec<Vec<f32>> = tensor_list
            .into_iter()
            .map(|t| {
                counter += 1;
                if counter % 2 == 0 {
                    let _ = emit_utility(app, "embed-progress", Progress {done: counter, total: total_tensors}); // ignore error
                }
                let outputs = model_guard
                    .run(inputs![
                        "pixel_values" => TensorRef::from_array_view((
                            t.shape(),
                            t.as_slice().unwrap()
                        )).unwrap(),
                    ])
                    .unwrap();

                let output = outputs["image_embeds"]
                    .try_extract_array::<f32>()
                    .unwrap()
                    .into_owned();

                output.into_raw_vec()
            })
            .collect();

        Ok(embedding_vectors)
    }

    // just make the inference batched instead of taking in list and doing 1 by 1 batch size
    pub fn embed_batch_list_batched(&self, tensor_list: Vec<Array4<f32>>, app: &AppHandle) -> Result<Vec<Vec<f32>>, AppError> {
        let model_opt = self.model.as_ref().ok_or_else(|| AppError::CustomError("Model not loaded".to_string()))?;
        let mut model_guard = model_opt.lock()?;
        let mut counter = 0; // counter for app emit
        let total_tensors = tensor_list.len(); // send over the total amount of stuff to embed

        let embedding_vectors: Vec<Vec<f32>> = tensor_list
            .into_iter()
            .map(|t| {
                counter += 1;
                if counter % 2 == 0 {
                    let _ = emit_utility(app, "embed-progress", Progress {done: counter, total: total_tensors}); // ignore error
                }
                let outputs = model_guard
                    .run(inputs![
                        "pixel_values" => TensorRef::from_array_view((
                            t.shape(),
                            t.as_slice().unwrap()
                        )).unwrap(),
                    ])
                    .unwrap();

                let output = outputs["image_embeds"]
                    .try_extract_array::<f32>()
                    .unwrap()
                    .into_owned();

                output.into_raw_vec()
            })
            .collect();

        Ok(embedding_vectors)
    }

    // embed a batch of tensor by using batching not one by one
    // same as embed_batch_list_with_progress but sends batch_size images through the
    // vision graph per run() instead of one. vision_model.onnx already declares batch as
    // a dynamic axis ([batch,3,224,224] -> [batch,512])
    pub fn embed_batch_list_batched_with_progress(&self, tensor_list: Vec<Array4<f32>>, batch_size: usize, app: &AppHandle) -> Result<Vec<Vec<f32>>, AppError> {
        let model_opt = self.model.as_ref().ok_or_else(|| AppError::CustomError("Model not loaded".to_string()))?;
        let mut model_guard = model_opt.lock()?;
        let mut counter = 0; // counter for app emit
        let total_tensors = tensor_list.len(); // send over the total amount of stuff to embed

        let mut embedding_vectors: Vec<Vec<f32>> = Vec::with_capacity(total_tensors);

        for group in tensor_list.chunks(batch_size.max(1)) {
            
            let shape = group[0].shape();
            let (c, h, w) = (shape[1], shape[2], shape[3]);

            let mut packed: Vec<f32> = Vec::with_capacity(group.len() * c * h * w);
            for t in group {
                packed.extend_from_slice(
                    t.as_slice().ok_or_else(|| AppError::CustomError("Invalid tensor slice".to_string()))?
                );
            }

            let batch_shape: [usize; 4] = [group.len(), c, h, w];

            let outputs = model_guard
                .run(inputs![
                    "pixel_values" => TensorRef::from_array_view((
                        batch_shape,
                        packed.as_slice()
                    )).map_err(|e| AppError::OrtError(e.to_string()))?,
                ])?;

            let output = outputs["image_embeds"]
                .try_extract_array::<f32>()?
                .into_owned();

            // [B, 512] comes back row major so the rows stay in the input order
            let dim = output.shape()[1];
            for row in output.into_raw_vec().chunks(dim) {
                embedding_vectors.push(row.to_vec());
            }

            counter += group.len();
            let _ = emit_utility(app, "embed-progress", Progress {done: counter, total: total_tensors}); // ignore error
        }

        Ok(embedding_vectors)
    }
}

impl ClipTextModel {
    pub fn new(model_path: &str) -> Result<Self, AppError> {
        let model = Session::builder()?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_intra_threads(8)?
            .commit_from_file(model_path)?;

        Ok(Self {
            model_path: model_path.to_string(),
            model: Some(Mutex::new(model)),
        })
    }

    pub fn unload_model(&mut self) {
        self.model = None;
    }

    // mobileclip2-b's text graph takes input_ids only, no attention_mask
    pub fn embed_single(&self, tokenized: Vec<i64>, _mask: Vec<i64>) -> Result<Vec<f32>, AppError> {
        let id_shape: [usize; 2] = [1, 77];

        let model_opt = self.model.as_ref().ok_or_else(|| AppError::CustomError("Clip Text Model not loaded".to_string()))?;
        let mut model_guard = model_opt.lock()?;

        let output = model_guard
            .run(inputs![
                "input_ids" => TensorRef::from_array_view((
                    id_shape, tokenized.as_slice()
                )).map_err(|e| AppError::OrtError(e.to_string()))?,
            ])?;

        let embedded_query = output["text_embeds"]
            .try_extract_array::<f32>()?
            .into_owned();

        Ok(embedded_query.into_raw_vec())
    }
}

impl BLIPVisionEncoder {
    pub fn new(model_path: &str) -> Result<Self, AppError> {

        let model = Session::builder()?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_intra_threads(8)?
            .commit_from_file(model_path)?;

        Ok(Self {
            model: Some(Mutex::new(model)),
            model_path: model_path.to_string()
        })
    }

    pub fn unload_model(&mut self) {
        self.model = None;
    }

    pub fn encode_single(&self, tensor: Array4<f32>) -> Result<Vec<f32>, AppError> {

        let model_opt = self.model.as_ref().ok_or_else(|| AppError::CustomError("BLIP Vision Model not loaded".to_string()))?;
        let mut model_guard = model_opt.lock()?;

        let outputs = model_guard.run(inputs![
            "pixel_values" => TensorRef::from_array_view((tensor.shape(), tensor.as_slice().unwrap()))?
        ])?;

        let embedded_img = outputs["image_embeds"].try_extract_array::<f32>()?.into_owned();

        Ok(embedded_img.into_raw_vec())
    }

    // takes id + tensor pairs and hands back id + embedding pairs
    // the id stays on the pair so the caller never has to trust that the vec came back in order
    // for loop not a map since the ort calls are fallible and ? does not work inside a closure
    pub fn encode_batch(&self, tensor_list: Vec<(u64, Array4<f32>)>) -> Result<Vec<(u64, Vec<f32>)>, AppError> {

        let model_opt = self.model.as_ref().ok_or_else(|| AppError::CustomError("BLIP Vision Model not loaded".to_string()))?;
        let mut model_guard = model_opt.lock()?;

        let mut embedding_vectors: Vec<(u64, Vec<f32>)> = Vec::with_capacity(tensor_list.len());

        for (id, tensor) in tensor_list {
            let outputs = model_guard.run(inputs![
                "pixel_values" => TensorRef::from_array_view((
                    tensor.shape(),
                    tensor.as_slice().ok_or_else(|| AppError::CustomError("Invalid tensor slice".to_string()))?
                )).map_err(|e| AppError::OrtError(e.to_string()))?,
            ])?;

            let embedded_img = outputs["image_embeds"].try_extract_array::<f32>()?.into_owned();

            embedding_vectors.push((id, embedded_img.into_raw_vec()));
        }

        Ok(embedding_vectors)
    }


    // same as encode_batch but emits the rerank count on the blip-progress namespace
    pub fn encode_batch_with_progress(&self, tensor_list:  Vec<(u64, Array4<f32>)>, app: &AppHandle) -> Result<Vec<(u64, Vec<f32>)>, AppError> {
        let model_opt = self.model.as_ref().ok_or_else(|| AppError::CustomError("BLIP Vision Model not loaded".to_string()))?;
        let mut model_guard = model_opt.lock()?;
        let mut counter = 0; // counter for app emit
        let total_tensors = tensor_list.len(); // send over the total amount of stuff to rerank

        let mut embedding_vectors: Vec<(u64, Vec<f32>)> = Vec::with_capacity(total_tensors);

        for (id, tensor) in tensor_list {
            counter += 1;
            let _ = emit_utility(app, "blip-progress", Progress {done: counter, total: total_tensors}); // ignore error

            let outputs = model_guard.run(inputs![
                "pixel_values" => TensorRef::from_array_view((
                    tensor.shape(),
                    tensor.as_slice().ok_or_else(|| AppError::CustomError("Invalid tensor slice".to_string()))?
                )).map_err(|e| AppError::OrtError(e.to_string()))?,
            ])?;

            let embedded_img = outputs["image_embeds"].try_extract_array::<f32>()?.into_owned();

            embedding_vectors.push((id, embedded_img.into_raw_vec()));
        }

        Ok(embedding_vectors)
    }
}


impl BLIPitmHead {
    pub fn new(model_path: &str) -> Result<Self, AppError> {

        let model = Session::builder()?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_intra_threads(8)?
            .commit_from_file(model_path)?;

        Ok(Self {
            model: Some(Mutex::new(model)),
            model_path: model_path.to_string()
        })
    }

    pub fn unload_model(&mut self) {
        self.model = None;
    }

    // use the itm blip head to score a text + image
    // what comes in is the image which alr gone through the blip vision head 
    // also the tokenized query to match against
    // what it returns is agnostic for now basically make it return the 2 logits 
    pub fn itm_match_single(&self, image_embeds: Vec<f32>, tokenized: Vec<i64>, mask: Vec<i64>) -> Result<(f32, f32), AppError> {
        let model_opt = self.model.as_ref().ok_or_else(|| AppError::CustomError("BLIP ITM Model not loaded".to_string()))?;
        let mut model_guard = model_opt.lock()?;

        // embeds arrive flat, vision head gives [1, 577, 768] so rebuild that shape
        let emb_shape: [usize; 3] = [1, image_embeds.len() / 768, 768];
        let txt_shape: [usize; 2] = [1, tokenized.len()];

        let output = model_guard
            .run(inputs![
                "image_embeds" => TensorRef::from_array_view((
                    emb_shape, image_embeds.as_slice()
                ))?,

                "input_ids" => TensorRef::from_array_view((
                    txt_shape, tokenized.as_slice()
                ))?,

                "attention_mask" => TensorRef::from_array_view((
                    txt_shape, mask.as_slice()
                ))?,
            ])?;

        let logits = output["itm_logits"]
            .try_extract_array::<f32>()?
            .into_owned();

        let logits = logits.into_raw_vec();

        Ok((logits[0], logits[1]))
    }

    // scores every image embed against the one tokenized query, the itm head is a cross encoder
    // so it has to see the text and runs once per pair
    // returns the raw logits per id, caller decides how to fold them into a score
    pub fn itm_match_batch(&self, image_embeds_list: Vec<(u64, Vec<f32>)>, tokenized: Vec<i64>, mask: Vec<i64>) -> Result<Vec<(u64, (f32, f32))>, AppError> {
        let model_opt = self.model.as_ref().ok_or_else(|| AppError::CustomError("BLIP ITM Model not loaded".to_string()))?;
        let mut model_guard = model_opt.lock()?;

        let txt_shape: [usize; 2] = [1, tokenized.len()];

        let mut scores: Vec<(u64, (f32, f32))> = Vec::with_capacity(image_embeds_list.len());

        for (id, image_embeds) in image_embeds_list {
            // embeds arrive flat, vision head gives [1, 577, 768] so rebuild that shape
            let emb_shape: [usize; 3] = [1, image_embeds.len() / 768, 768];

            let output = model_guard
                .run(inputs![
                    "image_embeds" => TensorRef::from_array_view((
                        emb_shape, image_embeds.as_slice()
                    )).map_err(|e| AppError::OrtError(e.to_string()))?,

                    "input_ids" => TensorRef::from_array_view((
                        txt_shape, tokenized.as_slice()
                    )).map_err(|e| AppError::OrtError(e.to_string()))?,

                    "attention_mask" => TensorRef::from_array_view((
                        txt_shape, mask.as_slice()
                    )).map_err(|e| AppError::OrtError(e.to_string()))?,
                ])?;

            // itm_logits is [1, 2] which is [no match, match]
            let logits = output["itm_logits"]
                .try_extract_array::<f32>()?
                .into_owned();

            let logits = logits.into_raw_vec();

            // indexing straight into this would panic and take the whole app with it
            if logits.len() < 2 {
                return Err(AppError::CustomError("ITM head returned unexpected logits shape".to_string()));
            }

            scores.push((id, (logits[0], logits[1])));
        }

        Ok(scores)
    }
}
