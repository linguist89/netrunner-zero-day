# rocketbox

Converts characters from the [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) library (MIT, licence in `models/LICENSE-microsoft-rocketbox.txt`) into `models/rb-*.glb.txt`, ready for the game's own animation clips.

## Why a conversion is needed

The game plays its clips (`anim-m-walk`, `anim-f-idle` and the rest) by copying each bone's rotation onto a bone with the same name. Those clips were made for the Ready Player Me rigs, whose bones are called `Hips`, `LeftUpLeg` and so on. Rocketbox characters use a 3ds Max Biped skeleton (`Bip01 L Thigh`), stand in an A-pose, and are measured in centimetres, so renaming the bones is not enough.

`rb2rpm.py` does the following for each character:

1. Reads the mesh at its bind pose.
2. Bends it bone by bone into the reference rig's rest pose, swinging each limb segment onto the reference direction (the A-pose arms become T-pose arms).
3. Builds a skeleton with the reference rig's bone names, hierarchy and orientations, placed at the Rocketbox character's own joints, so each body keeps its proportions.
4. Moves the skin weights from Biped bones to the new bones. Face bones fold into `Head`, and end bones such as `HeadTop_End` are placed by proportion.
5. Writes a compact GLB (KHR_mesh_quantization): colour textures as 512 px JPEG, and the hair and eyelash cards as PNG with alpha.

Men are matched to `avatar-player`, women to `avatar-rosa`. Rocketbox bodies have shorter legs than those rigs, so the game scales the clips' hip height by each body's own hip height (`ch.hipsY` in `makeAvatar`, used in `retarget`).

## Running it

You need Python 3 with `bpy` (Blender as a module: `pip install bpy`), `numpy` and `pillow`.

```
git clone --filter=blob:none --sparse https://github.com/microsoft/Microsoft-Rocketbox
cd Microsoft-Rocketbox && git sparse-checkout set Assets/Avatars/Adults Assets/Avatars/Professions && cd -
tools/rocketbox/convert_all.sh Microsoft-Rocketbox/Assets/Avatars
```

`convert_all.sh` lists the 22 characters the game uses. To add one, add its folder to `LIST`, run the script, then put the new `rb-...` name in the right group of `RB` in `index.html`.

## Who is who in the game

| Group in `RB` | Characters | Where they spend the day |
| --- | --- | --- |
| business | Business_Male_02, 04, 06, Business_Female_01, 04 | Caduceus (Building F); the "busy" passers-by |
| security | Security_Female_01 | Caduceus |
| worker | Construction_Male_07, Construction_Female_01, Delivery_Male_01 | Meridian Utilities and the Exchange (D, X) |
| lab | Gardener_Male_01 | Solarpunk Lab (H) |
| casual | Male_Adult_04, 09, 10, 12, 18, Female_Adult_07, 13 | anywhere |
| police | Police_Male_03, 06, 07 | the three male officers on patrol |
| nadia | Female_Adult_12 | behind the Byte Mart counter |
| courier | Female_Adult_04 | Ines, by the park fountain |

People with a workplace start on Meridian Row outside it, and when they wander more than 30 m away they favour the corners that lead back.
