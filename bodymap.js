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
let BM_UID=0;                                  // unique gradient ids per drawn figure (several figures can share a page)
function bodySvg(age,view,strokes,o){o=o||{};const g=figGeo(age),p=g.p,back=view==='back',u='bmg'+(++BM_UID),ln='#6d5e82',skin=`url(#${u}s)`,shirt=`url(#${u}t)`,pants=`url(#${u}p)`,hair=`url(#${u}h)`,cx=g.cx,hr=p.hr,hy=g.headCy,F=n=>+(+n).toFixed(1),acc='#a58ad8';
 const R=(x,y,w,h,rx,fill)=>`<rect x="${F(x)}" y="${F(y)}" width="${F(w)}" height="${F(h)}" rx="${F(rx)}" fill="${fill}"/>`,Cc=(x,y,r,fill)=>`<circle cx="${F(x)}" cy="${F(y)}" r="${F(r)}" fill="${fill}"/>`;
 const x0=cx-p.tw/2,x1=cx+p.tw/2,y0=g.torsoY,y1=y0+p.th,rr=p.tw*.3,lcL=g.legLx+p.lw/2,lcR=g.legRx+p.lw/2,yb=g.legTop+p.ll;
 let f=`<defs><radialGradient id="${u}s" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fffaf4"/><stop offset=".6" stop-color="#f9e4d0"/><stop offset="1" stop-color="#efcfb4"/></radialGradient><linearGradient id="${u}t" x1="0" x2="1"><stop offset="0" stop-color="#cdbcf3"/><stop offset=".45" stop-color="#efe6ff"/><stop offset="1" stop-color="#c7b4ef"/></linearGradient><linearGradient id="${u}p" x1="0" x2="1"><stop offset="0" stop-color="#a9cdee"/><stop offset=".5" stop-color="#dbeafb"/><stop offset="1" stop-color="#a3c8ec"/></linearGradient><linearGradient id="${u}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c0a9d6"/><stop offset="1" stop-color="#8b73a8"/></linearGradient></defs>`;
 f+=`<g transform="${bmTr(g)}" stroke="${ln}" stroke-width="1.6" stroke-linejoin="round">`;
 f+=`<ellipse cx="${cx}" cy="${F(yb+10)}" rx="${F(p.tw*.8)}" ry="5" fill="#000" fill-opacity=".12" stroke="none"/>`;
 f+=R(g.legLx,g.legTop,p.lw,p.ll,p.lw/2.4,skin)+R(g.legRx,g.legTop,p.lw,p.ll,p.lw/2.4,skin);
 f+=R(g.legLx-1.5,g.legTop-4,p.lw+3,p.ll*.84,p.lw/2.6,pants)+R(g.legRx-1.5,g.legTop-4,p.lw+3,p.ll*.84,p.lw/2.6,pants);
 const cuff=g.legTop-4+p.ll*.8;f+=`<path d="M${F(g.legLx-1.5)} ${F(cuff)}h${F(p.lw+3)}M${F(g.legRx-1.5)} ${F(cuff)}h${F(p.lw+3)}" stroke="#86acd2" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
 for(const lc of[lcL,lcR])f+=`<ellipse cx="${F(lc)}" cy="${F(yb+4)}" rx="${F(p.lw*.84)}" ry="7.5" fill="#fff"/><path d="M${F(lc-p.lw*.84)} ${F(yb+6.5)}q${F(p.lw*.84)} 6.5 ${F(p.lw*1.68)} 0" stroke="#b49ee0" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
 f+=R(g.armLx,g.armY,p.aw,p.al,p.aw/2,skin)+R(g.armRx,g.armY,p.aw,p.al,p.aw/2,skin)+Cc(g.armLx+p.aw/2,g.armY+p.al,p.aw*.62,skin)+Cc(g.armRx+p.aw/2,g.armY+p.al,p.aw*.62,skin);
 f+=R(cx-7,hy+hr-6,14,y0-(hy+hr)+10,4,skin);
 f+=`<path d="M${F(x0)} ${F(y0+rr)}Q${F(x0)} ${F(y0)} ${F(x0+rr)} ${F(y0)}L${F(x1-rr)} ${F(y0)}Q${F(x1)} ${F(y0)} ${F(x1)} ${F(y0+rr)}L${F(x1-1.5)} ${F(y1-8)}Q${F(x1-1.5)} ${F(y1)} ${F(x1-9)} ${F(y1)}L${F(x0+9)} ${F(y1)}Q${F(x0+1.5)} ${F(y1)} ${F(x0+1.5)} ${F(y1-8)}Z" fill="${shirt}"/>`;
 f+=R(g.legLx-1.5,y1-28,2*p.lw+7,28+p.ll*.22,8,pants)+`<path d="M${F(x0+3)} ${F(y1-28)}H${F(x1-3)}" stroke="#86acd2" stroke-width="2" fill="none"/>`;
 f+=back?`<path d="M${cx-11} ${F(y0)}Q${cx} ${F(y0+7)} ${cx+11} ${F(y0)}" fill="none" stroke="${acc}" stroke-width="3" stroke-linecap="round"/>`:`<path d="M${cx-12} ${F(y0)}Q${cx} ${F(y0+17)} ${cx+12} ${F(y0)}Z" fill="${skin}"/><path d="M${cx-12} ${F(y0)}Q${cx} ${F(y0+17)} ${cx+12} ${F(y0)}" fill="none" stroke="${acc}" stroke-width="3" stroke-linecap="round"/>`;
 f+=R(g.armLx-1,g.armY-1,p.aw+2,p.al*.42,p.aw/2.2,shirt)+R(g.armRx-1,g.armY-1,p.aw+2,p.al*.42,p.aw/2.2,shirt)+`<path d="M${F(g.armLx-1)} ${F(g.armY+p.al*.42-1)}h${F(p.aw+2)}M${F(g.armRx-1)} ${F(g.armY+p.al*.42-1)}h${F(p.aw+2)}" stroke="${acc}" stroke-width="2" fill="none"/>`;
 f+=Cc(cx-hr*.97,hy+hr*.12,hr*.2,skin)+Cc(cx+hr*.97,hy+hr*.12,hr*.2,skin)+Cc(cx,hy,hr,skin);
 if(back)f+=`<circle cx="${cx}" cy="${F(hy-hr*.02)}" r="${F(hr*.98)}" fill="${hair}"/><path d="M${F(cx-hr*.35)} ${F(hy-hr*.3)}q${F(hr*.35)} ${F(hr*.45)} ${F(hr*.7)} 0M${F(cx-hr*.5)} ${F(hy+hr*.15)}q${F(hr*.5)} ${F(hr*.35)} ${F(hr)} 0" fill="none" stroke="#7a6392" stroke-width="1.3" stroke-linecap="round"/>`;
 else{const e=(x)=>`<ellipse cx="${F(x)}" cy="${F(hy+hr*.1)}" rx="${F(hr*.1)}" ry="${F(hr*.13)}" fill="${ln}" stroke="none"/><circle cx="${F(x+hr*.035)}" cy="${F(hy+hr*.05)}" r="${F(hr*.04)}" fill="#fff" stroke="none"/>`;
  f+=`<path d="M${F(cx-hr*.98)} ${F(hy-hr*.2)}A${hr} ${hr} 0 0 1 ${F(cx+hr*.98)} ${F(hy-hr*.2)}Q${F(cx+hr*.2)} ${F(hy-hr*.62)} ${F(cx-hr*.98)} ${F(hy-hr*.2)}Z" fill="${hair}"/><path d="M${F(cx-hr*.1)} ${F(hy-hr*.93)}q${F(hr*.28)} ${F(-hr*.28)} ${F(hr*.5)} ${F(-hr*.04)}q${F(-hr*.2)} ${F(hr*.12)} ${F(-hr*.5)} ${F(hr*.04)}z" fill="${hair}"/>`+
  e(cx-hr*.36)+e(cx+hr*.36)+`<path d="M${F(cx-hr*.5)} ${F(hy-hr*.12)}q${F(hr*.14)} ${F(-hr*.09)} ${F(hr*.28)} 0M${F(cx+hr*.22)} ${F(hy-hr*.12)}q${F(hr*.14)} ${F(-hr*.09)} ${F(hr*.28)} 0" fill="none" stroke="${ln}" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="${F(cx-hr*.6)}" cy="${F(hy+hr*.38)}" rx="${F(hr*.15)}" ry="${F(hr*.1)}" fill="#ffb3c1" fill-opacity=".55" stroke="none"/><ellipse cx="${F(cx+hr*.6)}" cy="${F(hy+hr*.38)}" rx="${F(hr*.15)}" ry="${F(hr*.1)}" fill="#ffb3c1" fill-opacity=".55" stroke="none"/><path d="M${F(cx-hr*.3)} ${F(hy+hr*.44)}Q${cx} ${F(hy+hr*.72)} ${F(cx+hr*.3)} ${F(hy+hr*.44)}" fill="none" stroke="${ln}" stroke-width="1.5" stroke-linecap="round"/>`}
 for(const a of(o.areas||[]))if(BM_ZONES[view].includes(a))for(const z of g.zones[a])f+=z.c?`<circle cx="${z.c[0]}" cy="${z.c[1]}" r="${z.c[2]+3}" fill="#7c3aed" fill-opacity=".14" stroke="none"/><circle cx="${z.c[0]}" cy="${z.c[1]}" r="${z.c[2]}" fill="#7c3aed" fill-opacity=".12" stroke="#7c3aed" stroke-opacity=".6" stroke-dasharray="5 4" stroke-width="2"/>`:`<rect x="${F(z.r[0]-3)}" y="${F(z.r[1]-3)}" width="${F(z.r[2]+6)}" height="${F(z.r[3]+6)}" rx="12" fill="#7c3aed" fill-opacity=".14" stroke="none"/><rect x="${F(z.r[0])}" y="${F(z.r[1])}" width="${F(z.r[2])}" height="${F(z.r[3])}" rx="8" fill="#7c3aed" fill-opacity=".12" stroke="#7c3aed" stroke-opacity=".6" stroke-dasharray="5 4" stroke-width="2"/>`;
 f+='</g>';const w=o.w;
 return`<svg ${o.id?`id="${o.id}" `:''}viewBox="0 0 200 400" role="img" aria-label="${bmEsc(o.label)}" ${o.interactive?'tabindex="0" focusable="true" ':''}style="width:${w?w+'px':'100%'};max-width:${w||300}px;height:auto;display:inline-block${o.interactive?';touch-action:none;background:linear-gradient(#fff,#f4eeff);border-radius:20px;border:2px solid var(--lav);box-shadow:0 6px 18px #0001':''}">${f}<g${o.id?' id="bmst"':''}>${strokesSvg(strokes,p)}</g>${o.interactive?'<circle id="bmcur" cx="100" cy="200" r="5" fill="none" stroke="#000" stroke-width="1.5" style="display:none"/>':''}</svg>`}
// ---- marks: never trusted (state, storage or server): clamp, cap and rebuild
function cleanStrokes(a){return Array.isArray(a)?a.slice(0,BM_MAX_STROKES).map(st=>Array.isArray(st)?st.slice(0,BM_MAX_POINTS).filter(Array.isArray).map(q=>[bmClamp(q[0]),bmClamp(q[1])]):[]).filter(st=>st.length):[]}
const bmTotal=bm=>['front','back'].reduce((n,v)=>n+((bm&&bm[v])||[]).reduce((m,st)=>m+((st&&st.length)||0),0),0);
function capTotal(list,room){const out=[];for(const st of list){if(room<=0)break;const k=st.slice(0,room);out.push(k);room-=k.length}return out}
function packMarks(age,bm){const front=capTotal(cleanStrokes(bm&&bm.front),BM_MAX_TOTAL),back=capTotal(cleanStrokes(bm&&bm.back),BM_MAX_TOTAL-bmTotal({front}));return front.length||back.length?{v:1,fig:FIGP[age]?age:'9-10',front,back}:null}
function cleanMarks(x){return x&&typeof x==='object'&&x.v===1?packMarks(x.fig,x):null}
