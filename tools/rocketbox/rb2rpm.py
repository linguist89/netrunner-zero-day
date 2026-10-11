#!/usr/bin/env python3
"""Stage 2: put a Rocketbox character (exported by fbx2gltf.py) on the game's own skeleton.

The game plays its animation clips by copying each clip's per-bone rotations onto bones with the
same name, so a new character only moves correctly if its bones have the clip's names AND the same
local axes as the Ready Player Me rig the clips were made for. This script:

  1. reads the Rocketbox mesh at its bind pose (3ds Max Biped skeleton, A-pose, centimetres);
  2. bends it, bone by bone, into the reference rig's rest pose (each limb segment is swung onto the
     reference direction, so an A-pose arm becomes a T-pose arm);
  3. builds a new skeleton with the reference rig's bone names, hierarchy and world orientations,
     but at the Rocketbox character's own joint positions (so proportions are kept);
  4. remaps the skin weights from Biped bones to the new bones (face bones fold into Head);
  5. writes a GLB with small textures: colour as JPEG, the hair/eyelash cards as PNG with alpha.

usage: rb2rpm.py raw.glb reference.glb[.txt] textures_dir out.glb [--tex 512]
"""
import sys, json, struct, base64, io, os, re, glob
import numpy as np
from PIL import Image

# ---------- glTF reading ----------
def read_glb(path):
    b = open(path, 'rb').read()
    if path.endswith('.txt'): b = base64.b64decode(b.strip())
    jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + jl])
    off = 20 + jl; bin_ = b''
    if off < len(b): bl = struct.unpack('<I', b[off:off + 4])[0]; bin_ = b[off + 8:off + 8 + bl]
    return j, bin_

CT = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
def acc(j, bin_, i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; dt = CT[a['componentType']]; n = NC[a['type']]
    start = bv.get('byteOffset', 0) + a.get('byteOffset', 0); stride = bv.get('byteStride')
    isz = np.dtype(dt).itemsize * n
    if stride and stride != isz:
        raw = np.frombuffer(bin_, np.uint8, count=stride * a['count'], offset=start).reshape(a['count'], stride)[:, :isz]
        arr = np.frombuffer(raw.tobytes(), dt).reshape(a['count'], n)
    else:
        arr = np.frombuffer(bin_, dt, count=a['count'] * n, offset=start).reshape(a['count'], n)
    if a.get('normalized') and dt != np.float32: arr = arr.astype(np.float32) / np.iinfo(dt).max
    return arr.copy()

def quat_mat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
def mat_quat(m):
    t = np.trace(m)
    if t > 0:
        s = np.sqrt(t + 1) * 2; w = 0.25 * s; x = (m[2, 1] - m[1, 2]) / s; y = (m[0, 2] - m[2, 0]) / s; z = (m[1, 0] - m[0, 1]) / s
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = np.sqrt(1 + m[0, 0] - m[1, 1] - m[2, 2]) * 2; w = (m[2, 1] - m[1, 2]) / s; x = 0.25 * s; y = (m[0, 1] + m[1, 0]) / s; z = (m[0, 2] + m[2, 0]) / s
    elif m[1, 1] > m[2, 2]:
        s = np.sqrt(1 + m[1, 1] - m[0, 0] - m[2, 2]) * 2; w = (m[0, 2] - m[2, 0]) / s; x = (m[0, 1] + m[1, 0]) / s; y = 0.25 * s; z = (m[1, 2] + m[2, 1]) / s
    else:
        s = np.sqrt(1 + m[2, 2] - m[0, 0] - m[1, 1]) * 2; w = (m[1, 0] - m[0, 1]) / s; x = (m[0, 2] + m[2, 0]) / s; y = (m[1, 2] + m[2, 1]) / s; z = 0.25 * s
    q = np.array([x, y, z, w]); return q / np.linalg.norm(q)
def trs(n):
    if 'matrix' in n: return np.array(n['matrix'], float).reshape(4, 4).T
    m = np.eye(4); s = np.array(n.get('scale', [1, 1, 1]), float)
    m[:3, :3] = quat_mat(n.get('rotation', [0, 0, 0, 1])) * s; m[:3, 3] = n.get('translation', [0, 0, 0]); return m
def world_mats(j):
    W = {}; parent = {}
    for i, n in enumerate(j['nodes']):
        for c in n.get('children', []): parent[c] = i
    def w(i):
        if i not in W: W[i] = (w(parent[i]) if i in parent else np.eye(4)) @ trs(j['nodes'][i])
        return W[i]
    for i in range(len(j['nodes'])): w(i)
    return W, parent

def swing(a, b):
    """the smallest rotation taking direction a onto direction b"""
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b); v = np.cross(a, b); c = float(np.dot(a, b))
    if c > 0.999999: return np.eye(3)
    if c < -0.999999:
        ax = np.cross(a, [1, 0, 0]); ax = ax if np.linalg.norm(ax) > 1e-6 else np.cross(a, [0, 1, 0]); ax /= np.linalg.norm(ax)
        return 2 * np.outer(ax, ax) - np.eye(3)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx / (1 + c)
def ortho(m):
    u, _, vt = np.linalg.svd(m); r = u @ vt
    if np.linalg.det(r) < 0: u[:, -1] *= -1; r = u @ vt
    return r

# ---------- Biped -> game skeleton ----------
def biped_name(rpm):
    """the Biped joint that sits where this game bone sits, or None (end bones are placed by proportion)"""
    fixed = {'Hips': 'Bip01 Pelvis', 'Spine': 'Bip01 Spine', 'Spine1': 'Bip01 Spine1', 'Spine2': 'Bip01 Spine2', 'Neck': 'Bip01 Neck', 'Head': 'Bip01 Head',
             'LeftEye': 'Bip01 LEye', 'RightEye': 'Bip01 REye'}
    if rpm in fixed: return fixed[rpm]
    m = re.match(r'(Left|Right)(.*)$', rpm)
    if not m: return None
    s = 'L' if m.group(1) == 'Left' else 'R'; part = m.group(2)
    limb = {'Shoulder': 'Clavicle', 'Arm': 'UpperArm', 'ForeArm': 'Forearm', 'Hand': 'Hand', 'UpLeg': 'Thigh', 'Leg': 'Calf', 'Foot': 'Foot', 'ToeBase': 'Toe0'}
    if part in limb: return 'Bip01 %s %s' % (s, limb[part])
    f = re.match(r'Hand(Thumb|Index|Middle|Ring|Pinky)([1-4])$', part)
    if f:
        k = {'Thumb': 0, 'Index': 1, 'Middle': 2, 'Ring': 3, 'Pinky': 4}[f.group(1)]; seg = int(f.group(2))
        if seg == 4: return None
        return 'Bip01 %s Finger%d%s' % (s, k, '' if seg == 1 else str(seg - 1))
    return None
def fold_biped(b):
    """the game bone that a Biped joint's skin weights go to"""
    if b in ('Bip01', 'Bip01 Pelvis') or not b.startswith('Bip01'): return 'Hips'   # a few files carry an extra helper such as neutral_bone
    if b in ('Bip01 LEye', 'Bip01 LEyeBlinkTop', 'Bip01 LEyeBlinkBottom'): return 'LeftEye'
    if b in ('Bip01 REye', 'Bip01 REyeBlinkTop', 'Bip01 REyeBlinkBottom'): return 'RightEye'
    if re.match(r'Bip01 [LRM][A-Z]', b) and not re.match(r'Bip01 [LR] ', b): return 'Head'   # jaw, lips, brows, cheeks...
    return None
# the child whose direction defines each bone (the segment that is swung onto the reference)
def prim_child(rpm, children):
    pref = {'Hips': None, 'Spine': 'Spine1', 'Spine1': 'Spine2', 'Spine2': 'Neck', 'Neck': 'Head', 'Head': None}
    if rpm in pref: return pref[rpm]
    m = re.match(r'(Left|Right)(.*)$', rpm)
    if not m: return None
    s, part = m.group(1), m.group(2)
    nxt = {'Shoulder': 'Arm', 'Arm': 'ForeArm', 'ForeArm': 'Hand', 'Hand': 'HandMiddle1', 'UpLeg': 'Leg', 'Leg': 'Foot', 'Foot': 'ToeBase'}
    if part in nxt: return s + nxt[part]
    f = re.match(r'Hand(Thumb|Index|Middle|Ring|Pinky)([1-3])$', part)
    if f and int(f.group(2)) < 3: return s + 'Hand' + f.group(1) + str(int(f.group(2)) + 1)
    return None

def main():
    args = sys.argv[1:]; tex_px = 512
    if '--tex' in args: i = args.index('--tex'); tex_px = int(args[i + 1]); del args[i:i + 2]
    raw_path, ref_path, tex_dir, out_path = args

    # ---- reference rig: names, hierarchy, world rest frames ----
    rj, _ = read_glb(ref_path); RW, RP = world_mats(rj); rn = rj['nodes']
    hips_i = next(i for i, n in enumerate(rn) if n.get('name') == 'Hips')
    order = []; rparent = {}
    def walk(i, p):
        nm = rn[i]['name']
        if nm.startswith('CURVE'): return
        order.append(nm); rparent[nm] = p
        for c in rn[i].get('children', []): walk(c, nm)
    walk(hips_i, None)
    ridx = {n.get('name'): i for i, n in enumerate(rn)}
    rpos = {b: RW[ridx[b]][:3, 3] for b in order}; rrot = {b: ortho(RW[ridx[b]][:3, :3]) for b in order}
    rlocal_t = {b: np.array(rn[ridx[b]].get('translation', [0, 0, 0]), float) for b in order}
    children = {b: [c for c in order if rparent[c] == b] for b in order}

    # ---- Rocketbox mesh at bind pose ----
    j, bin_ = read_glb(raw_path); W, _ = world_mats(j)
    mesh_node = next(i for i, n in enumerate(j['nodes']) if 'mesh' in n and 'skin' in n)
    skin = j['skins'][j['nodes'][mesh_node]['skin']]; joints = skin['joints']; ibm = acc(j, bin_, skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    jname = [j['nodes'][i]['name'] for i in joints]; jpos = {jname[k]: W[joints[k]][:3, 3] for k in range(len(joints))}
    skinmat = np.stack([W[joints[k]] @ ibm[k] for k in range(len(joints))])
    prims = []
    for p in j['meshes'][j['nodes'][mesh_node]['mesh']]['primitives']:
        a = p['attributes']; v = acc(j, bin_, a['POSITION']).astype(float); nrm = acc(j, bin_, a['NORMAL']).astype(float)
        jt = acc(j, bin_, a['JOINTS_0']).astype(int); wt = acc(j, bin_, a['WEIGHTS_0']).astype(float); wt /= wt.sum(1, keepdims=True)
        M = np.einsum('vk,vkab->vab', wt, skinmat[jt]); vh = np.c_[v, np.ones(len(v))]
        P = np.einsum('vab,vb->va', M, vh)[:, :3]; N = np.einsum('vab,vb->va', M[:, :3, :3], nrm); N /= np.linalg.norm(N, axis=1, keepdims=True)
        prims.append(dict(P=P, N=N, uv=acc(j, bin_, a['TEXCOORD_0']), idx=acc(j, bin_, p['indices']).ravel(), jt=jt, wt=wt, mat=j['materials'][p['material']]['name']))

    # face +z like the reference rig, with the character's left at +x
    flip = np.eye(3)
    fwd = (jpos['Bip01 L Toe0'] + jpos['Bip01 R Toe0']) / 2 - (jpos['Bip01 L Foot'] + jpos['Bip01 R Foot']) / 2
    if fwd[2] < 0: flip = np.diag([-1., 1, -1])
    jpos = {k: flip @ v for k, v in jpos.items()}
    for p in prims: p['P'] = p['P'] @ flip.T; p['N'] = p['N'] @ flip.T
    assert jpos['Bip01 L Thigh'][0] > jpos['Bip01 R Thigh'][0], 'left/right mirrored'

    # ---- pose matching over the game's hierarchy ----
    hb = {b: biped_name(b) for b in order}; have = {b for b in order if hb[b] in jpos}
    p0 = {b: jpos[hb[b]] for b in have}
    scale = (p0['Head'][1] - p0['Hips'][1]) / (rpos['Head'][1] - rpos['Hips'][1])
    G = {}; newp = {}
    for b in order:
        q = rparent[b]
        if b in have:
            newp[b] = p0[b] if q is None else newp[q] + G[q] @ (p0[b] - p0[q])
        else:   # end bones: the reference offset, scaled to this body, in the reference frame
            newp[b] = newp[q] + rrot[q] @ (rlocal_t[b] * scale); p0[b] = None
        Gq = np.eye(3) if q is None else G[q]
        c = prim_child(b, children[b])
        if b in have and c in have:
            G[b] = swing(Gq @ (p0[c] - p0[b]), rpos[c] - rpos[b]) @ Gq
        else:
            G[b] = Gq
    # skin: every Biped joint folds onto a game bone
    fold = {}
    inv_hb = {v: k for k, v in hb.items() if v}
    for nm in jname:
        fold[nm] = inv_hb.get(nm) or fold_biped(nm)
        if fold[nm] is None:
            raise SystemExit('unmapped Biped joint: ' + nm)
    bones = order; bi = {b: i for i, b in enumerate(bones)}
    for p in prims:
        A = np.zeros((len(p['P']), 3)); NN = np.zeros_like(A)
        jt = p['jt']; wt = p['wt']; nj = np.zeros((len(jt), 4), int); nw = np.zeros((len(jt), 4))
        for k in range(4):
            names = [fold[jname[x]] for x in jt[:, k]]
            for b in set(names):
                sel = np.array([n == b for n in names]) & (wt[:, k] > 0)
                if not sel.any(): continue
                piv = p0[b] if p0[b] is not None else newp[b]
                A[sel] += wt[sel, k:k + 1] * (newp[b] + (p['P'][sel] - piv) @ G[b].T)
                NN[sel] += wt[sel, k:k + 1] * (p['N'][sel] @ G[b].T)
            nj[:, k] = [bi[n] for n in names]; nw[:, k] = wt[:, k]
        # merge duplicate joints per vertex
        for v in range(len(nj)):
            d = {}
            for k in range(4): d[nj[v, k]] = d.get(nj[v, k], 0) + nw[v, k]
            items = sorted(d.items(), key=lambda t: -t[1])[:4] + [(0, 0.0)] * 4
            nj[v] = [t[0] for t in items[:4]]; nw[v] = [t[1] for t in items[:4]]
        nw /= nw.sum(1, keepdims=True)
        p['P'] = A; p['N'] = NN / np.linalg.norm(NN, axis=1, keepdims=True); p['jt'] = nj; p['wt'] = nw
    # stand on the ground, hips over the origin
    allP = np.concatenate([p['P'] for p in prims])
    shift = np.array([-newp['Hips'][0], -allP[:, 1].min(), -newp['Hips'][2] + rpos['Hips'][2]])
    for p in prims: p['P'] = p['P'] + shift
    for b in bones: newp[b] = newp[b] + shift

    # ---- the new skeleton: reference names and world orientations, this body's joint positions ----
    Wn = {}
    for b in bones: m = np.eye(4); m[:3, :3] = rrot[b]; m[:3, 3] = newp[b]; Wn[b] = m
    nodes = [{'name': 'Armature', 'children': []}]; ni = {}
    for b in bones:
        q = rparent[b]; L = (np.linalg.inv(Wn[q]) if q else np.eye(4)) @ Wn[b]
        ni[b] = len(nodes); nodes.append({'name': b, 'translation': [float(x) for x in L[:3, 3]], 'rotation': [float(x) for x in mat_quat(ortho(L[:3, :3]))]})
        (nodes[ni[q]] if q else nodes[0]).setdefault('children', []).append(ni[b])
    IBM = np.stack([np.linalg.inv(Wn[b]) for b in bones])

    # ---- materials and textures ----
    blob = bytearray(); views = []; accs = []; images = []; textures = []; materials = []
    def add_view(data, target=None):
        while len(blob) % 4: blob.append(0)
        views.append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(data)} | ({'target': target} if target else {})); blob.extend(data); return len(views) - 1
    def add_acc(arr, ctype, typ, target=None, minmax=False, normalized=False):
        v = add_view(arr.tobytes(), target); a = {'bufferView': v, 'componentType': ctype, 'count': len(arr), 'type': typ}
        if minmax: a['min'] = [float(x) for x in arr.min(0)]; a['max'] = [float(x) for x in arr.max(0)]
        if normalized: a['normalized'] = True
        accs.append(a); return len(accs) - 1
    def add_acc_strided(arr, ctype, typ, stride, normalized):   # a VEC3 of bytes padded to 4 per vertex
        v = add_view(arr.tobytes(), 34962); views[v]['byteStride'] = stride
        accs.append({'bufferView': v, 'componentType': ctype, 'count': len(arr), 'type': typ, 'normalized': normalized}); return len(accs) - 1
    def add_image(path, kind):
        im = Image.open(path); bio = io.BytesIO()
        if kind == 'alpha':
            im = im.convert('RGBA'); px = max(128, tex_px // 2); im = im.resize((px, px * im.height // im.width), Image.LANCZOS); im.save(bio, 'PNG', optimize=True); mime = 'image/png'
        else:
            im = im.convert('RGB'); im = im.resize((tex_px, tex_px * im.height // im.width), Image.LANCZOS); im.save(bio, 'JPEG', quality=82, optimize=True); mime = 'image/jpeg'
        images.append({'bufferView': add_view(bio.getvalue()), 'mimeType': mime}); textures.append({'source': len(images) - 1, 'sampler': 0}); return len(textures) - 1
    tex_files = glob.glob(os.path.join(tex_dir, '*'))
    def find_tex(matname, kind):
        part = matname.split('_')[-1]   # body | head | opacity
        cand = [f for f in tex_files if re.search(r'_%s_color\.' % part, os.path.basename(f), re.I)]
        return cand[0] if cand else None
    prim_out = []
    tag = re.sub(r'\W', '', os.path.splitext(os.path.basename(out_path))[0])
    for p in prims:
        part = p['mat'].split('_')[-1].lower(); alpha = part == 'opacity'
        tf = find_tex(p['mat'], 'alpha' if alpha else 'rgb')
        m = {'name': 'RB_' + part, 'pbrMetallicRoughness': {'metallicFactor': 0.0, 'roughnessFactor': 0.85 if not alpha else 0.7}}
        if tf: m['pbrMetallicRoughness']['baseColorTexture'] = {'index': add_image(tf, 'alpha' if alpha else 'rgb')}
        if alpha: m['alphaMode'] = 'MASK'; m['alphaCutoff'] = 0.45; m['doubleSided'] = True
        materials.append(m)
        # compact vertex data (KHR_mesh_quantization): normals as bytes, UVs as shorts, weights as bytes summing to 255
        n8 = np.c_[np.clip(np.round(p['N'] * 127), -127, 127).astype(np.int8), np.zeros(len(p['N']), np.int8)]
        uv = p['uv']; uv_ok = uv.min() >= 0 and uv.max() <= 1
        w8 = np.floor(p['wt'] * 255).astype(int); w8[np.arange(len(w8)), w8.argmax(1)] += 255 - w8.sum(1)
        prim_out.append({'attributes': {'POSITION': add_acc(p['P'].astype(np.float32), 5126, 'VEC3', 34962, True),
                                        'NORMAL': add_acc_strided(n8, 5120, 'VEC3', 4, True),
                                        'TEXCOORD_0': add_acc(np.round(uv * 65535).astype(np.uint16), 5123, 'VEC2', 34962, normalized=True) if uv_ok else add_acc(uv.astype(np.float32), 5126, 'VEC2', 34962),
                                        'JOINTS_0': add_acc(p['jt'].astype(np.uint8), 5121, 'VEC4', 34962),
                                        'WEIGHTS_0': add_acc(w8.astype(np.uint8), 5121, 'VEC4', 34962, normalized=True)},
                         'indices': add_acc(p['idx'].astype(np.uint16 if p['idx'].max() < 65535 else np.uint32), 5123 if p['idx'].max() < 65535 else 5125, 'SCALAR', 34963),
                         'material': len(materials) - 1})
    mesh_i = len(nodes); nodes.append({'name': 'RB_Body', 'mesh': 0, 'skin': 0}); nodes[0]['children'].append(mesh_i)
    ibm_acc = add_acc(IBM.transpose(0, 2, 1).reshape(-1, 16).astype(np.float32), 5126, 'MAT4')
    gl = {'asset': {'version': '2.0', 'generator': 'netrunner rb2rpm (Microsoft Rocketbox, MIT)'},
          'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': nodes, 'meshes': [{'name': 'RB_Body', 'primitives': prim_out}],
          'skins': [{'joints': [ni[b] for b in bones], 'inverseBindMatrices': ibm_acc, 'skeleton': ni['Hips']}],
          'materials': materials, 'textures': textures, 'images': images, 'samplers': [{'magFilter': 9729, 'minFilter': 9987}],
          'accessors': accs, 'bufferViews': views, 'extensionsUsed': ['KHR_mesh_quantization'], 'extensionsRequired': ['KHR_mesh_quantization'], 'buffers': [{'byteLength': len(blob)}],
          'extras': {'hipsY': float(newp['Hips'][1]), 'height': float(allP[:, 1].max() - allP[:, 1].min())}}
    js = json.dumps(gl, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    while len(blob) % 4: blob.append(0)
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
    open(out_path, 'wb').write(out)
    print('%s: %d bones, %d verts, hips %.3f m, height %.2f m, %d KB' % (os.path.basename(out_path), len(bones), sum(len(p['P']) for p in prims), newp['Hips'][1], gl['extras']['height'], len(out) // 1024))

if __name__ == '__main__':
    main()
