const { load, tick, assert, pass } = require('./load');
(async () => {
  const w = load('index.html'); const d = w.document; await tick();
  assert.deepStrictEqual(w.__errs, []);
  w.eval("ST.lang='ar';ST.nick='Sam';ST.ab='9-10'");
  const ev = s => w.eval(s), occ = (rep, date, iso, o) => ev(`plOcc(Object.assign({off:0,rep:${JSON.stringify(rep)},date:${JSON.stringify(date)},days:[],end:'',done:{}},${JSON.stringify(o || {})}),${JSON.stringify(iso)})`);
  const today = () => ev('plISO(plNow())'), mine = () => ev("D.pl.tasks.filter(k=>k.by==='parent'&&!k.demo)");

  // --- the planner left the child's world: no tile, no route, the child cannot create anything
  w.go('home'); const tiles = [...d.querySelectorAll('#app .grid > button.nav')].map(b => b.getAttribute('onclick'));
  assert.strictEqual(tiles.length, 8); assert(!tiles.some(x => /planner/.test(x))); assert.strictEqual(tiles[1], "go('health')");
  w.location.hash = '#planner'; await tick(); assert.strictEqual(ev('ST.view'), 'landing', 'an old #planner link goes to the start page'); w.go('home');
  ev("plNew()"); assert.strictEqual(ev('ST.ple'), null, 'the child cannot open the add form');
  pass('home has 9 sections (no My Planner tile), #planner no longer opens, the child cannot add tasks');

  // --- recurrence engine
  assert(occ('once', '2026-11-14', '2026-11-14') && !occ('once', '2026-11-14', '2026-11-15'));
  assert(occ('daily', '2026-11-14', '2026-12-01') && !occ('daily', '2026-11-14', '2026-11-13'));
  assert(occ('weekly', '2026-11-14', '2026-11-28') && !occ('weekly', '2026-11-14', '2026-11-27'));
  assert(occ('days', '2026-11-01', '2026-11-16', { days: [1, 3] }) && !occ('days', '2026-11-01', '2026-11-17', { days: [1, 3] }));
  assert(occ('month', '2026-01-31', '2026-02-28') && !occ('month', '2026-01-31', '2026-02-27'), 'monthly clamps to month end');
  assert(occ('year', '2024-02-29', '2026-02-28') && occ('year', '2024-02-29', '2028-02-29'), 'yearly leap-day clamp');
  assert(occ('range', '2026-11-10', '2026-11-12', { end: '2026-11-12' }) && !occ('range', '2026-11-10', '2026-11-13', { end: '2026-11-12' }));
  assert(!occ('daily', '2026-11-14', '2026-11-20', { off: 1 }), 'cancelled tasks disappear');
  pass('recurrence: once, daily, weekly, selected weekdays, monthly, yearly, date range, cancelled');

  // --- the planner lives in the parents' area (after the family code)
  ev("ST.cok=1"); w.go('care'); ev("ST.ct='plan';R()"); assert(d.querySelector('#plp'), 'planner section inside the parents area'); assert(d.querySelector('#plp [role=note]'), 'demo + safety notes are shown');
  const pv = () => d.querySelector('#plp').textContent;
  for (const lang of ['ar', 'en']) { ev(`ST.lang='${lang}'`); for (const v of ['day', 'week', 'month', 'year']) { ev(`enter('care');ST.ct='plan';ST.plv='${v}';R()`); assert(!/undefined|NaN|pl_|pc_/.test(pv()), lang + ' ' + v); }
    ev("ST.plt='todo';R()"); assert(!/undefined|NaN|pl_|pc_/.test(pv()), lang + ' todo'); }
  ev("ST.lang='ar';enter('care');ST.ct='plan';ST.plv='month';ST.pld='2026-11-14';R()"); assert.strictEqual(d.querySelectorAll('#plp [aria-pressed][onclick*="ST.pld"]').length, 30);
  w.plShift(1); assert.strictEqual(ev('ST.pld'), '2026-12-14'); ev("ST.plv='year';R()"); w.plShift(-1); assert.strictEqual(ev('ST.pld'), '2025-12-14');
  ev("ST.pld='2026-01-31';ST.plv='month'"); w.plShift(1); assert.strictEqual(ev('ST.pld'), '2026-02-28');
  pass('the planner is a section of the parents area; day/week/month/year/todo render in Arabic and English; month ends clamp');

  // --- several doses a day: ONE card with one button per dose; the child never sees or ticks medicine
  ev("ST.ct='plan';ST.plt='cal';ST.plv='day';ST.pld=plISO(plNow());R()");
  const medCards = [...d.querySelectorAll('#plp .card')].filter(c => c.textContent.includes('دواء (مثال فقط)') && c.querySelector('.chips'));
  assert.strictEqual(medCards.length, 1, 'one card for the medicine'); assert.strictEqual(medCards[0].querySelectorAll('.chips button').length, 4, 'four doses = four buttons');
  assert(medCards[0].querySelector('.chips button').disabled, 'the parent view only shows status; the child ticks the child tasks');
  const med = ev("D.pl.tasks.find(k=>k.cat==='med').id"), T = today(), doneN = id => ev(`Object.keys(D.pl.tasks.find(k=>k.id==${id}).done).length`);
  w.plMark(med, T, '08:00', 1); assert.strictEqual(doneN(med), 0, 'medicine cannot be ticked from the parent view');
  w.plEdit(med); assert.strictEqual(ev('ST.ple'), null, 'the example medicine has fixed wording and is not editable');
  ev("ST.cok=0;go('home')"); w.plMark(med, T, '08:00', 1); assert.strictEqual(doneN(med), 0, 'the child cannot tick medicine'); w.plOff(med); assert.strictEqual(ev(`D.pl.tasks.find(k=>k.id==${med}).off`), 0, 'the child cannot cancel it');
  assert(!d.querySelector('#dt').textContent.includes('دواء'), 'medicine is never shown to the child');
  ev("ST.cok=1;go('care')");
  pass('a medicine taken 4 times a day shows one card with 4 buttons for the parent; the child never sees, ticks or cancels it');

  // --- validation, add-times, edit, reschedule, cancel (parents only)
  ev("plNew();ST.ple.title='';plSave()"); assert.strictEqual(ev('ST.plerr'), 1);
  ev("ST.ple.title='x';ST.ple.rep='range';plSave()"); assert.strictEqual(ev('ST.plerr'), 2);
  ev("ST.ple.end='2020-01-01';plSave()"); assert.strictEqual(ev('ST.plerr'), 3);
  ev("ST.ple.end='';ST.ple.rep='days';ST.ple.days=[];plSave()"); assert.strictEqual(ev('ST.plerr'), 4);
  ev("ST.ple.rep='once';ST.ple.cat='zzz';plSave()"); assert.strictEqual(ev('ST.plerr'), 1); assert.strictEqual(mine().length, 0, 'unknown category rejected');
  assert.strictEqual(d.querySelectorAll('#plp button[disabled]').length, 0, 'the parent can pick every category, medical ones included'); 
  ev("ST.ple.times=[];ST.ple.cat='edu'"); d.querySelector('#plh').value = '09:30'; w.plAddT(); d.querySelector('#plh').value = '09:30'; w.plAddT(); d.querySelector('#plh').value = '08:15'; w.plAddT();
  assert.strictEqual(ev("ST.ple.times.join()"), '08:15,09:30', 'times are unique and sorted');
  ev("ST.ple.times=['18:00','07:00','xx'];ST.ple.title='  واجب   الرياضيات ';ST.ple.date=plISO(plNow());ST.ple.rep='daily';plSave()");
  assert.strictEqual(mine().length, 1); assert.strictEqual(ev("mine=D.pl.tasks.find(k=>k.by==='parent'&&!k.demo);mine.title"), 'واجب الرياضيات'); assert.strictEqual(ev('mine.times.join()'), '07:00,18:00');
  const id = ev('mine.id'); w.plEdit(id); ev(`ST.ple.date=plAdd('${T}',2);ST.ple.title='<b id=zz>x</b>';plSave()`); ev(`ST.pld=plAdd('${T}',2);ST.plv='day';R()`);
  assert(!d.querySelector('#zz'), 'titles are escaped'); assert.strictEqual(ev(`D.pl.tasks.find(k=>k.id==${id}).date`), ev(`plAdd('${T}',2)`), 'rescheduled');
  w.plOff(id); assert.strictEqual(ev(`D.pl.tasks.find(k=>k.id==${id}).off`), 1, 'cancelled');
  ev("plNew();ST.ple.title='دواء المساء';ST.ple.cat='med';ST.ple.times=['20:00'];plSave()"); assert.strictEqual(mine().filter(k => k.cat === 'med').length, 1, 'a parent can add a medical task');
  pass('validation, add/remove times, edit/reschedule, cancel, HTML escaped; parents can add every category');

  // --- cards stay short: edit / cancel live inside a folded "options" section
  ev("ST.plv='day';ST.pld=plISO(plNow());R()");
  assert([...d.querySelectorAll('#plp .card')].every(c => [...c.children].filter(x => x.tagName === 'BUTTON').length === 0), 'no loose edit/cancel buttons on cards');

  // --- Upcoming shows only today + the next 3 days
  ev("D.pl.tasks.forEach(k=>{if(!k.demo)k.off=1})");
  ev(`plNew();ST.ple.title='بعيدة';ST.ple.cat='act';ST.ple.date=plAdd('${T}',5);plSave()`); ev(`plNew();ST.ple.title='قريبة';ST.ple.cat='act';ST.ple.date=plAdd('${T}',3);plSave()`);
  ev("ST.plt='todo';R()"); const tx = d.querySelector('#plp').textContent; assert(tx.includes('قريبة') && !tx.includes('بعيدة'), 'upcoming = today + next 3 days'); assert(d.querySelectorAll('#plp h4').length <= 4);
  pass('Upcoming lists only the next 3 days (grouped by day), completed items are folded away');

  // --- the child's 5th daily task is exactly what the family set for today
  ev("D.pl.tasks.forEach(k=>{if(!k.demo)k.off=1});ST.cok=0"); w.go('home'); const ids = ev('D.dt.ids'); assert.strictEqual(ids[4], 'planner'); assert.strictEqual(d.querySelectorAll('#dt .dt-row').length, 5);
  const p0 = ev('progLoad().tasks'); assert(/تحدٍّ من أهلي لليوم/.test(d.querySelectorAll('#dt .dt-row')[4].textContent)); assert.strictEqual(d.querySelectorAll('#dt .dt-row')[4].querySelectorAll('button.pri').length, 0);
  assert(/لا توجد مهام من أهلك اليوم/.test(d.querySelectorAll('#dt .dt-row')[4].textContent), 'nothing set by the family: the child is not blocked'); assert(ev("D.dt.d.includes('planner')"), 'an empty family day counts as done'); assert.strictEqual(ev('progLoad().tasks'), p0, 'but it pays no reward');
  ev(`ST.cok=1;go('care');plNew();ST.ple.title='رياضة';ST.ple.cat='rout';ST.ple.date=plISO(plNow());ST.ple.rep='daily';ST.ple.times=['07:00','18:00'];plSave()`);
  ev(`plNew();ST.ple.title='موعد الطبيب';ST.ple.cat='appt';ST.ple.date=plISO(plNow());plSave()`); ev("ST.cok=0"); w.go('home');
  const row = d.querySelectorAll('#dt .dt-row')[4].textContent; assert(row.includes('رياضة') && !row.includes('موعد الطبيب') && !row.includes('دواء'), 'the child sees the family tasks, never the medical ones');
  assert(!ev("D.dt.d.includes('planner')"), 'a new family task re-opens today\'s planner challenge');
  assert.strictEqual(d.querySelectorAll('#dt .dt-row')[4].querySelectorAll('.chips button').length, 2, 'one button per time');
  const kid = ev("D.pl.tasks.find(k=>k.title==='رياضة').id");
  w.plMark(kid, T, '07:00', 1); assert(!ev("D.dt.d.includes('planner')"), 'half done is not done');
  assert.strictEqual(ev('plDayStat(plISO(plNow())).n'), 1, 'only child tasks count (not medicine or appointments)');
  w.plMark(kid, T, '18:00', 1); assert(ev("D.dt.d.includes('planner')"), 'all family tasks done -> the daily task is done'); assert.strictEqual(ev('progLoad().tasks'), p0 + 1, 'same sticker progress counter as other daily tasks');
  w.plMark(kid, T, '18:00', 0); assert(!ev("D.dt.d.includes('planner')"), 'undo takes it back'); w.plMark(kid, T, '18:00', 1); assert.strictEqual(ev('progLoad().tasks'), p0 + 1, 'no double credit');
  ev("D.dt=null;localStorage.removeItem(dtKey());dtEnsure();plSyncDay()"); assert.strictEqual(ev('progLoad().tasks'), p0 + 1, 'a new 24h set on the same calendar day does not pay twice');
  pass('the child sees exactly the family tasks of today (never medical ones), ticks them per time, empty day never blocks, the reward is paid once per day');

  // --- reminders per dose, once; only for the child's tasks
  ev("ST.cok=1;go('care')");
  ev("plNew();ST.ple.title='r';ST.ple.cat='act';ST.ple.date=plISO(plNow());const n=plNow();ST.ple.times=[String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')];ST.ple.rem=0;plSave()");
  assert(d.getElementById('plr'), 'in-app reminder shown'); d.getElementById('plr').remove(); w.plCheck(); w.plCheck(); assert(!d.getElementById('plr'), 'no duplicate');
  ev("plNew();ST.ple.title='دواء الآن';ST.ple.cat='med';ST.ple.date=plISO(plNow());const n=plNow();ST.ple.times=[String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')];ST.ple.rem=0;plSave();plCheck()");
  assert(!d.getElementById('plr'), 'medical reminders never pop up on the child screen');
  w.clearInterval(ev('D.pl.ti')); assert.deepStrictEqual(w.__errs, []);
  pass('reminders: one in-app banner per dose (no duplicates), none for medical tasks; browser notifications are optional');
  console.log('ALL PLANNER TESTS PASSED'); w.close();
})().catch(e => { console.error(e); process.exit(1); });
