// UNS body map: age-appropriate child figures (front and back) and the vector marks a child draws on them.
// A COMMUNICATION AID only: marks show where the child points. They are not a diagnosis, are never interpreted,
// and never decide urgency. The figure is clothed and gender-neutral. Marks are stored as vectors (0-1000 grid), not images.
const BM_MAX_STROKES=40,BM_MAX_POINTS=120,BM_MAX_TOTAL=600,BM_COLOR='#7c3aed';   // 600 points in all keeps a report well under 8 KB
const FIGP={                                   // proportions, pen and dot sizes (viewBox units), default tool
 '7-8':{hr:40,tw:78,th:96,aw:24,al:80,lw:30,ll:100,pen:7,dot:8,tool:'dot'},
 '9-10':{hr:33,tw:70,th:118,aw:20,al:100,lw:26,ll:124,pen:5,dot:6,tool:'draw'},
 '11-12':{hr:28,tw:66,th:134,aw:18,al:114,lw:24,ll:140,pen:3.2,dot:4,tool:'draw'}};
const BM_ZONES={front:['head','chest','stomach','arms','legs'],back:['head','back','arms','legs']};
const bmClamp=v=>{v=Math.round(+v);return Number.isFinite(v)?Math.max(0,Math.min(1000,v)):0};
const bmEsc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function figGeo(age){const p=FIGP[age]||FIGP['9-10'],top=6,neck=8,cx=100,headCy=top+p.hr,torsoY=top+2*p.hr+neck,legTop=torsoY+p.th-6,bottom=legTop+p.ll+12,s=384/bottom;
 const armY=torsoY+6,armLx=cx-p.tw/2-p.aw+4,armRx=cx+p.tw/2-4,legLx=cx-p.lw-2,legRx=cx+2;
 const zones={head:[{c:[cx,headCy,p.hr+3]}],chest:[{r:[cx-p.tw/2,torsoY,p.tw,p.th*.48]}],stomach:[{r:[cx-p.tw/2,torsoY+p.th*.48,p.tw,p.th*.52]}],back:[{r:[cx-p.tw/2,torsoY,p.tw,p.th]}],
  arms:[{r:[armLx,armY,p.aw,p.al]},{r:[armRx,armY,p.aw,p.al]}],legs:[{r:[legLx,legTop,p.lw,p.ll]},{r:[legRx,legTop,p.lw,p.ll]}]};
 return{p,cx,s,top,neck,headCy,torsoY,legTop,bottom,armY,armLx,armRx,legLx,legRx,zones}}
const bmTr=g=>`translate(0 8) translate(100 0) scale(${g.s.toFixed(4)}) translate(-100 0)`;
function zoneCenter(age,view,zone){if(!BM_ZONES[view]||!BM_ZONES[view].includes(zone))return null;const g=figGeo(age),z=g.zones[zone][0];
 const x=z.c?z.c[0]:z.r[0]+z.r[2]/2,y=z.c?z.c[1]:z.r[1]+z.r[3]/2;return[bmClamp((100+(x-100)*g.s)/200*1000),bmClamp((8+y*g.s)/400*1000)]}
function strokesSvg(strokes,p){p=p||FIGP['9-10'];return(strokes||[]).map(st=>{
 if(st.length===1){const x=st[0][0]*.2,y=st[0][1]*.4;return`<circle cx="${x}" cy="${y}" r="${p.dot+1.6}" fill="#fff"/><circle cx="${x}" cy="${y}" r="${p.dot}" fill="${BM_COLOR}" fill-opacity=".8"/>`}
 const pts=st.map(q=>q[0]*.2+','+q[1]*.4).join(' ');
 return`<polyline points="${pts}" fill="none" stroke="#fff" stroke-width="${p.pen+3}" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${pts}" fill="none" stroke="${BM_COLOR}" stroke-opacity=".8" stroke-width="${p.pen}" stroke-linecap="round" stroke-linejoin="round"/>`}).join('')}
function bodySvg(age,view,strokes,o){o=o||{};const g=figGeo(age),p=g.p,back=view==='back',sk='#fbf0e4',ln='#8a7a94',sh='#e1d5f4',sw='#cfe2f3',hc='#9a8aa8';
 const R=(x,y,w,h,rx,fill)=>`<rect x="${+x.toFixed(1)}" y="${+y.toFixed(1)}" width="${+w.toFixed(1)}" height="${+h.toFixed(1)}" rx="${+rx.toFixed(1)}" fill="${fill}"/>`;
 const E=(cx,cy,rx,ry)=>`<ellipse cx="${+cx.toFixed(1)}" cy="${+cy.toFixed(1)}" rx="${+rx.toFixed(1)}" ry="${ry}" fill="${sk}"/>`,C=(cx,cy,r)=>`<circle cx="${+cx.toFixed(1)}" cy="${+cy.toFixed(1)}" r="${+r.toFixed(1)}" fill="${sk}"/>`;
 let f=`<g transform="${bmTr(g)}" stroke="${ln}" stroke-width="1.6" stroke-linejoin="round">`;
 f+=R(g.legLx,g.legTop,p.lw,p.ll,p.lw/2.4,sk)+R(g.legRx,g.legTop,p.lw,p.ll,p.lw/2.4,sk)+E(g.legLx+p.lw/2,g.legTop+p.ll+3,p.lw*.78,7)+E(g.legRx+p.lw/2,g.legTop+p.ll+3,p.lw*.78,7);
 f+=R(g.armLx,g.armY,p.aw,p.al,p.aw/2,sk)+R(g.armRx,g.armY,p.aw,p.al,p.aw/2,sk)+C(g.armLx+p.aw/2,g.armY+p.al,p.aw*.58)+C(g.armRx+p.aw/2,g.armY+p.al,p.aw*.58);
 f+=R(g.cx-8,g.top+2*p.hr-2,16,g.neck+4,4,sk)+R(g.cx-p.tw/2,g.torsoY,p.tw,p.th,p.tw/5,sh)+R(g.armLx,g.armY,p.aw,p.al*.42,p.aw/2.2,sh)+R(g.armRx,g.armY,p.aw,p.al*.42,p.aw/2.2,sh)+R(g.legLx-1,g.torsoY+p.th-28,2*p.lw+6,28+p.ll*.26,8,sw);
 f+=C(g.cx,g.headCy,p.hr);
 if(back)f+=`<path d="M ${g.cx-p.hr} ${g.headCy+p.hr*.1} A ${p.hr} ${p.hr} 0 0 1 ${g.cx+p.hr} ${g.headCy+p.hr*.1} Z" fill="${hc}"/>`;
 else f+=`<path d="M ${(g.cx-p.hr*.98).toFixed(1)} ${(g.headCy-p.hr*.2).toFixed(1)} A ${p.hr} ${p.hr} 0 0 1 ${(g.cx+p.hr*.98).toFixed(1)} ${(g.headCy-p.hr*.2).toFixed(1)} Q ${g.cx} ${(g.headCy-p.hr*.55).toFixed(1)} ${(g.cx-p.hr*.98).toFixed(1)} ${(g.headCy-p.hr*.2).toFixed(1)} Z" fill="${hc}"/>`+
  `<circle cx="${(g.cx-p.hr*.36).toFixed(1)}" cy="${(g.headCy+p.hr*.08).toFixed(1)}" r="${(p.hr*.09).toFixed(1)}" fill="${ln}"/><circle cx="${(g.cx+p.hr*.36).toFixed(1)}" cy="${(g.headCy+p.hr*.08).toFixed(1)}" r="${(p.hr*.09).toFixed(1)}" fill="${ln}"/><path d="M ${(g.cx-p.hr*.3).toFixed(1)} ${(g.headCy+p.hr*.42).toFixed(1)} Q ${g.cx} ${(g.headCy+p.hr*.7).toFixed(1)} ${(g.cx+p.hr*.3).toFixed(1)} ${(g.headCy+p.hr*.42).toFixed(1)}" fill="none" stroke="${ln}" stroke-linecap="round"/>`;
 for(const a of(o.areas||[]))if(BM_ZONES[view].includes(a))for(const z of g.zones[a])f+=z.c?`<circle cx="${z.c[0]}" cy="${z.c[1]}" r="${z.c[2]}" fill="#7c3aed" fill-opacity=".12" stroke="#7c3aed" stroke-opacity=".55" stroke-dasharray="5 4" stroke-width="2"/>`:`<rect x="${+z.r[0].toFixed(1)}" y="${+z.r[1].toFixed(1)}" width="${+z.r[2].toFixed(1)}" height="${+z.r[3].toFixed(1)}" fill="#7c3aed" fill-opacity=".12" stroke="#7c3aed" stroke-opacity=".55" stroke-dasharray="5 4" stroke-width="2"/>`;
 f+='</g>';const w=o.w;
 return`<svg ${o.id?`id="${o.id}" `:''}viewBox="0 0 200 400" role="img" aria-label="${bmEsc(o.label)}" ${o.interactive?'tabindex="0" focusable="true" ':''}style="width:${w?w+'px':'100%'};max-width:${w||300}px;height:auto;display:inline-block${o.interactive?';touch-action:none;background:#fff;border-radius:16px;border:2px solid var(--lav)':''}">${f}<g${o.id?' id="bmst"':''}>${strokesSvg(strokes,p)}</g>${o.interactive?'<circle id="bmcur" cx="100" cy="200" r="5" fill="none" stroke="#000" stroke-width="1.5" style="display:none"/>':''}</svg>`}
// ---- marks: never trusted (state, storage or server): clamp, cap and rebuild
function cleanStrokes(a){return Array.isArray(a)?a.slice(0,BM_MAX_STROKES).map(st=>Array.isArray(st)?st.slice(0,BM_MAX_POINTS).filter(Array.isArray).map(q=>[bmClamp(q[0]),bmClamp(q[1])]):[]).filter(st=>st.length):[]}
const bmTotal=bm=>['front','back'].reduce((n,v)=>n+((bm&&bm[v])||[]).reduce((m,st)=>m+((st&&st.length)||0),0),0);
function capTotal(list,room){const out=[];for(const st of list){if(room<=0)break;const k=st.slice(0,room);out.push(k);room-=k.length}return out}
function packMarks(age,bm){const front=capTotal(cleanStrokes(bm&&bm.front),BM_MAX_TOTAL),back=capTotal(cleanStrokes(bm&&bm.back),BM_MAX_TOTAL-bmTotal({front}));return front.length||back.length?{v:1,fig:FIGP[age]?age:'9-10',front,back}:null}
function cleanMarks(x){return x&&typeof x==='object'&&x.v===1?packMarks(x.fig,x):null}
