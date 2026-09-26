//! Sky Studio — the Tauri port of server/skyStore.ts, contract-identical.
//!
//! Every reality owns its skies inside its OWN folder (total isolation):
//!
//!   <realities>/<folder>/sky.json          ← registry (active + roster + settings)
//!   <realities>/<folder>/assets/<id>.<ext> ← the uploaded image bytes
//!
//! All path components pass through the same sanitize + containment rules
//! as every other reality-folder API (realities::sanitize_folder_name /
//! realities::is_inside over realities::realities_dir()).
//!
//! The asset bytes are NOT served over HTTP on desktop — the webview has no
//! route for them. `sky_asset` returns raw bytes and the renderer wraps them
//! in an object URL (see skyRegistry.ts). No base64: 6 MB photos cross the
//! IPC bridge as raw arrays once and are cached as blob URLs.

use serde::Serialize;
use std::fs;
use std::path::PathBuf;

use crate::realities::{is_inside, realities_dir, sanitize_folder_name};

const MAX_PHOTO_BYTES: usize = 6 * 1024 * 1024; /* 6 MB — matches the web contract */
const MAX_PHOTOS: usize = 8;

const EXT_BY_MIME: &[(&str, &str)] = &[
    ("image/png", "png"),
    ("image/jpeg", "jpg"),
    ("image/webp", "webp"),
    ("image/gif", "gif"),
    ("image/avif", "avif"),
];

const MIME_BY_EXT: &[(&str, &str)] = &[
    ("png", "image/png"),
    ("jpg", "image/jpeg"),
    ("jpeg", "image/jpeg"),
    ("webp", "image/webp"),
    ("gif", "image/gif"),
    ("avif", "image/avif"),
];

#[derive(Serialize, Clone)]
pub struct SkyPhoto {
    pub id: String,
    pub file: String,
    pub name: String,
    pub mime: String,
    pub size: u64,
    #[serde(rename = "addedAt")]
    pub added_at: f64,
}

#[derive(Serialize, Clone)]
pub struct SkySettings {
    pub blend: f64,
    pub dim: f64,
    pub blur: f64,
    pub vignette: f64,
    pub drift: f64,
}

impl Default for SkySettings {
    fn default() -> Self {
        Self { blend: 0.85, dim: 0.45, blur: 0.12, vignette: 0.55, drift: 0.3 }
    }
}

#[derive(Serialize, Clone)]
pub struct SkyManifest {
    pub version: u8,
    #[serde(rename = "activeId")]
    pub active_id: Option<String>,
    pub photos: Vec<SkyPhoto>,
    pub settings: SkySettings,
}

impl Default for SkyManifest {
    fn default() -> Self {
        Self { version: 1, active_id: None, photos: Vec::new(), settings: SkySettings::default() }
    }
}

fn now_millis() -> f64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as f64
}

/// Resolve + harden a reality folder. `ensure` recreates a lost folder so an
/// upload can still land the user's photo (same policy as the web server).
fn resolve_sky_dir(folder_raw: Option<&str>, ensure: bool) -> Result<PathBuf, String> {
    let folder = folder_raw.map(sanitize_folder_name).unwrap_or_default();
    if folder.is_empty() {
        return Err("Unknown or unsafe reality folder".into());
    }
    let dir = realities_dir()?.join(&folder);
    if !is_inside(&realities_dir()?, &dir) {
        return Err("Unknown or unsafe reality folder".into());
    }
    if !dir.exists() {
        if !ensure {
            return Err("Unknown or unsafe reality folder".into());
        }
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    if !dir.is_dir() {
        return Err("Unknown or unsafe reality folder".into());
    }
    Ok(dir)
}

fn manifest_path(dir: &PathBuf) -> PathBuf {
    dir.join("sky.json")
}

fn assets_dir(dir: &PathBuf) -> Result<PathBuf, String> {
    let a = dir.join("assets");
    if !a.exists() {
        fs::create_dir_all(&a).map_err(|e| e.to_string())?;
    }
    Ok(a)
}

fn read_sky_manifest(folder: Option<&str>) -> SkyManifest {
    let dir = match resolve_sky_dir(folder, false) {
        Ok(d) => d,
        Err(_) => return SkyManifest::default(),
    };
    let raw = match fs::read_to_string(manifest_path(&dir)) {
        Ok(s) => s,
        Err(_) => return SkyManifest::default(),
    };
    /* repair pass: tolerate hand-edited files (mirrors the web reader) */
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct RawPhoto {
        id: Option<String>,
        file: Option<String>,
        name: Option<String>,
        mime: Option<String>,
        size: Option<f64>,
        added_at: Option<f64>,
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct RawManifest {
        active_id: Option<String>,
        photos: Option<Vec<RawPhoto>>,
        settings: Option<SkySettings>,
    }
    match serde_json::from_str::<RawManifest>(&raw) {
        Ok(r) => SkyManifest {
            version: 1,
            active_id: r.active_id,
            photos: r
                .photos
                .unwrap_or_default()
                .into_iter()
                .filter(|p| p.id.is_some() && p.file.is_some())
                .map(|p| SkyPhoto {
                    id: p.id.unwrap_or_default(),
                    file: p.file.unwrap_or_default(),
                    name: p.name.unwrap_or_else(|| "photo".into()),
                    mime: p.mime.unwrap_or_else(|| "image/jpeg".into()),
                    size: p.size.unwrap_or(0.0) as u64,
                    added_at: p.added_at.unwrap_or(0.0),
                })
                .collect(),
            settings: r.settings.unwrap_or_default(),
        },
        Err(_) => SkyManifest::default(),
    }
}

fn write_sky_manifest(dir: &PathBuf, manifest: &SkyManifest) -> Result<(), String> {
    let json = serde_json::to_string_pretty(manifest).map_err(|e| e.to_string())?;
    fs::write(manifest_path(dir), json).map_err(|e| e.to_string())
}

/// Drop registry entries whose asset file vanished (hand-deleted files).
fn prune_missing_photos(dir: &PathBuf, mut manifest: SkyManifest) -> SkyManifest {
    let before = manifest.photos.len();
    manifest.photos.retain(|p| dir.join(&p.file).exists());
    if manifest.photos.len() != before {
        let still = manifest.photos.iter().any(|p| Some(&p.id) == manifest.active_id.as_ref());
        if !still {
            manifest.active_id = None;
        }
    }
    manifest
}

pub fn get_sky_status(folder: Option<String>) -> Result<SkyManifest, String> {
    let dir = resolve_sky_dir(folder.as_deref(), false)
        .map_err(|_| String::new())
        .unwrap_or_default();
    if !dir.as_os_str().is_empty() && dir.is_dir() {
        let m = prune_missing_photos(&dir, read_sky_manifest(folder.as_deref()));
        write_sky_manifest(&dir, &m).ok(); /* persist the prune, like the web */
        Ok(m)
    } else {
        Ok(SkyManifest::default())
    }
}

pub fn add_sky_photo(
    folder: Option<String>,
    name: Option<String>,
    mime: Option<String>,
    data_base64: Option<String>,
    ensure: bool,
) -> Result<serde_json::Value, String> {
    let dir = resolve_sky_dir(folder.as_deref(), ensure)?;
    let mime = mime.unwrap_or_default();
    let ext = EXT_BY_MIME
        .iter()
        .find(|(m, _)| *m == mime)
        .map(|(_, e)| e.to_string())
        .ok_or_else(|| format!("Unsupported image type: {}", mime))?;
    let b64 = data_base64.unwrap_or_default();
    if b64.is_empty() {
        return Err("Empty upload".into());
    }
    let bytes = decode_base64(&b64).ok_or_else(|| "Corrupt upload payload".to_string())?;
    if bytes.is_empty() {
        return Err("Empty upload".into());
    }
    if bytes.len() > MAX_PHOTO_BYTES {
        return Err(format!(
            "Image too large — {} MB, the sky holds 6 MB",
            bytes.len() / 1024 / 1024
        ));
    }

    let mut manifest = prune_missing_photos(&dir, read_sky_manifest(folder.as_deref()));
    if manifest.photos.len() >= MAX_PHOTOS {
        return Err(format!("This sky already holds {} photos — remove one first", MAX_PHOTOS));
    }

    let id = format!(
        "sky-{:x}-{:x}",
        now_millis() as u64,
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .subsec_nanos() as u64
    );
    let photo = SkyPhoto {
        file: format!("assets/{}.{}", id, ext),
        name: name.unwrap_or_else(|| "photo".into()).chars().take(80).collect(),
        mime,
        size: bytes.len() as u64,
        added_at: now_millis(),
        id: id.clone(),
    };

    let target = assets_dir(&dir)?.join(format!("{}.{}", id, ext));
    if !is_inside(&dir, &target) {
        return Err("Unsafe asset path".into());
    }
    fs::write(&target, &bytes).map_err(|e| e.to_string())?;
    let first = manifest.photos.is_empty();
    manifest.photos.push(photo.clone());
    if first && manifest.active_id.is_none() {
        manifest.active_id = Some(id);
    }
    write_sky_manifest(&dir, &manifest)?;
    Ok(serde_json::json!({ "success": true, "photo": photo, "manifest": manifest }))
}

pub fn remove_sky_photo(folder: Option<String>, photo_id: String) -> Result<serde_json::Value, String> {
    let dir = resolve_sky_dir(folder.as_deref(), false)?;
    let mut manifest = prune_missing_photos(&dir, read_sky_manifest(folder.as_deref()));
    let photo = manifest
        .photos
        .iter()
        .find(|p| p.id == photo_id)
        .cloned()
        .ok_or_else(|| "No such photo in this sky".to_string())?;
    let f = dir.join(&photo.file);
    if is_inside(&dir, &f) {
        fs::remove_file(&f).ok(); /* file already gone — registry still updated */
    }
    manifest.photos.retain(|p| p.id != photo_id);
    if manifest.active_id.as_deref() == Some(photo_id.as_str()) {
        manifest.active_id = None;
    }
    write_sky_manifest(&dir, &manifest)?;
    Ok(serde_json::json!({ "success": true, "manifest": manifest }))
}

pub fn set_active_sky_photo(folder: Option<String>, photo_id: Option<String>) -> Result<serde_json::Value, String> {
    let dir = resolve_sky_dir(folder.as_deref(), false)?;
    let mut manifest = prune_missing_photos(&dir, read_sky_manifest(folder.as_deref()));
    if let Some(id) = &photo_id {
        if !manifest.photos.iter().any(|p| &p.id == id) {
            return Err("No such photo in this sky".into());
        }
    }
    manifest.active_id = photo_id;
    write_sky_manifest(&dir, &manifest)?;
    Ok(serde_json::json!({ "success": true, "manifest": manifest }))
}

pub fn update_sky_settings(
    folder: Option<String>,
    patch: Option<SkySettings>,
) -> Result<serde_json::Value, String> {
    let dir = resolve_sky_dir(folder.as_deref(), false)?;
    let mut manifest = prune_missing_photos(&dir, read_sky_manifest(folder.as_deref()));
    let clamp = |v: f64| -> f64 { v.max(0.0).min(1.0) };
    if let Some(p) = patch {
        manifest.settings = SkySettings {
            blend: clamp(p.blend),
            dim: clamp(p.dim),
            blur: clamp(p.blur),
            vignette: clamp(p.vignette),
            drift: clamp(p.drift),
        };
    }
    write_sky_manifest(&dir, &manifest)?;
    Ok(serde_json::json!({ "success": true, "manifest": manifest }))
}

/// Raw bytes of one sky asset. The renderer wraps these in an object URL —
/// the Tauri webview has no HTTP route into the realities tree.
pub fn sky_asset(folder: String, file: String) -> Result<Vec<u8>, String> {
    let dir = resolve_sky_dir(Some(&folder), false)?;
    /* strict whitelist — only generated sky asset names ever leave the disk */
    let valid = {
        let b = file.as_bytes();
        b.len() > 6
            && b.starts_with(b"sky-")
            && b.iter().take(b.len() - 4).all(|c| c.is_ascii_alphanumeric() || *c == b'-')
            && matches!(&b[b.len() - 4..], b".png" | b".jpg" | b".webp" | b".gif" | b".avif")
    };
    if !valid {
        return Err("Unsafe asset name".into());
    }
    let path = dir.join("assets").join(&file);
    if !is_inside(&dir, &path) {
        return Err("Unsafe asset path".into());
    }
    fs::read(&path).map_err(|_| "No such sky asset".to_string())
}

fn decode_base64(input: &str) -> Option<Vec<u8>> {
    const REV: &[i8; 256] = &{
        let mut t = [-1i8; 256];
        let alphabet = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut i = 0;
        while i < 64 {
            t[alphabet[i] as usize] = i as i8;
            i += 1;
        }
        t
    };
    let mut out = Vec::with_capacity(input.len() / 4 * 3);
    let mut buf: u32 = 0;
    let mut bits: u32 = 0;
    for ch in input.bytes() {
        if ch == b'=' || ch == b'\r' || ch == b'\n' {
            continue;
        }
        let v = REV[ch as usize];
        if v < 0 {
            return None;
        }
        buf = (buf << 6) | v as u32;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
        }
    }
    Some(out)
}

/// Extension → mime for the renderer's blob typing (kept for parity).
pub fn mime_for_ext(ext: &str) -> Option<&'static str> {
    MIME_BY_EXT.iter().find(|(e, _)| *e == ext).map(|(_, m)| *m)
}
