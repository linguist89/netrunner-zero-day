// One command for the netrunner-total-update skill.
//   node sync.js               rebuild the board model from index.html and write the smallest patch that brings the board up to date
//   node sync.js --mark-synced record the new state in manifest.json (run once the patch calls succeeded)
// Every section is hashed piece by piece: shell (header, plan frames, roads), panel, one overlay per plan, and its tiles.
// A changed shell (or a changed renderer) redraws the section; otherwise only the changed pieces are sent.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execSync } = require('child_process');
const HERE = __dirname, OUT = path.join(HERE, 'out'), MAN = path.join(HERE, 'manifest.json'), LIMIT = 42000;
const run = c => execSync(c, { cwd: HERE, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
const J = JSON.stringify;

if (process.argv.includes('--mark-synced')) {
  const st = JSON.parse(fs.readFileSync(path.join(OUT, 'state.json'), 'utf8'));
  fs.writeFileSync(MAN, J({ figmaFile: JSON.parse(fs.readFileSync(path.join(HERE, 'meta.json'))).figmaFile, commit: st.commit, synced: new Date().toISOString().slice(0, 10), lib: st.lib, pieces: st.pieces }, null, 0).replace(/,"/g, ',\n"') + '\n');
  console.log(`manifest updated to ${st.commit}`); process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
fs.readdirSync(OUT).filter(f => /^patch-\d+\.js$/.test(f)).forEach(f => fs.unlinkSync(path.join(OUT, f)));
try { execSync(`node dump.js ${J(path.resolve(HERE, '../../index.html'))} out/world.json`, { cwd: HERE, stdio: ['ignore', 'ignore', 'pipe'] }); }
catch (e) { console.log('DUMP FAILED\n' + String(e.stderr).split('\n').filter(l => /\[dump\]|Error/.test(l)).slice(0, 6).join('\n')); process.exit(1); }
run('node gen.js'); run('node board.js');

// renderer blocks, for tree-shaking: //#fn name deps...
const src = fs.readFileSync(path.join(HERE, 'render.js'), 'utf8'), blocks = [];
src.split(/^\/\/#fn /m).slice(1).forEach(b => { const nl = b.indexOf('\n'), [name, ...deps] = b.slice(0, nl).trim().split(/\s+/); blocks.push({ name, deps, code: b.slice(nl + 1).replace(/^\/\/.*\n/gm, '').trim() }); });
const lib = hash(src);
const libFor = roots => { const need = new Set(), add = n => { if (need.has(n)) return; need.add(n); blocks.find(b => b.name === n).deps.forEach(add); }; roots.forEach(add); return blocks.filter(b => need.has(b.name)).map(b => b.code).join('\n'); };
const ROOTS = { full: ['SHELL', 'TILE', 'OVERLAY', 'PANEL'], tile: ['TILE'], overlay: ['OVERLAY'], panel: ['PANEL'], drop: ['FIND'], remove: ['FIND'] };

// hash every piece and diff against the manifest
const { sections } = JSON.parse(fs.readFileSync(path.join(OUT, 'board.json'), 'utf8'));
const man = fs.existsSync(MAN) ? JSON.parse(fs.readFileSync(MAN, 'utf8')) : { pieces: {} };
const old = man.lib === lib ? man.pieces : {}, pieces = {}, ops = [], summary = [];
const commit = run('git log -1 --format=%h -- ../../index.html') || run('git rev-parse --short HEAD');
sections.forEach(s => {
  const shell = J(Object.assign({}, s, { panel: undefined, plans: s.plans.map(p => Object.assign({}, p, { tiles: undefined, overlay: undefined })) }));
  const mine = { [`${s.name}|shell`]: hash(shell), [`${s.name}|panel`]: hash(J(s.panel)) };
  s.plans.forEach((p, i) => { mine[`${s.name}|${i}|overlay`] = hash(J(p.overlay)); p.tiles.forEach(t => { mine[`${s.name}|${i}|${t.k}`] = hash(J(t)); }); });
  Object.assign(pieces, mine);
  if (old[`${s.name}|shell`] !== mine[`${s.name}|shell`]) { ops.push(['full', s]); summary.push(`${s.name}: whole section`); return; }
  const parts = [];
  if (old[`${s.name}|panel`] !== mine[`${s.name}|panel`]) { ops.push(['panel', s.name, s.panel]); parts.push('panel'); }
  s.plans.forEach((p, i) => {
    if (old[`${s.name}|${i}|overlay`] !== mine[`${s.name}|${i}|overlay`]) { ops.push(['overlay', s.name, i, p.overlay]); parts.push((i ? `plan ${i} ` : '') + 'overlay'); }
    p.tiles.forEach(t => { if (old[`${s.name}|${i}|${t.k}`] !== mine[`${s.name}|${i}|${t.k}`]) { ops.push(['tile', s.name, i, t]); parts.push((i ? `plan ${i} ` : '') + t.k); } });
    Object.keys(old).filter(k => k.startsWith(`${s.name}|${i}|tile:`) && !mine[k]).forEach(k => { const t = k.split('|')[2]; ops.push(['drop', s.name, i, t]); parts.push('-' + t); });
  });
  if (parts.length) summary.push(`${s.name}: ${parts.join(' ')}`);
});
const names = new Set(sections.map(s => s.name));
[...new Set(Object.keys(man.pieces || {}).map(k => k.split('|')[0]))].filter(n => !names.has(n)).forEach(n => { ops.push(['remove', n]); summary.push(`${n}: remove`); });
fs.writeFileSync(path.join(OUT, 'state.json'), J({ commit, lib, pieces }));

const warn = JSON.parse(fs.readFileSync(path.join(OUT, 'specs.json'), 'utf8')).warnings;
console.log(`index.html at ${commit} · board synced at ${man.commit || 'never'}${man.lib && man.lib !== lib ? ' · renderer changed: full redraw' : ''}`);
warn.forEach(w => console.log('WARN ' + w));
if (!ops.length) { console.log('IN SYNC: nothing to update'); process.exit(0); }

// pack ops into as few use_figma scripts as fit, each carrying only the renderer blocks it needs
const files = []; let cur = [];
const script = list => libFor(['RUN', ...new Set(list.flatMap(o => ROOTS[o[0]]))]).replace(/^const done=\[\];/m, `const OPS=${J(list)};\nconst done=[];`);
ops.forEach(op => { const next = cur.concat([op]); if (cur.length && script(next).length > LIMIT) { files.push(cur); cur = [op]; } else cur = next; });
if (cur.length) files.push(cur);
files.forEach((list, i) => { const f = `out/patch-${i + 1}.js`; const code = script(list); fs.writeFileSync(path.join(HERE, f), code); console.log(`SEND ${f} (${(code.length / 1000).toFixed(1)}k chars)`); });
summary.forEach(s => console.log('  ' + s));
