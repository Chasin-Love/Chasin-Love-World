//! Reality folder management — REBORN in R104. The desktop twin of the
//! server's reality daemon (server/realityDaemon.ts + server/paths.ts): the
//! same sanitize rules, the same containment guards before every destructive
//! call, the same on-disk tree. In dev it operates on the project's
//! src/realities tree; in production the tree lives in the app-data dir.
//! Custom realities are always authoritative in localStorage — the disk
//! mirror is the durable half.
//!
//! R102 stands here: NO reality folder is special to this backend, the home
//! one included. The only protected name is the bin itself — the system's
//! recycle directory, not a reality.
//!
//! R105: a bin verb that resolves to NOTHING on disk is a success no-op, not
//! an error — in the compiled app a committed pack has no folder in this
//! tree, so the state-side operation IS the whole truth (see `BinOutcome`).

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

/* --------------------------- name + path hygiene -------------------------- */

/// Folder names become directories on disk: keep [A-Za-z0-9-_], refuse the
/// empty and dot forms. This is the exact class the Node side enforces in
/// server/paths.ts — the two backends must never disagree about what a
/// folder name is allowed to be.
pub(crate) fn sanitize_folder_name(raw: &str) -> String {
    let segment: String = raw
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    if segment.is_empty() || segment == "." || segment == ".." {
        String::new()
    } else {
        segment
    }
}

/// True only when `child` sits strictly inside `parent` (both canonicalized;
/// a child equal to the parent is refused — the tree is the boundary).
pub(crate) fn is_inside(parent: &Path, child: &Path) -> bool {
    match (parent.canonicalize(), child.canonicalize()) {
        (Ok(p), Ok(c)) => c.starts_with(&p) && c != p,
        _ => false,
    }
}

/// The desktop twin of `ident()` in server/realityTemplates.ts — the
/// generated module declares `export const <name>Reality`, so a folder like
/// "my-reality" would emit an invalid identifier, and because every reality
/// is compiled together through one eager glob, one bad file white-screens
/// the whole app. Folds to an identifier-safe stem (leading digit →
/// underscore prefix; empty → "reality").
pub(crate) fn ident_of(folder: &str) -> String {
    let cleaned: String = folder
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '_' { c } else { '_' })
        .collect();
    let cleaned = if cleaned.chars().next().is_some_and(|c| c.is_ascii_digit()) {
        format!("_{cleaned}")
    } else {
        cleaned
    };
    if cleaned.is_empty() { "reality".to_string() } else { cleaned }
}

/// The bin (and its hidden twin) is the recycle directory, never a reality.
fn is_protected(name: &str) -> bool {
    name == "bin" || name == ".bin"
}

/* ------------------------------ tree discovery ---------------------------- */

/// Where the realities tree lives, in priority order:
/// 1. `MYU_REALITIES_DIR` — explicit override (dev convenience / CI);
/// 2. the project tree two levels above src-tauri (dev);
/// 3. the app-data mirror (production).
pub(crate) fn realities_dir() -> Result<PathBuf, String> {
    if let Ok(dir) = std::env::var("MYU_REALITIES_DIR") {
        let p = PathBuf::from(dir);
        fs::create_dir_all(&p).map_err(|e| e.to_string())?;
        return Ok(p);
    }
    if let Ok(cwd) = std::env::current_dir() {
        let candidate = cwd.join("..").join("src").join("realities");
        if candidate.join("solPrime").exists() || candidate.is_dir() {
            return Ok(candidate);
        }
    }
    let dir = crate::store::app_data_root().join("realities");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn bin_dir() -> Result<PathBuf, String> {
    let dir = realities_dir()?.join("bin");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/* ------------------------------- the shapes ------------------------------- */

#[derive(Serialize)]
pub struct FolderInfo {
    pub name: String,
    #[serde(rename = "hasIndex")]
    pub has_index: bool,
    #[serde(rename = "hasSurface")]
    pub has_surface: bool,
}

#[derive(Serialize)]
pub struct BinInfo {
    #[serde(rename = "folderName")]
    pub folder_name: String,
    #[serde(rename = "trashedAt")]
    pub trashed_at: f64,
}

/// R105 — the outcome of a bin verb. `noop` means "nothing on disk to operate
/// on": in the compiled desktop app a committed pack (Sol-Prime included) has
/// no folder in this tree at all — its only body is the bundle — so a
/// deletion/restore/purge that resolves to nothing IS already total on disk.
/// The verb succeeds and says so instead of lying about a failure. The Node
/// twin carries the same semantic (server/realityDaemon.ts), and lib.rs
/// shapes both as `{ "success": true, "noop": true }`.
pub struct BinOutcome {
    pub target: String,
    pub noop: bool,
}

fn folder_id_key(s: &str) -> String {
    s.chars().filter(|c| c.is_ascii_alphanumeric()).collect::<String>().to_lowercase()
}

/// ONE factored lookup for the four verbs that hunt a folder by name or id
/// (resolve / restore / purge / rename): a single pass over the directory
/// that skips protected + non-dir entries and accepts a folder when either
/// key matches — the display name case-insensitively, or the reality id
/// alphanumerically-normalized, or the id verbatim. First match wins (the
/// same per-entry priority the pre-rebirth lookups had).
fn locate_folder(
    dir: &Path,
    skip_protected: bool,
    folder_name: Option<&str>,
    reality_id: Option<&str>,
) -> Option<String> {
    for entry in fs::read_dir(dir).ok()?.flatten() {
        if !entry.path().is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().into_owned();
        if skip_protected && is_protected(&name) {
            continue;
        }
        if let Some(f) = folder_name {
            if name.eq_ignore_ascii_case(f) {
                return Some(name);
            }
        }
        if let Some(rid) = reality_id {
            if folder_id_key(&name) == folder_id_key(rid) || name == rid {
                return Some(name);
            }
        }
    }
    None
}

/// Resolve a caller's folder reference to a real folder name, falling back to
/// the sanitized folder_name for create-style flows that target a folder
/// which may not exist yet.
fn resolve_folder(folder_name: Option<&str>, reality_id: Option<&str>) -> Result<String, String> {
    if let Some(found) = locate_folder(&realities_dir()?, true, folder_name, reality_id) {
        return Ok(found);
    }
    let fallback = folder_name.map(sanitize_folder_name).unwrap_or_default();
    if fallback.is_empty() {
        return Err(format!(
            "No folder found for {}",
            reality_id.or(folder_name).as_deref().unwrap_or("?")
        ));
    }
    Ok(fallback)
}

/* -------------------------------- listing --------------------------------- */

pub fn list_folders() -> Result<Vec<FolderInfo>, String> {
    let dir = realities_dir()?;
    let mut out = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten() {
        if !entry.path().is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().into_owned();
        if is_protected(&name) {
            continue;
        }
        out.push(FolderInfo {
            has_index: entry.path().join("index.ts").exists(),
            has_surface: entry.path().join("surface.ts").exists(),
            name,
        });
    }
    Ok(out)
}

pub fn list_bin() -> Result<Vec<BinInfo>, String> {
    let dir = bin_dir()?;
    let mut out = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten() {
        if !entry.path().is_dir() {
            continue;
        }
        /* R105 — dot-directories (.tombstones, the permanent-death ledger)
           are system records, never binned realities */
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        let trashed_at = entry
            .metadata()
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as f64)
            .unwrap_or(0.0);
        out.push(BinInfo {
            folder_name: name,
            trashed_at,
        });
    }
    Ok(out)
}

/* ----------------------- R105 permanent-death tombstones -------------------
   A tombstone is an empty file, bin/.tombstones/<realityId>.tombstone — the
   disk-side record that this reality id was deleted ON PURPOSE. The client
   adopts tombstoned ids at boot (App.tsx) and on every sync poll
   (realitySync), so even a wiped / fresh-installed / corrupt saved state can
   never resurrect a deleted reality: the compiled desktop bundle always
   carries its packs, and this record is what keeps them dead. Written by
   move-to-bin and purge (a purge keeps it — permanent death), removed by
   restore, KEPT by empty. The Node twin (server/realityDaemon.ts) writes the
   same files with the same filename rule: the id verbatim, only when it is
   already filename-safe ([A-Za-z0-9._-]+). */

fn is_tombstone_safe_id(id: &str) -> bool {
    !id.is_empty()
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_')
}

fn tombstone_path(reality_id: &Option<String>) -> Option<PathBuf> {
    let id = reality_id.as_deref()?.trim();
    if !is_tombstone_safe_id(id) {
        return None;
    }
    Some(bin_dir().ok()?.join(".tombstones").join(format!("{id}.tombstone")))
}

fn write_tombstone(reality_id: &Option<String>) {
    let Some(path) = tombstone_path(reality_id) else {
        return;
    };
    if let Some(dir) = path.parent() {
        if let Err(e) = fs::create_dir_all(dir) {
            eprintln!("[realities] tombstone write failed: {e}");
            return;
        }
    }
    if let Err(e) = fs::write(&path, "") {
        eprintln!("[realities] tombstone write failed: {e}");
    }
}

fn remove_tombstone(reality_id: &Option<String>) {
    if let Some(path) = tombstone_path(reality_id) {
        let _ = fs::remove_file(path);
    }
}

pub fn list_tombstones() -> Result<Vec<String>, String> {
    let dir = match bin_dir() {
        Ok(dir) => dir.join(".tombstones"),
        Err(_) => return Ok(Vec::new()),
    };
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if let Some(id) = name.strip_suffix(".tombstone") {
            out.push(id.to_string());
        }
    }
    Ok(out)
}

/* -------------------------------- the bin ---------------------------------
   Every destructive verb checks containment BEFORE it destroys — the guard
   after the rm is not a guard. R102: any reality can be binned, restored,
   purged or renamed; the refusal below only stops the bin eating itself. */

pub fn move_to_bin(reality_id: Option<String>, folder_name: Option<String>) -> Result<BinOutcome, String> {
    let target = resolve_folder(folder_name.as_deref(), reality_id.as_deref())?;
    if target == "bin" || target == ".bin" {
        return Err("Refusing to move the bin directory into itself.".into());
    }
    let src = realities_dir()?.join(&target);
    let dst = bin_dir()?.join(&target);
    if !is_inside(&realities_dir()?, &src) || !is_inside(&bin_dir()?, &dst) {
        return Err("Resolved path escaped the realities tree; refused.".into());
    }
    if !src.exists() {
        /* R105 — nothing on disk to move is a COMPLETED deletion, not a
           failure: erroring here made the app lie ("could not reach the bin")
           and burn the retry queue for a deletion that had already fully
           happened. (Node twin: realityDaemon.moveToBin's same branch.) */
        write_tombstone(&reality_id);
        return Ok(BinOutcome { target, noop: true });
    }
    if dst.exists() {
        fs::remove_dir_all(&dst).map_err(|e| e.to_string())?;
    }
    fs::rename(&src, &dst).map_err(|e| e.to_string())?;
    write_tombstone(&reality_id);
    Ok(BinOutcome { target, noop: false })
}

pub fn restore_from_bin(reality_id: Option<String>, folder_name: Option<String>) -> Result<BinOutcome, String> {
    let bin = bin_dir()?;
    let target = match locate_folder(&bin, false, folder_name.as_deref(), reality_id.as_deref()) {
        Some(found) => found,
        None => {
            /* R105 — nothing trashed on disk is a completed restore, not a
               failure: a committed pack restored in the compiled app never
               had a folder here; the state-side restore that already ran IS
               the whole truth. (Node twin: restoreFromBin's same branch.) */
            let target = reality_id.clone().unwrap_or_default();
            remove_tombstone(&reality_id);
            return Ok(BinOutcome { target, noop: true });
        }
    };
    let src = bin.join(&target);
    let dst = realities_dir()?.join(&target);
    if !is_inside(&bin, &src) || !is_inside(&realities_dir()?, &dst) {
        return Err("Resolved path escaped the realities tree; refused.".into());
    }
    if dst.exists() {
        fs::remove_dir_all(&dst).map_err(|e| e.to_string())?;
    }
    fs::rename(&src, &dst).map_err(|e| e.to_string())?;
    remove_tombstone(&reality_id);
    Ok(BinOutcome { target, noop: false })
}

pub fn purge_from_bin(reality_id: Option<String>, folder_name: Option<String>) -> Result<BinOutcome, String> {
    let bin = bin_dir()?;
    let target = match locate_folder(&bin, false, folder_name.as_deref(), reality_id.as_deref()) {
        Some(found) => found,
        None => {
            /* R105 — nothing in the bin to erase is a completed purge, not a
               failure: a committed pack purged in the compiled app never had
               a folder here; the zero-trace purge that already ran in state
               IS the whole truth. (Node twin: purgeFromBin's same branch.) */
            let target = reality_id.clone().unwrap_or_default();
            write_tombstone(&reality_id);
            return Ok(BinOutcome { target, noop: true });
        }
    };
    let path = bin.join(&target);
    if !is_inside(&bin, &path) {
        return Err("Resolved path escaped the bin tree; refused.".into());
    }
    fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
    /* R105 — a purge KEEPS its tombstone: the reality is permanently dead
       and the record is what keeps it dead across state wipes. */
    write_tombstone(&reality_id);
    Ok(BinOutcome { target, noop: false })
}

pub fn empty_bin() -> Result<u32, String> {
    let bin = bin_dir()?;
    let mut count = 0u32;
    for entry in fs::read_dir(&bin).map_err(|e| e.to_string())?.flatten() {
        if !entry.path().is_dir() {
            continue;
        }
        /* R105 — the .tombstones ledger (dot-directories) is NEVER emptied:
           it IS the record that keeps the emptied realities dead forever */
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        let path = bin.join(&name);
        if !is_inside(&bin, &path) {
            continue;
        }
        fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
        count += 1;
    }
    /* R105 — the tombstones (bin/.tombstones) are KEPT: emptying the bin is
       the last word, and the records are what keep the emptied realities
       dead forever. */
    Ok(count)
}

/* -------------------------------- renaming -------------------------------- */

pub fn rename_folder(reality_id: String, new_name: String) -> Result<String, String> {
    /* R102 — rename is free for every reality, the home one too. The on-disk
       identity derives the same way the Node daemon derives it: strip every
       non-alphanumeric, then lowercase the first character. */
    let clean_new: String = new_name.chars().filter(|c| c.is_ascii_alphanumeric()).collect();
    if clean_new.is_empty() {
        return Err("New name contains no valid characters.".into());
    }
    let mut chars = clean_new.chars();
    let first = chars.next().unwrap().to_lowercase().next().unwrap();
    let new_folder: String = first.to_string() + &chars.as_str().to_string();

    let dir = realities_dir()?;
    let old = locate_folder(&dir, true, None, Some(&reality_id))
        .ok_or_else(|| format!("Could not find reality folder for {}", reality_id))?;
    if old == new_folder {
        return Ok(new_folder);
    }

    let src = dir.join(&old);
    let dst = dir.join(&new_folder);
    if !is_inside(&dir, &src) || !is_inside(&dir, &dst) {
        return Err("Resolved path escaped the realities tree; refused.".into());
    }
    if dst.exists() {
        fs::remove_dir_all(&dst).map_err(|e| e.to_string())?;
    }
    fs::rename(&src, &dst).map_err(|e| e.to_string())?;

    /* Patch the display name in BOTH generated modules — the same file set
       the Node daemon patches. The R98 defect taught why both: a rename that
       touched only index.ts left surface.ts holding the old name, one world
       with two names depending on the backend. Both templates carry a `name`
       field, so both are rewritten. The replacement splices a JSON string
       literal over the ENTIRE quoted span (quotes included): the old naive
       \' splice let a trailing backslash escape the closing quote, corrupt
       the module, and the eager glob white-screened the app. */
    for file in ["index.ts", "surface.ts"] {
        let module_path = dst.join(file);
        if !module_path.exists() {
            continue;
        }
        let content = fs::read_to_string(&module_path).map_err(|e| e.to_string())?;
        let Some(start) = content.find("name:") else { continue };
        let Some(q1off) = content[start..].find(['\'', '"']) else { continue };
        let q1 = start + q1off;
        let quote = content.as_bytes()[q1] as char;
        let Some(len) = content[q1 + 1..].find(quote) else { continue };
        let name_literal = serde_json::to_string(&new_name).unwrap_or_else(|_| "\"\"".into());
        let mut patched = String::from(&content[..q1]);
        patched.push_str(&name_literal);
        patched.push_str(&content[q1 + 1 + len..]);
        fs::write(&module_path, patched).map_err(|e| e.to_string())?;
    }
    Ok(new_folder)
}

/* ----------------------------- folder creation ---------------------------- */

/// Create a new reality folder on disk with index.ts + surface.ts templates
/// matching the server's create-folder generator (UniverseSurfaceConfig
/// schema). Returns the folder name.
#[allow(clippy::too_many_arguments)]
pub fn create_folder(
    id: Option<String>,
    name: String,
    code_name: Option<String>,
    spectral: Option<String>,
    description: Option<String>,
    color_a: String,
    color_b: String,
    star_color: String,
    bodies_json: String,
    entries_json: String,
    folder_name: Option<String>,
    galaxy_count_hint: Option<u32>,
) -> Result<String, String> {
    if name.trim().is_empty() {
        return Err("Reality name is required".into());
    }
    let mut folder = folder_name
        .as_deref()
        .map(sanitize_folder_name)
        .unwrap_or_default();
    if folder.is_empty() {
        /* derive from the display name: keep word characters, split on
           separators, camelCase the tail — "my first world" → "myFirstWorld" */
        let raw: String = name
            .trim()
            .chars()
            .filter(|c| c.is_ascii_alphanumeric() || *c == ' ' || *c == '-' || *c == '_')
            .collect();
        let words: Vec<String> = raw
            .split(|c: char| c == ' ' || c == '-' || c == '_')
            .filter(|w| !w.is_empty())
            .enumerate()
            .map(|(i, w)| {
                let lower = w.to_lowercase();
                if i == 0 {
                    lower
                } else {
                    let mut cs = lower.chars();
                    match cs.next() {
                        Some(f) => f.to_uppercase().collect::<String>() + cs.as_str(),
                        None => String::new(),
                    }
                }
            })
            .collect();
        folder = words.join("");
    }
    if folder.is_empty() {
        folder = format!(
            "reality_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
        );
    }

    let dir = realities_dir()?;
    let target = dir.join(&folder);
    if !is_inside(&dir, &target) {
        return Err("Invalid folder name".into());
    }
    fs::create_dir_all(&target).map_err(|e| e.to_string())?;

    let clean_id = id.unwrap_or_else(|| {
        folder
            .chars()
            .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
            .collect::<String>()
            .to_lowercase()
    });
    let ident = ident_of(&folder);
    let var_name = format!("{ident}Reality");
    let surface_var = format!("{ident}Surface");
    /* every user-controlled value crosses as a JSON string literal (JSON is a
       subset of TS expression syntax for strings). Raw single-quote splices
       were the injection hole the Round-1 fix closed on the server — a
       crafted color like x',evil(),y would execute inside the generated
       module; the same fix lives here. */
    let esc = |s: &str| -> String { serde_json::to_string(s).unwrap_or_else(|_| "\"\"".into()) };

    let surface = format!(
        "import {{ UniverseSurfaceConfig }} from '../types';\n\nexport const {sv}: UniverseSurfaceConfig = {{\n  realityId: {cid},\n  name: {name},\n  colorA: {ca},\n  colorB: {cb},\n  deepColor: '#030108',\n  starColor: {sc},\n  webFilaments: {ca},\n  nebulaIntensity: 1.0,\n  dustLaneIntensity: 0.8,\n  starDensity: 0.85,\n}};\n",
        sv = surface_var,
        cid = esc(&clean_id),
        name = esc(&name),
        ca = esc(&color_a),
        cb = esc(&color_b),
        sc = esc(&star_color),
    );
    fs::write(target.join("surface.ts"), surface).map_err(|e| e.to_string())?;

    let index = format!(
        "import {{ RealityConfig }} from '../types';\nimport {{ {sv} }} from './surface';\n\nconst day = 86400000;\nconst now = Date.now();\nconst TAU = Math.PI * 2;\n\nexport const {v}: RealityConfig = {{\n  id: {cid},\n  name: {name},\n  codeName: {cn},\n  spectral: {sp},\n  description: {desc},\n  bubblePos: [0, 0, 0],\n  bubbleSize: 7500,\n  colorA: {ca},\n  colorB: {cb},\n  starColor: {sc},\n  bodies: {bodies},\n  entries: {entries},{hint}\n}};\n\nexport * from './surface';\n",
        sv = surface_var,
        v = var_name,
        cid = esc(&clean_id),
        name = esc(&name),
        cn = esc(code_name.as_deref().unwrap_or(&format!("REALITY-{}", folder.to_uppercase()))),
        sp = esc(spectral.as_deref().unwrap_or("Quantum Singularity")),
        desc = esc(description.as_deref().unwrap_or(&format!("The {} continuum realm.", name))),
        ca = esc(&color_a),
        cb = esc(&color_b),
        sc = esc(&star_color),
        bodies = if bodies_json.trim().is_empty() || bodies_json == "[]" {
            default_bodies_json(&clean_id, &name, &color_a, &color_b)
        } else {
            bodies_json
        },
        entries = entries_json,
        hint = galaxy_count_hint
            .map(|h| format!("\n  galaxyCountHint: {},", h.clamp(1, 12)))
            .unwrap_or_default(),
    );
    fs::write(target.join("index.ts"), index).map_err(|e| e.to_string())?;
    Ok(folder)
}

/* ------------------------------ the data mirror ---------------------------- */

/// Write a reality's world database to its own folder (data.json) — the
/// desktop twin of the server's POST /api/realities/write-data, with the
/// same resolve → contain → skip-identical semantics. `data_json` is the
/// caller's data object, serialized by the adapter before it crosses the
/// bridge. (The Node daemon's in-memory markRecentlyWritten has no desktop
/// twin — the Tauri daemon status carries no operations log.)
pub fn write_data(
    reality_id: Option<String>,
    folder_name: Option<String>,
    data_json: String,
) -> Result<String, String> {
    let data: serde_json::Value =
        serde_json::from_str(&data_json).map_err(|e| format!("data object is required: {}", e))?;
    if !data.is_object() {
        return Err("data object is required".into());
    }

    let target = resolve_folder(folder_name.as_deref(), reality_id.as_deref())?;
    /* R83-2: the committed seed is boot truth — its data.json mirror is
       read-only to the browser on BOTH backends. (R102 removed every other
       special case; this one protects the committed FILE, never the deletion
       right.) */
    if target == "solPrime" || target == "sol-prime"
        || reality_id.as_deref() == Some("sol-prime")
        || folder_name.as_deref() == Some("solPrime")
        || folder_name.as_deref() == Some("sol-prime")
    {
        return Err("Sol Prime is the read-only seed — its mirror is not browser-writable.".into());
    }
    let dir = realities_dir()?;
    let folder = dir.join(&target);
    if !is_inside(&dir, &folder) || !folder.exists() {
        return Err("Reality folder does not exist".into());
    }

    let mut next = data;
    if let (Some(obj), Some(rid)) = (next.as_object_mut(), reality_id.as_deref()) {
        obj.insert("realityId".into(), serde_json::Value::String(rid.into()));
    }
    let mirrored_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    if let Some(obj) = next.as_object_mut() {
        obj.insert("mirroredAt".into(), serde_json::Value::Number(mirrored_at.into()));
    }

    /* data.json is not a module — Vite ignores it — but writes stay honest:
       skip when the content is identical minus the timestamp. */
    let data_file = folder.join("data.json");
    let mut skip = false;
    if let Ok(prev_raw) = fs::read_to_string(&data_file) {
        if let Ok(mut prev) = serde_json::from_str::<serde_json::Value>(&prev_raw) {
            if let (Some(prev_obj), Some(next_obj)) = (prev.as_object_mut(), next.as_object()) {
                prev_obj.remove("mirroredAt");
                let mut next_rest = next_obj.clone();
                next_rest.remove("mirroredAt");
                skip = *prev_obj == next_rest;
            }
        }
    }
    if !skip {
        let serialized = serde_json::to_string_pretty(&next).map_err(|e| e.to_string())?;
        fs::write(&data_file, serialized).map_err(|e| e.to_string())?;
    }
    Ok(format!("src/realities/{}/data.json", target))
}

/* ----------------------------- the seed roster ----------------------------- */

/// The two starter bodies a brand-new reality boots with (star + planet),
/// matching the server's create-folder generator. Same rule as the module
/// templates: interpolated text crosses as JSON literals, never raw
/// quote-splices — the palette colors are string literals inside the bodies
/// array and the id is sanitized but escaped anyway, so the invariant holds
/// unconditionally.
fn default_bodies_json(clean_id: &str, name: &str, color_a: &str, color_b: &str) -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let ca = serde_json::to_string(color_a).unwrap_or_else(|_| "\"\"".into());
    let cb = serde_json::to_string(color_b).unwrap_or_else(|_| "\"\"".into());
    let core_name = serde_json::to_string(&format!("{name} Core Star")).unwrap_or_else(|_| "\"\"".into());
    let prime_name = serde_json::to_string(&format!("{name} Prime")).unwrap_or_else(|_| "\"\"".into());
    let core_note = serde_json::to_string(&format!("The stellar anchor of {name}."))
        .unwrap_or_else(|_| "\"\"".into());
    let prime_note = serde_json::to_string(&format!("The primordial terrestrial world of {name}."))
        .unwrap_or_else(|_| "\"\"".into());
    format!(
        "[\n    {{\n      id: {cid},\n      name: {core_name},\n      kind: 'star',\n      meaning: null,\n      note: {core_note},\n      createdAt: {now},\n      radius: 6.5,\n      palette: {{ deep: '#1c0e35', base: {ca}, high: '#ffffff', atmo: {cb}, ice: '#ffffff' }},\n      orbit: {{ a: 0, speed: 0, phase: 0, incl: 0 }},\n    }},\n    {{\n      id: {cid2},\n      name: {prime_name},\n      kind: 'planet',\n      meaning: 'moment',\n      note: {prime_note},\n      createdAt: {now},\n      radius: 2.2,\n      clouds: true,\n      nightside: true,\n      palette: {{ deep: '#0c1b33', base: '#10b981', high: '#6ee7b7', atmo: {ca}, ice: '#e0f2fe' }},\n      orbit: {{ a: 45, speed: Math.PI * 2 / 365, phase: 1.2, incl: 0.04 }},\n    }}\n  ]",
        cid = serde_json::to_string(&format!("{clean_id}-core")).unwrap_or_else(|_| "\"\"".into()),
        cid2 = serde_json::to_string(&format!("{clean_id}-prime")).unwrap_or_else(|_| "\"\"".into()),
        core_name = core_name,
        prime_name = prime_name,
        core_note = core_note,
        prime_note = prime_note,
        ca = ca,
        cb = cb,
        now = now
    )
}
