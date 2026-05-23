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


piece = arg_value("--piece")
variant = arg_value("--variant", "move")
piece_color = arg_value("--color", "w")
clip_paths = [path for path in arg_value("--clips", "").split("|") if path]
output_dir = arg_value("--out")
frame_count = int(arg_value("--frames", "96"))
resolution = int(arg_value("--resolution", "220"))

if piece not in {"b", "n", "r", "q"}:
    raise RuntimeError(f"Unsupported piece for Meshy sprite render: {piece}")
if variant not in {"move", "capture", "promotion"}:
    raise RuntimeError(f"Unsupported animation variant: {variant}")
if piece_color not in {"w", "b"}:
    raise RuntimeError(f"Unsupported piece color: {piece_color}")
if not clip_paths:
    raise RuntimeError("Missing --clips")
for clip_path in clip_paths:
    if not os.path.exists(clip_path):
        raise RuntimeError(f"Missing GLB clip: {clip_path}")
if not output_dir:
    raise RuntimeError("Missing --out folder")

os.makedirs(output_dir, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()

scene = bpy.context.scene
scene.frame_start = 0
scene.frame_end = frame_count - 1
scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
scene.render.film_transparent = True
scene.render.resolution_x = resolution
scene.render.resolution_y = resolution
scene.render.resolution_percentage = 100

try:
    scene.eevee.taa_render_samples = 64
except AttributeError:
    pass

try:
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0.04
    scene.view_settings.gamma = 1
except TypeError:
    pass

world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.color = (1, 1, 1)


def make_material(name, color, metallic=0.03, roughness=0.31, coat=0.18):
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
    piece_material = make_material("ChessAlive animated ivory", (0.94, 0.86, 0.62, 1), 0.03, 0.29, 0.22)
else:
    piece_material = make_material("ChessAlive animated black", (0.035, 0.04, 0.048, 1), 0.10, 0.26, 0.18)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


for obj in list(bpy.data.objects):
    if obj.type in {"LIGHT", "CAMERA"}:
        bpy.data.objects.remove(obj, do_unlink=True)

bpy.ops.object.light_add(type="AREA", location=(0, -3.2, 4.2))
key_light = bpy.context.object
key_light.name = "Piece key softbox"
key_light.data.energy = 520
key_light.data.size = 5.0

bpy.ops.object.light_add(type="POINT", location=(-2.8, -2.2, 2.6))
rim_light = bpy.context.object
rim_light.name = "Piece rim glint"
rim_light.data.energy = 85

bpy.ops.object.camera_add(location=(0, -5.6, 1.15))
camera = bpy.context.object
camera.name = "Piece sprite camera"
camera.data.type = "ORTHO"
camera.data.ortho_scale = 2.75 if piece == "n" else 2.55
look_at(camera, (0, 0, 0.84))
scene.camera = camera


def imported_group(filepath):
    before_objects = set(bpy.data.objects)
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=filepath)
    new_objects = [obj for obj in bpy.data.objects if obj not in before_objects]
    new_actions = [action for action in bpy.data.actions if action not in before_actions]
    for obj in list(new_objects):
        if obj.type in {"LIGHT", "CAMERA"}:
            bpy.data.objects.remove(obj, do_unlink=True)
            new_objects.remove(obj)

    armature = next((obj for obj in new_objects if obj.type == "ARMATURE"), None)
    meshes = [obj for obj in new_objects if obj.type == "MESH"]
    if not armature or not meshes:
        raise RuntimeError(f"{filepath} did not import a rigged mesh")

    for obj in meshes:
        obj.data.materials.clear()
        obj.data.materials.append(piece_material)
        for polygon in obj.data.polygons:
            polygon.use_smooth = False

    action = None
    if armature.animation_data and armature.animation_data.action:
        action = armature.animation_data.action
    if not action and new_actions:
        action = new_actions[0]
    if not action:
        raise RuntimeError(f"{filepath} did not include an animation action")

    armature.animation_data_create()
    armature.animation_data.action = action
    start, end = action.frame_range
    scene.frame_set(math.floor(start))
    bpy.context.view_layer.update()

    mins = Vector((1e9, 1e9, 1e9))
    maxs = Vector((-1e9, -1e9, -1e9))
    for obj in meshes:
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
    target_height = 1.58 if piece == "n" else 1.52
    scale = target_height / height
    armature.scale = tuple(component * scale for component in armature.scale)
    if piece == "n":
        armature.rotation_euler[2] += math.radians(90 if piece_color == "w" else -90)
    elif piece_color == "b":
        armature.rotation_euler[2] += math.radians(180)

    group = {
        "action": action,
        "armature": armature,
        "base_location": armature.location.copy(),
        "base_rotation": armature.rotation_euler.copy(),
        "meshes": meshes,
        "objects": [armature, *meshes],
    }
    set_group_visible(group, False)
    return group


def set_group_visible(group, visible):
    for obj in group["objects"]:
        obj.hide_render = not visible
        obj.hide_viewport = not visible


groups = [imported_group(path) for path in clip_paths]


def action_duration_seconds(group):
    start, end = group["action"].frame_range
    return max(0.001, (end - start + 1) / scene.render.fps)


total_duration = sum(action_duration_seconds(group) for group in groups)
timeline = []
cursor = 0.0
for group in groups:
    duration = action_duration_seconds(group)
    timeline.append((group, cursor / total_duration, (cursor + duration) / total_duration))
    cursor += duration


def group_for_progress(progress):
    for group, start, end in timeline:
        if progress <= end:
            return group, start, end
    return timeline[-1]


def set_group_frame(group, local_progress):
    action = group["action"]
    armature = group["armature"]
    armature.animation_data_create()
    armature.animation_data.action = action
    start, end = action.frame_range
    action_frame = start + (end - start) * local_progress
    whole_frame = math.floor(action_frame)
    scene.frame_set(whole_frame, subframe=action_frame - whole_frame)


for frame in range(frame_count):
    progress = frame / max(1, frame_count - 1)
    group, segment_start, segment_end = group_for_progress(progress)
    segment_progress = (progress - segment_start) / max(0.001, segment_end - segment_start)
    for candidate in groups:
        set_group_visible(candidate, candidate is group)

    armature = group["armature"]
    armature.location = group["base_location"].copy()
    armature.rotation_euler = group["base_rotation"].copy()
    set_group_frame(group, max(0, min(1, segment_progress)))

    if variant == "move":
        armature.location.x += math.sin(progress * math.pi * 2) * 0.03
        armature.location.z += math.sin(progress * math.pi) * 0.035
    elif variant == "capture":
        armature.location.x += math.sin(progress * math.pi * 5) * 0.055
        armature.location.z += math.sin(progress * math.pi * 2) * 0.04
        armature.rotation_euler[2] += math.sin(progress * math.pi * 2) * 0.10
    else:
        armature.location.x += math.sin(progress * math.pi * 3) * 0.035
        armature.location.z += math.sin(progress * math.pi * 2) * 0.045
        armature.rotation_euler[2] += math.sin(progress * math.pi * 2) * 0.07

    scene.render.filepath = os.path.join(output_dir, f"{piece}_{piece_color}_{variant}_{frame:04d}.png")
    bpy.ops.render.render(write_still=True)
