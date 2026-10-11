# Stage 1: a Rocketbox FBX to a plain glTF (skinned mesh, Biped skeleton, no images, no animation).
# Run with Python that has the `bpy` module (pip install bpy): python3 fbx2gltf.py in.fbx out.glb
import sys, bpy
src, dst = sys.argv[1], sys.argv[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src, use_anim=False)
for o in list(bpy.data.objects):
    if o.type == 'EMPTY': bpy.data.objects.remove(o)   # Bip01 Footsteps
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_image_format='NONE', export_animations=False,
                          export_skins=True, export_morph=False, export_yup=True, export_apply=False, use_selection=False)
