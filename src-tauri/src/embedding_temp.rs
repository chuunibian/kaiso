use ort::session::Session;
use std::sync::Mutex;
use tauri::AppHandle;
use crate::temp_command::emit_utility;
use crate::temp_models::Progress;


use ndarray::Array4;
use ort::{inputs, session::builder::GraphOptimizationLevel, value::TensorRef};

use tokenizers::Tokenizer;
use tokenizers::{PaddingParams, PaddingStrategy, TruncationParams};

pub struct ClipVisionModel {
    model_path: String,
    model: Option<Mutex<Session>>,
}

pub struct ClipTextModel {
    model_path: String,
    model: Option<Mutex<Session>>,
}

pub struct AppTokenizer {
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

impl AppTokenizer {
    pub fn new(tokenizer_path: &str) -> Result<Self, String> {
        let mut temp_tokenzier =
            Tokenizer::from_file(tokenizer_path).map_err(|e| e.to_string())?;

        // For padding
        temp_tokenzier.with_padding(Some(PaddingParams {
            strategy: PaddingStrategy::Fixed(77),
            ..Default::default()
        }));

        // for truncation
        temp_tokenzier
            .with_truncation(Some(TruncationParams {
                max_length: 77,
                ..Default::default()
            }))
            .map_err(|e| e.to_string())?;

        Ok(Self {
            tokenizer: Some(temp_tokenzier),
            tokenizer_path: tokenizer_path.to_string(),
        })
    }

    pub fn delete_tokenizer(&mut self) {
        self.tokenizer = None;
    }

    pub fn tokenize_input(&self, input: &str) -> Result<(Vec<i64>, Vec<i64>), String> {
        let tokenizer = self
            .tokenizer
            .as_ref()
            .ok_or("Tokenizer not loaded".to_string())?;
        let encoding = tokenizer.encode(input, true).map_err(|e| e.to_string())?;
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
    pub fn new(model_path: &str) -> Result<Self, String> {
        let model = Session::builder()
            .map_err(|e| e.to_string())?
            .with_optimization_level(GraphOptimizationLevel::Level3)
            .map_err(|e| e.to_string())?
            .with_intra_threads(8)
            .map_err(|e| e.to_string())?
            .commit_from_file(model_path)
            .map_err(|e| e.to_string())?;

        Ok(Self {
            model_path: model_path.to_string(),
            model: Some(Mutex::new(model)),
        })
    }

    pub fn unload_model(&mut self) {
        self.model = None;
    }

    pub fn embed_single(&self, tensor: Array4<f32>) -> Result<Vec<f32>, String> {
        let model_opt = self.model.as_ref().ok_or("Model not loaded".to_string())?;
        let mut model_guard = model_opt.lock().map_err(|e| e.to_string())?;

        let output = model_guard
            .run(inputs![
                "pixel_values" => TensorRef::from_array_view((
                    tensor.shape(),
                    tensor.as_slice().unwrap()
                )).unwrap(),
            ])
            .map_err(|e| e.to_string())?;

        let output = output["image_embeds"]
            .try_extract_array::<f32>()
            .map_err(|e| e.to_string())?
            .into_owned();

        Ok(output.into_raw_vec())
    }

    // takes in preprocessed tensor list and then returns list of embeddings.
    pub fn embed_batch_list(&self, tensor_list: Vec<Array4<f32>>) -> Result<Vec<Vec<f32>>, String> {
        let model_opt = self.model.as_ref().ok_or("Model not loaded".to_string())?;
        let mut model_guard = model_opt.lock().map_err(|e| e.to_string())?;

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
    pub fn embed_batch_list_with_progress(&self, tensor_list: Vec<Array4<f32>>, app: &AppHandle) -> Result<Vec<Vec<f32>>, String> {
        let model_opt = self.model.as_ref().ok_or("Model not loaded".to_string())?;
        let mut model_guard = model_opt.lock().map_err(|e| e.to_string())?;
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
}

impl ClipTextModel {
    pub fn new(model_path: &str) -> Result<Self, String> {
        let model = Session::builder()
            .map_err(|e| e.to_string())?
            .with_optimization_level(GraphOptimizationLevel::Level3)
            .map_err(|e| e.to_string())?
            .with_intra_threads(8)
            .map_err(|e| e.to_string())?
            .commit_from_file(model_path)
            .map_err(|e| e.to_string())?;

        Ok(Self {
            model_path: model_path.to_string(),
            model: Some(Mutex::new(model)),
        })
    }

    pub fn unload_model(&mut self) {
        self.model = None;
    }

    pub fn embed_single(&self, tokenized: Vec<i64>, mask: Vec<i64>) -> Result<Vec<f32>, String> {
        let id_shape: [usize; 2] = [1, 77];

        let model_opt = self.model.as_ref().ok_or("Model not loaded".to_string())?;
        let mut model_guard = model_opt.lock().map_err(|e| e.to_string())?;

        let output = model_guard
            .run(inputs![
                "input_ids" => TensorRef::from_array_view((
                    id_shape, tokenized.as_slice()
                )).unwrap(),

                "attention_mask" => TensorRef::from_array_view((
                    id_shape, mask.as_slice()
                )).unwrap(),
            ])
            .map_err(|e| e.to_string())?;

        let embedded_query = output["text_embeds"]
            .try_extract_array::<f32>()
            .map_err(|e| e.to_string())?
            .into_owned();

        Ok(embedded_query.into_raw_vec())
    }
}
