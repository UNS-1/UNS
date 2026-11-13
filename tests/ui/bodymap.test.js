const { load, tick, assert, pass } = require('./load');
const ev = (w, c) => w.eval(c), J = x => JSON.stringify(x);
const txt = w => w.document.querySelector('#app').textContent.replace(/\s+/g, ' ');
const boot = async age => { const w = load('index.html'); await tick(40); if (age) w.setAge(age); return w; };
const svg = w => { const s = w.document.getElementById('bmsvg'); if (s) s.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 400 }); return s; };
const fire = (w, el, type, x, y) => el.dispatchEvent(new w.MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true }));
const gesture = (w, pts) => { let s = svg(w); fire(w, s, 'pointerdown', pts[0][0], pts[0][1]); for (const p of pts.slice(1)) fire(w, s, 'pointermove', p[0], p[1]); fire(w, s, 'pointerup', 0, 0); };
const key = (w, k) => svg(w).dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const toMap = (w, areas) => { w.go('health'); for (const a of areas) ev(w, `tg(ST.a,'${a}')`); w.R(); ev(w, 'ST.step=1'); w.R(); };
const marks = w => ev(w, 'JSON.parse(JSON.stringify(ST.bm))');
(async () => {
  // ---- flow and zones
  let w = await boot('9-10'); w.go('health'); const d = w.document;
  d.querySelectorAll('#app .chips button').forEach(b => { if (/Stomach|البطن|Back|الظهر/.test(b.textContent)) b.click(); });
  assert(/private part|مكان خاص/.test(txt(w)), 'step 0 reminds the child to tell a trusted adult about private places');
  d.querySelector('#app button.pri').click(); assert.strictEqual(ev(w, 'ST.step'), 1); assert(d.getElementById('bmsvg'));
  assert(/ask a grown-up|tell a grown-up|شخصًا كبيرًا|أخبر/.test(txt(w)) && d.querySelector('#app .card.c3'), 'the urgent-safety box stays on this screen');
  assert.strictEqual(ev(w, 'ST.bm.view'), 'front'); assert.strictEqual((d.getElementById('bmsvg').innerHTML.match(/stroke-dasharray/g) || []).length, 1, 'front: only the stomach zone');
  w.bmView('back'); assert.strictEqual((d.getElementById('bmsvg').innerHTML.match(/stroke-dasharray/g) || []).length, 1, 'back: only the back zone');
  w = await boot('9-10'); toMap(w, ['back']); assert.strictEqual(ev(w, 'ST.bm.view'), 'back', 'only a back area chosen: starts on the back');
  w = await boot('9-10'); toMap(w, []); assert.strictEqual(ev(w, 'ST.bm.view'), 'front'); assert.strictEqual((w.document.getElementById('bmsvg').innerHTML.match(/stroke-dasharray/g) || []).length, 0);
  pass('after choosing where it hurts, a body step follows with the urgent-safety text; chosen zones are outlined on the right side; back-only starts on the back');

  // ---- age figures, tools and wording
  const figs = {}, how = {}, tool = {};
  for (const age of ['7-8', '9-10', '11-12']) { w = await boot(age); toMap(w, ['stomach']); figs[age] = w.document.getElementById('bmsvg').innerHTML; tool[age] = ev(w, 'ST.bm.tool'); how[age] = txt(w).match(/(Tap or draw|Draw on the body|Mark the exact|اضغط أو ارسم|ارسم على الجسم|حدّد المكان بدقة)[^.]*\./)?.[0]; }
  assert.strictEqual(new Set(Object.values(figs)).size, 3, 'a different figure for each age group'); assert.deepStrictEqual([tool['7-8'], tool['9-10'], tool['11-12']], ['dot', 'draw', 'draw']); assert.strictEqual(new Set(Object.values(how)).size, 3, 'instruction wording by age');
  pass('each age group gets its own figure, default tool and wording');

  // ---- drawing with pointer
  w = await boot('11-12'); toMap(w, ['stomach']);
  gesture(w, [[100, 200], [100.5, 200.2], [110, 210], [140, 240]]); let m = marks(w);
  assert.strictEqual(m.front.length, 1); assert.strictEqual(J(m.front[0][0]), J([500, 500])); assert.strictEqual(m.front[0].length, 3, 'a move of about 1 pixel is skipped: ' + m.front[0].length);
  assert(w.document.getElementById('bmsvg').innerHTML.includes('<polyline'), 'stroke is drawn on screen');
  w.bmTool('dot'); gesture(w, [[50, 50]]); m = marks(w); assert.strictEqual(J(m.front[1]), J([[250, 125]]), 'a tap in dot mode places one dot');
  gesture(w, [[-40, 900]]); m = marks(w); assert.strictEqual(J(m.front[2]), J([[0, 1000]]), 'positions are clamped to the body area');
  w.bmView('back'); assert.strictEqual(marks(w).back.length, 0, 'front and back are separate'); gesture(w, [[100, 100]]); assert.strictEqual(marks(w).back.length, 1);
  assert(/Front \(3\)|الأمام \(3\)/.test(txt(w)) && /Back \(1\)|الخلف \(1\)/.test(txt(w)), 'counts shown on the side chips');
  w.bmUndo(); assert.strictEqual(marks(w).back.length, 0); w.bmView('front'); w.bmUndo(); assert.strictEqual(marks(w).front.length, 2); w.bmClear(); assert.strictEqual(marks(w).front.length, 0);
  w.bmTool('dot'); for (let i = 0; i < 45; i++) gesture(w, [[10 + i, 20]]); assert.strictEqual(marks(w).front.length, 40, 'at most 40 marks per side'); assert(/most marks|الحد الأقصى/.test(txt(w)));
  w.bmClear(); w.bmTool('draw'); gesture(w, [[10, 10], ...Array.from({ length: 200 }, (_, i) => [10 + (i % 150) * 1.2, 10 + i * 1.5])]); assert(marks(w).front[0].length <= 120, 'at most 120 points per line');
  w.bmClear(); w.bmView('back'); w.bmClear(); w.bmView('front'); for (let k = 0; k < 7; k++) gesture(w, [[10, 10], ...Array.from({ length: 130 }, (_, i) => [10 + i, 10 + k * 5 + (i % 2) * 4])]);
  { const mm = marks(w); const tot = mm.front.reduce((a, st) => a + st.length, 0) + mm.back.reduce((a, st) => a + st.length, 0); assert(tot <= 600 && tot >= 590, 'at most 600 points in all: ' + tot); assert(/most marks|الحد الأقصى/.test(txt(w))); }
  pass('pointer drawing: lines and dots, small moves skipped, positions clamped, front/back separate, undo and clear, 40 marks and 120 points caps');

  // ---- keyboard
  w = await boot('9-10'); toMap(w, ['head']); const sv = svg(w); assert.strictEqual(sv.getAttribute('tabindex'), '0'); sv.dispatchEvent(new w.Event('focus')); assert.strictEqual(w.document.getElementById('bmcur').style.display, 'block', 'a visible cursor while focused');
  key(w, 'ArrowRight'); key(w, 'ArrowRight'); key(w, 'Enter'); assert.strictEqual(J(marks(w).front[0]), J([[530, 500]]), 'Enter places a dot at the cursor');
  key(w, ' '); key(w, 'ArrowDown'); key(w, 'ArrowDown'); key(w, 'ArrowDown'); key(w, ' '); w.document.getElementById('bmsvg'); m = marks(w);
  assert.strictEqual(m.front.length, 2); assert.strictEqual(m.front[1].length, 4, 'Space starts a line, the arrows extend it, Space ends it'); assert.strictEqual(J(m.front[1][3]), J([530, 545]));
  pass('keyboard: focus shows a cursor, arrows move it, Enter places a dot, Space draws a line (no pointer needed)');

  // ---- saving, skipping, nurse view
  w = await boot('8-10' && '9-10'); toMap(w, ['stomach']); w.document.querySelectorAll('#app button').forEach(b => { if (/Skip drawing|تخطَّ الرسم/.test(b.textContent)) b.click(); });
  assert.strictEqual(ev(w, 'ST.step'), 2); assert(/Point to the face|أشر إلى الوجه/.test(txt(w)) && w.document.querySelectorAll('#app .faces button').length === 6, 'drawing is optional; the pain scale follows unchanged');
  ev(w, 'ST.pain=4;ST.step=5'); w.sendSym(); let r = ev(w, 'D.reports[D.reports.length-1]'); assert.strictEqual(r.bm, null, 'no marks means no body-map data');
  toMap(w, ['stomach']); gesture(w, [[100, 230]]); w.bmView('back'); gesture(w, [[90, 120], [100, 150], [110, 180]]); ev(w, 'ST.step=2;ST.pain=4;ST.step=5'); w.sendSym();
  r = ev(w, 'D.reports[D.reports.length-1]'); assert.strictEqual(r.bm.v, 1); assert.strictEqual(r.bm.fig, '9-10'); assert.strictEqual(r.bm.front.length, 1); assert.strictEqual(r.bm.back.length, 1);
  ev(w, 'ST.nok=1;ST.nt=2'); w.go('nurse'); const nurse = w.document.querySelector('#app'); const first = [...nurse.querySelectorAll('.card')].find(c => c.querySelector('figure'));
  assert(first, 'the nurse sees the body drawing'); assert(first.querySelectorAll('figure').length >= 1 && first.querySelector('polyline, circle[fill-opacity]'), 'marks are drawn on the figure'); assert(/not a diagnosis|ليس تشخيصًا/.test(nurse.textContent));
  const figCount = nurse.querySelectorAll('figure').length; assert(figCount >= 3, 'demo report (front) + new report (front and back): ' + figCount);
  pass('drawing is optional; with marks the report carries front/back vector marks for the child\'s age figure; the nurse view draws them next to the report');

  // ---- marks never change urgency and hostile state is cleaned
  w = await boot('9-10'); ev(w, 'ST.bm={view:"front",tool:"draw",front:[[[1e9,"x"],null,[5,5]],"bad"],back:[],touched:1}'); ev(w, 'ST.a=["head"];ST.pain=0;ST.h=["rest"];ST.q=null;ST.s=[]'); w.sendSym();
  r = ev(w, 'D.reports[D.reports.length-1]'); assert.strictEqual(J(r.bm.front), '[[[1000,0],[5,5]]]'); assert.strictEqual(ev(w, 'flagged(D.reports[D.reports.length-1])'), false, 'marks alone never flag a report');
  pass('hostile or malformed marks are rebuilt safely; drawing marks never raise a Little Signal by themselves');

  // ---- every health step, both languages, all ages
  for (const age of ['7-8', '9-10', '11-12']) { w = await boot(age); for (const lang of ['ar', 'en']) { if (ev(w, 'ST.lang') !== lang) w.L();
    for (let st = 0; st <= 6; st++) { w.go('health'); if (st >= 1) { ev(w, `ST.a=['stomach'];ST.step=${st}`); w.R(); } const bad = txt(w).match(/\b[a-z]{1,4}_[a-z0-9_]+\b|\bn_[a-z]+\b|\{[nlab]\}/g); assert(!bad, `${age}/${lang}/step ${st}: ${bad}`); if (st === 2) assert.strictEqual(w.document.querySelectorAll('#app .faces button').length, 6); } }
    assert.deepStrictEqual(w.__errs, [], age + ' script errors'); }
  pass('all seven My Health steps render in Arabic and English for every age with no missing translations and no script errors');
  console.log('ALL BODYMAP UI TESTS PASSED');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
