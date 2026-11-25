const { load, tick, assert, pass } = require('./load');
(async () => {
  const w = load('index.html'); const d = w.document; await tick();
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  assert.deepStrictEqual(w.__errs, []);
  const $$ = s => [...d.querySelectorAll(s)];
  const realNow = w.Date.now.bind(w.Date); let offset = 0; w.Date.now = () => realNow() + offset;

  // --- four daily challenges + my planner, percent out of 100
  w.go('home');
  assert.strictEqual($$('#dt .dt-row').length, 5, 'five daily tasks');
  const ids = w.eval('D.dt.ids'); assert.strictEqual(new Set(ids).size, 5);
  assert.strictEqual(ids[4], 'planner', 'the fifth daily task is the challenge from the family (set in the parents area)'); assert.deepStrictEqual(ids.slice(0, 4), ['ch_feel', 'ch_think', 'ch_move', 'ch_talk'], 'the first four are the challenges: feelings, thinking, movement, connection');
  assert.strictEqual($$('#dt .dt-row')[4].querySelectorAll('button.pri').length, 0, 'the planner row has no manual done button: it completes by itself');
  assert.strictEqual(d.querySelector('#dtp').textContent, '20%', 'the family task counts as done when the family set nothing today');
  assert.strictEqual(d.querySelector('[role=progressbar]').getAttribute('aria-valuenow'), '20');
  const rowAt = i => $$('#dt .dt-row')[i];
  assert(/ثلاثة مشاعر/.test(rowAt(0).textContent), 'feelings challenge asks for three feelings');
  assert(/لغزًا جديدًا/.test(rowAt(1).textContent), 'thinking challenge: solve a new puzzle');
  assert.strictEqual(rowAt(2).querySelectorAll('button').length, 1, 'movement challenge has only the done button (nothing to open)');
  assert(/جالس أو مستلقٍ/.test(rowAt(2).textContent), 'movement challenge says it can be done sitting or lying down');
  assert(/شخصًا/.test(rowAt(3).textContent), 'connection challenge: share an activity with someone');
  assert(rowAt(0).textContent.includes('المستوى 1/3'), 'level is visible');
  const feelAt = age => { w.eval(`ST.ab='${age}';R()`); return rowAt(0).textContent; };
  assert.notStrictEqual(feelAt('7-8'), feelAt('11-12'), 'challenge wording depends on the age band'); w.eval("ST.ab='9-10';R()");
  assert(!/مهاراتي/.test(d.querySelector('#dt').textContent), 'the daily panel no longer mentions My Skills');
  pass('home shows 4 daily challenges (feelings, thinking, movement, connection) + my planner, age-based wording, level shown, progress 20% (family task empty = done)');

  w.dtMark(ids[0], 1); assert.strictEqual(d.querySelector('#dtp').textContent, '40%');
  w.dtMark(ids[1], 1); w.dtMark(ids[2], 1); assert.strictEqual(d.querySelector('#dtp').textContent, '80%');
  w.dtMark(ids[2], 0); assert.strictEqual(d.querySelector('#dtp').textContent, '60%', 'undo works');
  w.dtMark(ids[2], 1); w.dtMark('not-a-task', 1); assert.strictEqual(w.eval('D.dt.d.length'), 4, 'unknown ids ignored');
  pass('progress is done/5 x 100 (20% steps), can be undone, ignores unknown ids');

  // --- persistence
  const saved = JSON.parse(w.localStorage.getItem(w.eval('dtKey()')));
  assert.strictEqual(saved.d.length, 4); assert.strictEqual(saved.ids.length, 5);
  pass('state is saved locally (this browser only)');

  // --- locked game
  w.go('happy'); assert(d.querySelector('#app button.locked'), 'Star Sky is locked in My Happy Space');
  assert.strictEqual(d.querySelector('#app button.locked').getAttribute('aria-disabled'), 'true');
  assert(!d.querySelector('#app .star-tile'));
  w.go('star'); assert.strictEqual(w.eval('ST.view'), 'happy', 'direct go() to the game is refused while locked');
  w.location.hash = '#star'; await tick(); assert.strictEqual(w.eval('ST.view'), 'happy', 'typing #star in the URL is refused while locked');
  pass('game is locked until all five tasks are done (tile, go() and URL hash)');

  // --- timer behind the brain button
  w.go('home'); assert(!d.querySelector('#dtc'), 'timer hidden by default');
  d.querySelector('.dt-brain').click(); assert(d.querySelector('#dtc'));
  assert(/^23:5\d:\d\d$|^24:00:00$/.test(d.querySelector('#dtc').textContent), 'shows time left of 24h: ' + d.querySelector('#dtc').textContent);
  offset += 3600e3; w.dtTick(); assert(/^22:5\d:\d\d$|^23:00:00$/.test(d.querySelector('#dtc').textContent), 'counts down');
  d.querySelector('.dt-brain').click(); assert(!d.querySelector('#dtc'), 'brain button hides it again');
  pass('brain button shows and hides a 24h countdown to the next renewal');

  // --- unlock
  w.dtMark(ids[3], 1); w.dtMark(ids[4], 1); w.go('home');
  assert.strictEqual(d.querySelector('#dtp').textContent, '100%'); assert(d.querySelector('#dt .card.c4'), 'celebration + play button');
  w.go('happy'); assert(d.querySelector('#app .star-tile') && !d.querySelector('#app button.locked'));
  w.go('star'); assert.strictEqual(w.eval('ST.view'), 'star'); assert(d.querySelector('#spc'), 'game canvas');
  pass('finishing all 5 tasks unlocks Star Rocket');

  // --- Star Rocket logic (canvas drawing is mocked; the rules are tested directly)
  w.R(); assert(d.querySelector('#app .sp-go'), 'start button'); d.querySelector('#app .sp-go').click();
  assert.strictEqual(w.eval('G.sp.st'), 'play'); assert.strictEqual($$('#app .sp-b').length, 2, 'big left/right buttons');
  const ev = c => w.eval(c);
  ev("G.sp.items=[];G.sp.next=99;"); const base = () => ev('G.sp.tot');
  ev("G.sp.items=[{k:'s',l:1,x:SP_LX[1],y:SP_PY}];spStep(G.sp,.016)"); assert.strictEqual(ev('G.sp.got'), 1, 'star collected');
  ev("G.sp.items=[{k:'g',l:1,x:SP_LX[1],y:SP_PY}];spStep(G.sp,.016)"); assert.strictEqual(ev('G.sp.got'), 4, 'gem is worth 3');
  const before = ev('G.sp.tot');
  ev("G.sp.combo=5;G.sp.items=[{k:'a',l:1,x:SP_LX[1],y:SP_PY}];spStep(G.sp,.016)");
  assert.strictEqual(ev('G.sp.tot'), before, 'an asteroid never removes stars'); assert.strictEqual(ev('G.sp.combo'), 0); assert(ev('G.sp.slow') > 0, 'it only slows the rocket');
  ev("G.sp.shield=1;G.sp.slow=0;G.sp.items=[{k:'a',l:1,x:SP_LX[1],y:SP_PY}];spStep(G.sp,.016)"); assert.strictEqual(ev('G.sp.shield'), 0); assert.strictEqual(ev('G.sp.slow'), 0, 'shield absorbs the hit');
  ev("G.sp.boost=3;G.sp.items=[{k:'a',l:1,x:SP_LX[1],y:SP_PY}];spStep(G.sp,.016)"); assert.strictEqual(ev('G.sp.slow'), 0, 'turbo ignores asteroids');
  ev("G.sp.boost=0;G.sp.magnet=5;G.sp.items=[{k:'s',l:0,x:SP_LX[0],y:SP_PY-60}];for(let i=0;i<10;i++)spStep(G.sp,.016)"); assert(ev('G.sp.items.length===0||Math.abs(G.sp.items[0].x-G.sp.x)<Math.abs(SP_LX[0]-G.sp.x)'), 'magnet pulls stars');
  ev("G.sp.lane=1;spMove(-1);spMove(-1);spMove(-1)"); assert.strictEqual(ev('G.sp.lane'), 0); ev("spMove(1);spMove(1);spMove(1);spMove(1)"); assert.strictEqual(ev('G.sp.lane'), 2, 'lane stays within 3 lanes');
  ev("G.sp.pause=1;spMove(-1)"); assert.strictEqual(ev('G.sp.lane'), 2, 'no moves while paused'); ev('G.sp.pause=0');
  // spawn never blocks all three lanes
  for (let i = 0; i < 3000; i++) { ev("G.sp.items=[];spSpawn(G.sp)"); assert(ev("new Set(G.sp.items.filter(x=>x.k==='a').map(x=>x.l)).size")<3, 'a free lane always exists'); }
  pass('Star Rocket rules: stars/gems/combo, asteroids only slow (never lose stars), shield, turbo, magnet, lanes, pause, always a free lane');
  // reaching planets
  ev("G.sp.items=[];G.sp.got=SP_NEED-1;G.sp.p=0;G.sp.items=[{k:'s',l:1,x:SP_LX[1],y:SP_PY}];G.sp.lane=1;G.sp.x=SP_LX[1];spStep(G.sp,.016)");
  assert.strictEqual(ev('G.sp.p'), 1); assert.strictEqual(ev('G.sp.got'), 0); assert(ev('G.sp.boost') > 0, 'arriving gives a speed boost');
  ev("G.sp.p=4;G.sp.got=SP_NEED-1;G.sp.items=[{k:'s',l:1,x:SP_LX[1],y:SP_PY}];spStep(G.sp,.016)"); assert.strictEqual(ev('G.sp.st'), 'done');
  w.R(); assert(d.querySelector('#app .sp-go'), 'play again button at the end'); d.querySelector('#app .sp-go').click(); assert.strictEqual(ev('G.sp.p'), 0); assert.strictEqual(ev('G.sp.st'), 'play');
  // full simulated run reaches the end without errors
  ev("G.sp.items=[];for(let i=0;i<20000&&G.sp.st==='play';i++){const s=G.sp;const tgt=s.items.filter(x=>(x.k==='s'||x.k==='g')&&x.y<SP_PY).sort((a,b)=>b.y-a.y)[0];if(tgt)s.lane=tgt.l;spStep(s,.016)}");
  assert.strictEqual(ev('G.sp.st'), 'done', 'a simple bot can finish all 5 planets'); assert.deepStrictEqual(w.__errs, []);
  pass('5 planets reached in order; ends with a celebration; play again; a bot can finish the trip');

  // --- 24h renewal (also when the tab was closed)
  offset += 24 * 3600e3 + 1000; w.dtTick();
  assert.strictEqual(w.eval('D.dt.d.length'), 0, 'tasks reset after 24h'); w.go('happy');
  assert(d.querySelector('#app button.locked'), 'game locks again with the new tasks');
  w.go('home'); assert.strictEqual($$('#dt .dt-row').length, 5); assert.strictEqual(d.querySelector('#dtp').textContent, '20%');
  w.localStorage.setItem(w.eval('dtKey()'), JSON.stringify({ s: realNow() + offset - 25 * 3600e3, ids: ['memory'], d: ['memory'] }));
  w.eval('D.dt=null;D.dtk=""'); w.go('home'); assert.strictEqual(w.eval('D.dt.ids.length'), 5, 'tampered/old stored state is rebuilt safely');
  pass('tasks renew automatically after 24 hours (timer tick, reopen, bad stored data)');

  // --- levels follow the child's completions and are saved per child; a day keeps its level until renewal
  assert.strictEqual(JSON.parse(w.localStorage.getItem('uns_ch_' + w.eval('psKey()').slice(7))).ch_feel, 1, 'completions are counted per challenge');
  w.eval("chBump('ch_feel');chBump('ch_feel')"); w.go('home');
  assert(rowAt(0).textContent.includes('المستوى 1/3'), 'the level does not change in the middle of a day');
  w.eval("D.dt=null;localStorage.removeItem(dtKey());dtEnsure()"); w.go('home');
  assert(rowAt(0).textContent.includes('المستوى 2/3'), 'after 3 completions the next day starts at level 2');
  assert(rowAt(1).textContent.includes('المستوى 1/3'), 'other challenges keep their own level');
  w.eval("D.dt=null;D.dtk=''; localStorage.setItem(dtKey(), JSON.stringify({s: Date.now(), ids: ['memory','match','puzzle','coloring','planner'], d: ['memory'], c: ['memory']}))"); w.go('home');
  assert.deepStrictEqual(w.eval('D.dt.ids'), ['ch_feel', 'ch_think', 'ch_move', 'ch_talk', 'planner'], 'a saved day built from the old skills tasks is replaced by the challenges');
  pass('challenge levels: 3 completions per level, kept per child, steady within a day, old skills-based days replaced');

  // --- challenge bank: 108 different challenges (4 types x 3 ages x 3 levels x 3 versions), a new version every 24 hours
  const bank = JSON.parse(w.eval("(()=>{const a=[];CH_IDS.forEach(id=>['7-8','9-10','11-12'].forEach(g=>[1,2,3].forEach(L=>chPool(id,g,L).forEach(x=>a.push(x)))));return JSON.stringify(a)})()"));
  assert(bank.length >= 50 && bank.length === 108, 'at least 50 challenges (108)');
  assert.strictEqual(new Set(bank.map(x => x[0])).size, bank.length, 'no challenge is repeated in Arabic');
  assert.strictEqual(new Set(bank.map(x => x[1])).size, bank.length, 'no challenge is repeated in English');
  assert(bank.every(x => x[0] && x[1]), 'every challenge has Arabic and English text');
  const seen = new Set(); for (let k = 0; k < 3; k++) { w.go('home'); seen.add(rowAt(0).textContent + '|' + rowAt(3).textContent); offset += 24 * 3600e3 + 1000; w.dtTick(); }
  assert.strictEqual(seen.size, 3, 'three consecutive days show three different versions');
  pass('challenge bank: 108 unique bilingual challenges, a different version each day (3-day cycle per type/age/level)');

  // --- task launched from the panel: completion bar inside the activity
  w.dtLaunch(w.eval('D.dt.ids[0]')); assert(d.querySelector('#app button.pri'), 'activity shows "I finished my task"');
  d.querySelector('#app .card.c2 button.pri').click(); assert.strictEqual(w.eval('D.dt.d.length'), 2); assert.strictEqual(w.eval('ST.view'), 'home');
  pass('a task opened from the panel offers a completion button inside the activity');

  // --- both languages, all age groups, no missing keys
  for (const age of ['7-8', '9-10', '11-12']) for (const lang of ['ar', 'en']) {
    w.eval(`ST.ab='${age}';ST.lang='${lang}'`); w.eval('D.dt=null;D.dtk=""'); w.dtMarkAll = 0;
    w.go('home'); const h = d.querySelector('#app').textContent;
    assert($$('#dt .dt-row').length === 5 && !/\bdt_|\bst_|\badult\b(?!s)/.test(h.replace(/For parents and nurses/, '')), 'home ' + age + lang);
    w.eval('G.sp=null'); w.eval("D.dt.d=D.dt.ids.slice()"); w.go('star'); assert.strictEqual(w.eval('ST.view'), 'star');
    assert(!/\bst_|\bdt_|\bsp_/.test(d.querySelector('#app').textContent), 'star ' + age + lang);
  }
  assert.deepStrictEqual(w.__errs, []);
  pass('daily tasks and Star Rocket render in Arabic and English for all three age groups without script errors');

  // --- nurse and caregiver areas stay reachable
  w.eval("ST.lang='ar'"); w.go('home');
  const ad = $$('#app .adult button'); assert.strictEqual(ad.length, 2, 'home has big entry buttons for nurses and caregivers');
  ad[0].click(); assert.strictEqual(w.eval('ST.view'), 'nurse');
  d.querySelector('#ncode').value = 'N7K4Q'; w.nurseIn(); assert.strictEqual(w.eval('ST.nok'), 1);
  w.eval('ST.nt=7;R()'); w.genCode(); const code = w.eval('D.codes[0].code');
  w.go('home'); w.go('nurse'); assert.strictEqual(w.eval('ST.nok'), 1, 'leaving the nurse view with Home no longer locks it');
  assert(d.querySelector('#app h1').textContent.includes('لوحة التمريض') && d.querySelector('#nurseTabsMarker') === null);
  w.go('care'); d.querySelector('#fcode').value = code; w.redeem(); assert.strictEqual(w.eval('ST.cok'), 1);
  w.go('nurse'); assert(d.querySelector('#app .chips'), 'nurse tabs visible after the caregiver area');
  w.go('care'); assert.strictEqual(w.eval('ST.cok'), 1, 'caregiver session survives moving around');
  w.go('nurse'); [...d.querySelectorAll('#app button')].find(b => b.textContent.includes('🔒')).click();
  assert.strictEqual(w.eval('ST.nok'), 0); w.go('nurse'); assert(d.querySelector('#ncode'), 'lock button locks the dashboard');
  pass('nurse dashboard stays reachable after the caregiver area; explicit lock button; big adult-area buttons on home');
  console.log('ALL DAILY TASKS TESTS PASSED'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
