// Figma-side renderer. Runs inside use_figma (FigJam Plugin API), never in node.
// It is split into blocks by `//#fn <name> <deps...>`; sync.js copies only the blocks a patch needs.
// Board model (see board.js): section > shell (header + plan frames with their base) + tiles + overlay + panel.
// Node names on the board: section = its title key, plan frame 'plan:<i>', tile 'tile:<c>,<r>', 'overlay', 'panel'.

//#fn H
const H=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
//#fn F
await Promise.all([['Inter','Regular'],['Inter','Bold'],['JetBrains Mono','Regular'],['JetBrains Mono','Bold']].map(([family,style])=>figma.loadFontAsync({family,style})));
//#fn R H
function R(p,x,y,w,h,f,o={}){const n=o.e?figma.createEllipse():figma.createRectangle();p.appendChild(n);n.x=x;n.y=y;n.resize(Math.max(w,.5),Math.max(h,.5));n.fills=f?[{type:'SOLID',color:H(f),opacity:o.op??1}]:[];n.strokes=o.s?[{type:'SOLID',color:H(o.s),opacity:o.so??1}]:[];if(o.s){n.strokeWeight=o.sw||1;if(o.dash)n.dashPattern=o.dash;}if(o.cr)n.cornerRadius=o.cr;if(o.n)n.name=o.n;return n;}
//#fn T H F
function T(p,x,y,s,size,col,o={}){const t=figma.createText();p.appendChild(t);t.fontName={family:o.m?'JetBrains Mono':'Inter',style:o.b?'Bold':'Regular'};t.fontSize=size;t.characters=String(s);t.fills=[{type:'SOLID',color:H(col)}];if(o.lh)t.lineHeight={unit:'PERCENT',value:o.lh};if(o.w){t.textAutoResize='HEIGHT';t.resize(o.w,t.height);}if(o.al)t.textAlignHorizontal=o.al;t.x=o.c?x-t.width/2:x;t.y=o.c?y-t.height/2:y;return t;}
//#fn FR H
function FR(p,name,x,y,w,h,bg,clip=true){const f=figma.createFrame();p.appendChild(f);f.name=name;f.x=x;f.y=y;f.resize(w,h);f.fills=bg?[{type:'SOLID',color:H(bg)}]:[];f.clipsContent=clip;return f;}
//#fn FIND
const SECN=n=>figma.currentPage.children.find(c=>c.type==='SECTION'&&c.name===n);
const KID=(p,n)=>p&&p.children.find(c=>c.name===n);
// put a fresh node where the old one with the same name was (or just under the overlay), so layer order never changes
function SWAP(p,name,make){const old=KID(p,name),ov=KID(p,'overlay');let i=old?p.children.indexOf(old):ov?p.children.indexOf(ov):p.children.length;if(old)old.remove();const n=make();if(n.parent!==p)p.appendChild(n);p.insertChild(Math.min(i,p.children.length-1),n);return n;}
//#fn TILE R FR FIND
// shapes: "x,y,w,h,paletteIndex;..." in tile-local px; palette: [hex, ellipse?, opacity]
function TILE(plan,t){return SWAP(plan,t.k,()=>{const f=FR(plan,t.k,t.x,t.y,t.w,t.h,null);for(const row of t.s.split(';')){if(!row)continue;const a=row.split(','),c=t.p[+a[4]];R(f,+a[0],+a[1],+a[2],+a[3],c[0],{e:c[1]===1,op:c[2]});}return f;});}
//#fn PIN R T
function PIN(p,x,y,n,col,r){if(r)R(p,x-r,y-r,2*r,2*r,col,{e:1,op:.08,s:col,so:.7,sw:1.5,dash:[6,4]});R(p,x-12,y-12,24,24,col,{e:1,s:'#0b0c10',sw:2,n:'pin '+n});T(p,x,y,n,12,'#0b0c10',{b:1,c:1});}
//#fn TRI H
function TRI(p,cx,cy,deg,col,s){const v=figma.createVector();p.appendChild(v);v.vectorPaths=[{windingRule:'NONZERO',data:`M ${s} 0 L ${2*s} ${2*s} L 0 ${2*s} Z`}];v.fills=[{type:'SOLID',color:H(col)}];v.strokes=[{type:'SOLID',color:H('#0b0c10')}];v.strokeWeight=1.5;v.rotation=-deg;const a=-deg*Math.PI/180;v.x=cx-(s*Math.cos(a)-s*Math.sin(a));v.y=cy-(s*Math.sin(a)+s*Math.cos(a));v.name='spawn';return v;}
//#fn OVERLAY R T FR FIND PIN TRI
// o: { rects:[x,y,w,h,col,op], lights:[x,y,faint], pins:[x,y,n,col,r], tris:[x,y,deg,col,size,label], labels:[x,y,text,size,col,bg], texts:[x,y,text,size,col] }
function OVERLAY(plan,o){return SWAP(plan,'overlay',()=>{const f=FR(plan,'overlay',0,0,plan.width,plan.height,null);
 (o.rects||[]).forEach(([x,y,w,h,c,op])=>R(f,x,y,w,h,c,{op}));
 (o.lights||[]).forEach(([x,y,faint])=>{R(f,x-16,y-16,32,32,'#ffe08a',{e:1,op:faint?.08:.18});R(f,x-5,y-5,10,10,'#ffe08a',{e:1,s:'#0b0c10',op:faint?.4:1});});
 (o.labels||[]).forEach(([x,y,s,size,col,bg])=>{const t=T(f,x,y,s,size,col,{b:1,c:1,al:'CENTER',m:size<12});t.x=Math.max(6,Math.min(t.x,f.width-6-t.width));const b=R(f,t.x-5,t.y-3,t.width+10,t.height+6,bg,{op:.8,cr:3});f.insertChild(f.children.indexOf(t),b);});
 (o.pins||[]).forEach(([x,y,n,c,r])=>PIN(f,x,y,n,c,r));
 (o.tris||[]).forEach(([x,y,d,c,s,l])=>{TRI(f,x,y,d,c,s);if(l)T(f,x+s+4,y-s,l,10,c,{m:1,b:1});});
 (o.texts||[]).forEach(([x,y,s,size,c])=>T(f,x,y,s,size,c,{m:1,b:1}));
 return f;});}
//#fn TABLE H F
function TABLE(p,rows,w,widths,cols){const g=figma.createAutoLayout('VERTICAL',{name:'table',itemSpacing:0});p.appendChild(g);g.fills=[];rows.forEach((r,i)=>{const row=figma.createAutoLayout('HORIZONTAL',{itemSpacing:8,paddingTop:6,paddingBottom:6,paddingLeft:8,paddingRight:8});g.appendChild(row);row.fills=[{type:'SOLID',color:H(i?(i%2?'#ffffff':'#f2f3f6'):'#1b1d24')}];r.forEach((c,j)=>{const t=figma.createText();t.fontName={family:j===1?'Inter':'JetBrains Mono',style:!i||!j?'Bold':'Regular'};t.fontSize=12;t.characters=String(c);t.fills=[{type:'SOLID',color:H(!i?'#ffffff':(!j&&cols&&cols[i-1])||'#1b1d24')}];row.appendChild(t);t.textAutoResize='HEIGHT';t.resize(widths[j],t.height);});row.layoutSizingHorizontal='FIXED';row.resize(w,row.height);});return g;}
//#fn PANEL T TABLE FR FIND
// blocks: ['h',text] | ['p',text,size?,colour?] | ['t',rows,widths,pinColours]
function PANEL(sec,pn){const f=SWAP(sec,'panel',()=>{const a=figma.createAutoLayout('VERTICAL',{name:'panel',itemSpacing:10});a.fills=[];return a;});f.x=pn.x;f.y=pn.y;
 pn.blocks.forEach(b=>{if(b[0]==='t'){TABLE(f,b[1],pn.w,b[2],b[3]);return;}const t=T(f,0,0,b[1],b[0]==='h'?17:b[2]||12,b[0]==='h'?'#14161c':b[3]||'#2b2f3a',{b:b[0]==='h',w:pn.w,lh:150});});
 let mb=0;sec.children.forEach(c=>{mb=Math.max(mb,c.y+c.height)});sec.resize(sec.width,mb+40);return f;}
//#fn ROADS R
function ROADS(f,g){const{x0,z1,s,C}=g,px=x=>(x-x0)*s,py=z=>(z1-z)*s,B=C.bounds,SW=3.2,rw=C.roadW/2,W=f.width,Hh=f.height;
 const Q=(a0,a1,b0,b1,c,op)=>{if(px(a1)<0||px(a0)>W||py(b0)<0||py(b1)>Hh)return;R(f,px(a0),py(b1),(a1-a0)*s,(b1-b0)*s,c,{op:op||1});};
 C.roadsZ.forEach(rz=>[-1,1].forEach(k=>Q(B.x0,B.x1,rz+k*5.8-SW/2,rz+k*5.8+SW/2,'#5b5f6a')));C.roadsX.forEach(rx=>[-1,1].forEach(k=>Q(rx+k*5.8-SW/2,rx+k*5.8+SW/2,B.z0,B.z1,'#5b5f6a')));
 C.roadsZ.forEach(rz=>Q(B.x0,B.x1,rz-rw,rz+rw,'#1d1e24'));C.roadsX.forEach(rx=>Q(rx-rw,rx+rw,B.z0,B.z1,'#1d1e24'));
 C.roadsZ.forEach(rz=>{for(let x=B.x0+2;x<B.x1-2;x+=4)if(!C.roadsX.some(rx=>Math.abs(x-rx)<6))Q(x-1,x+1,rz-.06,rz+.06,'#d8c27a',.8);});C.roadsX.forEach(rx=>{for(let z=B.z0+2;z<B.z1-2;z+=4)if(!C.roadsZ.some(rz=>Math.abs(z-rz)<6))Q(rx-.06,rx+.06,z-1,z+1,'#d8c27a',.8);});
 C.roadsX.forEach(rx=>C.roadsZ.forEach(rz=>{const h=rw+SW+.2,e=rw+1.5;Q(rx-h,rx+h,rz-h,rz+h,'#24252c');for(let k=-3.4;k<=3.4;k+=.85)[-1,1].forEach(g=>{Q(rx+k-.25,rx+k+.25,rz+g*e-1.3,rz+g*e+1.3,'#d9d6cc',.85);Q(rx+g*e-1.3,rx+g*e+1.3,rz+k-.25,rz+k+.25,'#d9d6cc',.85);});}));}
//#fn SHELL R T FR FIND ROADS
// draws the section, its header and every plan frame with its base layer (background, grid lines, roads)
function SHELL(s){const old=SECN(s.name);if(old)old.remove();const sec=figma.createSection();figma.currentPage.appendChild(sec);sec.name=s.name;sec.x=s.x;sec.y=s.y;sec.resize(s.w,s.h);sec.fills=[{type:'SOLID',color:H(s.fill)}];
 R(sec,40,40,10,64,s.accent,{cr:3});T(sec,64,30,s.title,34,'#14161c',{b:1});if(s.sub)T(sec,64,80,s.sub,13,'#4a4f5c',{w:s.w-110,lh:140});
 s.plans.forEach((p,i)=>{const f=FR(sec,'plan:'+i,p.x,p.y,p.w,p.h,p.bg);f.cornerRadius=8;
  p.grid.forEach(([v,at])=>v?R(f,at,0,1,p.h,'#ffffff',{op:.05}):R(f,0,at,p.w,1,'#ffffff',{op:.05}));if(p.roads)ROADS(f,p.roads);});
 return sec;}
//#fn RUN FIND
// ops: ['full', section] | ['tile', sectionName, planIndex, tile] | ['overlay', sectionName, planIndex, overlay] | ['panel', sectionName, panel] | ['drop', sectionName, planIndex, tileName] | ['remove', sectionName]
const done=[];
for(const op of OPS){const[k,a,b,c]=op;
 if(k==='full'){const sec=SHELL(a);a.plans.forEach((p,i)=>{const f=KID(sec,'plan:'+i);p.tiles.forEach(t=>TILE(f,t));OVERLAY(f,p.overlay);});PANEL(sec,a.panel);done.push(a.name);}
 else if(k==='remove'){const s=SECN(a);if(s)s.remove();done.push('-'+a);}
 else if(k==='drop'){const t=KID(KID(SECN(a),'plan:'+b),c);if(t)t.remove();done.push(a+'/-'+c);}
 else{const sec=SECN(a);if(!sec)throw new Error('missing section '+a+': run a full sync');
  if(k==='panel')PANEL(sec,b);else{const f=KID(sec,'plan:'+b);if(!f)throw new Error('missing plan '+b+' in '+a);k==='tile'?TILE(f,c):OVERLAY(f,c);}done.push(a+'/'+(c&&c.k||k));}}
return done;
