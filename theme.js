// UNS shared theme helpers (used by index.html and app.html).
const TH=[['sky','🌌',['#D7CBF2','#6f55b0']],['gar','🌿',['#CFEBD3','#3f7a4b']],['sea','🌊',['#BFE3F4','#2a77a6']],['cl','☁️',['#F8D9E6','#a9507f']],['sun','☀️',['#FADDB5','#9a6200']]];
function thLoad(def){try{const s=localStorage.getItem('uns_theme');if(TH.some(x=>x[0]===s))return s}catch(e){}return def}
function thSave(k){try{localStorage.setItem('uns_theme',k)}catch(e){}}
function thRender(cur,adult,nameFn,pick){document.documentElement.setAttribute('data-th',adult?'care':cur);const h=document.getElementById('th');if(!h)return;h.hidden=!!adult;
 h.innerHTML=TH.map(x=>`<button class="dot" aria-label="${nameFn(x[0])}" title="${nameFn(x[0])}" aria-pressed="${cur===x[0]}" style="background:linear-gradient(135deg,${x[2][0]} 50%,${x[2][1]} 50%)" onclick="${pick}('${x[0]}')"></button>`).join('')}
