#!/usr/bin/env bash
# Convert the chosen Microsoft Rocketbox characters (MIT) into game-ready, base64-encoded GLBs in models/.
# usage: convert_all.sh /path/to/Microsoft-Rocketbox/Assets/Avatars   (needs python3 with bpy, numpy, pillow)
set -euo pipefail
SRC=$1; HERE=$(cd "$(dirname "$0")" && pwd); MODELS=$HERE/../../models; TMP=$(mktemp -d)
LIST="Professions/Police_Male_03 Professions/Police_Male_06 Professions/Police_Male_07 Professions/Security_Female_01
Professions/Business_Female_01 Professions/Business_Female_04 Professions/Business_Male_02 Professions/Business_Male_04 Professions/Business_Male_06
Adults/Female_Adult_04 Adults/Female_Adult_07 Adults/Female_Adult_12 Adults/Female_Adult_13
Adults/Male_Adult_04 Adults/Male_Adult_09 Adults/Male_Adult_10 Adults/Male_Adult_12 Adults/Male_Adult_18
Professions/Construction_Male_07 Professions/Construction_Female_01 Professions/Gardener_Male_01 Professions/Delivery_Male_01"
for a in $LIST; do
  n=$(basename "$a"); out=rb-$(echo "$n" | tr 'A-Z_' 'a-z-')
  case "$n" in *Female*) ref=avatar-rosa;; *) ref=avatar-player;; esac
  python3 "$HERE/fbx2gltf.py" "$SRC/$a/Export/$n.fbx" "$TMP/$n.glb" > /dev/null 2>&1
  python3 "$HERE/rb2rpm.py" "$TMP/$n.glb" "$MODELS/$ref.glb.txt" "$SRC/$a/Textures" "$TMP/$out.glb"
  base64 -w0 "$TMP/$out.glb" > "$MODELS/$out.glb.txt"
done
rm -rf "$TMP"
