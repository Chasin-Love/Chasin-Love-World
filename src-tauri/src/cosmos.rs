//! The Rust side of the C++ simulation core's FFI — REBORN in R104, derived
//! directly from `src/platform/native/cosmos_engine.hpp` (the header IS the
//! contract: every declaration below mirrors an `extern "C"` export there,
//! parameter for parameter; `physicsEngine.ts` stays the TS reference the C++
//! must stay numerically identical to).
//!
//! Two compile modes, decided by build.rs:
//! - `cosmos_cpp` — build.rs found a C++ toolchain and welded
//!   `cosmos_engine.cpp` into this binary via the `cc` crate; the extern
//!   declarations below link against it directly (no dlopen, ever).
//! - `cosmos_stub` — no toolchain (a bare `cargo check` host): the stub
//!   module keeps the crate type-correct. A binary built this way reports
//!   `backend: "stub"` through `cosmos_status` and never claims native
//!   physics — degradation is a value, never a shrug.

#![allow(dead_code)]

#[allow(unused_imports)]
use std::ffi::{c_char, c_double, c_int};

/// Body-kind encoding, fixed by `COSMOS_KIND_*` in cosmos_engine.hpp and
/// mirrored by the `kind` mapping in src/platform/native/cpp_bridge.ts.
pub const KIND_STAR: i32 = 0;
pub const KIND_PLANET: i32 = 1;
pub const KIND_DWARF: i32 = 2;
pub const KIND_NEBULA: i32 = 3;
pub const KIND_HOLE: i32 = 4;
pub const KIND_VAULT: i32 = 5;

/// Telemetry fields per body from `cosmos_physics_batch` — fixed by
/// `COSMOS_PHYSICS_FIELD_COUNT` in the header, mirroring BodyPhysicsData in
/// src/physics/physicsEngine.ts in exact order.
pub const PHYSICS_FIELD_COUNT: usize = 41;

/* The real core — one `extern "C"` block per export family, in the order the
   header declares them. */
#[cfg(cosmos_cpp)]
pub(crate) mod ffi {
    use std::ffi::{c_char, c_double, c_int, c_void};

    extern "C" {
        /* Engine identity for honest telemetry (never hard-coded in JS). */
        pub fn cosmos_version() -> *const c_char;

        /* Single-body Kepler solve — the port of calculateKeplerPosition.
           `out` receives 5 written doubles: x, y, z, radius, trueAnomaly. */
        pub fn cosmos_orbit_position(
            a: c_double,
            eccentricity: c_double,
            phase: c_double,
            inclination: c_double,
            sim_days: c_double,
            speed: c_double,
            out: *mut c_double,
        );

        /* Batch Kepler positions for n bodies. node/arg_peri carry the R84
           ascending-node elements; NULL or per-entry 0 means the historical
           node-at-X plane. Outputs: out_xyz (3n), out_radius (n),
           out_true_anomaly (n). */
        pub fn cosmos_kepler_batch(
            a: *const c_double,
            e: *const c_double,
            phase: *const c_double,
            incl: *const c_double,
            speed: *const c_double,
            n: c_int,
            sim_days: c_double,
            node: *const c_double,
            arg_peri: *const c_double,
            out_xyz: *mut c_double,
            out_radius: *mut c_double,
            out_true_anomaly: *mut c_double,
        );

        /* Full astrophysics telemetry batch — the port of calculatePhysics.
           ids are NUL-terminated body-id pointers for profile lookup; out is
           n × PHYSICS_FIELD_COUNT doubles, row-major per body. */
        pub fn cosmos_physics_batch(
            ids: *const *const c_char,
            orbit_a: *const c_double,
            radius: *const c_double,
            kinds: *const c_int,
            has_rings: *const c_int,
            phase: *const c_double,
            speed: *const c_double,
            n: c_int,
            sim_time_sec: c_double,
            out: *mut c_double,
        );

        /* Terrain value-noise fbm — bit-exact port of cpuFbm. */
        pub fn cosmos_terrain_fbm(x: c_double, y: c_double) -> c_double;

        /* RK4 ops/sec benchmark on an internal simulator instance. */
        pub fn cosmos_benchmark_rk4(n_bodies: c_int, iterations: c_int) -> c_double;

        /* The handle-based N-body session family (R87/R91): one live
           simulator owned by the caller, RK4 inside, SI units throughout. */
        pub fn cosmos_create_simulator() -> *mut c_void;
        pub fn cosmos_destroy_simulator(handle: *mut c_void);
        pub fn cosmos_add_body(
            handle: *mut c_void,
            id: u32,
            mass: c_double,
            radius: c_double,
            px: c_double, py: c_double, pz: c_double,
            vx: c_double, vy: c_double, vz: c_double,
        );
        pub fn cosmos_step_simulation(handle: *mut c_void, dt: c_double, iterations: c_int);
        pub fn cosmos_get_body_state(
            handle: *mut c_void,
            index: u32,
            out_pos: *mut c_double,
            out_vel: *mut c_double,
        );
        /* R91 — the batched session read: one call returns every body.
           `out` holds 6 × count doubles row-major (px,py,pz,vx,vy,vz); the
           return value is the number of bodies actually written (≤ count). */
        pub fn cosmos_get_body_states(
            handle: *mut c_void,
            count: u32,
            out: *mut c_double,
        ) -> u32;
        pub fn cosmos_time_dilation(radius: c_double, mass: c_double) -> c_double;
    }
}

/* The type-correct stand-in for toolchain-less hosts. Every stub answers the
   same signature with the same zero-value semantics the real core would give
   an empty universe — callers honor returned counts, never assumptions. */
#[cfg(cosmos_stub)]
pub(crate) mod ffi {
    use std::ffi::{c_char, c_double, c_int, c_void};

    pub unsafe fn cosmos_version() -> *const c_char {
        b"stub\0".as_ptr() as *const c_char
    }

    pub unsafe fn cosmos_orbit_position(
        _a: c_double, _e: c_double, _phase: c_double, _incl: c_double,
        _days: c_double, _speed: c_double, out: *mut c_double,
    ) {
        if !out.is_null() {
            *out.add(0) = 0.0; *out.add(1) = 0.0; *out.add(2) = 0.0;
            *out.add(3) = 0.0; *out.add(4) = 0.0;
        }
    }

    pub unsafe fn cosmos_kepler_batch(
        _a: *const c_double, _e: *const c_double, _phase: *const c_double,
        _incl: *const c_double, _speed: *const c_double, n: c_int,
        _days: c_double, _node: *const c_double, _arg_peri: *const c_double,
        out_xyz: *mut c_double, out_radius: *mut c_double,
        out_anomaly: *mut c_double,
    ) {
        let n = n.max(0) as usize;
        if !out_xyz.is_null() { std::slice::from_raw_parts_mut(out_xyz, n * 3).fill(0.0); }
        if !out_radius.is_null() { std::slice::from_raw_parts_mut(out_radius, n).fill(0.0); }
        if !out_anomaly.is_null() { std::slice::from_raw_parts_mut(out_anomaly, n).fill(0.0); }
    }

    pub unsafe fn cosmos_physics_batch(
        _ids: *const *const c_char, _a: *const c_double, _r: *const c_double,
        _k: *const c_int, _h: *const c_int, _p: *const c_double, _s: *const c_double,
        n: c_int, _t: c_double, out: *mut c_double,
    ) {
        let n = n.max(0) as usize;
        if !out.is_null() { std::slice::from_raw_parts_mut(out, n * 41).fill(0.0); }
    }

    pub unsafe fn cosmos_terrain_fbm(_x: c_double, _y: c_double) -> c_double { 0.0 }
    pub unsafe fn cosmos_benchmark_rk4(_n: c_int, _i: c_int) -> c_double { 0.0 }

    /* A stub host owns no simulator: create hands back NULL and lib.rs's
       session gate turns that into "simulator unavailable in this build" —
       the refusal is the feature. */
    pub unsafe fn cosmos_create_simulator() -> *mut c_void { std::ptr::null_mut() }
    pub unsafe fn cosmos_destroy_simulator(_h: *mut c_void) {}
    pub unsafe fn cosmos_add_body(
        _h: *mut c_void, _id: u32, _mass: c_double, _radius: c_double,
        _px: c_double, _py: c_double, _pz: c_double,
        _vx: c_double, _vy: c_double, _vz: c_double,
    ) {}
    pub unsafe fn cosmos_step_simulation(_h: *mut c_void, _dt: c_double, _iters: c_int) {}
    pub unsafe fn cosmos_get_body_state(
        _h: *mut c_void, _index: u32, out_pos: *mut c_double, out_vel: *mut c_double,
    ) {
        if !out_pos.is_null() { std::slice::from_raw_parts_mut(out_pos, 3).fill(0.0); }
        if !out_vel.is_null() { std::slice::from_raw_parts_mut(out_vel, 3).fill(0.0); }
    }
    pub unsafe fn cosmos_get_body_states(
        _h: *mut c_void, _count: u32, out: *mut c_double,
    ) -> u32 {
        /* zero the offered capacity defensively — callers honor the
           returned count, which is 0 here */
        if !out.is_null() && _count > 0 {
            std::slice::from_raw_parts_mut(out, _count as usize * 6).fill(0.0);
        }
        0
    }
    pub unsafe fn cosmos_time_dilation(_radius: c_double, _mass: c_double) -> c_double { 0.0 }
}

/// The core's own version string (COSMOS_VERSION_STRING from the header —
/// "2.0.0" today), surfaced through cosmos_status for honest telemetry.
pub fn version_string() -> String {
    unsafe {
        let ptr = ffi::cosmos_version();
        if ptr.is_null() {
            return String::from("unknown");
        }
        std::ffi::CStr::from_ptr(ptr).to_string_lossy().into_owned()
    }
}
