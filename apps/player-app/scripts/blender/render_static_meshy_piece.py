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
piece = arg_value("--piece")
piece_color = arg_value("--color", "w")
output_path = arg_value("--out")
resolution = int(arg_value("--resolution", "512"))

if not source_glb or not os.path.exists(source_glb):
    raise RuntimeError(f"Missing Meshy GLB source: {source_glb}")
if piece_color not in {"w", "b"}:
    raise RuntimeError(f"Unsupported piece color: {piece_color}")
if not output_path:
    raise RuntimeError("Missing --out path")

os.makedirs(os.path.dirname(output_path), exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=source_glb)

scene = bpy.context.scene
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
    scene.eevee.gtao_factor = 1.15
except AttributeError:
    pass

try:
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = -0.05
    scene.view_settings.gamma = 1
except TypeError:
    pass

world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.color = (1, 1, 1)


def make_material(name, color, metallic=0.04, roughness=0.29, coat=0.18):
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


black_material = make_material("ChessAlive Meshy black piece", (0.026, 0.030, 0.038, 1), 0.10, 0.25, 0.18)
fallback_white_material = make_material("ChessAlive Meshy ivory fallback", (0.96, 0.88, 0.64, 1), 0.03, 0.28, 0.20)

mesh_objects = []
for obj in list(bpy.data.objects):
    if obj.type in {"CAMERA", "LIGHT"}:
        bpy.data.objects.remove(obj, do_unlink=True)
        continue
    if obj.type == "MESH":
        mesh_objects.append(obj)
        if piece_color == "b":
            obj.data.materials.clear()
            obj.data.materials.append(black_material)
        elif not obj.data.materials:
            obj.data.materials.append(fallback_white_material)
        for polygon in obj.data.polygons:
            polygon.use_smooth = False

if not mesh_objects:
    raise RuntimeError(f"{source_glb} did not import visible meshes")

armature = next((obj for obj in bpy.data.objects if obj.type == "ARMATURE"), None)
if armature:
    action = next(iter(bpy.data.actions), None)
    if action:
        armature.animation_data_create()
        armature.animation_data.action = action
        scene.frame_set(int(action.frame_range[0]))
        bpy.context.view_layer.update()
    root = armature
else:
    root = bpy.data.objects.new("Meshy static piece root", None)
    bpy.context.collection.objects.link(root)
    for obj in mesh_objects:
        if obj.parent is None:
            obj.parent = root


def bounds():
    bpy.context.view_layer.update()
    mins = Vector((1e9, 1e9, 1e9))
    maxs = Vector((-1e9, -1e9, -1e9))
    for obj in mesh_objects:
        if obj.hide_render:
            continue
        for corner in obj.bound_box:
            world_corner = obj.matrix_world @ Vector(corner)
            mins.x = min(mins.x, world_corner.x)
            mins.y = min(mins.y, world_corner.y)
            mins.z = min(mins.z, world_corner.z)
            maxs.x = max(maxs.x, world_corner.x)
            maxs.y = max(maxs.y, world_corner.y)
            maxs.z = max(maxs.z, world_corner.z)
    return mins, maxs


def normalize():
    mins, maxs = bounds()
    center = (mins + maxs) / 2
    height = max(0.001, maxs.z - mins.z)
    root.location.x -= center.x
    root.location.y -= center.y
    root.location.z -= mins.z
    target_height = 1.38 if piece == "p" else 1.48 if piece != "k" else 1.68
    scale = target_height / height
    root.scale = tuple(component * scale for component in root.scale)
    bpy.context.view_layer.update()


normalize()
root.location.z -= 0.18 if piece != "p" else 0.08
bpy.context.view_layer.update()


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


bpy.ops.object.light_add(type="AREA", location=(0, -3.4, 4.4))
key_light = bpy.context.object
key_light.name = "Meshy piece key softbox"
key_light.data.energy = 455
key_light.data.size = 4.6

bpy.ops.object.light_add(type="POINT", location=(-2.7, -2.2, 2.4))
rim_light = bpy.context.object
rim_light.name = "Meshy piece rim glint"
rim_light.data.energy = 76

bpy.ops.object.camera_add(location=(0, -5.8, 1.08))
camera = bpy.context.object
camera.name = "Meshy static piece camera"
camera.data.type = "ORTHO"
camera.data.ortho_scale = 2.36
camera.data.shift_y = -0.04
look_at(camera, (0, 0, 0.84))
scene.camera = camera

scene.render.filepath = output_path
bpy.ops.render.render(write_still=True)
