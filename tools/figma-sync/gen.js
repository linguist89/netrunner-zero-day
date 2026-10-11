// out/world.json + meta.json -> out/specs.json: drawing data for every board section, plus guide checks.
const fs = require('fs');
const D = JSON.parse(fs.readFileSync(__dirname + '/out/world.json', 'utf8'));
const META = JSON.parse(fs.readFileSync(__dirname + '/meta.json', 'utf8'));
const r1 = v => Math.round(v * 10) / 10;
const fin = m => [m.x0, m.x1, m.z0, m.z1, m.y0, m.y1].every(Number.isFinite);
const face = yaw => Math.abs(Math.cos(yaw)) > 0.5 ? (Math.cos(yaw) > 0 ? 'north (0)' : 'south (PI)') : (Math.sin(yaw) > 0 ? 'east (PI/2)' : 'west (-PI/2)');
const deg = yaw => Math.round(yaw * 180 / Math.PI); // 0 = up the screen
const warnings = [];

/* buildings: footprint from building(), zone from the door handler's setZone */
const doorOf = {}; // letter -> { enter, exit, inSpawn, outSpawn }
Object.entries(D.spawns).forEach(([id, s]) => { const L = id.replace(/^(door|enter|exit)/, ''); const o = doorOf[L] = doorOf[L] || {}; if (/^exit/.test(id)) { o.exit = id; o.outSpawn = s; } else { o.enter = id; o.inSpawn = s; o.zone = s.zone; } });
const HERO = D.buildings.map(b => { const m = META.buildings[b.name] || {}; const d = doorOf[b.name] || {}; return Object.assign({}, b, { zone: d.zone || m.zone || null, short: m.short || b.sign, label: m.name || b.sign, door: d }); });

/* ---------------- interiors ---------------- */
const FLOOR = { in: '#6b4a2e', cad: '#c4c8cf', lab: '#7d7a70', util: '#45474d', police: '#c2c7cf', mart: '#57525c', xch: '#6f6a60' };
const RUG = { in: '#7a3b2e', cad: '#3a6f7a', lab: '#5a6a3a', mart: '#7a4a3a', police: '#3a4a6a', xch: '#5a4a3a', util: '#4a4a4a' };
function colour(m, zone) {
  const k = m.mat || '';
  if (/floor/i.test(k) && !/closet/i.test(k)) return FLOOR[zone] || '#55585f';
  if (/rug/i.test(k)) return RUG[zone] || '#5a4a4a';
  if (/wall/i.test(k) || (k === 'clay' && m.y1 > 6)) return '#3a3d44';
  const map = [[/^(scr|lscr|lapScr)/, '#3ee8f0'], [/poster/i, '#c9a24a'], [/books|bookStack/, '#8c3b2f'], [/brick/, '#8a4a3a'], [/oak/, '#a07a4a'], [/blackSteel/, '#2a2c31'], [/carbon/, '#2c2c30'], [/darkPlastic/, '#1e2024'], [/leather/, '#6a4030'], [/concrete/, '#8a8a86'], [/moss|leaf/, '#3f8a4a'], [/^wb/, '#f2f2ee'], [/seed/, '#c9a060'], [/glass/i, '#9fd8e8'], [/printer/, '#d8d8d8'], [/fridgeLight/, '#dfe8ff']];
  if (/steel/i.test(k) && m.col == null) return '#8d939b';
  for (const [re, c] of map) if (re.test(k)) return c;
  if (m.col && m.col !== '#ffffff') return m.col;
  if (m.em && m.em !== '#000000') return m.em;
  return m.col || '#7a8090';
}
const LABEL_MATS = /^(exitLbl|cadLogo|utilSign|xchSign|martSignIn|policeBoard|rackLbl|wall1337|quickref|payLbl|csLbl)/;
const S = 40;
let autoSlot = 0;
function interior(zone) {
  const z = D.zones[zone], off = z.offset, rot = Math.abs(z.rotY - Math.PI) < 0.01;
  let M = META.zones[zone];
  const B = HERO.find(h => h.zone === zone) || {};
  if (!M) { M = { id: B.name || zone, title: (B.label || zone) + ' (no meta.json entry yet)', sign: B.col || '#888888', fill: '#F9F9F9', slot: [0, 4000 + 1000 * autoSlot++], quest: '', feel: '' }; warnings.push(`zone '${zone}' has no meta.json entry: add title, colours, slot, quest and feel`); }
  const ms = z.meshes.filter(fin).filter(m => m.vis !== false && m.n !== 'blk' && !/glowDisc|coneMat/.test(m.mat || ''));
  const floor = ms.filter(m => /floor/i.test(m.mat || '') && m.y1 < 0.05).sort((a, b) => (b.x1 - b.x0) * (b.z1 - b.z0) - (a.x1 - a.x0) * (a.z1 - a.z0))[0];
  const X0 = floor.x0 - off, X1 = floor.x1 - off, Z0 = floor.z0, Z1 = floor.z1, pad = 1.2;
  const W = Math.round((X1 - X0 + 2 * pad) * S), H = Math.round((Z1 - Z0 + 2 * pad) * S);
  const px = x => r1((x - (X0 - pad)) * S), py = zz => r1((Z1 + pad - zz) * S);
  const cuts = M.plans === 'mezzanine' ? [{ name: 'Ground floor', keep: m => m.y0 < 2.8 }, { name: 'Mezzanine (+3.1 m)', keep: m => (m.y0 >= 2.8 && m.y0 < 6) || (m.y0 < 0.05 && m.y1 > 6) }] : [{ name: 'Floor plan', keep: m => m.y0 < 2.6 }];
  const plans = cuts.map(c => {
    const shapes = [], labels = [];
    ms.filter(c.keep).sort((a, b) => (a.y1 - b.y1) || ((b.x1 - b.x0) * (b.z1 - b.z0) - (a.x1 - a.x0) * (a.z1 - a.z0))).forEach(m => {
      const w = m.x1 - m.x0, d = m.z1 - m.z0;
      if (m.text) { if (LABEL_MATS.test(m.mat || '')) labels.push([px((m.x0 + m.x1) / 2 - off), py((m.z0 + m.z1) / 2), m.text.replace(/\s+/g, ' ').trim().slice(0, 48)]); return; }
      if (w < 0.06 && d < 0.06) return;
      if (/^(scr|lscr|lapScr|mscr)/.test(m.mat || m.n) && w * d < 0.02) return;
      shapes.push([/^(cyl|sph)/.test(m.n) ? 1 : 0, px(m.x0 - off), py(m.z1), r1(Math.max(w * S, 1)), r1(Math.max(d * S, 1)), colour(m, zone), (m.a != null && m.a < 0.9) || /glass/i.test(m.mat || '') ? 0.35 : 1]);
    });
    return { name: c.name, shapes, labels };
  });
  const lights = z.lights.map(l => rot ? [-l.x, -l.z] : [l.x, l.z]).map(p => [px(p[0]), py(p[1])]);
  const inters = D.inter.filter(i => i.zone === zone).map((i, k) => ({ n: k + 1, id: i.id, label: i.label, lx: r1(i.x - off), lz: r1(i.z), y: i.y, r: i.r, px: px(i.x - off), py: py(i.z) }));
  const dr = B.door || {}, inS = dr.inSpawn, outS = dr.outSpawn;
  const spawn = inS ? { lx: r1(inS.x - off), lz: r1(inS.z), face: face(inS.yaw), deg: deg(inS.yaw), px: px(inS.x - off), py: py(inS.z) } : null;
  // checks against the World Layout Guide
  const notes = [];
  notes.push(z.lights.length > 6 ? `Point lights: ${z.lights.length}. Over the guide's limit of 6 per zone (addLights uses 2 of the 8 a material takes).` : `Point lights: ${z.lights.length} (limit 6).`);
  const ex = inters.find(i => /^exit/.test(i.id));
  if (ex && spawn) { const d = Math.hypot(ex.lx - spawn.lx, ex.lz - spawn.lz); notes.push(`Inside spawn to exit trigger: ${d.toFixed(1)} m vs radius ${ex.r} m: ${d > ex.r ? 'clear' : 'the spawn sits inside the Leave prompt (guide 4.3 wants it outside)'}.`); }
  const hero = inters.find(i => /^comp-|cyberDesk|nadia/.test(i.id));
  if (hero && spawn) notes.push(`Hero object (${hero.id}) is ${Math.hypot(hero.lx - spawn.lx, hero.lz - spawn.lz).toFixed(1)} m from the spawn (guide: within 6 to 8 m).`);
  const fights = [];
  for (let a = 0; a < inters.length; a++) for (let b = a + 1; b < inters.length; b++) { const A = inters[a], Bb = inters[b]; if (A.y !== Bb.y) continue; const d = Math.hypot(A.lx - Bb.lx, A.lz - Bb.lz); if (d < (A.r + Bb.r) * 0.5) fights.push(`${A.id}/${Bb.id} (${d.toFixed(1)} m)`); }
  if (fights.length) notes.push('Prompts very close together (< half the summed radii): ' + fights.join(', ') + '.');
  ms.filter(m => !/wall|win|sill|exitLbl|clay|brick|Lbl|trim|charcoal|doorIn|tray|slab|stringer|tread|landing|frame|Frame|rail|policeSteel/i.test((m.mat || '') + m.n) && m.y1 < 2.6 && (m.x0 < floor.x0 - 0.1 || m.x1 > floor.x1 + 0.1 || m.z0 < floor.z0 - 0.1 || m.z1 > floor.z1 + 0.1))
    .forEach(m => notes.push(`'${m.mat}' (${m.n}) at x ${r1(m.x0 - off)} to ${r1(m.x1 - off)}, z ${r1(m.z0)} to ${r1(m.z1)} goes ${Math.max(floor.x0 - m.x0, m.x1 - floor.x1, floor.z0 - m.z0, m.z1 - floor.z1).toFixed(2)} m through the wall.`));
  const door = B.x != null ? `street door on the ${B.face > 0 ? 'north' : 'south'} face at (${B.x}, ${B.z + B.face * B.d / 2})` : 'no street door found';
  return { zone, M, off, rot, X0: r1(X0), X1: r1(X1), Z0: r1(Z0), Z1: r1(Z1), W, H, S, pad, plans, lights, inters, spawn, outS: outS ? { x: outS.x, z: outS.z, face: face(outS.yaw) } : null, door, notes, exitTop: ex ? ex.lz > 0 : false };
}
const out = { interiors: {}, warnings };
Object.keys(D.zones).filter(k => k !== 'out').forEach(k => { out.interiors[k] = interior(k); });
Object.keys(META.zones).filter(k => !D.zones[k]).forEach(k => warnings.push(`meta.json lists zone '${k}' but the game no longer has it: remove it and delete the "Interior ${META.zones[k].id}" section`));

/* ---------------- city ---------------- */
const Z = D.zones.out, C = D.CITY;
function cityLayer(win, s, short) {
  const [x0, x1, z0, z1] = win; const px = x => r1((x - x0) * s), py = z => r1((z1 - z) * s);
  const R = (a0, a1, b0, b1, col, op = 1, kind = 0) => [kind, px(a0), py(b1), r1((a1 - a0) * s), r1((b1 - b0) * s), col, op];
  const shapes = [];
  D.mapBlocks.forEach(b => shapes.push(R(b[0], b[1], b[2], b[3], b[4])));
  const ms = Z.meshes.filter(fin);
  ms.filter(m => /parkpath/.test(m.mat || '')).forEach(m => shapes.push(R(m.x0, m.x1, m.z0, m.z1, '#7d828c')));
  const prop = (re, col, kind = 0, test = () => true) => ms.filter(m => re.test(m.mat || '') && test(m)).forEach(m => shapes.push(R(m.x0, m.x1, m.z0, m.z1, col, 1, kind)));
  prop(/^fountain$/, '#5a6270', 1, m => m.y0 === 0); prop(/^water$/, '#2a6a8a', 1);
  prop(/^dumpster$/, '#2f5a3a'); prop(/^fence$/, '#8a8f99'); prop(/^crate$/, '#5f6672', 0, m => m.n === 'box'); prop(/^planter$/, '#2f3a33', 0, m => m.n === 'box');
  prop(/^cabinet$/, '#22262e'); prop(/^lotBooth$/, '#3a3d46'); prop(/^bollard$/, '#2a3550', 1, m => m.n === 'cyl'); prop(/^bin$/, '#3b4049', 1, m => m.n === 'cyl');
  prop(/^benchWood$/, '#7a5a3a', 0, m => m.n === 'blk');
  ms.filter(m => m.n === 'sigCap').forEach(m => { const cx = (m.x0 + m.x1) / 2, cz = (m.z0 + m.z1) / 2; shapes.push(R(cx - 0.45, cx + 0.45, cz - 0.45, cz + 0.45, '#ffb020', 1, 1)); }); // traffic signal heads
  // parked cars only: the lot, the garage roof and the police kerb (moving traffic is left off)
  ms.filter(m => m.n === 'carBody').filter(m => { const cx = (m.x0 + m.x1) / 2, cz = (m.z0 + m.z1) / 2; return m.y0 > 9 || (cx > 43 && cx < 65 && cz > -33 && cz < -7) || (Math.abs(cz - 8.6) < 0.3 && cx > 44 && cx < 64); })
    .forEach(m => shapes.push(R(m.x0, m.x1, m.z0, m.z1, (m.mat || '').replace('carBody', '') || '#888888')));
  ms.filter(m => m.mat === 'trunk').forEach(m => { const sc = (m.x1 - m.x0) / 0.42, cx = (m.x0 + m.x1) / 2, cz = (m.z0 + m.z1) / 2, rr = 1.3 * sc; shapes.push(R(cx - rr, cx + rr, cz - rr, cz + rr, '#27604a', 0.9, 1)); });
  C.roadsZ.forEach(rz => { for (let x = -60; x <= 60; x += 24) { if (C.roadsX.some(rx => Math.abs(x - rx) < 9)) continue; [-1, 1].forEach(g => { const lit = rz === 0 && Math.abs(x) < 20, rr = lit ? 0.5 : 0.35; shapes.push(R(x - rr, x + rr, rz + g * 5.6 - rr, rz + g * 5.6 + rr, lit ? '#ffcf90' : '#c9b48a', 1, 1)); }); } });
  C.roadsX.forEach(rx => { for (let z = -64; z <= 64; z += 24) { if (C.roadsZ.some(rz => Math.abs(z - rz) < 9)) continue; [-1, 1].forEach(g => shapes.push(R(rx + g * 5.6 - 0.35, rx + g * 5.6 + 0.35, z - 0.35, z + 0.35, '#c9b48a', 1, 1))); } });
  const Wd = Math.round((x1 - x0) * s), Hd = Math.round((z1 - z0) * s);
  const inW = sh => sh[1] + sh[3] >= 0 && sh[2] + sh[4] >= 0 && sh[1] <= Wd && sh[2] <= Hd;
  const labels = HERO.map(h => [px(h.x), py(h.z), short ? h.name + '\n' + h.short : `${h.label}\n${h.w} × ${h.d} m · ${h.h} m tall`, h.col]);
  labels.push([px(54), py(-20), 'PARKING LOT', '#ffd23f'], [px(-54), py(20) - 52, 'PARK + FOUNTAIN', '#8cf28c'], [px(-54), py(-60), 'MULTI-STOREY\nGARAGE', '#d0d4dc']);
  const doors = HERO.map(h => { const fz = h.z + h.face * h.d / 2; return [px(h.x - 1.15), py(fz + (h.face > 0 ? 0.25 : 0)), r1(2.3 * s), r1(Math.max(0.25 * s, 2)), h.col]; });
  const pins = D.inter.filter(i => i.zone === 'out').map((i, k) => ({ n: k + 1, id: i.id, label: i.label, x: i.x, z: i.z, r: i.r, px: px(i.x), py: py(i.z) }));
  const spawns = HERO.filter(h => h.door.outSpawn).map(h => ({ id: h.name, deg: deg(h.door.outSpawn.yaw), px: px(h.door.outSpawn.x), py: py(h.door.outSpawn.z), x: h.door.outSpawn.x, z: h.door.outSpawn.z, r: (pins.find(p => p.id === h.door.enter) || {}).r, ex: (pins.find(p => p.id === h.door.enter) || {}) }));
  const inWin = (p) => p.px >= 0 && p.py >= 0 && p.px <= Wd && p.py <= Hd;
  return { win, s, W: Wd, H: Hd, shapes: shapes.filter(inW), labels: labels.filter(l => l[0] >= 0 && l[0] <= Wd && l[1] >= 0 && l[1] <= Hd), doors, pins: pins.filter(inWin), allPins: pins, spawns: spawns.filter(inWin) };
}
out.city = cityLayer([-90, 90, -100, 100], 7, true);
out.row = cityLayer([-32, 64, -34, 34], 14, false);

/* street checks: hero footprints that intersect, exit spawns inside an Enter prompt or a footprint */
const street = [];
for (let a = 0; a < HERO.length; a++) for (let b = a + 1; b < HERO.length; b++) { const A = HERO[a], B = HERO[b]; const ox = Math.min(A.x + A.w / 2, B.x + B.w / 2) - Math.max(A.x - A.w / 2, B.x - B.w / 2), oz = Math.min(A.z + A.d / 2, B.z + B.d / 2) - Math.max(A.z - A.d / 2, B.z - B.d / 2); if (ox > 0 && oz > 0) street.push(`Buildings ${A.name} and ${B.name} intersect by ${r1(Math.min(ox, oz))} m.`); }
out.row.spawns.forEach(s => { if (s.ex && s.ex.x != null && Math.hypot(s.x - s.ex.x, s.z - s.ex.z) <= s.r) street.push(`${s.id}: Leave puts you inside the Enter prompt.`); });
HERO.forEach(h => { const s = h.door.outSpawn; if (s && Math.abs(s.x - h.x) < h.w / 2 && Math.abs(s.z - h.z) < h.d / 2) street.push(`${h.name}: Leave puts you inside the building footprint.`); });
out.street = street;
out.cityGrid = C;
fs.writeFileSync(__dirname + '/out/specs.json', JSON.stringify(out));
