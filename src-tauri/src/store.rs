//! Desktop persistence — REBORN in R104. The universe state JSON and the
//! binary payload store live in the OS app-data directory, and the webview
//! reaches them only through the `store_*` commands in lib.rs. The on-disk
//! layout is a compatibility contract (the author's existing data lives in
//! it): `<app-data>/universe-state.json` and `<app-data>/payloads/<id>.bin`,
//! written atomically (tmp file + rename) so a crash never half-writes a
//! universe. The semantics mirror src/vault/storage/indexedDB.ts so the
//! adapter swap stays invisible to the rest of the app.

use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::PathBuf;

/* ------------------------------ where things live ------------------------ */

/// The store root. Windows: `%APPDATA%\MyUniverse`. Everywhere else:
/// `$XDG_DATA_HOME/MyUniverse` or `~/.local/share/MyUniverse`.
fn root() -> Result<PathBuf, String> {
    let dir = app_data_dir().ok_or_else(|| "could not resolve app-data dir".to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

#[cfg(target_os = "windows")]
fn app_data_dir() -> Option<PathBuf> {
    std::env::var("APPDATA").ok().map(|d| PathBuf::from(d).join("MyUniverse"))
}

#[cfg(not(target_os = "windows"))]
fn app_data_dir() -> Option<PathBuf> {
    std::env::var("XDG_DATA_HOME")
        .ok()
        .map(|d| PathBuf::from(d).join("MyUniverse"))
        .or_else(|| {
            std::env::var("HOME").ok().map(|h| {
                PathBuf::from(h).join(".local").join("share").join("MyUniverse")
            })
        })
}

fn state_file() -> Result<PathBuf, String> {
    Ok(root()?.join("universe-state.json"))
}

fn payload_file(id: &str) -> Result<PathBuf, String> {
    Ok(root()?.join("payloads").join(format!("{id}.bin")))
}

fn payloads_dir() -> Result<PathBuf, String> {
    let dir = root()?.join("payloads");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Payload ids become filenames, so they are validated like filenames: no
/// empty ids, no path separators, no traversal. One guard, all three verbs.
fn valid_payload_id(id: &str) -> bool {
    !id.is_empty() && !id.contains('/') && !id.contains('\\') && !id.contains("..")
}

/// Write bytes to `path` through a tmp sibling + rename — the atomic pattern
/// every store write uses.
fn write_atomic(path: &PathBuf, bytes: &[u8]) -> Result<(), String> {
    let tmp = path.with_extension("tmp");
    {
        let mut f = fs::File::create(&tmp).map_err(|e| e.to_string())?;
        f.write_all(bytes).map_err(|e| e.to_string())?;
        f.sync_all().ok();
    }
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}

/* --------------------------------- the API -------------------------------- */

/// The root other modules resolve against (realities.rs production tree).
pub fn app_data_root() -> PathBuf {
    root().unwrap_or_else(|_| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
}

#[derive(Serialize)]
pub struct StateSnapshot {
    pub json: Option<String>,
    pub path: String,
    #[serde(rename = "migratedFromWebview")]
    pub migrated_from_webview: bool,
}

/// Read the persisted universe state. `migratedFromWebview` tells the
/// frontend whether the localStorage `my-universe:v4` snapshot still needs
/// importing (false since the R79 hotfix closed the adoption loop).
pub fn state_read() -> Result<StateSnapshot, String> {
    let path = state_file()?;
    let json = fs::read_to_string(&path).ok();
    Ok(StateSnapshot {
        json,
        path: path.to_string_lossy().into_owned(),
        migrated_from_webview: false,
    })
}

pub fn state_write(json: String) -> Result<(), String> {
    write_atomic(&state_file()?, json.as_bytes())
}

pub fn payload_put(id: String, bytes: Vec<u8>) -> Result<(), String> {
    if !valid_payload_id(&id) {
        return Err("invalid payload id".into());
    }
    payloads_dir()?;
    write_atomic(&payload_file(&id)?, &bytes)
}

pub fn payload_get(id: String) -> Result<Option<Vec<u8>>, String> {
    if !valid_payload_id(&id) {
        return Err("invalid payload id".into());
    }
    Ok(fs::read(payload_file(&id)?).ok())
}

pub fn payload_delete(id: String) -> Result<(), String> {
    if !valid_payload_id(&id) {
        return Err("invalid payload id".into());
    }
    let path = payload_file(&id)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
