// out/specs.json -> one self-contained use_figma script per board section in out/calls/.
// Every script deletes the section with the same name first, so re-running one is safe.
const fs = require('fs');
const P = JSON.parse(fs.readFileSync(__dirname + '/out/specs.json', 'utf8'));
const META = JSON.parse(fs.readFileSync(__dirname + '/meta.json', 'utf8'));
const COMMIT = process.argv[2] || 'unknown';
const OUT = __dirname + '/out/calls'; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const J = JSON.stringify;

const LIB = `const H=h=>{h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255}};
for(const f of [['Inter','Regular'],['Inter','Bold'],['JetBrains Mono','Regular'],['JetBrains Mono','Bold']]) await figma.loadFontAsync({family:f[0],style:f[1]});
function R(p,x,y,w,h,f,o={}){const n=o.e?figma.createEllipse():figma.createRectangle();p.appendChild(n);n.x=x;n.y=y;n.resize(Math.max(w,0.5),Math.max(h,0.5));n.fills=f?[{type:'SOLID',color:H(f),opacity:o.op==null?1:o.op}]:[];if(o.s){n.strokes=[{type:'SOLID',color:H(o.s),opacity:o.so==null?1:o.so}];n.strokeWeight=o.sw||1;if(o.dash)n.dashPattern=o.dash;}else n.strokes=[];if(o.cr)n.cornerRadius=o.cr;if(o.n)n.name=o.n;return n;}
function T(p,x,y,s,size,col,o={}){const t=figma.createText();p.appendChild(t);t.fontName={family:o.m?'JetBrains Mono':'Inter',style:o.b?'Bold':'Regular'};t.fontSize=size;t.characters=String(s);t.fills=[{type:'SOLID',color:H(col)}];if(o.lh)t.lineHeight={unit:'PERCENT',value:o.lh};if(o.w){t.textAutoResize='HEIGHT';t.resize(o.w,t.height);}if(o.al)t.textAlignHorizontal=o.al;t.x=x;t.y=y;if(o.c){t.x=x-t.width/2;t.y=y-t.height/2;}return t;}
function FR(p,x,y,w,h,bg,name){const f=figma.createFrame();p.appendChild(f);f.x=x;f.y=y;f.resize(w,h);f.fills=[{type:'SOLID',color:H(bg)}];f.clipsContent=true;f.name=name;f.cornerRadius=8;return f;}
function SEC(name,x,y,w,h,fill){figma.currentPage.children.filter(n=>n.type==='SECTION'&&n.name===name).forEach(n=>n.remove());const s=figma.createSection();figma.currentPage.appendChild(s);s.name=name;s.x=x;s.y=y;s.resize(w,h);s.fills=[{type:'SOLID',color:H(fill)}];return s;}
function SH(p,data,pal){for(const row of data.split(';')){if(!row)continue;const a=row.split(',');const c=pal[+a[4]];R(p,+a[0],+a[1],+a[2],+a[3],c[0],{e:c[1]===1,op:c[2]});}}
function PIN(p,x,y,n,col,r){if(r)R(p,x-r,y-r,2*r,2*r,col,{e:1,op:0.08,s:col,so:0.7,sw:1.5,dash:[6,4],n:'radius '+n});R(p,x-12,y-12,24,24,col,{e:1,s:'#0b0c10',sw:2,n:'pin '+n});T(p,x,y,n,12,'#0b0c10',{b:1,c:1});}
function TABLE(p,x,y,w,rows,cols,widths){widths=widths||[30,190,110,110];const g=figma.createAutoLayout('VERTICAL',{name:'Table',itemSpacing:0});p.appendChild(g);g.x=x;g.y=y;g.fills=[];rows.forEach((r,i)=>{const row=figma.createAutoLayout('HORIZONTAL',{itemSpacing:8,paddingTop:6,paddingBottom:6,paddingLeft:8,paddingRight:8});g.appendChild(row);row.fills=[{type:'SOLID',color:H(i===0?'#1b1d24':(i%2?'#ffffff':'#f2f3f6'))}];r.forEach((c,j)=>{const t=figma.createText();t.fontName={family:j===0||j>=2?'JetBrains Mono':'Inter',style:i===0||j===0?'Bold':'Regular'};t.fontSize=12;t.characters=String(c);t.fills=[{type:'SOLID',color:H(i===0?'#ffffff':(j===0&&cols&&cols[i-1]?cols[i-1]:'#1b1d24'))}];row.appendChild(t);t.textAutoResize='HEIGHT';t.resize(widths[j]||100,t.height);});row.layoutSizingHorizontal='FIXED';row.resize(w,row.height);});return g;}
function TRI(p,cx,cy,deg,col,s){const v=figma.createVector();p.appendChild(v);v.vectorPaths=[{windingRule:'NONZERO',data:'M '+s+' 0 L '+(2*s)+' '+(2*s)+' L 0 '+(2*s)+' Z'}];v.fills=[{type:'SOLID',color:H(col)}];v.strokes=[{type:'SOLID',color:H('#0b0c10')}];v.strokeWeight=1.5;v.rotation=-deg;const a=-deg*Math.PI/180;v.x=cx-(s*Math.cos(a)-s*Math.sin(a));v.y=cy-(s*Math.sin(a)+s*Math.cos(a));v.name='spawn arrow';return v;}
function FIT(sec){let mb=0;sec.children.forEach(c=>{mb=Math.max(mb,c.y+c.height)});sec.resize(sec.width,mb+40);}
`;
const ROADS = `function ROADS(f,x0,z1,s,W,H,C){const px=x=>(x-x0)*s,py=z=>(z1-z)*s;const B=C.bounds,RX=C.roadsX,RZ=C.roadsZ,SW=3.2,rw=C.roadW/2;
const Rw=(a0,a1,b0,b1,c,op)=>{if(px(a1)<0||px(a0)>W||py(b0)<0||py(b1)>H)return;R(f,px(a0),py(b1),(a1-a0)*s,(b1-b0)*s,c,{op:op||1});};
RZ.forEach(rz=>[-1,1].forEach(g=>Rw(B.x0,B.x1,rz+g*5.8-SW/2,rz+g*5.8+SW/2,'#5b5f6a')));RX.forEach(rx=>[-1,1].forEach(g=>Rw(rx+g*5.8-SW/2,rx+g*5.8+SW/2,B.z0,B.z1,'#5b5f6a')));
RZ.forEach(rz=>Rw(B.x0,B.x1,rz-rw,rz+rw,'#1d1e24'));RX.forEach(rx=>Rw(rx-rw,rx+rw,B.z0,B.z1,'#1d1e24'));
RZ.forEach(rz=>{for(let x=B.x0+2;x<B.x1-2;x+=4){if(RX.some(rx=>Math.abs(x-rx)<6))continue;Rw(x-1,x+1,rz-0.06,rz+0.06,'#d8c27a',0.8);}});RX.forEach(rx=>{for(let z=B.z0+2;z<B.z1-2;z+=4){if(RZ.some(rz=>Math.abs(z-rz)<6))continue;Rw(rx-0.06,rx+0.06,z-1,z+1,'#d8c27a',0.8);}});
RX.forEach(rx=>RZ.forEach(rz=>{const h=(2*rw+2*SW+0.4)/2;Rw(rx-h,rx+h,rz-h,rz+h,'#24252c');for(let k=-3.4;k<=3.4;k+=0.85)[-1,1].forEach(g=>{Rw(rx+k-0.25,rx+k+0.25,rz+g*(rw+1.5)-1.3,rz+g*(rw+1.5)+1.3,'#d9d6cc',0.85);Rw(rx+g*(rw+1.5)-1.3,rx+g*(rw+1.5)+1.3,rz+k-0.25,rz+k+0.25,'#d9d6cc',0.85);});}));}
`;
function encode(shapes) {
  const pal = [], key = {}, rows = [];
  shapes.forEach(sh => { const k = sh[5] + '|' + sh[0] + '|' + sh[6]; if (key[k] == null) { key[k] = pal.length; pal.push([sh[5], sh[0], sh[6]]); } rows.push([sh[1], sh[2], sh[3], sh[4], key[k]].join(',')); });
  const last = new Map(); rows.forEach((r, i) => last.set(r, i));
  return { pal, s: rows.filter((r, i) => last.get(r) === i).join(';') + ';' };
}
const pinCol = id => /^exit/.test(id) ? '#3ddc84' : /^comp-|cyberDesk/.test(id) ? '#ff4d6d' : /^(nadia|courier|rosa|julien|frontDesk)$/.test(id) ? '#b388ff' : /^(door|enter)/.test(id) ? '#3ee8f0' : '#ffb020';
const write = (name, body) => fs.writeFileSync(`${OUT}/${name.replace(/[^A-Za-z0-9]+/g, '_')}.js`, `// section: ${name}\n` + LIB + body);
const LEGEND = 'Legend: grey grid = 1 m · yellow dot = point light · coloured pin = interactable (dashed ring = prompt radius) · green = exit · red = terminal · violet = person · amber = examine · green triangle = inside spawn, pointing the way you face';

/* ---------------- interiors ---------------- */
Object.values(P.interiors).forEach(o => {
  const M = o.M, S = o.S, PANEL = 470, HEAD = 150, name = 'Interior ' + M.id;
  const plansW = o.plans.length * o.W + (o.plans.length - 1) * 24, secW = 40 + plansW + 32 + PANEL + 40;
  const plans = o.plans.map(p => Object.assign({ name: p.name, labels: p.labels }, encode(p.shapes)));
  const grid = []; for (let x = Math.ceil(o.X0); x <= Math.floor(o.X1); x++) grid.push(['v', x, Math.round((x - (o.X0 - o.pad)) * S)]); for (let z = Math.ceil(o.Z0); z <= Math.floor(o.Z1); z++) grid.push(['h', z, Math.round(((o.Z1 + o.pad) - z) * S)]);
  const rows = [['#', 'Interactable', 'id', 'zone x, z']].concat(o.inters.map(i => [i.n, i.label + (i.y ? ' (mezz)' : ''), i.id, i.lx + ', ' + i.lz]));
  const cols = o.inters.map(i => pinCol(i.id));
  const meta = `Zone '${o.zone}' · interior offset x + ${o.off} · root ${o.rot ? 'rotated PI (door on the top wall, like the street door)' : 'not rotated'}\nFloor ${o.X0} to ${o.X1} by ${o.Z0} to ${o.Z1} m (${r(o.X1 - o.X0)} × ${r(o.Z1 - o.Z0)} m) · ${o.door} · ${S} px per metre, north up, as the overhead camera sees it`;
  const spawnTxt = (o.spawn ? `Enter: placed at zone (${o.spawn.lx}, ${o.spawn.lz}) facing ${o.spawn.face}.` : 'Enter: no door handler found.') + (o.outS ? `\nLeave: placed on the street at (${o.outS.x}, ${o.outS.z}) facing ${o.outS.face}.` : '') + (M.quest ? `\nQuest hooks: ${M.quest}` : '');
  write(name, `const ids=[];const sec=SEC(${J(name)},${M.slot[0]},${M.slot[1]},${secW},${HEAD + o.H + 40},${J(M.fill)});ids.push(sec.id);
R(sec,40,40,10,64,${J(M.sign)},{cr:3});T(sec,64,34,${J(M.title)},34,'#14161c',{b:1});T(sec,64,82,${J(meta)},13,'#4a4f5c',{w:${secW - 110},lh:140});
const plans=${J(plans)},grid=${J(grid)},lights=${J(o.lights)},inters=${J(o.inters)},cols=${J(cols)},sp=${J(o.spawn)},two=${o.plans.length > 1};
plans.forEach((pl,pi)=>{const f=FR(sec,40+pi*(${o.W}+24),${HEAD},${o.W},${o.H},'#0f1117','Plan · '+pl.name);ids.push(f.id);const mezz=pi===1;
 grid.forEach(g=>g[0]==='v'?R(f,g[2],0,1,${o.H},'#ffffff',{op:0.05}):R(f,0,g[2],${o.W},1,'#ffffff',{op:0.05}));
 SH(f,pl.s,pl.pal);
 grid.forEach(g=>{if(g[1]%2)return;g[0]==='v'?T(f,g[2]+2,${o.H - 16},g[1],9,'#8a90a0',{m:1}):T(f,4,g[2]+2,g[1],9,'#8a90a0',{m:1});});
 pl.labels.forEach(l=>{const t=T(f,l[0],l[1],l[2],10,'#f3e6bd',{m:1,b:1,c:1});if(t.x+t.width>${o.W - 6})t.x=${o.W - 6}-t.width;if(t.x<6)t.x=6;const bg=R(f,t.x-4,t.y-2,t.width+8,t.height+4,'#1f3a2e',{op:0.85,cr:3});f.insertChild(f.children.indexOf(t),bg);});
 lights.forEach(l=>{R(f,l[0]-16,l[1]-16,32,32,'#ffe08a',{e:1,op:mezz?0.08:0.18});R(f,l[0]-5,l[1]-5,10,10,'#ffe08a',{e:1,s:'#0b0c10',sw:1,op:mezz?0.4:1});});
 inters.forEach((i,k)=>{if(two&&(i.y>0)!==mezz)return;PIN(f,i.px,i.py,i.n,cols[k],i.r*${S});});
 if(!mezz&&sp){TRI(f,sp.px,sp.py,sp.deg,'#3ddc84',11);T(f,sp.px+16,sp.py-8,'SPAWN',10,'#3ddc84',{m:1,b:1});}
 T(f,${o.W - 56},8,'N ↑',13,'#cfd3dc',{m:1,b:1});R(f,16,12,${S * 2},4,'#cfd3dc');T(f,16,20,'2 m',10,'#cfd3dc',{m:1});
 T(f,${o.W}/2-80,${o.exitTop ? 6 : o.H - 34},mezz?'Mezzanine level · y 3.1':${J((o.exitTop ? '↑' : '↓') + ' to Meridian Row')},11,mezz?${J(M.sign)}:'#3ddc84',{m:1,b:1});
});
const px=${40 + plansW + 32};T(sec,px,${HEAD},'Interactables (world x = zone x + ${o.off})',16,'#14161c',{b:1});
const tb=TABLE(sec,px,${HEAD + 30},${PANEL},${J(rows)},cols);
const h1=T(sec,px,tb.y+tb.height+24,'Spawn and doors',16,'#14161c',{b:1});
const b1=T(sec,px,h1.y+26,${J(spawnTxt)},12,'#2b2f3a',{w:${PANEL},lh:145});
const h2=T(sec,px,b1.y+b1.height+22,'Checks against the World Layout Guide',16,'#14161c',{b:1});
const b2=T(sec,px,h2.y+26,${J(o.notes.map(n => '• ' + n).join('\n') + (M.feel ? '\nIntended feel: ' + M.feel : ''))},12,'#2b2f3a',{w:${PANEL},lh:145});
T(sec,px,b2.y+b2.height+22,${J(LEGEND)},11,'#6a7080',{w:${PANEL},lh:140});
FIT(sec);return {section:sec.id,ids};`);
});
function r(v) { return Math.round(v * 10) / 10; }

/* ---------------- city and street ---------------- */
function cityCode(key, name, title, sub, sx, sy, fill, opts) {
  const c = P[key], e = encode(c.shapes), HEAD = 150, PANEL = 440, secW = 40 + c.W + 32 + PANEL + 40;
  const step = opts.tick, ticks = [];
  for (let x = Math.ceil(c.win[0] / step) * step; x <= c.win[1]; x += step) ticks.push(['v', x, Math.round((x - c.win[0]) * c.s)]);
  for (let z = Math.ceil(c.win[2] / step) * step; z <= c.win[3]; z += step) ticks.push(['h', z, Math.round((c.win[3] - z) * c.s)]);
  const pc = c.pins.map(p => pinCol(p.id));
  const rows = [['#', 'Interactable', 'id', 'world x, z']].concat(c.allPins.map(p => [p.n, p.label, p.id, p.x + ', ' + p.z]));
  write(name, ROADS + `const ids=[];const sec=SEC(${J(name)},${sx},${sy},${secW},${HEAD + c.H + 60},${J(fill)});ids.push(sec.id);
R(sec,40,40,10,64,'#3ee8f0',{cr:3});T(sec,64,34,${J(title)},34,'#14161c',{b:1});T(sec,64,82,${J(sub)},13,'#4a4f5c',{w:${secW - 110},lh:140});
const f=FR(sec,40,${HEAD},${c.W},${c.H},'#2e3039','Plan · ${name}');ids.push(f.id);const ticks=${J(ticks)};
ticks.forEach(g=>g[0]==='v'?R(f,g[2],0,1,${c.H},'#ffffff',{op:0.06}):R(f,0,g[2],${c.W},1,'#ffffff',{op:0.06}));
ROADS(f,${c.win[0]},${c.win[3]},${c.s},${c.W},${c.H},${J(P.cityGrid || null)}||${J({ bounds: { x0: -84, x1: 84, z0: -92, z1: 92 }, roadsX: [-72, -36, 36, 72], roadsZ: [-80, -40, 0, 40, 80], roadW: 8 })});
SH(f,${J(e.s)},${J(e.pal)});
ticks.forEach(g=>{if(g[1]%${opts.labelEvery})return;g[0]==='v'?T(f,g[2]+3,${c.H - 16},g[1],10,'#c9cdd6',{m:1}):T(f,4,g[2]+3,g[1],10,'#c9cdd6',{m:1});});
${J(c.doors)}.forEach(d=>R(f,d[0],d[1],d[2],d[3],d[4],{n:'street door'}));
${J(c.labels)}.forEach(l=>{const t=T(f,l[0],l[1],l[2],${opts.labelSize},l[3],{b:1,c:1,al:'CENTER'});const bg=R(f,t.x-6,t.y-4,t.width+12,t.height+8,'#0b0c10',{op:0.72,cr:4});f.insertChild(f.children.indexOf(t),bg);});
const pc=${J(pc)};${J(c.pins.map(p => [p.px, p.py, p.n, p.r]))}.forEach((p,k)=>PIN(f,p[0],p[1],p[2],pc[k],${opts.radius ? 'p[3]*' + c.s : '0'}));
${opts.spawns ? `${J(c.spawns.map(s => [s.px, s.py, s.deg, s.id]))}.forEach(s=>{TRI(f,s[0],s[1],s[2],'#3ddc84',9);T(f,s[0]+12,s[1]-6,s[3],11,'#3ddc84',{m:1,b:1});});` : ''}
T(f,${c.W - 60},10,'N ↑',14,'#e6e8ee',{m:1,b:1});R(f,16,14,${opts.bar * c.s},4,'#e6e8ee');T(f,16,22,'${opts.bar} m',10,'#e6e8ee',{m:1});
const px=${40 + c.W + 32};T(sec,px,${HEAD},'Interactables outdoors',16,'#14161c',{b:1});
const tb=TABLE(sec,px,${HEAD + 30},${PANEL},${J(rows)},${J(c.allPins.map(p => pinCol(p.id)))});
T(sec,px,tb.y+tb.height+24,${J(opts.notes)},12,'#2b2f3a',{w:${PANEL},lh:150});
FIT(sec);return {section:sec.id,ids};`);
  return secW;
}
const cityW = cityCode('city', 'City map', 'Meridian: full city plan', 'Top-down plan of the outdoor zone (out) as built by buildOutdoor() and fillBlocks(). 7 px per metre, north up (+z), east right (+x), gridlines every 10 m with world coordinates.', 1100, 0, '#F9F9F9',
  { tick: 10, labelEvery: 10, labelSize: 11, bar: 10, radius: false, spawns: false, notes: 'How the city is laid out (CITY in index.html)\n• Meridian Row is the east-west road at z = 0; its two central blocks are hand-built (A, F, Byte Mart facing north onto it; H, D, X facing south).\n• Other blocks come from fillBlocks(): office slabs, the park and fountain, the garage, the parking lot and Meridian Police.\n• Bright dots are the lamps that cast real light; amber dots are traffic signal heads.\n• Traffic and pedestrians move, so only parked cars are drawn.\n• Interiors live in their own zones far east and have their own sections below.' });
cityCode('row', 'Meridian Row', 'Meridian Row: the playable street in detail', 'x -32 to 64, z -34 to 34 at 14 px per metre, gridlines every 2 m. Street doors, Enter prompt radii and where Leave puts you.', 1100 + cityW + 100, 0, '#F5FBFF',
  { tick: 2, labelEvery: 4, labelSize: 13, bar: 5, radius: true, spawns: true, notes: 'Reading this view\n• Cyan bars = lit street doors; cyan pins = Enter prompts, dashed ring = prompt radius. Numbers match the city map.\n• Green arrows = where Leave puts you on the street, pointing the way you face.\n• Amber dots = traffic signal heads.\n' + (P.street.length ? 'Street checks:\n' + P.street.map(s => '• ' + s).join('\n') : 'Street checks: all exit spawns clear their Enter prompts and footprints; no building footprints intersect.') });

/* ---------------- read me ---------------- */
const flagged = [];
Object.values(P.interiors).forEach(o => o.notes.forEach(n => { if (/limit 6\)|: clear\./.test(n)) return; const m = n.match(/is ([0-9.]+) m from the spawn/); if (m && +m[1] <= 8) return; flagged.push(`${o.M.id}: ${n}`); }));
P.street.forEach(s => flagged.push('Street: ' + s));
const zoneRows = [['zone', 'Building', 'Offset', 'Root']].concat(Object.values(P.interiors).map(o => [o.zone, o.M.title, 'x + ' + o.off, o.rot ? 'rotated PI' : 'none']));
write('Read me', `figma.currentPage.children.filter(n=>n.type==='SECTION'&&n.name==='Read me').forEach(n=>n.remove());const sec=figma.createSection();figma.currentPage.appendChild(sec);sec.name='Read me';sec.x=0;sec.y=0;sec.resize(1000,1600);sec.fills=[{type:'SOLID',color:H('#FFFBF0')}];
R(sec,40,40,10,64,'#3ee8f0',{cr:3});T(sec,64,30,'Netrunner: Zero Day',40,'#14161c',{b:1});T(sec,64,84,'World layout board · city plan and every enterable interior',16,'#4a4f5c');
let y=140;const para=(h,b)=>{T(sec,40,y,h,18,'#14161c',{b:1});const t=T(sec,40,y+30,b,13,'#2b2f3a',{w:920,lh:150});y=t.y+t.height+28;};
para('Where this comes from',${J(`Measured from linguist89/netrunner-zero-day at commit ${COMMIT}: index.html runs headlessly (Babylon NullEngine) and every mesh, light, interactable and door spawn is read out after buildWorld(). Kept in sync by tools/figma-sync in the repo: only sections whose data changed are redrawn.`)});
para('How to read every plan','Top-down, as the overhead camera sees it: north (+z) up, east (+x) right, metres. Pins are interactables (numbers match the table beside each plan), dashed rings are prompt radii, yellow dots point lights, green triangles spawn points facing the way the player faces. Interiors use zone coordinates (world x minus the zone offset).');
T(sec,40,y,'Zones',18,'#14161c',{b:1});y+=32;const tb=TABLE(sec,40,y,920,${J(zoneRows)},null,[70,450,150,170]);y+=tb.height+32;
para('What the measurements flag',${J(flagged.length ? flagged.map((f, i) => (i + 1) + '. ' + f).join('\n') : 'Nothing: every check passes.')});
sec.resize(1000,y+20);return {section:sec.id};`);
