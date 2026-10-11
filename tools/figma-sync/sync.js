// One command for the netrunner-total-update skill.
//   node sync.js               rebuild data, list the board sections that changed since the last sync
//   node sync.js --mark-synced record the current state as synced (run after the Figma calls succeeded)
// Output is kept to a few lines on purpose: it is read by an agent.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execSync } = require('child_process');
const HERE = __dirname, REPO = path.resolve(HERE, '../..'), MAN = path.join(HERE, 'manifest.json'), OUT = path.join(HERE, 'out');
const sh = c => execSync(c, { cwd: HERE, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
const commit = sh('git rev-parse --short HEAD');
const man = fs.existsSync(MAN) ? JSON.parse(fs.readFileSync(MAN, 'utf8')) : { commit: null, sections: {} };
const hashes = () => { const h = {}; fs.readdirSync(path.join(OUT, 'calls')).forEach(f => { const s = fs.readFileSync(path.join(OUT, 'calls', f), 'utf8'); const name = s.split('\n')[0].replace('// section: ', ''); h[name] = { file: path.join('out/calls', f), hash: crypto.createHash('sha1').update(s.replace(/commit [0-9a-f]{7,}/g, 'commit X')).digest('hex').slice(0, 12) }; }); return h; };

if (process.argv.includes('--mark-synced')) {
  const h = JSON.parse(fs.readFileSync(path.join(OUT, 'hashes.json'), 'utf8'));
  fs.writeFileSync(MAN, JSON.stringify({ figmaFile: JSON.parse(fs.readFileSync(path.join(HERE, 'meta.json'))).figmaFile, commit: h.commit, synced: new Date().toISOString().slice(0, 10), sections: Object.fromEntries(Object.entries(h.sections).map(([k, v]) => [k, v.hash])) }, null, 1) + '\n');
  console.log(`manifest updated to ${h.commit}`); process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });
try { execSync(`node dump.js ${JSON.stringify(path.join(REPO, 'index.html'))} out/world.json`, { cwd: HERE, stdio: ['ignore', 'ignore', 'pipe'] }); }
catch (e) { console.log('DUMP FAILED:\n' + e.stderr.toString().split('\n').filter(l => /\[dump\]|Error/.test(l)).slice(0, 6).join('\n')); process.exit(1); }
sh('node gen.js'); sh(`node build.js ${commit}`);
const now = hashes();
fs.writeFileSync(path.join(OUT, 'hashes.json'), JSON.stringify({ commit, sections: now }));
const changed = Object.keys(now).filter(k => k !== 'Read me' && man.sections[k] !== now[k].hash);
const removed = Object.keys(man.sections).filter(k => !now[k]);
if (man.sections['Read me'] !== now['Read me'].hash) changed.push('Read me'); // the read me only follows its own findings, not every edit
const warn = JSON.parse(fs.readFileSync(path.join(OUT, 'specs.json'), 'utf8')).warnings;
console.log(`repo ${commit} · board last synced at ${man.commit || 'never'}`);
warn.forEach(w => console.log('WARN ' + w));
if (!changed.length && !removed.length) { console.log('IN SYNC: nothing to update'); process.exit(0); }
changed.forEach(k => console.log(`UPDATE ${k} -> ${now[k].file} (${fs.statSync(path.join(HERE, now[k].file)).size} chars)`));
removed.forEach(k => console.log(`REMOVE ${k}`));
