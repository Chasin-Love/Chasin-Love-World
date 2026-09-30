//! Desktop persistence: universe state JSON + binary payload store, both in
//! the OS app-data directory. The webview frontend reaches these through the
//! `store_*` commands; the semantics mirror src/vault/storage/indexedDB.ts
//! so the adapter swap is invisible to the rest of the app.

use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::PathBuf;

fn base_dir() -> Result<PathBuf, String> {
    let dir = dirs().ok_or_else(|| "could not resolve app-data dir".to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Public accessor for other modules (realities.rs production fallback).
pub fn app_data_root() -> PathBuf {
    base_dir().unwrap_or_else(|_| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
}

fn payload_dir() -> Result<PathBuf, String> {
    let dir = base_dir()?.join("payloads");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

#[cfg(target_os = "windows")]
fn dirs() -> Option<PathBuf> {
    std::env::var("APPDATA").ok().map(|d| PathBuf::from(d).join("MyUniverse"))
}

#[cfg(not(target_os = "windows"))]
fn dirs() -> Option<PathBuf> {
    std::env::var("XDG_DATA_HOME")
        .ok()
        .map(|d| PathBuf::from(d).join("MyUniverse"))
        .or_else(|| {
            std::env::var("HOME").ok().map(|h| {
                PathBuf::from(h).join(".local").join("share").join("MyUniverse")
            })
        })
}

/* ------------------------------- state JSON ------------------------------ */

#[derive(Serialize)]
pub struct StateSnapshot {
    pub json: Option<String>,
    pub path: String,
    #[serde(rename = "migratedFromWebview")]
    pub migrated_from_webview: bool,
}

/// Read the persisted universe state. `migratedFromWebview` tells the frontend
/// whether the localStorage `my-universe:v4` snapshot still needs importing.
pub fn state_read() -> Result<StateSnapshot, String> {
    let path = base_dir()?.join("universe-state.json");
    let json = match fs::read_to_string(&path) {
        Ok(s) => Some(s),
        Err(_) => None,
    };
    Ok(StateSnapshot {
        json,
        path: path.to_string_lossy().into_owned(),
        migrated_from_webview: false,
    })
}

/// Atomically write the universe state (tmp file + rename).
pub fn state_write(json: String) -> Result<(), String> {
    let path = base_dir()?.join("universe-state.json");
    let tmp = base_dir()?.join("universe-state.json.tmp");
    {
        let mut f = fs::File::create(&tmp).map_err(|e| e.to_string())?;
        f.write_all(json.as_bytes()).map_err(|e| e.to_string())?;
        f.sync_all().ok();
    }
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

/* ------------------------------- payloads -------------------------------- */

/// Store raw payload bytes under payloads/<id>.bin. Called with the binary
/// body via Tauri's raw IPC (tauri::ipc::Request).
pub fn payload_put(id: String, bytes: Vec<u8>) -> Result<(), String> {
    if id.is_empty() || id.contains('/') || id.contains('\\') || id.contains("..") {
        return Err("invalid payload id".into());
    }
    let path = payload_dir()?.join(format!("{}.bin", id));
    let tmp = payload_dir()?.join(format!("{}.bin.tmp", id));
    {
        let mut f = fs::File::create(&tmp).map_err(|e| e.to_string())?;
        f.write_all(&bytes).map_err(|e| e.to_string())?;
        f.sync_all().ok();
    }
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

pub fn payload_get(id: String) -> Result<Option<Vec<u8>>, String> {
    if id.is_empty() || id.contains('/') || id.contains('\\') || id.contains("..") {
        return Err("invalid payload id".into());
    }
    let path = payload_dir()?.join(format!("{}.bin", id));
    match fs::read(&path) {
        Ok(bytes) => Ok(Some(bytes)),
        Err(_) => Ok(None),
    }
}

pub fn payload_delete(id: String) -> Result<(), String> {
    if id.is_empty() || id.contains('/') || id.contains('\\') || id.contains("..") {
        return Err("invalid payload id".into());
    }
    let path = payload_dir()?.join(format!("{}.bin", id));
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
