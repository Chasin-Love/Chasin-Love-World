//! The desktop build script — REBORN in R104.
//!
//! One job above all: the C++ simulation core is WELDED into the desktop
//! binary (no DLL, no redist, no dlopen — R100's self-contained-exe law).
//! When no toolchain exists the build must still succeed with the stub FFI,
//! but the loss has to be LOUD — a silent stub build was the exact bug class
//! R100 killed (the PATH probe alone lied: two full MSVC installations sat
//! on this machine while every build printed "No C++ compiler found", until
//! the probe learned to ask vswhere, which finds MSVC without any PATH).

use std::path::PathBuf;

/// Where the core's source lives — anchored on CARGO_MANIFEST_DIR, never on
/// the current directory: whoever invokes cargo (npm, CI, an IDE) must reach
/// the same file. The old relative path resolved OUTSIDE the repo on CI and
/// broke every real-toolchain build with C1083.
fn core_source() -> Option<PathBuf> {
    let manifest = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").ok()?);
    let core = manifest
        .join("..")
        .join("src")
        .join("platform")
        .join("native")
        .join("cosmos_engine.cpp");
    core.is_file().then_some(core)
}

/// The include dir handed to cc (same tree as the source — the header lives
/// beside it).
fn native_include(core: &PathBuf) -> PathBuf {
    core.parent().map(|p| p.to_path_buf()).unwrap_or_else(|| PathBuf::from("."))
}

/// The toolchain probe. PATH first (cl / g++ / c++ / clang++), then — on
/// Windows only — the vswhere disk probe, because MSVC is famously absent
/// from the PATH outside a developer prompt. A negative environment claim
/// gets a disk probe, not just a PATH probe (the R98/R100 lesson family).
fn find_cpp_compiler() -> bool {
    for tool in ["cl", "g++", "c++", "clang++"] {
        let probe = if cfg!(windows) {
            std::process::Command::new("where").arg(tool).output()
        } else {
            std::process::Command::new("which").arg(tool).output()
        };
        if probe.is_ok_and(|out| out.status.success()) {
            return true;
        }
    }

    #[cfg(windows)]
    {
        let vswhere = "C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe";
        let located = std::process::Command::new(vswhere)
            .args([
                "-latest",
                "-products",
                "*",
                "-requires",
                "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
                "-property",
                "installationPath",
            ])
            .output();
        if located.is_ok_and(|out| out.status.success() && !out.stdout.is_empty()) {
            return true;
        }
    }

    false
}

/// Weld the core into the binary. The flag set is the R100 receipt: /O2 +
/// AVX2 (and their GCC twins), fast math, and — the load-bearing line —
/// static_crt(true), cc's own /MT switch, which welds the C++ runtime into
/// the exe so the machine needs zero VC++ Redistributables. (A raw .flag("/MT")
/// loses to cc's appended /MD, and CXXFLAGS lands before it too — both found
/// empirically in R100.) The Linux twins weld libstdc++/libgcc; glibc stays
/// dynamic by design (static glibc breaks NSS).
fn weld_core(core: &PathBuf) {
    println!("cargo:rerun-if-changed={}", core.display());
    cc::Build::new()
        .cpp(true)
        .file(core)
        .include(native_include(core))
        .std("c++20")
        .flag_if_supported("/O2")
        .flag_if_supported("/arch:AVX2")
        .flag_if_supported("-O3")
        .flag_if_supported("-ffast-math")
        .flag_if_supported("-mavx2")
        .static_crt(true)
        .flag_if_supported("-static-libstdc++")
        .flag_if_supported("-static-libgcc")
        .compile("cosmos_engine");
    println!("cargo:rustc-cfg=cosmos_cpp");
}

fn main() {
    /* both cfgs are declared up front so cargo never warns about an
       unexpected cfg whichever mode this host lands in */
    println!("cargo:rustc-check-cfg=cfg(cosmos_cpp)");
    println!("cargo:rustc-check-cfg=cfg(cosmos_stub)");

    match core_source() {
        None => println!(
            "cargo:warning=cosmos_engine.cpp not found in this checkout — building with cosmos FFI stubs"
        ),
        Some(core) => {
            if find_cpp_compiler() {
                weld_core(&core);
            } else {
                println!(
                    "cargo:warning=No C++ compiler found (PATH and vswhere both came up empty) — building with cosmos FFI stubs"
                );
                println!("cargo:rustc-cfg=cosmos_stub");
            }
        }
    }

    tauri_build::build()
}
