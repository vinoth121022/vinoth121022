import math
import os
import sys

import bpy
from mathutils import Vector


def arg_value(name, default=None):
    if "--" not in sys.argv:
        return default
    args = sys.argv[sys.argv.index("--") + 1 :]
    for index, value in enumerate(args):
        if value == name and index + 1 < len(args):
            return args[index + 1]
    return default


source_glb = arg_value("--glb")
variant = arg_value("--variant", "move")
piece_color = arg_value("--color", "w")
output_dir = arg_value("--out")
frame_count = int(arg_value("--frames", "72"))
resolution = int(arg_value("--resolution", "240"))

if not source_glb or not os.path.exists(source_glb):
    raise RuntimeError(f"Missing pawn GLB source: {source_glb}")
if variant not in {"move", "capture", "promotion"}:
    raise RuntimeError(f"Unsupported pawn variant: {variant}")
if piece_color not in {"w", "b"}:
    raise RuntimeError(f"Unsupported piece color: {piece_color}")
if not output_dir:
    raise RuntimeError("Missing --out folder")

os.makedirs(output_dir, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=source_glb)

scene = bpy.context.scene
scene.frame_start = 0
scene.frame_end = frame_count - 1
scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
scene.render.film_transparent = True
scene.render.resolution_x = resolution
scene.render.resolution_y = resolution
scene.render.resolution_percentage = 100

try:
    scene.eevee.taa_render_samples = 96
except AttributeError:
    pass

try:
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0.05
    scene.view_settings.gamma = 1
except TypeError:
    pass

world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.color = (1, 1, 1)


def make_material(name, color, metallic=0.03, roughness=0.33, coat=0.18):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value = coat
    material.diffuse_color = color
    return material


if piece_color == "w":
    pawn_material = make_material("ChessAlive pawn ivory", (0.94, 0.86, 0.62, 1), 0.03, 0.29, 0.22)
else:
    pawn_material = make_material("ChessAlive pawn black", (0.035, 0.04, 0.048, 1), 0.10, 0.26, 0.18)

armature = next((obj for obj in bpy.data.objects if obj.type == "ARMATURE"), None)
if not armature:
    raise RuntimeError("Pawn_animation.glb did not import an armature")

character_meshes = []
for obj in bpy.data.objects:
    if obj.type != "MESH":
        continue
    if obj.parent == armature or obj.name.lower().startswith("char"):
        character_meshes.append(obj)
        obj.data.materials.clear()
        obj.data.materials.append(pawn_material)
        for polygon in obj.data.polygons:
            polygon.use_smooth = False
    else:
        obj.hide_render = True
        obj.hide_viewport = True

if not character_meshes:
    raise RuntimeError("Pawn_animation.glb did not import a skinned pawn mesh")

for obj in bpy.data.objects:
    if obj.type == "LIGHT":
        bpy.data.objects.remove(obj, do_unlink=True)
    if obj.type == "CAMERA":
        bpy.data.objects.remove(obj, do_unlink=True)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


bpy.ops.object.light_add(type="AREA", location=(0, -3.2, 4.2))
key_light = bpy.context.object
key_light.name = "Pawn key softbox"
key_light.data.energy = 480
key_light.data.size = 4.8

bpy.ops.object.light_add(type="POINT", location=(-2.8, -2.2, 2.4))
rim_light = bpy.context.object
rim_light.name = "Pawn rim glint"
rim_light.data.energy = 70

bpy.ops.object.camera_add(location=(0, -5.6, 1.15))
camera = bpy.context.object
camera.name = "Pawn sprite camera"
camera.data.type = "ORTHO"
camera.data.ortho_scale = 2.55
look_at(camera, (0, 0, 0.83))
scene.camera = camera

actions = {action.name: action for action in bpy.data.actions}

variant_sequences = {
    "move": ["Funky_Walk", "Happy_jump_f"],
    "capture": ["Running", "Jumping_Punch", "Triple_Combo_Attack", "FunnyDancing_01"],
    "promotion": ["Happy_jump_f", "All_Night_Dance", "FunnyDancing_02"],
}


def action_duration_seconds(name):
    action = actions.get(name)
    if not action:
        raise RuntimeError(f"Pawn_animation.glb is missing required action: {name}")
    start, end = action.frame_range
    return (end - start + 1) / scene.render.fps


variant_timeline = {}
for timeline_variant, names in variant_sequences.items():
    total = sum(action_duration_seconds(name) for name in names)
    cursor = 0
    entries = []
    for name in names:
        duration = action_duration_seconds(name)
        entries.append((name, cursor / total, (cursor + duration) / total))
        cursor += duration
    variant_timeline[timeline_variant] = entries


def action_for_progress(progress):
    sequence = variant_timeline[variant]
    for name, start, end in sequence:
        if progress <= end:
            return name, start, end
    name, start, end = sequence[-1]
    return name, start, end


def set_action_frame(name, local_progress):
    action = actions.get(name)
    if not action:
        raise RuntimeError(f"Pawn_animation.glb is missing required action: {name}")
    armature.animation_data_create()
    armature.animation_data.action = action
    start, end = action.frame_range
    action_frame = start + (end - start) * local_progress
    whole_frame = math.floor(action_frame)
    scene.frame_set(whole_frame, subframe=action_frame - whole_frame)


def normalize_character():
    bpy.context.view_layer.update()
    mins = Vector((1e9, 1e9, 1e9))
    maxs = Vector((-1e9, -1e9, -1e9))
    for obj in character_meshes:
        for corner in obj.bound_box:
            world_corner = obj.matrix_world @ Vector(corner)
            mins.x = min(mins.x, world_corner.x)
            mins.y = min(mins.y, world_corner.y)
            mins.z = min(mins.z, world_corner.z)
            maxs.x = max(maxs.x, world_corner.x)
            maxs.y = max(maxs.y, world_corner.y)
            maxs.z = max(maxs.z, world_corner.z)
    center = (mins + maxs) / 2
    height = max(0.001, maxs.z - mins.z)
    armature.location.x -= center.x
    armature.location.y -= center.y
    armature.location.z -= mins.z
    scale = 1.52 / height
    armature.scale = tuple(component * scale for component in armature.scale)


set_action_frame(variant_sequences[variant][0], 0)
normalize_character()

if piece_color == "b":
    armature.rotation_euler[2] = math.radians(180)

base_rotation_z = armature.rotation_euler[2]

for frame in range(frame_count):
    progress = frame / max(1, frame_count - 1)
    action_name, segment_start, segment_end = action_for_progress(progress)
    segment_progress = (progress - segment_start) / max(0.001, segment_end - segment_start)
    set_action_frame(action_name, max(0, min(1, segment_progress)))
    if variant == "move":
        armature.location.x = math.sin(progress * math.pi * 2) * 0.025
    elif variant == "capture":
        armature.location.x = math.sin(progress * math.pi * 6) * 0.035
        armature.rotation_euler[2] = base_rotation_z + math.sin(progress * math.pi * 2) * 0.08
    else:
        armature.location.x = math.sin(progress * math.pi * 4) * 0.025
        armature.rotation_euler[2] = base_rotation_z + math.sin(progress * math.pi * 2) * 0.04
    scene.render.filepath = os.path.join(output_dir, f"pawn_{piece_color}_{variant}_{frame:04d}.png")
    bpy.ops.render.render(write_still=True)
