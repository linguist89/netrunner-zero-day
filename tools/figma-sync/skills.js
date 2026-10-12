// Draws the "Skills and training" section of the board from the game data (ZD.SKILLS, ZD.TRAINING, quest req and skillReward).
// Not part of the hashed sync: run node skills.js and send out/skills-section.js with use_figma whenever skills, classes or skill checks change. It replaces the old section in place.
const fs = require('fs'); const { JSDOM } = require('jsdom');
const src = fs.readFileSync(require('path').resolve(__dirname, '../../index.html'), 'utf8');
const w = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' }).window; w.eval(src.match(/<script id="core">([\s\S]*?)<\/script>/)[1]);
const Z = w.ZD; const ALLQ = Z.QUESTS.concat(Z.GIGS, Z.SIDE);
const data = {
  groups: Z.SKILL_GROUPS.map(g => ({ name: g[1], col: { tech: '#3ee8f0', social: '#ff9f43', field: '#8cf28c' }[g[0]], skills: Z.SKILLS.filter(k => k.group === g[0]).map(k => ({
    name: k.name, blurb: k.blurb,
    classes: Z.TRAINING.filter(t => t.skill === k.id).map(t => (t.tier === 1 ? 'I  ' : 'II ') + t.title + ' · ' + t.location + ' · ' + t.objectives.filter(o => !o.drill).map(o => o.cmd || o.text).join(' + ') + ' + drill'),
    checks: ALLQ.filter(q => q.req && q.req[k.id]).map(q => q.title + ' ' + q.req[k.id]),
    rewards: ALLQ.filter(q => q.skillReward && q.skillReward[k.id]).map(q => q.title)
  })) })),
  points: Z.SKILL_POINTS, max: Z.SKILL_MAX
};
const code = `const D=${JSON.stringify(data)};
const H=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
await Promise.all([['Inter','Regular'],['Inter','Bold'],['JetBrains Mono','Regular']].map(([family,style])=>figma.loadFontAsync({family,style})));
const old=figma.currentPage.children.find(c=>c.type==='SECTION'&&c.name==='Skills and training'); if(old) old.remove();
const sec=figma.createSection(); sec.name='Skills and training'; sec.x=0; sec.y=3900; sec.fills=[{type:'SOLID',color:H('#f6f7fb')}];
function T(p,s,size,col,o={}){const t=figma.createText();p.appendChild(t);t.fontName={family:o.m?'JetBrains Mono':'Inter',style:o.b?'Bold':'Regular'};t.fontSize=size;t.characters=String(s);t.fills=[{type:'SOLID',color:H(col)}];t.lineHeight={unit:'PERCENT',value:o.lh||145};if(o.w){t.textAutoResize='HEIGHT';t.resize(o.w,t.height);}return t;}
function AL(p,dir,props,bg){const a=figma.createAutoLayout(dir,props);p.appendChild(a);a.fills=bg?[{type:'SOLID',color:H(bg)}]:[];return a;}
const root=AL(sec,'VERTICAL',{name:'content',itemSpacing:28}); root.x=60; root.y=60;
const head=AL(root,'VERTICAL',{name:'header',itemSpacing:8});
T(head,'Skills and training',34,'#14161c',{b:1});
T(head,'Every runner has '+D.groups.reduce((a,g)=>a+g.skills.length,0)+' skills ranked 1 to '+D.max+'. A new profile rolls '+D.points+' points: every skill starts at 1, none above 4, and every roll keeps at least two strengths (3+) and two weaknesses (1). The roll is hidden: a skill reads "untested" until a quest checks it or a class trains it. Old saves roll on load.',14,'#2b2f3a',{w:1500});
// the loop, as a row of steps
const flow=AL(root,'HORIZONTAL',{name:'loop',itemSpacing:12,counterAxisAlignItems:'CENTER'});
[['1  Roll','18 points, hidden, at Jump in'],['2  Skill check','A quest with a requirement tries to start'],['3  Pass','Quest starts, the skill is revealed'],['3  Fail','Quest waits, notice names what is missing'],['4  Train','Training board, Building H: practical + 3-question drill'],['5  +1 rank','Part II opens; side stories also pay ranks']].forEach(([a,b],i)=>{const c=AL(flow,'VERTICAL',{itemSpacing:4,paddingTop:12,paddingBottom:12,paddingLeft:14,paddingRight:14,cornerRadius:6},i===3?'#fff1ec':'#ffffff');c.strokes=[{type:'SOLID',color:H(i===3?'#ff6a3d':'#d5d9e2')}];c.strokeWeight=1.5;T(c,a,15,'#14161c',{b:1});T(c,b,12,'#4a5060',{w:200});if(i<5)T(flow,'→',22,'#8a90a0',{b:1});});
// three columns of skill cards
const cols=AL(root,'HORIZONTAL',{name:'groups',itemSpacing:24});
D.groups.forEach(g=>{const col=AL(cols,'VERTICAL',{name:g.name,itemSpacing:14});
 const gh=AL(col,'HORIZONTAL',{itemSpacing:8,counterAxisAlignItems:'CENTER'}); const sw=figma.createRectangle(); gh.appendChild(sw); sw.resize(14,14); sw.cornerRadius=3; sw.fills=[{type:'SOLID',color:H(g.col)}]; T(gh,g.name.toUpperCase(),13,'#14161c',{b:1});
 g.skills.forEach(k=>{const c=AL(col,'VERTICAL',{name:k.name,itemSpacing:8,paddingTop:14,paddingBottom:14,paddingLeft:16,paddingRight:16,cornerRadius:6},'#ffffff');c.strokes=[{type:'SOLID',color:H('#d5d9e2')}];c.strokeWeight=1;
  const bar=figma.createRectangle(); c.appendChild(bar); bar.resize(470,4); bar.fills=[{type:'SOLID',color:H(g.col)}];
  T(c,k.name,20,'#14161c',{b:1}); T(c,k.blurb,12.5,'#4a5060',{w:470});
  T(c,'Classes',11,'#8a90a0',{b:1}); k.classes.forEach(x=>T(c,x,11.5,'#1b1d24',{m:1,w:470,lh:140}));
  T(c,'Skill checks',11,'#8a90a0',{b:1}); T(c,k.checks.length?k.checks.join(' · '):'none yet',12,k.checks.length?'#b8401a':'#8a90a0',{w:470});
  if(k.rewards.length){T(c,'Also raised by',11,'#8a90a0',{b:1}); T(c,k.rewards.join(' · '),12,'#1f7a3a',{w:470});}
 });});
T(root,'Generated from index.html (ZD.SKILLS, ZD.TRAINING, quest req / skillReward). The training board itself is on the Interior H plan, pin 5. This section is drawn by hand, not by figma-sync, so redraw it when skills change.',11,'#6a7080',{w:1500});
sec.resizeWithoutConstraints(root.width+120, root.height+120);
return {section:sec.id, w:Math.round(sec.width), h:Math.round(sec.height), cards: D.groups.reduce((a,g)=>a+g.skills.length,0)};`;
fs.mkdirSync(require('path').join(__dirname, 'out'), { recursive: true }); fs.writeFileSync(require('path').join(__dirname, 'out/skills-section.js'), code); console.log('SEND out/skills-section.js (' + (code.length / 1000).toFixed(1) + 'k chars)');
