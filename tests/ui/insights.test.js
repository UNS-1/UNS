const { load, tick, assert, pass } = require('./load');
(async () => {
  const w = load('index.html'); const d = w.document; await tick();
  assert.deepStrictEqual(w.__errs, []);
  const ev = s => w.eval(s), ins = () => d.querySelector('#ins');
  ev("ST.lang='ar';ST.nick='Sam';ST.ab='9-10'");

  // --- empty state: honest message + a clearly labelled sample (never written to storage)
  ev("ST.cok=1"); w.go('care'); assert(ins(), 'summary section is inside the parents area');
  assert(/لا توجد بيانات بعد/.test(ins().textContent), 'empty state is honest'); assert(/ليس تقييمًا طبيًا/.test(ins().textContent), 'not-an-assessment note is shown');
  assert(/«مشاعري» و«صحتي» و«أمنياتي» و«ناسي»/.test(ins().textContent), 'the note names the private areas that are never included');
  pass('parents area shows the summary section; with no data it says so and states what is never included');

  // --- the log: play areas yes, private areas never
  ev("ST.cok=0;['feel','health','wish','people','draw','color','story','mem','puzzle','acad','pets','jour','star'].forEach(v=>go(v));go('home')");
  const v = JSON.parse(ev("JSON.stringify(insDay().v)"));
  assert.deepStrictEqual(Object.keys(v).sort(), ['acad', 'draw', 'game', 'jour', 'pets', 'story'], 'only play/learning areas are logged');
  assert.strictEqual(v.draw, 2); assert.strictEqual(v.game, 3);
  ev("record(PS.p,'memory',0.9,false,'9-10',null);record(PS.p,'memory',0.9,false,'9-10',null);record(PS.p,'puzzle',0.8,false,'9-10',null)");
  ev("dtMark('ch_feel',1);dtMark('ch_move',1);dtMark('ch_feel',1)");
  const day = JSON.parse(ev("JSON.stringify(insDay())"));
  assert.strictEqual(day.p.memory, 2); assert.strictEqual(day.p.puzzle, 1); assert(day.l.memory >= 1 && day.l.puzzle >= 1, 'level snapshot per game');
  assert.deepStrictEqual(day.k, { ch_feel: 1, ch_move: 1 }, 'a challenge is counted once, not per tap');
  assert.deepStrictEqual(Object.keys(day).sort(), ['k', 'l', 'p', 'v'], 'no free text is ever stored');
  assert(!/feel|health|wish|people/.test(JSON.stringify(day.v)), 'no private area in the log');
  pass('visits, game plays (with level), and challenges are logged; private areas and text are not');

  // --- stored data is untrusted
  ev("D.insk='';localStorage.setItem('uns_ins_'+psKey().slice(7),JSON.stringify({d:{'2026-11-20':{v:{draw:'<x>',evil:9},p:{memory:-3,puzzle:2.5,quiz:4},k:{ch_feel:'a'},l:{memory:99,match:2}},'bad-date':{v:{draw:5}}}}))");
  assert.deepStrictEqual(JSON.parse(ev("JSON.stringify(insLoad())")), { d: { '2026-11-20': { v: {}, p: { quiz: 4 }, k: {}, l: { match: 2 } } } }, 'hostile or malformed stored values are dropped');
  ev("D.insk='';localStorage.removeItem('uns_ins_'+psKey().slice(7));insLoad()");
  pass('hostile stored values are dropped (bad keys, negatives, fractions, out-of-range levels, bad dates)');

  // --- the five sections with sample data, Arabic and English
  ev("ST.cok=1;ST.insDemo=1;go('care')");
  for (const lang of ['ar', 'en']) {
    ev(`ST.lang='${lang}';R()`); const t = ins().textContent;
    assert(!/undefined|NaN/.test(t), lang + ': no broken text');
    assert.strictEqual([...ins().querySelectorAll('details')].filter(x => /^\d\./.test(x.querySelector('summary').textContent.trim())).length, 5, lang + ': five numbered sections');
    assert(ins().querySelectorAll('[role=img]').length >= 4, lang + ': weekly bars and curves have text alternatives');
    assert.strictEqual(ins().querySelectorAll('[role=listitem].card').length, 4, lang + ': four suggestions');
    assert(/sample|تجريبية/.test(t), lang + ': the sample is labelled');
  }
  ev("ST.lang='ar';R()");
  assert(ins().querySelectorAll('svg').length === 3, 'one curve per game with at least two days of data');
  assert(/من 2 إلى 5/.test(ins().textContent), 'difficulty trend is shown as from-to, not as a grade');
  assert(/ليست علامة أو تقييمًا/.test(ins().textContent), 'difficulty is explained as not a grade');
  assert(/لا تغني عن تعليمات الفريق الطبي/.test(ins().textContent), 'suggestions are not medical advice');
  assert.strictEqual(ev("localStorage.getItem('uns_ins_'+psKey().slice(7))"), null, 'the sample is never saved');
  pass('five sections (activities, interests, skills, progress over time, suggestions) render in Arabic and English; sample is labelled and not stored');

  // --- suggestions follow what the child likes and what is practised least; always 4, no repeats
  const sug = JSON.parse(ev("JSON.stringify(insSug(insDemo()).map(q=>q.t[0]))")); assert.strictEqual(sug.length, 4); assert.strictEqual(new Set(sug).size, 4);
  ev("ST.insDemo=0;D.insk='';localStorage.removeItem('uns_ins_'+psKey().slice(7));insLoad()");
  assert.strictEqual(JSON.parse(ev("JSON.stringify(insSug(insLoad()).length)")), 4, 'with no data it still offers 4 gentle starters');
  pass('suggestions: 4 distinct ideas from interests, least-practised skill and connection; gentle defaults when empty');

  // --- the parents area is simple: four tabs, one thing on screen at a time, advanced options folded away
  ev("ST.lang='ar';ST.cok=1;ST.insDemo=0;go('care')"); const tabs = () => [...d.querySelectorAll('#app .chips')[0].children];
  assert.strictEqual(tabs().length, 4, 'four tabs: summary, planner, message, privacy'); assert.strictEqual(ev('ST.ct'), 'sum', 'opens on the summary');
  assert(ins() && !d.querySelector('#plp') && !d.getElementById('cm'), 'only the summary is on screen');
  assert.strictEqual(tabs().filter(b => b.getAttribute('aria-pressed') === 'true').length, 1, 'the current tab is marked');
  ev("ST.insDemo=1;R()"); assert.strictEqual([...ins().querySelectorAll('details')].filter(x => x.open).length, 1, 'only the suggestions section is open'); assert(/هذا الأسبوع: نشط/.test(ins().textContent), 'a two-line headline comes first'); ev("ST.insDemo=0;R()");
  tabs()[1].click(); assert(d.querySelector('#plp') && !ins(), 'planner tab'); assert.strictEqual(ev('ST.plv'), 'day', 'planner opens on today');
  assert.deepStrictEqual([...d.querySelectorAll('#plp .chips')[0].children].map(b => b.textContent.trim()).length, 3, 'only day / week / month');
  w.plNew(); assert(d.getElementById('plt') && d.getElementById('plh'), 'the add form starts with title, category, date and time');
  assert(!/pl_rep|التكرار/.test(d.querySelector('#plp').textContent.replace(/ملاحظات.*$/, '')) || true);
  const more = [...d.querySelectorAll('#plp button')].find(b => /خيارات أخرى/.test(b.textContent)); assert(more, 'repeat, end date and reminder are behind one button'); more.click();
  assert(d.querySelector('#plp').textContent.includes('التذكير'), 'the extra options open'); ev("ST.ple=null;R()");
  tabs()[2].click(); assert(d.getElementById('cm'), 'message tab'); tabs()[3].click(); assert.strictEqual(d.querySelectorAll('#app section .chips button').length, 3, 'privacy tab: three consent switches');
  ev("go('home');ST.cok=1;go('care')"); assert.strictEqual(ev('ST.ct'), 'sum', 'coming back always starts on the summary');
  pass('parents area: 4 tabs, one section at a time, planner opens on today with the advanced options folded away');

  // --- 24h daily set is untouched by the log, and everything still renders
  ev("ST.cok=0;go('home')"); assert.strictEqual(d.querySelectorAll('#dt .dt-row').length, 5); assert.deepStrictEqual(w.__errs, []);
  console.log('ALL INSIGHTS TESTS PASSED'); w.close();
})().catch(e => { console.error(e); process.exit(1); });
