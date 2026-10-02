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
    /* R100 — the PATH probe alone LIED. MSVC is famously not on the PATH
       outside a developer prompt, and this laptop carried TWO full MSVC
       installations (VS 18 Community + Build Tools 2022) while every local
       desktop build printed "No C++ compiler found" and fell back to the
       FFI stubs. The cc crate locates MSVC through vswhere (and the
       registry) without any PATH, so the gate must ask vswhere the same
       question before declaring the machine bare. Same lesson as R98's
       emsdk: a negative environment claim gets a disk probe, not just a
       PATH probe. */
    #[cfg(windows)]
    {
        let vswhere = "C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe";
        if let Ok(out) = std::process::Command::new(vswhere)
            .args([
                "-latest",
                "-products",
                "*",
                "-requires",
                "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
                "-property",
                "installationPath",
            ])
            .output()
        {
            if out.status.success() && !out.stdout.is_empty() {
                return true;
            }
        }
    }
    false
}

fn main() {
    println!("cargo:rustc-check-cfg=cfg(cosmos_cpp)");
    println!("cargo:rustc-check-cfg=cfg(cosmos_stub)");
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
            /* R100 — WELD THE RUNTIME IN. cc's default /MD makes the binary
               demand MSVCP140.dll (the VC++ Redistributable) at load time —
               dumpbin proved it, and a machine without the redist refuses to
               start the app at all. static_crt(true) is cc's OWN supported
               /MT switch (a raw .flag("/MT") loses to cc's appended /MD, and
               CXXFLAGS lands before it too — both found empirically); the
               C++ runtime is then welded into the exe and the redist count
               drops to zero. The Linux twins weld libstdc++/libgcc the same
               way; glibc stays dynamic by design (static glibc breaks NSS).
               flag_if_supported keeps every flag a no-op where the compiler
               doesn't know it. */
            .static_crt(true)
            .flag_if_supported("-static-libstdc++")
            .flag_if_supported("-static-libgcc")
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
