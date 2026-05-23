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
piece_color = arg_value("--color", "w")
output_path = arg_value("--out")
resolution = int(arg_value("--resolution", "512"))

if not source_glb or not os.path.exists(source_glb):
    raise RuntimeError(f"Missing pawn GLB source: {source_glb}")
if piece_color not in {"w", "b"}:
    raise RuntimeError(f"Unsupported piece color: {piece_color}")
if not output_path:
    raise RuntimeError("Missing --out path")

os.makedirs(os.path.dirname(output_path), exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=source_glb)

scene = bpy.context.scene
scene.frame_start = 0
scene.frame_end = 28
scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
scene.render.film_transparent = True
scene.render.resolution_x = resolution
scene.render.resolution_y = resolution
scene.render.resolution_percentage = 100

try:
    scene.eevee.taa_render_samples = 128
except AttributeError:
    pass

try:
    scene.eevee.use_gtao = True
    scene.eevee.gtao_distance = 3
    scene.eevee.gtao_factor = 1.18
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


def make_material(name, color, metallic=0.04, roughness=0.30, coat=0.20):
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
    pawn_material = make_material("ChessAlive pawn ivory seated", (0.95, 0.86, 0.62, 1), 0.03, 0.28, 0.22)
else:
    pawn_material = make_material("ChessAlive pawn black seated", (0.030, 0.036, 0.045, 1), 0.10, 0.25, 0.18)

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

for obj in list(bpy.data.objects):
    if obj.type in {"LIGHT", "CAMERA"}:
        bpy.data.objects.remove(obj, do_unlink=True)


def set_clip_frame(action_name):
    action = bpy.data.actions.get(action_name)
    if not action:
        return False
    armature.animation_data_create()
    armature.animation_data.action = action
    scene.frame_set(int(action.frame_range[0]))
    bpy.context.view_layer.update()
    return True


set_clip_frame("walking_2_inplace") or set_clip_frame("Walking")


def pose_bone(name, rotation=(0, 0, 0), location=None, scale=None, frame=0):
    bone = armature.pose.bones.get(name)
    if not bone:
        return
    bone.rotation_mode = "XYZ"
    bone.rotation_euler = tuple(math.radians(value) for value in rotation)
    if location is not None:
        bone.location = location
    if scale is not None:
        bone.scale = scale
    bone.keyframe_insert("rotation_euler", frame=frame)
    if location is not None:
        bone.keyframe_insert("location", frame=frame)
    if scale is not None:
        bone.keyframe_insert("scale", frame=frame)


def add_board_sit_motion():
    # This is a real rig pose on the original GLB, used as the board-rest motion.
    # The legs fold under the pawn body so the board piece reads as a single chess piece.
    sit_action = bpy.data.actions.new("ChessAlive_Board_Sit_Pose")
    armature.animation_data_create()
    armature.animation_data.action = sit_action

    for frame, blend in ((0, 0.0), (10, 0.55), (20, 1.0), (28, 1.0)):
        hip_drop = -0.012 * blend
        pose_bone("Hips", rotation=(0, 0, 0), location=(0, 0, hip_drop), frame=frame)
        pose_bone("Spine", rotation=(-2 * blend, 0, 0), frame=frame)
        pose_bone("Spine01", rotation=(2 * blend, 0, 0), frame=frame)
        pose_bone("Spine02", rotation=(2 * blend, 0, 0), frame=frame)
        pose_bone("neck", rotation=(-1 * blend, 0, 0), frame=frame)
        pose_bone("Head", rotation=(0, 0, 0), frame=frame)

        limb_scale_value = max(0.035, 1 - 0.965 * blend)
        limb_scale = (limb_scale_value, limb_scale_value, limb_scale_value)

        pose_bone("LeftShoulder", rotation=(0, 0, -8 * blend), scale=limb_scale, frame=frame)
        pose_bone("RightShoulder", rotation=(0, 0, 8 * blend), scale=limb_scale, frame=frame)
        pose_bone("LeftArm", rotation=(12 * blend, 0, -16 * blend), scale=limb_scale, frame=frame)
        pose_bone("RightArm", rotation=(12 * blend, 0, 16 * blend), scale=limb_scale, frame=frame)
        pose_bone("LeftForeArm", rotation=(28 * blend, 0, -18 * blend), scale=limb_scale, frame=frame)
        pose_bone("RightForeArm", rotation=(28 * blend, 0, 18 * blend), scale=limb_scale, frame=frame)
        pose_bone("LeftHand", scale=limb_scale, frame=frame)
        pose_bone("RightHand", scale=limb_scale, frame=frame)

        pose_bone("LeftUpLeg", rotation=(78 * blend, 0, -20 * blend), scale=limb_scale, frame=frame)
        pose_bone("RightUpLeg", rotation=(78 * blend, 0, 20 * blend), scale=limb_scale, frame=frame)
        pose_bone("LeftLeg", rotation=(-118 * blend, 0, 12 * blend), scale=limb_scale, frame=frame)
        pose_bone("RightLeg", rotation=(-118 * blend, 0, -12 * blend), scale=limb_scale, frame=frame)
        pose_bone("LeftFoot", rotation=(46 * blend, 0, -14 * blend), scale=limb_scale, frame=frame)
        pose_bone("RightFoot", rotation=(46 * blend, 0, 14 * blend), scale=limb_scale, frame=frame)
        pose_bone("LeftToeBase", scale=limb_scale, frame=frame)
        pose_bone("RightToeBase", scale=limb_scale, frame=frame)

    scene.frame_set(28)
    bpy.context.view_layer.update()


add_board_sit_motion()


def character_bounds():
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
    return mins, maxs


def normalize_character():
    mins, maxs = character_bounds()
    center = (mins + maxs) / 2
    height = max(0.001, maxs.z - mins.z)
    armature.location.x -= center.x
    armature.location.y -= center.y
    armature.location.z -= mins.z
    scale = 1.56 / height
    armature.scale = tuple(component * scale for component in armature.scale)
    bpy.context.view_layer.update()


normalize_character()

if piece_color == "b":
    armature.rotation_euler[2] = math.radians(180)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


bpy.ops.object.light_add(type="AREA", location=(0, -3.2, 4.2))
key_light = bpy.context.object
key_light.name = "Static pawn key softbox"
key_light.data.energy = 520
key_light.data.size = 4.8

bpy.ops.object.light_add(type="POINT", location=(-2.8, -2.2, 2.4))
rim_light = bpy.context.object
rim_light.name = "Static pawn rim glint"
rim_light.data.energy = 78

bpy.ops.object.camera_add(location=(0, -5.4, 1.12))
camera = bpy.context.object
camera.name = "Static pawn seated camera"
camera.data.type = "ORTHO"
camera.data.ortho_scale = 2.02
camera.data.shift_y = 0.02
look_at(camera, (0, 0, 0.86))
scene.camera = camera

scene.render.filepath = output_path
bpy.ops.render.render(write_still=True)
