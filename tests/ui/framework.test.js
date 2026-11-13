const { load, tick, assert, pass, read } = require('./load');
(async () => {
  const w = load('index.html'); const d = w.document; await tick();
  const cat = w.eval('({DIMS,OBJ,ACT,TYPES,BANDS,AC})'); const { DIMS, OBJ, ACT, TYPES, BANDS } = cat; const AC = cat.AC;
  // ---- catalog integrity: real objectives, consistent classification
  assert.strictEqual(DIMS.length, 5); assert.strictEqual(Object.keys(OBJ).length, 34);
  for (const d of DIMS) assert(Object.values(OBJ).some(o => o[0] === d[0]), 'dimension ' + d[0] + ' has objectives');
  const ids = new Set();
  for (const a of ACT) {
    assert(!ids.has(a.id), 'unique id ' + a.id); ids.add(a.id);
    assert(a.objs.length >= 1 && a.objs.every(o => OBJ[o]), a.id + ': objectives exist');
    const derived = new Set(a.objs.map(o => OBJ[o][0])); assert.strictEqual([...derived].sort().join(), [...a.dims].sort().join(), a.id + ': dimensions are derived from objectives');
    assert(a.dims[0] === a.pri && derived.has(a.pri), a.id + ': primary dimension is backed by an objective');
    assert(a.ages.length >= 1 && a.ages.every(b => BANDS.includes(b)), a.id + ': age bands valid');
    assert(TYPES.some(t => t[0] === a.type), a.id + ': type valid');
    assert(a.t[0].length > 1 && a.t[1].length > 1 && a.how[0].length > 10 && a.how[1].length > 10, a.id + ': bilingual title and description');
    assert(!/\b(scor\w*|assess\w*|diagnos\w*|rating|grade)\b|تقييم|درجة|تشخيص/i.test(a.how[1] + ' ' + a.how[0]), a.id + ': no assessment language');
  }
  pass(`catalog: ${ACT.length} activities, 34 objectives; dimensions derived from objectives; bilingual descriptions; no assessment language`);
  for (const d of DIMS) assert(ACT.some(a => a.dims.includes(d[0])), d[0] + ' has activities');
  assert(ACT.filter(a => a.dims.length > 1).length >= 12, 'most activities support more than one dimension');
  for (const k of AC.keys()) { const a = ACT.find(x => x.id === 'acad-' + k); assert(a && a.acad === k && a.t[0] === AC[k][2] && a.t[1] === AC[k][3], 'academy topic ' + k + ' is classified with a matching title'); }
  pass('every dimension is used; ' + ACT.filter(a => a.dims.length > 1).length + ' activities span several dimensions; all 8 academy topics classified with matching titles');

  // ---- nothing removed
  for (const v of ['mem', 'match', 'puzzle', 'pzplay', 'album', 'color', 'draw', 'story', 'feel', 'health', 'acad', 'wish', 'people', 'pets', 'adopt', 'petcare', 'jour', 'happy', 'care', 'nurse']) assert(w.eval(`typeof V.${v}`) === 'function', v + ' still exists');
  for (const [v, id] of Object.entries({ mem: 'memory', match: 'match', puzzle: 'puzzle', album: 'coloring', draw: 'drawing', story: 'story', feel: 'feelings', health: 'health', wish: 'wishes', people: 'people', pets: 'pets', jour: 'journey' })) { w.eval(`ST.view='${v}'`); assert.strictEqual(w.actOfView(), id, v + ' maps to ' + id); }
  pass('all existing activities still exist and each screen maps to a classified activity');

  // ---- library UI
  w.go('skills'); const cards = () => d.querySelectorAll('#app > .card:not(.c3):not(.c4)').length;
  assert.strictEqual(w.eval('ST.skf.a'), '', 'no age chosen shows all ages');
  const total = () => { const m = d.querySelector('#app').textContent.match(/(\d+)\s*(?:نشاط|activities)/); return +m[1]; };
  assert.strictEqual(total(), 20);
  w.skf('d', 'phy'); const phy = total(); assert(phy > 0 && phy < 20); assert(w.eval('ACT.filter(a=>a.dims.includes("phy")).length') === phy);
  w.skf('o', 'finemotor'); assert(total() <= phy && total() > 0); w.skf('o', 'finemotor'); assert.strictEqual(total(), phy, 'objective chip toggles off');
  w.skf('d', 'soc'); w.skf('o', 'friendship'); assert.strictEqual(total(), 0); assert(/لا توجد|No activities/.test(d.querySelector('#app').textContent), 'empty state is explained');
  w.skf('d', ''); w.skf('a', '7-8'); const a57 = total(); w.skf('a', '11-12'); const a1112 = total(); assert(a57 > a1112 && a1112 > 0, 'age filter narrows the list');
  w.skf('a', ''); w.skf('t', 'game'); assert.strictEqual(total(), 3); w.skf('t', '');
  const gaps = Object.keys(OBJ).filter(k => !ACT.some(a => a.objs.includes(k))); assert(gaps.length > 0);
  assert.strictEqual(d.querySelectorAll('details .pill').length, gaps.length, 'coverage map shows every uncovered objective as a gap');
  pass('filters by dimension, objective, age and type work; empty state explained; coverage map lists the real gaps (' + gaps.length + ')');

  // ---- balanced set integrates all five dimensions for every age band
  for (const b of BANDS) { w.eval(`ST.skf={d:'',a:'${b}',t:'',o:''}`); const set = w.balancedSet(); assert.strictEqual(set.length, 5, b); assert.strictEqual(new Set(set.map(x => x[1].id)).size, 5, 'five different activities'); for (const [dim, a] of set) { assert(a.dims.includes(dim) && a.ages.includes(b)); } }
  pass('the balanced daily set offers 5 different, age-appropriate activities, one per dimension, for every age band');

  // ---- launch + strip + tried
  w.go('home'); assert(!d.querySelector('#app details'), 'no strip on the home screen');
  w.launch('puzzle'); assert.strictEqual(w.eval('ST.view'), 'puzzle'); assert(d.querySelector('#app details'), 'puzzle shows what it builds');
  w.launch('acad-4'); assert.strictEqual(w.eval('ST.view') + w.eval('ST.top'), 'acad4'); assert(/regulation|تنظيم المشاعر/i.test(d.querySelector('#app details').textContent));
  w.go('skills'); assert(/✓/.test(d.querySelector('#app').textContent), 'tried activities are marked, without scores');
  assert(!/%|\/\s*\d+\s*(?:activities|نشاط)/.test(d.querySelector('#app').textContent.replace(/\(\d+–\d+[^)]*\)/g, '')), 'no percentages or progress scores');
  assert.deepStrictEqual(w.__errs, []);
  pass('launch opens the right screen (including academy topics); each activity shows what it builds; tried marks without scores');
  console.log('ALL FRAMEWORK TESTS PASSED');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
