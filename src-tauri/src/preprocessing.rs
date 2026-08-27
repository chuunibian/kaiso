use anyhow::{Context, Result};
use fast_image_resize::images::Image as FirImage;
use fast_image_resize::{PixelType, ResizeOptions, Resizer};
use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::{DynamicImage, ImageFormat, ImageReader, RgbImage};
use jwalk::WalkDir;
use exif;
use ndarray::Array4;
use rayon::prelude::*;
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::BufReader;
use std::num::NonZeroU32;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicI64, Ordering};
use std::time::{Instant, SystemTime};
use twox_hash::XxHash64;

use crate::temp_models::{Image, ImageMetadata, ImageDimensions};

const CLIP_SIZE: u32 = 224;
const CLIP_MEAN: [f32; 3] = [0.48145466, 0.4578275, 0.40821073];
const CLIP_STD: [f32; 3] = [0.26862954, 0.26130258, 0.27577711];

// gets an FS path to albumn scans it and returns valid image paths
pub fn process_album_image_paths(albumn_path: &Path) -> Result<Vec<PathBuf>, String> {
    Ok(find_image_paths(albumn_path))
}

// takes in albumn paths and then preprocesses into tensors
// It is driving function and it has the par iter
pub fn preprocess_album(
    paths: Vec<PathBuf>,
    thumbnail_path: &PathBuf,
    album_name: &String,
    autoinc_counter: &AtomicI64,
) -> Result<Vec<(Image, Array4<f32>)>, String> {
    let target_size = 224;

    let tensors: Vec<(Image, Array4<f32>)> = paths
        .par_iter()
        .map(|path| {
            let image_id = autoinc_counter.fetch_add(1, Ordering::Relaxed) as u64;

            // let mut buffer = Cursor::new(Vec::new());
            // let mut encoder = JpegEncoder::new_with_quality(&mut buffer, 80);

            let (temp_img, temp1) = load_image(path, image_id).unwrap();
            let mut temp2 = recolor_image(temp1); // mut for pass into resize as view?
            let temp_thumb_resize = resize_image_thumb(&mut temp2).unwrap(); // mut ref need to be passed in
            let temp3 = resize_image(temp2, target_size).unwrap(); // takes ownership
            // let temp3 = resize_image(temp_thumb_resize.clone(), target_size).unwrap(); // diff ver

            // for thumbnail !!!
            temp_thumbnail_save(&temp_thumb_resize, image_id, thumbnail_path, album_name)
                .expect("failed to save thumbnail.");

            let temp4 = preprocess_rgb_image_to_clip(temp3); // return a tensor

            return (temp_img, temp4);
        })
        .collect();

    Ok(tensors)
}

// wil create the thumbnail dir on request of the album creation
pub fn create_thumbnail_dir(thumbnail_path: &PathBuf, album_name: &String) -> Result<(), String> {
    let full_path = thumbnail_path.join(album_name);
    fs::create_dir_all(&full_path).map_err(|e| e.to_string())?;
    Ok(())
}

// This function also needs to get some sort of auto incrementing number unique to a workspace
fn temp_thumbnail_save(img_view: &RgbImage, id: u64, thumbnail_path: &PathBuf, album_name: &String) -> Result<()> {
    let filename = format!("{}.jpg", id);
    let full_path = thumbnail_path.join(album_name).join(filename);

    img_view.save(&full_path)?;

    Ok(())
}


// TODO this is no longer relevant however can keep it
pub fn hash_path_id(path: &str) -> u64 {
    let seed = 420;
    let hash = XxHash64::oneshot(seed, path.as_bytes()); // need as bytes since &str is same bytes but typing says it is bytes that are text
    hash
}

// merge into ht
pub fn merge_image_and_embeddings(
    images: Vec<Image>,
    embeddings: Vec<Vec<f32>>,
) -> Result<HashMap<u64, Image>> {
    let mut ht = HashMap::new();
    for (mut img, emb) in images.into_iter().zip(embeddings) {
        img.embedding = Some(emb);
        ht.insert(img.id, img);
    }

    Ok(ht)
}

// Walk a directory and return paths to image files
pub fn find_image_paths(root: &Path) -> Vec<PathBuf> {
    WalkDir::new(root)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.path())
        .filter(|p| {
            matches!(
                p.extension()
                    .and_then(|e| e.to_str())
                    .map(str::to_ascii_lowercase)
                    .as_deref(),
                // Some("jpg" | "jpeg" | "png" | "gif" | "webp" | "bmp" | "tif" | "tiff" | "avif")
                Some("jpg" | "jpeg" | "png" | "webp")
            )
        })
        .collect()
}


fn get_exif_orientation(path: &Path) -> u32 {
    (|| -> Result<u32> {
        let file = File::open(path)?;
        let mut reader = BufReader::new(file);
        let exif = exif::Reader::new().read_from_container(&mut reader)?;
        let field = exif
            .get_field(exif::Tag::Orientation, exif::In::PRIMARY)
            .context("no orientation tag")?;
        field.value.get_uint(0).context("bad orientation value")
    })()
    .unwrap_or(1)
}

// Metadata comes from the filesystem, so this needs the path, not the decoded image.
fn extract_image_metadata(path: &Path, image: &DynamicImage) -> Result<ImageMetadata> {
    // !! In the future if add more metadata fields then just pass in &DynImage
    // and then get the extract metadata fields like dim and color and etc

    let m = fs::metadata(path).with_context(|| format!("stat failed: {}", path.display()))?;
    Ok(ImageMetadata {
        size: m.len(),
        date_created: m.created().unwrap_or(SystemTime::UNIX_EPOCH),
        date_modified: m.modified().unwrap_or(SystemTime::UNIX_EPOCH),
        dimensions: ImageDimensions {
            width: image.width(),
            height: image.height(),
        }
    })
}

fn orient(img: DynamicImage, orientation: u32) -> DynamicImage {
    match orientation {
        2 => img.fliph(),
        3 => img.rotate180(),
        4 => img.flipv(),
        5 => img.rotate90().fliph(),
        6 => img.rotate90(),
        7 => img.rotate270().fliph(),
        8 => img.rotate270(),
        _ => img,
    }
}

// Decode once, build the Image struct, orient, hand both downstream.
fn load_image(path: &PathBuf, image_id: u64) -> Result<(Image, DynamicImage)> {
    let decoded = ImageReader::open(&path)?
        .with_guessed_format()?
        .decode()
        .with_context(|| format!("decode failed: {}", path.display()))?;

    let meta = extract_image_metadata(path, &decoded)?;
    let orientation = get_exif_orientation(path);
    let oriented = orient(decoded, orientation);

    let name = path
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();

    let image = Image {
        id: image_id,
        meta,
        embedding: None,
        name,
        path: path.clone(),
    };

    Ok((image, oriented))
}

fn recolor_image(img: DynamicImage) -> RgbImage {
    img.to_rgb8()
}

fn resize_image(rgb: RgbImage, target_size: u32) -> Result<RgbImage> {
    let (w, h) = rgb.dimensions();

    let src = FirImage::from_vec_u8(
        NonZeroU32::new(w).context("zero width")?.get(),
        NonZeroU32::new(h).context("zero height")?.get(),
        rgb.into_raw(),
        PixelType::U8x3,
    )?;

    let mut dst = FirImage::new(target_size, target_size, PixelType::U8x3);
    let mut resizer = Resizer::new();
    resizer.resize(&src, &mut dst, &ResizeOptions::default())?;

    let resized = RgbImage::from_raw(target_size, target_size, dst.into_vec())
        .context("failed to rebuild RgbImage from resized buffer")?;

    Ok(resized)
}

fn resize_image_thumb(rgb: &mut RgbImage) -> Result<RgbImage> {
    let (w, h) = rgb.dimensions();

    let max_dim = std::cmp::max(w, h);

    let target_ratio = 256.0 / max_dim as f64;

    let target_w = (w as f64 * target_ratio) as u32;
    let target_h = (h as f64 * target_ratio) as u32;

    let src = FirImage::from_slice_u8(
        NonZeroU32::new(w).context("zero width")?.get(),
        NonZeroU32::new(h).context("zero height")?.get(),
        rgb,
        PixelType::U8x3,
    )?;

    let mut dst = FirImage::new(target_w, target_h, PixelType::U8x3);
    let mut resizer = Resizer::new();
    resizer.resize(&src, &mut dst, &ResizeOptions::default())?;

    let resized = RgbImage::from_raw(target_w, target_h, dst.into_vec())
        .context("failed to rebuild RgbImage from resized buffer")?;

    Ok(resized)
}

fn resize_image_naive(rgb_image: RgbImage, target_size: u32) -> Result<RgbImage, String> {
    Ok(image::imageops::resize(
        &rgb_image,
        target_size,
        target_size,
        FilterType::Triangle,
    ))
}

fn preprocess_rgb_image_to_clip(img: RgbImage) -> Array4<f32> {
    let (w, h) = (img.width() as usize, img.height() as usize);
    debug_assert_eq!(w, CLIP_SIZE as usize);
    debug_assert_eq!(h, CLIP_SIZE as usize);

    let plane = w * h;
    let raw = img.into_raw();

    let mut chw = vec![0f32; 3 * plane];
    let (r_plane, rest) = chw.split_at_mut(plane);
    let (g_plane, b_plane) = rest.split_at_mut(plane);

    for i in 0..plane {
        let base = i * 3;
        r_plane[i] = (raw[base] as f32 / 255.0 - CLIP_MEAN[0]) / CLIP_STD[0];
        g_plane[i] = (raw[base + 1] as f32 / 255.0 - CLIP_MEAN[1]) / CLIP_STD[1];
        b_plane[i] = (raw[base + 2] as f32 / 255.0 - CLIP_MEAN[2]) / CLIP_STD[2];
    }

    // fromshapevec takes a flat vector and turns it into that targeted dimension
    Array4::from_shape_vec((1, 3, h, w), chw).expect("shape is correct by construction")
}
