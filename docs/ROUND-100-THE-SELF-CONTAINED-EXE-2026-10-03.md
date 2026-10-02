# ROUND 100 — THE SELF-CONTAINED EXE

**Date:** 2026-10-03
**Branch:** `r99-the-wheels-connected` (continuing the same working branch — R100 lands as two commits on top of R99.1)
**Status:** complete — 2 commits, receipts read from the binaries themselves, `main` untouched
**Commits:** the probe fix + the weld

---

## The commission

Two sentences from the author, both landing:

1. *"I have MSVC — check please."* — said against the build's long-running
   claim of "No C++ compiler found — building with cosmos FFI stubs."
2. Static linking — *"ok but what about linux users… they are linux users
   after all."*

The first was a test of the project's newest law (R99: **a negative
environment claim gets a disk probe, not just a PATH probe**). The disk
answered: **two full MSVC installations** — Visual Studio 18 Community
(VC tools 14.44 *and* 14.51) plus Build Tools 2022 — on a machine whose
every desktop build since the port began printed "No C++ compiler found."
The probe looked only at the PATH; MSVC is famously not on the PATH outside
a developer prompt. R98's emsdk miss, repeated verbatim, this time
corrected the same day it was caught.

## Commit 1 — the gate stops lying

`has_cpp_compiler()` now asks **vswhere** the same question the `cc` crate
asks (`-requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64`), after
the PATH probe. The stub fallback remains for genuinely bare hosts.

**Receipts:** `desktop:check` runs with ZERO stub warnings;
`libcosmos_engine.a` (888 KB) freshly compiled from the R99-fixed source.
This closes the standing debt recorded since R85: **`cargo check` is
compile-verified on the author's laptop as of today** — R84's FFI
extension, R85's `reality_write_data` twin, R86's seed guard and R98's Rust
edits were all reviewed but never compiled here. Now they are.

(Historical footnote the artifacts wrote for us: a `libcosmos_engine.a`
dated Oct 2 proves R98 *did* compile with MSVC once — while writing
"no compilers on this machine" in its round doc. The PATH probe strikes
again; the brain, not the probe, keeps the truth.)

## Commit 2 — the weld

**The baseline was the smoking gun.** `dumpbin -dependents` on the built
exe showed **`MSVCP140.dll`** — the VC++ Redistributable — in the import
table. A Windows machine without the redist would refuse to START the app.
This is exactly the dependency the author wanted eliminated ("popular apps
ship their dependencies" — the author's own framing).

**The weld:** `cc::Build::static_crt(true)` — the crate's own supported
`/MT` switch (lib.rs line 1387 names it). The C++ core now links `libcpmt`
(the static C++ runtime) instead of `msvcprt` (the dynamic one), read from
the artifact's `DEFAULTLIB` directives. **The exe's redistributable imports
went from 1 to ZERO.** The remaining `api-ms-win-crt-*` imports are the
Universal CRT — a built-in part of Windows 10+ itself, not a download.

Two wrong turns, recorded because they are the lesson:

- `.flag("/MT")` loses — cc appends its own `/MD` after user flags;
  `CXXFLAGS` lands before it too. Both found empirically; the crate source
  gave the supported switch.
- `crt-static` for the Rust half was attempted and **REVERTED**: proc-macro
  crates (`syn`) cannot link a static CRT. The baseline proved it
  unnecessary — the Rust side demanded no redist DLL at all. The only true
  dependency was the C++ half's, and `/MT` killed it.

The Linux twins (`-static-libstdc++`, `-static-libgcc` via
`flag_if_supported` — no-ops where the compiler doesn't know them) weld
`libstdc++`/`libgcc` on gcc builds. **glibc stays dynamic by design** —
static glibc breaks NSS/DNS. CI (windows-latest, ubuntu-latest) inherits
both flags verbatim; `cc` 1.5.1 is pinned in `Cargo.lock`.

**Receipts:** artifact directive `msvcprt` → `libcpmt`; dumpbin redist
count 1 → 0; the exe **launches and lives** under the new linkage (a
missing-DLL binary dies at load); `desktop:check` green.

## The Linux answer (the author's second question)

Linux users never had "these things" to begin with — the VC++ runtime is a
Windows concept, and the same `build.rs` compiles the core with GCC/Clang
on Linux, baked into the binary the same way. The Linux dependency story is
the distro's own, and the repo already ships both canonical shapes:

- **`.deb`** — declares its system dependencies and apt resolves them at
  install: the Linux-native version of "the installer fetches what it
  needs."
- **AppImage** — bundles the app and its libraries into one runnable file:
  the Linux version of "weld everything in."

The one thing no Tauri app can weld on Linux is WebKitGTK — the browser
engine is a system library by design; every Tauri app in the world leans on
the distro for it. With this round's flags, the C++ core and its standard
library are NOT part of that debt anymore.

**New watch item:** CI builds Linux on `ubuntu-latest` (24.04, per
`desktop.yml`'s libappindicator3 note) — glibc is backwards-compatible, so
binaries built on the NEWEST LTS refuse to run on older LTS machines. The
right fix is building on the OLDEST supported runner; deferred because the
workflow's 24.04 workarounds would need re-checking against 22.04 — its own
small round, CI-verifiable only.

## Standing debt after this round

1. ~~`cargo check` on a toolchained host~~ — **CLOSED** (R100 commit 1).
2. ~~The desktop C++ core never compiled locally~~ — **CLOSED** (same).
3. The `verifyParity` button retirement (carried).
4. The smoke boot-retry guard (carried, recommended).
5. Linux CI runner pinning for older-glibc reach (NEW, this round).

## The lesson

R99 wrote it for emsdk; R100 proved it generalizes: **the build
environment's negative claims are the cheapest lies in the project.** Two
rounds in a row, a machine had the tool the build said it lacked. The
general rule now: *before accepting "X is not installed," look in the
places X installs itself — vswhere, the disk, the registry, the brain.*
And on the other side: the dependency you ship is whatever `dumpbin` says
it is — not whatever your build script implies. Read the binary.
