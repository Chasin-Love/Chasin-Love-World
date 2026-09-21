# Kamui keyframe scene — renders the 8 storyboard keyframes headless.
#
# Usage:
#   blender.exe -b --factory-startup -P kamui_scene.py
# Output: keyframe-N-<name>.png (1280x720, Cycles CPU) next to this script.
#
# Phase p (0..7) mirrors docs/KAMUI-VISUAL-STORYBOARD.md:
#   0 activation pulse, 1 reality bends, 2 whirlpool grips, 3 tidal grip,
#   4 form-loss (hero), 5 full vortex, 6 the tear, 7 portal open.
#
# Note: no compositing/bloom — Blender 5.2's new compositor segfaults in
# background mode here. Glow is faked with geometry: a radial-gradient glow
# disc (accretion halo) and Layer-Weight glow shells on luminous bodies.
import bpy
import bmesh
import math
import os
import random

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
RES = (1280, 720)
SAMPLES = 48
PHASE_NAMES = ["activation-pulse", "reality-bends", "whirlpool-grips", "tidal-grip",
               "form-loss", "full-vortex", "the-tear", "portal-open"]


def mat_emission(name, color, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1.0)
    em.inputs["Strength"].default_value = strength
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(em.outputs[0], out.inputs[0])
    return m


def mat_diffuse(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    df = nt.nodes.new("ShaderNodeBsdfDiffuse")
    df.inputs["Color"].default_value = (*color, 1.0)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(df.outputs[0], out.inputs[0])
    return m


def mat_glowshell(name, color, strength):
    """Soft sphere-of-light: opaque at the center, fading to nothing at the rim."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.45
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1.0)
    em.inputs["Strength"].default_value = strength
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(lw.outputs["Facing"], mix.inputs["Fac"])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m


def mat_glowdisc(name, heat):
    """Flat annulus glow around the core: transparent center, hot inner rim,
    cooling outward — the accretion halo."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    length = nt.nodes.new("ShaderNodeVectorMath")
    length.operation = "LENGTH"
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 2.2
    mr.inputs["From Max"].default_value = 7.2
    mr.clamp = True
    mask = nt.nodes.new("ShaderNodeValToRGB")
    mask.color_ramp.interpolation = "B_SPLINE"
    e0 = mask.color_ramp.elements[0]
    e0.position, e0.color = 0.0, (0, 0, 0, 1)
    e1 = mask.color_ramp.elements[1]
    e1.position, e1.color = 0.09, (1, 1, 1, 1)
    e_mid = mask.color_ramp.elements.new(0.38)
    e_mid.position, e_mid.color = 0.38, (0.22, 0.22, 0.22, 1)
    e2 = mask.color_ramp.elements.new(1.0)
    e2.position, e2.color = 1.0, (0, 0, 0, 1)
    heat_ramp = nt.nodes.new("ShaderNodeValToRGB")
    heat_ramp.color_ramp.interpolation = "B_SPLINE"
    h0 = heat_ramp.color_ramp.elements[0]
    h0.position, h0.color = 0.0, (1.0, 0.85, 0.6, 1)
    h1 = heat_ramp.color_ramp.elements.new(0.10)
    h1.position, h1.color = 0.10, (1.0, 0.55, 0.22, 1)
    h2 = heat_ramp.color_ramp.elements.new(0.55)
    h2.position, h2.color = 0.55, (0.8, 0.3, 0.5, 1)
    h3 = heat_ramp.color_ramp.elements.new(1.0)
    h3.position, h3.color = 1.0, (0.22, 0.1, 0.42, 1)
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.6 * heat
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    sep_alpha = nt.nodes.new("ShaderNodeSeparateColor")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(coord.outputs["Object"], sep.inputs["Vector"])
    comb = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(sep.outputs["X"], comb.inputs["X"])
    nt.links.new(sep.outputs["Y"], comb.inputs["Y"])
    nt.links.new(comb.outputs["Vector"], length.inputs[0])
    nt.links.new(length.outputs["Value"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], mask.inputs["Fac"])
    nt.links.new(mr.outputs["Result"], heat_ramp.inputs["Fac"])
    nt.links.new(heat_ramp.outputs["Color"], em.inputs["Color"])
    nt.links.new(mask.outputs["Color"], sep_alpha.inputs["Color"])
    nt.links.new(sep_alpha.outputs["Red"], mix.inputs["Fac"])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m


def mat_nebula(name, base1, base2, base3, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 5.0
    noise.inputs["Detail"].default_value = 8.0
    noise.inputs["Roughness"].default_value = 0.62
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "B_SPLINE"
    ramp.color_ramp.elements[0].position = 0.34
    ramp.color_ramp.elements[0].color = (*base1, 1.0)
    ramp.color_ramp.elements[1].position = 0.66
    ramp.color_ramp.elements[1].color = (*base2, 1.0)
    e3 = ramp.color_ramp.elements.new(0.88)
    e3.color = (*base3, 1.0)
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = strength
    transp = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(noise.outputs["Fac"], mix.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], em.inputs["Color"])
    nt.links.new(transp.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m, mapping


def sphere_mesh_with_mat(name, subdiv, mat):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    return mesh


class Scene:
    def __init__(self, p):
        self.p = p
        self.rnd = random.Random(42)
        self.meshes = {}

    def mesh_for(self, key, mat, subdiv=1):
        if key not in self.meshes:
            self.meshes[key] = sphere_mesh_with_mat(key, subdiv, mat)
        return self.meshes[key]

    def dot(self, key, mat, loc, rotz=0.0, rotx=0.0, scale=(1, 1, 1), subdiv=1, mkey=None):
        ob = bpy.data.objects.new(key, self.mesh_for(mkey or key.split("_")[0], mat, subdiv))
        ob.location = loc
        ob.rotation_euler = (rotx, 0.0, rotz)
        ob.scale = scale
        bpy.context.scene.collection.objects.link(ob)
        return ob

    def torus(self, name, major, minor, mat, loc=(0, 0, 0)):
        bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                         major_segments=72, minor_segments=8,
                                         location=loc)
        tor = bpy.context.active_object
        tor.name = name
        tor.data.materials.append(mat)
        return tor

    def build(self):
        p = self.p
        rnd = self.rnd

        star_m = mat_emission("star", (1.0, 0.98, 0.92), 2.8)
        star_far_m = mat_emission("star_far", (0.85, 0.9, 1.0), 2.2)
        bead_in_m = mat_emission("bead_in", (1.0, 0.93, 0.82), 3.2)
        bead_mid_m = mat_emission("bead_mid", (1.0, 0.52, 0.16), 2.2)
        bead_out_m = mat_emission("bead_out", (0.5, 0.3, 0.85), 1.2)
        stream_m = mat_emission("stream", (1.0, 0.86, 0.6), 2.5)
        anchor_m = mat_emission("anchor", (1.0, 0.9, 0.72), 3.5)
        halo_m = mat_glowshell("halo", (1.0, 0.78, 0.5), 0.9)
        ring_m = mat_emission("ring", (1.0, 0.78, 0.5), 6.5)
        tear_m = mat_emission("tear", (1.0, 1.0, 1.0), 20.0)
        core_m = mat_diffuse("coreblack", (0.002, 0.002, 0.004))
        planet_m = mat_diffuse("planet", (0.32, 0.4, 0.55))
        planet2_m = mat_diffuse("planet2", (0.45, 0.35, 0.3))

        heat = 0.55 + min(1.0, p / 5.0) * 0.8
        if p == 7:
            heat = 0.3
        disc_m = mat_glowdisc("glowdisc", heat)

        # world: near-black
        world = bpy.data.worlds.new("world")
        world.use_nodes = True
        world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.002, 0.002, 0.006, 1)
        bpy.context.scene.world = world

        # ---- starfield: inner shell (smears tangentially) + outer shell (stable) ----
        streak = 1.0 + 2.4 * max(0.0, (p - 0.5)) / 7.0
        for i in range(110):
            phi = rnd.uniform(0, 2 * math.pi)
            r = rnd.uniform(26, 32)
            z = rnd.uniform(-6, 6)
            self.dot(f"si_{i}", star_m, (r * math.cos(phi), r * math.sin(phi), z),
                     rotz=phi + math.pi / 2,
                     scale=(streak * 0.6 if p >= 1 else 1.0, rnd.uniform(0.03, 0.06), 0.06))
        for i in range(180):
            phi = rnd.uniform(0, 2 * math.pi)
            r = rnd.uniform(52, 64)
            z = rnd.uniform(-20, 20)
            self.dot(f"so_{i}", star_far_m, (r * math.cos(phi), r * math.sin(phi), z),
                     scale=(rnd.uniform(0.05, 0.12),) * 3)

        # ---- nebula backdrops: the "universe surface", swirled per phase ----
        neb_m1, neb_map1 = mat_nebula("neb_a", (0.05, 0.015, 0.09), (0.35, 0.08, 0.38), (0.6, 0.55, 0.85), 0.38)
        neb_m2, neb_map2 = mat_nebula("neb_b", (0.01, 0.02, 0.05), (0.05, 0.16, 0.3), (0.3, 0.45, 0.65), 0.28)
        self.nebula_plane("nebA", 90, 44, (0, 16, -1), math.radians(97), neb_m1, neb_map1,
                          swirl=2.6 * p, stretch=0.4 * p, dim=1.0 if p < 6 else 0.35)
        self.nebula_plane("nebB", 130, 30, (0, 26, -5), math.radians(94), neb_m2, neb_map2,
                          swirl=1.8 * p, stretch=0.3 * p, dim=1.0 if p < 6 else 0.3)

        # ---- core: black sphere + thin photon ring + glow-disc halo + light ----
        self.dot("core", core_m, (0, 0, 0), scale=(1.5,) * 3, subdiv=3)
        self.torus("photon_ring", 2.0, 0.045, ring_m)
        disc = bpy.data.meshes.new("discm")
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=72, y_segments=72, size=8.0)
        bm.to_mesh(disc)
        bm.free()
        disc.materials.append(disc_m)
        dob = bpy.data.objects.new("glow_disc", disc)
        dob.location = (0, 0, 0.05)
        bpy.context.scene.collection.objects.link(dob)

        light = bpy.data.lights.new("corelight", "POINT")
        light.energy = 700 * (0.5 + 0.5 * min(1.0, p / 5.0))
        light.color = (1.0, 0.72, 0.42)
        light.shadow_soft_size = 1.4
        lo = bpy.data.objects.new("corelight", light)
        lo.location = (0, 0, 0.6)
        bpy.context.scene.collection.objects.link(lo)

        if p == 6:  # the tear: white flash ring
            self.torus("tear_ring", 5.0, 0.07, tear_m)

        # ---- log-spiral arms: differential twist grows with phase ----
        if p >= 2:
            n = int(10 + 11 * p)
            r_in, r_out = 2.4, 9.0
            for a in range(3):
                for i in range(n):
                    t = (i + 0.5) / n
                    r = r_in + (r_out - r_in) * (t ** 0.85)
                    theta = (a * 2 * math.pi / 3 + 2.1 * math.log(r_in / r)
                             + 0.55 * p * (1.6 / max(r, 1.0)) * r_in)
                    size = 0.03 + 0.085 * (1 - t) + rnd.uniform(0, 0.02)
                    m = bead_in_m if t < 0.22 else (bead_mid_m if t < 0.62 else bead_out_m)
                    key = "bead_in" if t < 0.22 else ("bead_mid" if t < 0.62 else "bead_out")
                    self.dot(f"{key}_{a}_{i}", m,
                             (r * math.cos(theta), r * math.sin(theta), rnd.uniform(-0.1, 0.1)),
                             scale=(size,) * 3)

        # ---- cosmic bodies: spiral in, stretch radially, dissolve into streams ----
        def body_stream(name, head_r, head_theta, n, wrap, z):
            for i in range(n):
                t = (i + 0.5) / n
                r = 2.6 + (head_r - 2.6) * (1.0 - t)
                theta = head_theta + wrap * t
                size = 0.11 * (1.0 - 0.55 * t) * (1.0 if t < 0.25 else 0.85)
                self.dot(f"{name}_s_{i}", stream_m,
                         (r * math.cos(theta), r * math.sin(theta), z + rnd.uniform(-0.06, 0.06)),
                         rotz=theta + math.pi / 2,
                         scale=(size * 1.6, size, size))

        bodies = [
            ("anchor", 8.6, 0.9, 0.62, anchor_m, True),
            ("planetA", 6.4, 2.9, -0.3, planet_m, False),
            ("planetB", 7.6, 4.6, 0.45, planet2_m, False),
            ("planetC", 5.4, 5.6, 0.1, planet_m, False),
        ]
        for name, r0, th0, z, m, is_star in bodies:
            gone_at = 5.2 if is_star else 5.8
            if p >= gone_at:
                continue
            prog = min(1.0, p / gone_at)
            r = r0 - (r0 - 2.7) * (prog ** 1.6)
            th = th0 + 0.85 * prog * prog
            stretch = 1.0 + 2.3 * max(0.0, prog - 0.18)
            size = (0.55 if is_star else 0.24) * (1.0 - 0.55 * prog)
            if (is_star and p >= 4) or (not is_star and p >= 5):
                body_stream(name, r, th, 30 if is_star else 14, 2.0 if is_star else 1.2, z)
                if is_star:
                    self.dot(f"{name}_head", stream_m, (r * math.cos(th), r * math.sin(th), z),
                             rotz=th, scale=(0.4, 0.17, 0.17), subdiv=3)
                    self.dot(f"{name}_halo", halo_m, (r * math.cos(th), r * math.sin(th), z),
                             scale=(0.95, 0.95, 0.95), subdiv=3, mkey="halo")
            else:
                self.dot(name, m, (r * math.cos(th), r * math.sin(th), z),
                         rotz=th, scale=(size * stretch, size, size), subdiv=3)
                if is_star:
                    self.dot(f"{name}_halo", halo_m, (r * math.cos(th), r * math.sin(th), z),
                             scale=(size * stretch * 1.9, size * 1.9, size * 1.9), subdiv=3, mkey="halo")

        # ---- camera ----
        cam_data = bpy.data.cameras.new("cam")
        cam_data.lens = 55
        cam = bpy.data.objects.new("cam", cam_data)
        cam.location = (0, -16, 10.0)
        bpy.context.scene.collection.objects.link(cam)
        target = bpy.data.objects.new("cam_target", None)
        target.location = (0, 0, 0)
        bpy.context.scene.collection.objects.link(target)
        con = cam.constraints.new("TRACK_TO")
        con.target = target
        bpy.context.scene.camera = cam

    def nebula_plane(self, name, size, segs, loc, rotx, mat, mapping, swirl, stretch, dim):
        mesh = bpy.data.meshes.new(name)
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=segs, y_segments=segs, size=size / 2)
        # tangential swirl + radial pull near the center — the surface itself bends
        for v in bm.verts:
            x, y = v.co.x, v.co.y
            r = math.hypot(x, y)
            if r < size * 0.45 and r > 0.001:
                alpha = swirl * math.exp(-r / 7.0)
                nx = x * math.cos(alpha) - y * math.sin(alpha)
                ny = x * math.sin(alpha) + y * math.cos(alpha)
                pull = 1.0 - 0.05 * math.exp(-r / 6.0)
                v.co.x = nx * pull
                v.co.y = ny * pull
        bm.to_mesh(mesh)
        bm.free()
        ob = bpy.data.objects.new(name, mesh)
        ob.location = loc
        ob.rotation_euler = (rotx, 0, 0)
        ob.data.materials.append(mat)
        bpy.context.scene.collection.objects.link(ob)
        mapping.inputs["Rotation"].default_value = (0.0, 0.0, 0.6 + swirl * 0.5)
        mapping.inputs["Scale"].default_value = (1.0 + stretch, 1.0, 1.0)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = RES
    sc.render.image_settings.file_format = "PNG"
    sc.view_settings.view_transform = "Standard"

    for p, name in enumerate(PHASE_NAMES):
        Scene(p).build()
        sc.render.filepath = os.path.join(OUT_DIR, f"keyframe-{p}-{name}.png")
        print(f"[kamui] rendering phase {p} ({name}) ...", flush=True)
        bpy.ops.render.render(write_still=True)
        for ob in list(bpy.data.objects):
            bpy.data.objects.remove(ob, do_unlink=True)
        for blk in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras,
                    bpy.data.lights, bpy.data.worlds):
            for x in list(blk):
                if x.users == 0:
                    blk.remove(x)
        print(f"[kamui] phase {p} done", flush=True)


main()
