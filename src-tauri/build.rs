use std::path::PathBuf;

fn has_cpp_compiler() -> bool {
    for tool in ["cl", "g++", "c++", "clang++"] {
        let probe = if cfg!(windows) {
            std::process::Command::new("where").arg(tool).output()
        } else {
            std::process::Command::new("which").arg(tool).output()
        };
        if let Ok(out) = probe {
            if out.status.success() {
                return true;
            }
        }
    }
    false
}

fn main() {
    // Cargo runs build scripts with the CWD set to this package's root
    // (src-tauri/) — but never rely on the CWD: anchor every path on
    // CARGO_MANIFEST_DIR so the core is found no matter who invokes cargo,
    // from where, or on which CI runner. (The old `../../src/...` relative
    // path resolved OUTSIDE the repository and broke every CI build with a
    // real C++ toolchain: `clxx : fatal error C1083: Cannot open source file`.)
    let manifest_dir = PathBuf::from(
        std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is set by cargo"),
    );
    let native_dir = manifest_dir
        .join("..")
        .join("src")
        .join("platform")
        .join("native");
    let core_source = native_dir.join("cosmos_engine.cpp");

    if has_cpp_compiler() && core_source.is_file() {
        // The C++ simulation core is compiled and linked directly into the
        // Tauri binary. The renderer reaches it through the invoke commands
        // in src/lib.rs — no dlopen/LoadLibrary.
        println!("cargo:rerun-if-changed={}", core_source.display());
        cc::Build::new()
            .cpp(true)
            .file(&core_source)
            .include(&native_dir)
            .std("c++20")
            .flag_if_supported("/O2")
            .flag_if_supported("/arch:AVX2")
            .flag_if_supported("-O3")
            .flag_if_supported("-ffast-math")
            .flag_if_supported("-mavx2")
            .compile("cosmos_engine");
        println!("cargo:rustc-cfg=cosmos_cpp");
    } else if !core_source.is_file() {
        // The core source is missing from this checkout (it must be committed
        // at src/platform/native/cosmos_engine.cpp) — build with stubs rather
        // than hard-failing, but make the loss loud.
        println!(
            "cargo:warning=cosmos_engine.cpp not found at {} — building with cosmos FFI stubs",
            core_source.display()
        );
        println!("cargo:rustc-cfg=cosmos_stub");
    } else {
        // No C++ toolchain on this machine (e.g. a bare `cargo check` host):
        // build with the stub FFI so type-checking still works. Real builds
        // (CI windows-latest / ubuntu-latest, or after running
        // scripts/setup-windows-toolchain.ps1) compile the genuine core.
        println!("cargo:warning=No C++ compiler found — building with cosmos FFI stubs");
        println!("cargo:rustc-cfg=cosmos_stub");
    }

    tauri_build::build()
}
