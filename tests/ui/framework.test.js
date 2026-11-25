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

  // ---- parents area: skills tab (the old child-side library moved here)
  w.eval('ST.cok=1'); w.go('care'); w.eval("ST.ct='skl'"); w.R();
  assert(d.querySelector('.skl'), 'skills tab exists in the parents area'); assert.strictEqual(d.querySelectorAll('.skl .hl-card').length, 5, 'five skill areas');
  const gaps = Object.keys(OBJ).filter(k => !ACT.some(a => a.objs.includes(k))); assert(gaps.length > 0);
  assert.strictEqual(d.querySelectorAll('.skl details .pill').length, gaps.length, 'the team coverage map still lists every uncovered objective as a gap');
  w.go('home'); assert(![...d.querySelectorAll('#app .grid > button.nav')].some(b => /skills/.test(b.getAttribute('onclick'))), 'no skills tile for the child');
  w.go('skills'); assert.strictEqual(w.eval('ST.view'), 'home', 'the old route goes home');
  pass('skills moved to the parents area; coverage map kept for the team (' + gaps.length + ' gaps); child home has no skills tile');

  // ---- suggestions: five different age-appropriate activities for every age band, never from private areas
  for (const b of BANDS) { w.eval(`ST.ab='${b}'`); w.eval('D.focus=[]'); const set = w.eval('sklPick(5)'); assert.strictEqual(new Set(set.map(x => x.id)).size, 5, b + ': five different activities'); for (const a of set) assert(a.ages.includes(b) && !w.eval('SKL_EX').includes(a.id)); }
  pass('suggestions are 5 different, age-appropriate activities for every age band, never from private areas');

  // ---- launch + strip + tried
  w.eval('ST.cok=0'); w.go('home'); assert(!d.querySelector('#app details'), 'no strip on the home screen');
  w.launch('puzzle'); assert.strictEqual(w.eval('ST.view'), 'puzzle'); assert(!d.querySelector('#app details'), 'the child does not see the builder box');
  w.eval('ST.cok=1'); w.launch('puzzle'); assert(d.querySelector('#app details'), 'parents see what puzzle builds');
  w.launch('acad-4'); assert.strictEqual(w.eval('ST.view') + w.eval('ST.top'), 'acad4'); assert(/regulation|تنظيم المشاعر/i.test(d.querySelector('#app details').textContent));
  assert(w.eval('D.tried.has("puzzle")'), 'tried activities are remembered, without scores');
  assert.deepStrictEqual(w.__errs, []);
  pass('launch opens the right screen (including academy topics); parents see what each activity builds; tried is remembered without scores');
  console.log('ALL FRAMEWORK TESTS PASSED');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
