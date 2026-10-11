// Runs index.html headlessly (Babylon NullEngine in jsdom) and writes out/world.json:
// every mesh's world bounding box per zone, point lights, interactables and the spawn points each door uses.
// usage: node dump.js <path to index.html> <out file>
const fs = require('fs');
const { JSDOM } = require('jsdom');
const src = fs.readFileSync(process.argv[2], 'utf8');
const out = process.argv[3];

const want = (src.match(/babylonjs@([0-9.]+)\/babylon\.js/) || [])[1];
const have = require('babylonjs/package.json').version;
if (want && want !== have) console.error(`[dump] index.html uses babylonjs@${want}, node_modules has ${have}: run npm i babylonjs@${want}`);

let html = src.replace(/<script src="[^"]*"><\/script>/g, '');
const scripts = {};
html = html.replace(/<script id="(core|game)">([\s\S]*?)<\/script>/g, (m, id, body) => { scripts[id] = body; return ''; });

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const w = dom.window;
w.__BABYLON_NULL__ = true;
w.fetch = () => Promise.reject(new Error('no fetch'));
w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, addEventListener() {} }));
const noop = () => {}, grad = { addColorStop: noop };
const ctx = new Proxy({}, { get(t, k) { if (/^create(Radial|Linear)Gradient$|^createPattern$/.test(k)) return () => grad; if (k === 'measureText') return () => ({ width: 10 }); if (k === 'getImageData') return (x, y, ww, hh) => ({ data: new Uint8ClampedArray(ww * hh * 4) }); return k in t ? t[k] : noop; }, set(t, k, v) { t[k] = v; return true; } });
w.HTMLCanvasElement.prototype.getContext = () => ctx;
w.eval(fs.readFileSync(require.resolve('babylonjs/babylon.js'), 'utf8'));

// small source patches: tag text textures, skip cascaded shadows (needs a camera), expose internals,
// and let door handlers record where they would place the player instead of fading
const patches = [
  ['function textTex(text, o) {', 'function textTex(text, o) { const __t = __textTex0(text, o); __t.__text = String(text); return __t; } function __textTex0(text, o) {'],
  ['cfg.cascaded && BABYLON.CascadedShadowGenerator', 'cfg.cascaded && !NULL_ENGINE && BABYLON.CascadedShadowGenerator'],
  ["setZone('out', true);\n  }", "setZone('out', true); window.__dump = { zones, inter, obstacles, mapBlocks, CITY, store }; }"],
  ['function building(c) {', 'function building(c) { (window.__bld = window.__bld || []).push({ name: c.name, x: c.x, z: c.z, w: c.w, d: c.d, h: c.h, face: c.face, col: c.signColor, sign: c.sign });'],
  ['function transition(fn) {', 'function transition(fn) { if (window.__rec) { fn(); return; }'],
  ['function placePlayer(x, y, z, yaw) {', 'function placePlayer(x, y, z, yaw) { if (window.__rec) { window.__rec.push({ x, z, yaw, zone: state.zone }); return; }']
];
let game = scripts.game;
patches.forEach(([a, b]) => { if (!game.includes(a)) { console.error('[dump] patch target not found: ' + a.slice(0, 50)); process.exit(2); } game = game.replace(a, b); });
w.addEventListener('error', e => console.error('[dump] page error:', e.message));
w.eval(scripts.core);
w.eval(game);

const hex = c => c ? '#' + [c.r, c.g, c.b].map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('') : null;
const r2 = v => +v.toFixed(2);
let n = 0;
const t = setInterval(() => {
  if (!w.__dump) { if (++n > 600) { console.error('[dump] timeout'); process.exit(1); } return; }
  clearInterval(t);
  const D = w.__dump, res = { zones: {}, inter: [], spawns: {}, buildings: w.__bld || [], mapBlocks: D.mapBlocks, CITY: D.CITY };
  // door spawns: run every door / exit handler with all locks open and record placePlayer
  try { D.store.has = () => true; Object.assign(D.store.state.flags, { xchOpen: true, utilKey: true }); } catch (e) { }
  D.inter.filter(i => /^(door|enter|exit)/.test(i.id)).forEach(i => { w.__rec = []; try { i.run(); } catch (e) { } if (w.__rec.length) res.spawns[i.id] = w.__rec[w.__rec.length - 1]; });
  w.__rec = null;
  Object.values(D.zones).forEach(z => {
    z.root.setEnabled(true);
    const list = [];
    z.meshes.forEach(m => { try {
      m.computeWorldMatrix(true); const bb = m.getBoundingInfo().boundingBox, a = bb.minimumWorld, b = bb.maximumWorld; const mt = m.material || {};
      const tx = (mt.diffuseTexture && mt.diffuseTexture.__text) || (mt.emissiveTexture && mt.emissiveTexture.__text) || null;
      list.push({ n: m.name, mat: mt.name || null, col: hex(mt.diffuseColor), em: hex(mt.emissiveColor), a: mt.alpha, x0: r2(a.x), x1: r2(b.x), y0: r2(a.y), y1: r2(b.y), z0: r2(a.z), z1: r2(b.z), text: tx, vis: m.isVisible });
    } catch (e) { } });
    res.zones[z.name] = { offset: z.root.position.x, rotY: z.root.rotation.y, lights: z.lights.filter(l => l.getClassName() === 'PointLight').map(l => ({ x: r2(l.position.x), y: r2(l.position.y), z: r2(l.position.z) })), meshes: list };
  });
  D.inter.forEach(i => { if (i.pos) res.inter.push({ id: i.id, zone: i.zone, x: r2(i.pos.x), y: r2(i.pos.y), z: r2(i.pos.z), r: i.r, label: typeof i.label === 'function' ? '(dynamic)' : i.label }); });
  fs.writeFileSync(out, JSON.stringify(res));
  process.exit(0);
}, 50);
