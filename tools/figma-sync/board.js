// out/specs.json + meta.json -> out/board.json: the whole board as data.
// Each section = shell (header, plan frames, their base layer) + tiles + one overlay per plan + a panel.
// render.js draws this model; sync.js hashes every piece of it.
const fs = require('fs');
const P = JSON.parse(fs.readFileSync(__dirname + '/out/specs.json', 'utf8'));
const TS = 160; // tile size in px: 4 m inside buildings, ~23 m on the city map, ~11 m on Meridian Row
const HEAD = 150;
const r1 = v => Math.round(v * 10) / 10;
const pinCol = id => /^exit/.test(id) ? '#3ddc84' : /^comp-|cyberDesk/.test(id) ? '#ff4d6d' : /^(nadia|courier|rosa|julien|frontDesk)$/.test(id) ? '#b388ff' : /^(door|enter)/.test(id) ? '#3ee8f0' : '#ffb020';
const LEGEND = 'Legend: grey grid = 1 m · yellow dot = point light · coloured pin = interactable (dashed ring = prompt radius) · green = exit · red = terminal · violet = person · amber = examine · green triangle = spawn, pointing the way you face';

// cut a plan's shapes ([kind, x, y, w, h, colour, opacity], plan px) into tiles; a shape that crosses a border belongs to every tile it touches
function tiles(shapes, W, H) {
  const out = [];
  for (let ty = 0; ty < H; ty += TS) for (let tx = 0; tx < W; tx += TS) {
    const w = Math.min(TS, W - tx), h = Math.min(TS, H - ty), pal = [], idx = {}, rows = [];
    shapes.forEach(([k, x, y, sw, sh, c, op]) => {
      if (x >= tx + w || x + sw <= tx || y >= ty + h || y + sh <= ty) return;
      const key = c + k + op; if (idx[key] == null) { idx[key] = pal.length; pal.push([c, k, op]); }
      rows.push([r1(x - tx), r1(y - ty), sw, sh, idx[key]].join(','));
    });
    const last = new Map(); rows.forEach((r, i) => last.set(r, i)); // a shape stacked exactly on itself is drawn once
    if (rows.length) out.push({ k: `tile:${tx / TS},${ty / TS}`, x: tx, y: ty, w, h, p: pal, s: rows.filter((r, i) => last.get(r) === i).join(';') });
  }
  return out;
}
const gridLines = (ticks, s, origin, W, H) => ticks.map(([v, val, at]) => [v === 'v' ? 1 : 0, at]);
const tickTexts = (ticks, every, W, H, col, size) => ticks.filter(t => t[1] % every === 0).map(([v, val, at]) => v === 'v' ? [at + 2, H - 16, String(val), size, col] : [4, at + 2, String(val), size, col]);
const sections = [];

/* ---------------- interiors ---------------- */
Object.values(P.interiors).forEach(o => {
  const M = o.M, S = o.S, PANEL = 470, two = o.plans.length > 1;
  const ticks = [];
  for (let x = Math.ceil(o.X0); x <= Math.floor(o.X1); x++) ticks.push(['v', x, Math.round((x - (o.X0 - o.pad)) * S)]);
  for (let z = Math.ceil(o.Z0); z <= Math.floor(o.Z1); z++) ticks.push(['h', z, Math.round(((o.Z1 + o.pad) - z) * S)]);
  const plans = o.plans.map((pl, i) => {
    const mezz = i === 1;
    return {
      x: 40 + i * (o.W + 24), y: HEAD, w: o.W, h: o.H, bg: '#0f1117', grid: gridLines(ticks),
      tiles: tiles(pl.shapes, o.W, o.H),
      overlay: {
        rects: [[16, 12, 2 * S, 4, '#cfd3dc', 1]],
        lights: o.lights.map(l => [l[0], l[1], mezz ? 1 : 0]),
        labels: pl.labels.map(l => [l[0], l[1], l[2], 10, '#f3e6bd', '#1f3a2e']),
        pins: o.inters.map((it, k) => [it, k]).filter(([it]) => !two || (it.y > 0) === mezz).map(([it, k]) => [it.px, it.py, it.n, pinCol(it.id), it.r * S]),
        tris: !mezz && o.spawn ? [[o.spawn.px, o.spawn.py, o.spawn.deg, '#3ddc84', 11, 'SPAWN']] : [],
        texts: tickTexts(ticks, 2, o.W, o.H, '#8a90a0', 9).concat([[o.W - 56, 8, 'N ↑', 13, '#cfd3dc'], [16, 20, '2 m', 10, '#cfd3dc'],
          [o.W / 2 - 80, o.exitTop ? 6 : o.H - 34, mezz ? 'Mezzanine level · y 3.1' : (o.exitTop ? '↑' : '↓') + ' to Meridian Row', 11, mezz ? M.sign : '#3ddc84']])
      }
    };
  });
  const plansW = plans.length * o.W + (plans.length - 1) * 24, w = 40 + plansW + 32 + PANEL + 40;
  const spawnTxt = (o.spawn ? `Enter: placed at zone (${o.spawn.lx}, ${o.spawn.lz}) facing ${o.spawn.face}.` : 'Enter: no door handler found.') + (o.outS ? `\nLeave: placed on the street at (${o.outS.x}, ${o.outS.z}) facing ${o.outS.face}.` : '') + (M.quest ? `\nQuest hooks: ${M.quest}` : '');
  sections.push({
    name: 'Interior ' + M.id, x: M.slot[0], y: M.slot[1], w, h: HEAD + o.H + 40, fill: M.fill, accent: M.sign, title: M.title,
    sub: `Zone '${o.zone}' · interior offset x + ${o.off} · root ${o.rot ? 'rotated PI (door on the top wall, like the street door)' : 'not rotated'}\nFloor ${o.X0} to ${o.X1} by ${o.Z0} to ${o.Z1} m (${r1(o.X1 - o.X0)} × ${r1(o.Z1 - o.Z0)} m) · ${o.door} · ${S} px per metre, north up, as the overhead camera sees it`,
    plans,
    panel: { x: 40 + plansW + 32, y: HEAD, w: PANEL, blocks: [
      ['h', `Interactables (world x = zone x + ${o.off})`],
      ['t', [['#', 'Interactable', 'id', 'zone x, z']].concat(o.inters.map(i => [i.n, i.label + (i.y ? ' (mezz)' : ''), i.id, i.lx + ', ' + i.lz])), [30, 190, 110, 110], o.inters.map(i => pinCol(i.id))],
      ['h', 'Spawn and doors'], ['p', spawnTxt],
      ['h', 'Checks against the World Layout Guide'], ['p', o.notes.map(n => '• ' + n).join('\n') + (M.feel ? '\nIntended feel: ' + M.feel : '')],
      ['p', LEGEND, 11, '#6a7080']] }
  });
});

/* ---------------- city map and Meridian Row ---------------- */
function street(key, name, title, sub, x, opts) {
  const c = P[key], [x0, x1, z0, z1] = c.win, px = v => r1((v - x0) * c.s), py = v => r1((z1 - v) * c.s), PANEL = 440;
  const ticks = [];
  for (let v = Math.ceil(x0 / opts.tick) * opts.tick; v <= x1; v += opts.tick) ticks.push(['v', v, Math.round((v - x0) * c.s)]);
  for (let v = Math.ceil(z0 / opts.tick) * opts.tick; v <= z1; v += opts.tick) ticks.push(['h', v, Math.round((z1 - v) * c.s)]);
  const w = 40 + c.W + 32 + PANEL + 40;
  const notes = opts.notes + (P.street.length ? '\nStreet checks:\n' + P.street.map(s => '• ' + s).join('\n') : '');
  sections.push({
    name, x, y: 0, w, h: HEAD + c.H + 60, fill: opts.fill, accent: '#3ee8f0', title, sub,
    plans: [{ x: 40, y: HEAD, w: c.W, h: c.H, bg: '#2e3039', grid: gridLines(ticks), roads: { x0, z1, s: c.s, C: P.cityGrid },
      tiles: tiles(c.shapes, c.W, c.H),
      overlay: {
        rects: c.doors.map(d => [d[0], d[1], d[2], d[3], d[4], 1]).concat(P.clash.map(q => [px(q[0]), py(q[3]), r1((q[1] - q[0]) * c.s), r1((q[3] - q[2]) * c.s), '#ff4d6d', 0.6]), [[16, 14, opts.bar * c.s, 4, '#e6e8ee', 1]]),
        labels: c.labels.map(l => [l[0], l[1], l[2], opts.labelSize, l[3], '#0b0c10']),
        pins: c.pins.map(p => [p.px, p.py, p.n, pinCol(p.id), opts.radius ? p.r * c.s : 0]),
        tris: opts.spawns ? c.spawns.map(s => [s.px, s.py, s.deg, '#3ddc84', 9, s.id]) : [],
        texts: tickTexts(ticks, opts.labelEvery, c.W, c.H, '#c9cdd6', 10).concat([[c.W - 60, 10, 'N ↑', 14, '#e6e8ee'], [16, 22, opts.bar + ' m', 10, '#e6e8ee']])
      } }],
    panel: { x: 40 + c.W + 32, y: HEAD, w: PANEL, blocks: [
      ['h', 'Interactables outdoors'],
      ['t', [['#', 'Interactable', 'id', 'world x, z']].concat(c.allPins.map(p => [p.n, p.label, p.id, p.x + ', ' + p.z])), [30, 190, 110, 90], c.allPins.map(p => pinCol(p.id))],
      ['p', notes, 12]] }
  });
  return w;
}
const cityW = street('city', 'City map', 'Meridian: full city plan', 'Top-down plan of the outdoor zone (out) as built by buildOutdoor() and fillBlocks(). 7 px per metre, north up (+z), east right (+x), gridlines every 10 m with world coordinates.', 1100,
  { tick: 10, labelEvery: 10, labelSize: 11, bar: 10, radius: false, spawns: false, fill: '#F9F9F9', notes: 'How the city is laid out (CITY in index.html)\n• Meridian Row is the east-west road at z = 0; its two central blocks are hand-built (A, F, Byte Mart facing north onto it; H, D, X facing south).\n• Other blocks come from fillBlocks(): office slabs, the park and fountain, the garage, the parking lot and Meridian Police.\n• Bright dots are lamps that cast real light; amber dots are traffic signal heads; red strips are building footprints that intersect.\n• Traffic and pedestrians move, so only parked cars are drawn.\n• Interiors live in their own zones far east and have their own sections below.' });
street('row', 'Meridian Row', 'Meridian Row: the playable street in detail', 'x -32 to 64, z -34 to 34 at 14 px per metre, gridlines every 2 m. Street doors, Enter prompt radii and where Leave puts you.', 1100 + cityW + 100,
  { tick: 2, labelEvery: 4, labelSize: 13, bar: 5, radius: true, spawns: true, fill: '#F5FBFF', notes: 'Reading this view\n• Cyan bars = lit street doors; cyan pins = Enter prompts, dashed ring = prompt radius. Numbers match the city map.\n• Green arrows = where Leave puts you on the street, pointing the way you face.\n• Amber dots = traffic signal heads; red strips = intersecting building footprints.' });

/* ---------------- read me ---------------- */
const flagged = [];
Object.values(P.interiors).forEach(o => o.notes.forEach(n => { if (/limit 6\)|: clear\./.test(n)) return; const m = n.match(/is ([0-9.]+) m from the spawn/); if (m && +m[1] <= 8) return; flagged.push(`${o.M.id}: ${n}`); }));
P.street.forEach(s => flagged.push('Street: ' + s));
sections.push({
  name: 'Read me', x: 0, y: 0, w: 1000, h: 400, fill: '#FFFBF0', accent: '#3ee8f0', title: 'Netrunner: Zero Day', sub: 'World layout board · city plan and every enterable interior', plans: [],
  panel: { x: 40, y: 130, w: 920, blocks: [
    ['h', 'Where this comes from'], ['p', 'Measured from linguist89/netrunner-zero-day: index.html runs headlessly (Babylon NullEngine) and every mesh, light, interactable and door spawn is read out after buildWorld(). tools/figma-sync keeps the board in step: each section is split into tiles, an overlay and a panel, each with its own hash, and only the pieces whose data changed are redrawn. The commit last synced is in tools/figma-sync/manifest.json.', 13],
    ['h', 'How to read every plan'], ['p', 'Top-down, as the overhead camera sees it: north (+z) up, east (+x) right, metres. Pins are interactables (numbers match the table beside each plan), dashed rings are prompt radii, yellow dots point lights, green triangles spawn points facing the way the player faces. Interiors use zone coordinates (world x minus the zone offset).', 13],
    ['h', 'Zones'], ['t', [['zone', 'Building', 'Offset', 'Root']].concat(Object.values(P.interiors).map(o => [o.zone, o.M.title, 'x + ' + o.off, o.rot ? 'rotated PI' : 'none'])), [70, 450, 150, 170]],
    ['h', 'What the measurements flag'], ['p', flagged.length ? flagged.map((f, i) => (i + 1) + '. ' + f).join('\n') : 'Nothing: every check passes.', 13]] }
});
fs.writeFileSync(__dirname + '/out/board.json', JSON.stringify({ sections }));
