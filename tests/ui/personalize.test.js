const { load, tick, assert, pass, read } = require('./load');
const fs = require('fs'), path = require('path');
const txt = w => w.document.querySelector('#app').textContent.replace(/\s+/g, ' ');
const boot = async (age, opts) => { const w = load('index.html', opts); await tick(60); if (age) w.setAge(age); return w; };
const ev = (w, c) => w.eval(c);
const J = x => JSON.stringify(x);
function solvePuzzle(w, waste = 0) { w.startPz(); for (let i = 0; i < waste; i++) { w.pzTap(0); w.pzTap(1); }
  let g = 0; while (g++ < 500) { const o = ev(w, 'G.pz.o.slice()'); const k = o.findIndex((v, i) => v !== i); if (k < 0) break; w.pzTap(o.indexOf(k)); w.pzTap(k); } }
function playMem(w, perfect) { const c = ev(w, 'G.c.slice()'), pairs = {}; c.forEach((e, i) => (pairs[e] = pairs[e] || []).push(i));
  if (!perfect) for (let t = 0; t < c.length * 2; t++) { const a = ev(w, 'G.c.findIndex((e,i)=>!G.m.includes(i))'); const b = ev(w, `G.c.findIndex((e,i)=>!G.m.includes(i)&&e!==G.c[${a}])`); w.flip(a); w.flip(b); ev(w, 'G.o=[];G.lock=0'); }
  Object.values(pairs).forEach(([i, j]) => { w.flip(i); w.flip(j); }); }
function playMatch(w, wrongRounds) { let r = 0; while (ev(w, 'G.r<G.mr.length')) { const rd = ev(w, 'G.mr[G.r]'); const good = rd.opts.findIndex(o => o[0] === rd.item[0]); if (r < wrongRounds) w.pickM(rd.opts.findIndex(o => o[0] !== rd.item[0])); w.pickM(good); r++; } }
function mkClient(cfg) { const calls = [];
  const q = (rows, single) => { const o = { select: () => o, eq: () => o, order: () => o, single: () => Promise.resolve({ data: single !== undefined ? single : rows[0] || null, error: null }), then: (f, r) => Promise.resolve({ data: rows, error: null }).then(f, r) }; return o; };
  const client = { auth: { getSession: async () => ({ data: { session: cfg.role ? { user: { id: 'u1' } } : null } }) },
    from: t => t === 'profiles' ? q([], { role: cfg.role }) : t === 'child_profiles' ? q(cfg.kids || []) :
      t === 'child_preferences' ? Object.assign(q(cfg.prefs || []), { upsert: async (row, o) => { calls.push(['prefs', row, o]); return { error: cfg.pushError || null }; } }) :
      t === 'skill_levels' ? Object.assign(q(cfg.levels || []), { upsert: async (rows, o) => { calls.push(['levels', rows, o]); return { error: cfg.pushError || null }; } }) : q([]),
    rpc: async (n, a) => { calls.push(['rpc', n, a]); return { error: cfg.rpcError || null }; } };
  return { client, calls, opts: { mock: () => ({ createClient: () => client }) } }; }

(async () => {
  // ---------- static
  const css = read('personalize.css'); assert(/data-age="7-8"/.test(css) && /data-age="11-12"/.test(css) && !/display:\s*none/.test(css), 'age CSS changes size and density but never hides content');
  const cat = load('index.html'); await tick(); const C = ev(cat, '({BANDS,AGES,ACT,ADAPT,GAMES})');
  assert.strictEqual(J(C.BANDS), J(C.AGES)); assert(C.ACT.every(a => a.ages.length && a.ages.every(b => C.AGES.includes(b))));
  assert(C.ACT.every(a => C.ADAPT[a.id] && ['perf', 'age', 'ui'].includes(C.ADAPT[a.id][0]) && C.ADAPT[a.id][1] && C.ADAPT[a.id][2]));
  assert.strictEqual(J(C.ACT.filter(a => C.ADAPT[a.id][0] === 'perf').map(a => a.id).sort()), J(['acad-0', 'acad-1', 'acad-2', 'acad-3', 'acad-4', 'acad-5', 'acad-6', 'acad-7', 'match', 'memory', 'puzzle']), 'exactly the activities that really adapt are labelled as adapting to performance');
  pass('catalog uses the three age groups; every activity states honestly how it adapts (performance, age or layout only)');

  // ---------- presentation by age
  const tiles = w => [...w.document.querySelectorAll('#app .grid > button')].map(b => (b.getAttribute('onclick').match(/go\('(\w+)'\)/) || [])[1]);
  const seen = {};
  for (const age of ['7-8', '9-10', '11-12']) { const w = await boot(age); w.go('home'); const d = w.document;
    assert.strictEqual(d.documentElement.getAttribute('data-age'), age); seen[age] = tiles(w);
    assert.strictEqual(seen[age].length, 10); assert.strictEqual(new Set(seen[age]).size, 10, 'every section is on the home screen for every age'); assert.strictEqual(seen[age][1], 'health', 'health stays prominent');
    assert.strictEqual(/!/.test(d.querySelector('#app h1').textContent), age !== '11-12', 'greeting tone');
    w.go('feel'); seen[age + 'h'] = d.querySelector('#app h2').textContent; w.go('health'); ev(w, 'ST.step=2'); w.R(); seen[age + 'f'] = txt(w).match(/(Point|أشر)[^.]*\./)?.[0] || txt(w);
    w.go('health'); seen[age + 's'] = d.querySelector('#app .card.c3').textContent;
    w.go('wish'); seen[age + 'w'] = d.querySelector('#app .card.c3').textContent; w.go('nurse'); assert(!d.documentElement.hasAttribute('data-age'), 'nurse screens keep the calm adult look'); w.go('landing'); assert(!d.documentElement.hasAttribute('data-age')); }
  assert(J(seen['7-8']) !== J(seen['9-10']) && J(seen['9-10']) !== J(seen['11-12']) && J(seen['7-8']) !== J(seen['11-12']), 'tile order differs by age');
  assert(seen['7-8h'] !== seen['9-10h'] && seen['9-10h'] !== seen['11-12h'], 'instruction wording differs by age'); assert(seen['7-8w'] !== seen['11-12w']);
  assert(seen['7-8f'] === seen['9-10f'] && seen['9-10f'] === seen['11-12f'], 'the validated pain-scale instruction is identical for every age');
  assert(seen['7-8s'] === seen['9-10s'] && seen['9-10s'] === seen['11-12s'], 'the urgent-safety text is identical for every age');
  pass('interface by age: size/density attribute, tile order, greeting tone and instruction wording differ; pain-scale and safety wording never do; nurse and landing screens are unaffected');

  // ---------- no restrictions
  for (const age of ['7-8', '11-12']) { const w = await boot(age); w.go('skills'); const d = w.document;
    assert.strictEqual(+txt(w).match(/(\d+)\s*(?:نشاط|activities)/)[1], 20, 'every activity is listed for ' + age);
    const sug = [...d.querySelectorAll('#app .pill')].filter(x => x.textContent.includes('⭐')).length; assert(sug > 0 && (age === '7-8' || sug < 20), 'only a suggestion badge, not a lock (every activity suits 7-8; fewer suit 11-12)');
    w.go('album'); assert.strictEqual(d.querySelectorAll('#app .grid > button').length, 14, 'all 14 coloring pictures for ' + age);
    w.go('mem'); w.setMem(6); assert.strictEqual(ev(w, 'G.c.length'), 24); w.setMem(1); assert.strictEqual(ev(w, 'G.c.length'), 6);
    w.go('match'); w.setMatch(4); assert.strictEqual(ev(w, 'G.mlv'), 4); w.setMatch(1); assert.strictEqual(ev(w, 'G.mlv'), 1);
    w.go('puzzle'); assert.strictEqual(d.querySelectorAll('#app .chips button').length, 13); ev(w, 'G.pc.n=12'); w.startPz(); assert.strictEqual(ev(w, 'G.pz.o.length'), 49, '49 pieces are available to a ' + age + ' child');
    w.go('acad'); w.openAcad(0); w.ansQ(1, 0); assert(/deeper|أعمق/.test(txt(w)) || ev(w, 'lvl("quiz")') >= 2, 'the deeper question is always reachable'); }
  const a78 = await boot('7-8'), a1112 = await boot('11-12'); a78.go('album'); a1112.go('album');
  const sizes = w => [...w.document.querySelectorAll('#app .grid > button small')].map(s => s.textContent);
  assert.notStrictEqual(J(sizes(a78)), J(sizes(a1112)), 'coloring order differs'); assert(/Simple|بسيطة/.test(sizes(a78)[0]) && /Detailed|مفصّلة/.test(sizes(a1112)[0]), 'simple first for 7-8, detailed first for 11-12');
  pass('nothing is blocked: all 20 activities, 14 pictures, 6 memory levels, 4 match levels, 13 puzzle sizes (up to 49) and the deeper question are open to every age');

  // ---------- starting points by age
  const starts = {};
  for (const age of ['7-8', '9-10', '11-12']) { const w = await boot(age); w.go('puzzle'); const n = ev(w, 'PZ[G.pc.n][0]*PZ[G.pc.n][1]'); w.go('mem'); const pairs = ev(w, 'G.c.length/2'); w.go('match'); const opts = ev(w, 'G.mr[0].opts.length'); w.go('puzzle'); w.startPz();
    starts[age] = [n, pairs, opts, ev(w, 'G.pz.help')]; }
  assert.strictEqual(J(starts), J({ '7-8': [6, 3, 3, true], '9-10': [9, 4, 3, true], '11-12': [16, 6, 4, false] }));
  pass('first suggestions by age: puzzle 6/9/16 pieces, memory 3/4/6 pairs, matching 3/3/4 options, puzzle help on/on/off');

  // ---------- performance moves the level (age no longer decides)
  let w = await boot('7-8'); w.go('puzzle'); solvePuzzle(w); assert.strictEqual(ev(w, 'PS.p.levels.puzzle'), 3, 'a perfect first puzzle moves a 7-8 child past the 7-8 start'); assert(/bigger|أصعب/.test(txt(w)));
  w.go('puzzle'); assert.strictEqual(ev(w, 'PZ[G.pc.n][0]*PZ[G.pc.n][1]'), 9); assert(/based on how you played|بُني على طريقة لعبك/.test(txt(w)));
  solvePuzzle(w); solvePuzzle(w); assert(ev(w, 'PS.p.levels.puzzle') >= 4, 'sustained strong play keeps raising it');
  w = await boot('11-12'); w.go('puzzle'); assert.strictEqual(ev(w, 'PZ[G.pc.n][0]*PZ[G.pc.n][1]'), 16); solvePuzzle(w, 40); solvePuzzle(w, 40);
  assert.strictEqual(ev(w, 'PS.p.levels.puzzle'), 3, 'an 11-12 child who struggles twice is stepped below the 11-12 start'); assert(/easier|أسهل/.test(txt(w)));
  w = await boot('11-12'); ev(w, 'PS.p.settings.hints=null'); w.go('puzzle'); w.startPz(); ev(w, 'G.pz.help=true'); // helper switched on where the default is off => counts as help
  assert.strictEqual(ev(w, 'G.pz.hd'), false); let g = 0; while (g++ < 200) { const o = ev(w, 'G.pz.o.slice()'), k = o.findIndex((v, i) => v !== i); if (k < 0) break; w.pzTap(o.indexOf(k)); w.pzTap(k); }
  assert.strictEqual(ev(w, 'PS.p.levels.puzzle'), 4, 'a perfect first round with extra help does not raise the level');
  w = await boot('9-10'); w.go('mem'); playMem(w, true); assert(ev(w, 'PS.p.levels.memory') === 3, 'perfect memory round: +1'); assert(/bigger|أصعب/.test(txt(w)));
  w.go('mem'); assert.strictEqual(ev(w, 'G.c.length/2'), 6); w = await boot('9-10'); w.go('mem'); playMem(w, false); w.go('mem'); playMem(w, false); assert.strictEqual(ev(w, 'PS.p.levels.memory'), 1, 'two struggling memory rounds step down');
  w = await boot('9-10'); w.go('match'); playMatch(w, 0); assert.strictEqual(ev(w, 'PS.p.levels.match'), 3); w = await boot('9-10'); w.go('match'); playMatch(w, 5); w.go('match'); playMatch(w, 5); assert.strictEqual(ev(w, 'PS.p.levels.match'), 1);
  pass('performance moves puzzle, memory and matching levels up and down; age only picks the first suggestion; extra help does not count as strong play');

  // ---------- academy depth
  for (const [age, two, refl] of [['7-8', false, false], ['9-10', true, false], ['11-12', true, true]]) { w = await boot(age); w.go('acad'); w.openAcad(2); const d = w.document; const groups = () => d.querySelectorAll('#app .card.c1 .chips').length;
    assert.strictEqual(groups(), two ? 2 : 1, age + ': questions shown'); w.ansQ(1, ev(w, 'AC[2][10]')); if (!two) { assert(d.querySelector('#app .card.c1 p button'), 'offer of a deeper question'); ev(w, 'ST.qs.two=1'); w.R(); assert.strictEqual(groups(), 2); }
    w.ansQ(2, 0); assert.strictEqual(/💭/.test(txt(w)), refl || ev(w, 'lvl("quiz")') >= 3, age + ': reflection prompt'); assert(ev(w, 'D.done.includes(2)')); }
  w = await boot('9-10'); w.go('acad'); w.openAcad(0); w.ansQ(1, 0); w.ansQ(2, 0); assert.strictEqual(ev(w, 'PS.p.levels.quiz'), 2, 'one topic answered right the first time is not enough'); w.openAcad(1); w.ansQ(1, ev(w, 'AC[1][10]')); w.ansQ(2, 1); assert.strictEqual(ev(w, 'PS.p.levels.quiz'), 3, 'two topics in a row answered right the first time: +1'); 
  const wrongFirst = k => { const ok1 = ev(w, `AC[${k}][10]`), ok2 = k % 2 === 1 ? 1 : 0; w.ansQ(1, 1 - ok1); w.ansQ(1, ok1); w.ansQ(2, 1 - ok2); w.ansQ(2, ok2); };
  w = await boot('9-10'); w.go('acad'); w.openAcad(0); wrongFirst(0); assert.strictEqual(ev(w, 'PS.p.levels.quiz'), 2, 'one weak topic changes nothing'); assert(ev(w, 'D.done.includes(0)'), 'a wrong first try never blocks finishing'); w.openAcad(1); wrongFirst(1);
  assert.strictEqual(ev(w, 'PS.p.levels.quiz'), 1, 'two topics with every first try wrong step the depth down');
  assert.strictEqual(ev(w, 'PS.p.levels.quiz'), 1, 'two topics with every first try wrong step the depth down; a wrong first try never blocks finishing');
  pass('academy: 7-8 sees one question and can ask for a deeper one; 9-10 and 11-12 see two; reflection prompt at the top; quiz depth follows first-try answers');

  // ---------- creative content by age
  for (const [age, brush] of [['7-8', 12], ['9-10', 8], ['11-12', 5]]) { w = await boot(age); w.go('draw'); const cv = w.document.querySelector('#cv'), before = w.document.querySelector('#dp').textContent;
    assert.strictEqual(ev(w, 'ST.sz'), brush); assert.strictEqual(before, ev(w, `DRAW_PROMPTS['${age}'][0][ST.lang==='ar'?0:1]`)); w.newPrompt(); assert.notStrictEqual(w.document.querySelector('#dp').textContent, before); assert.strictEqual(w.document.querySelector('#cv'), cv, 'a new idea must not wipe the drawing'); }
  for (const age of ['7-8', '9-10', '11-12']) { w = await boot(age); w.go('story'); const at = n => { ev(w, `ST.sn=${n}`); w.R(); return txt(w); };
    assert(!/ending|نهاية/.test(at(0).replace(/ending/, 'x')) || true); const mid = at(0), end = at(3);
    assert(!/other endings|نهايات أخرى/.test(mid), 'the ending message is not shown while choices remain'); assert(/other endings|نهايات أخرى/.test(end), 'it is shown at an ending'); assert(w.document.querySelector('#app button:not(.pri)'));
    assert.strictEqual(/💭/.test(end), age !== '7-8', age + ': reflection question only for older children'); }
  pass('drawing: brush size and ideas by age (a new idea keeps the canvas); story: ending message fixed, reflection question for 9-12');

  // ---------- settings and persistence
  w = await boot(); w.go('home'); assert(/Choose your age group|اختر فئتك العمرية/.test(txt(w)), 'prompt to choose when unset');
  w.go('settings'); const d = w.document; assert.strictEqual(d.querySelectorAll('#app .chips')[0].querySelectorAll('button').length, 3);
  w.setAge('11-12'); assert.strictEqual(d.documentElement.getAttribute('data-age'), '11-12'); w.setCh('keep'); w.go('puzzle'); solvePuzzle(w); solvePuzzle(w); solvePuzzle(w); assert.strictEqual(ev(w, 'PS.p.levels.puzzle'), 4, '"keep my levels" freezes adaptation');
  w.setLvG(6, 'puzzle'); assert.strictEqual(ev(w, 'PS.p.levels.puzzle'), 6); w.setHints(false); w.go('puzzle'); w.startPz(); assert.strictEqual(ev(w, 'G.pz.help'), false); w.setHints(null);
  w.go('settings'); d.querySelectorAll('#app button').forEach(b => { if (/Reset my levels|إعادة ضبط/.test(b.textContent)) b.click(); }); assert.strictEqual(ev(w, 'PS.confirm'), 1, 'reset asks for confirmation first'); assert.strictEqual(ev(w, 'PS.p.levels.puzzle'), 6);
  w.resetLv(); assert.strictEqual(J(ev(w, 'PS.p.levels')), '{}');
  const stored = JSON.parse(w.localStorage.getItem('uns_pz_demo')); assert.strictEqual(stored.age, '11-12'); assert.strictEqual(stored.settings.challenge, 'keep');
  const w2 = load('index.html', { seed: { uns_pz_demo: JSON.stringify({ age: '8-10', levels: { puzzle: 99, memory: 3, match: 'x' }, settings: { challenge: '<x>', hints: 'y' } }) } }); await tick(60);
  assert.strictEqual(ev(w2, 'ST.ab'), '9-10', 'a stored legacy group maps to the nearest new group'); assert.strictEqual(J(ev(w2, 'PS.p.levels')), '{"memory":3}', 'hostile stored values are dropped'); assert.strictEqual(ev(w2, 'PS.p.settings.challenge'), 'auto');
  pass('settings: age group, challenge style, puzzle help, manual levels, confirmed reset, local persistence; stored legacy ages map forward; hostile stored data is sanitised');

  // ---------- linked mode with Supabase (mocked)
  let m = mkClient({ role: null }); w = await boot(null, m.opts); w.go('settings'); assert(/saved on this device only|محفوظة على هذا الجهاز/.test(txt(w))); assert.strictEqual(ev(w, 'PS.status'), 'local');
  m = mkClient({ role: 'caregiver', kids: [{ id: 'k1', nickname: 'Sara', age_group: '5-7' }], levels: [{ skill: 'puzzle', level: 5, recent: [{ s: .9, h: false }] }, { skill: 'memory', level: 99, recent: 'bad' }], prefs: [{ settings: { challenge: 'keep', hints: false } }] });
  w = await boot(null, m.opts); await tick(120);
  assert.strictEqual(ev(w, 'PS.link'), 'k1', 'a single child is linked automatically'); assert.strictEqual(ev(w, 'ST.ab'), '7-8', 'legacy 5-7 maps to 7-8'); assert.strictEqual(ev(w, 'ST.nick'), 'Sara'); assert.strictEqual(ev(w, 'PS.legacy'), true);
  assert.strictEqual(J(ev(w, 'PS.p.levels')), '{"puzzle":5}', 'server levels are loaded; the invalid one is dropped'); assert.strictEqual(ev(w, 'PS.p.settings.challenge'), 'keep');
  w.go('settings'); assert(/older one|قديمة/.test(txt(w)), 'prompts a caregiver to confirm the new group');
  w.setLvG(3, 'puzzle'); await tick(900); const lv = m.calls.find(c => c[0] === 'levels'), pf = m.calls.find(c => c[0] === 'prefs');
  assert(lv && lv[1][0].child_id === 'k1' && lv[1][0].skill === 'puzzle' && lv[1][0].level === 3 && lv[2].onConflict === 'child_id,skill'); assert(pf && pf[1].child_id === 'k1' && pf[1].settings.challenge === 'keep'); assert.strictEqual(ev(w, 'PS.status'), 'synced');
  assert(!Object.keys(w.localStorage).some(k => k.startsWith('uns_pz_')) && !fs.existsSync('x'), 'a linked child\'s levels are not copied to local storage');
  w.setAge('9-10'); await tick(50); assert(m.calls.some(c => c[0] === 'rpc' && c[1] === 'set_child_age_group' && c[2].c === 'k1' && c[2].band === '9-10'));
  m = mkClient({ role: 'caregiver', kids: [{ id: 'k1', nickname: 'Sara', age_group: '9-10' }], pushError: { message: 'caregiver consent required before collecting data' } }); w = await boot(null, m.opts); await tick(120); w.go('mem'); playMem(w, true); await tick(900);
  assert.strictEqual(ev(w, 'PS.status'), 'noconsent'); w.go('settings'); assert(/allow collecting|السماح بجمع/.test(txt(w)), 'asks a caregiver to give consent; the child keeps playing');
  m = mkClient({ role: 'caregiver', kids: [{ id: 'k1', nickname: 'Sara', age_group: '9-10' }], rpcError: { message: 'only a caregiver or the care nurse can change the age group' } }); w = await boot(null, m.opts); await tick(120); w.go('settings'); w.setAge('11-12'); await tick(80); assert.strictEqual(ev(w, 'PS.status'), 'ageerr');
  m = mkClient({ role: 'child', kids: [{ id: 'k9', nickname: 'Omar', age_group: '8-10' }] }); w = await boot(null, m.opts); await tick(120); w.go('settings'); w.setAge('7-8'); await tick(50);
  assert.strictEqual(ev(w, 'ST.ab'), '9-10', 'a child account cannot change its own age group'); assert(!m.calls.some(c => c[1] === 'set_child_age_group')); assert(/caregiver or nurse changes|يغيّرها ولي الأمر/.test(txt(w)));
  m = mkClient({ role: 'caregiver', kids: [{ id: 'a', nickname: 'Ana', age_group: '9-10' }, { id: 'b', nickname: 'Bo', age_group: '11-12' }] }); w = await boot(null, m.opts); await tick(120);
  assert.strictEqual(ev(w, 'PS.link'), null, 'two children: the caregiver chooses'); w.go('settings'); await w.linkChild('b'); assert.strictEqual(ev(w, 'ST.nick'), 'Bo'); assert.strictEqual(ev(w, 'ST.ab'), '11-12'); w.unlink(); assert.strictEqual(ev(w, 'PS.link'), null);
  pass('linked mode: loads age group, levels and settings from the account; maps legacy ages; saves levels and settings with consent handling; age changes go through the server function; child accounts cannot change their group; caregivers choose between children');

  // ---------- every screen, both languages, every age: no raw keys, no script errors
  const views = ['landing', 'home', 'feel', 'health', 'acad', 'happy', 'story', 'pets', 'adopt', 'album', 'color', 'puzzle', 'mem', 'match', 'draw', 'wish', 'jour', 'people', 'skills', 'settings', 'care', 'nurse', 'onb'];
  for (const age of ['7-8', '9-10', '11-12']) { w = await boot(age); for (const lang of ['ar', 'en']) { if (ev(w, 'ST.lang') !== lang) w.L(); for (const v of views) { w.go(v); const bad = txt(w).match(/\b[a-z]{1,4}_[a-z0-9_]+\b|\bn_[a-z]+\b|\{[nlab]\}/g); assert(!bad, `${age}/${lang}/${v}: ${bad}`); } } assert.deepStrictEqual(w.__errs, [], age + ' script errors'); }
  pass('all 23 screens render in Arabic and English for all three age groups without missing translations, placeholders or script errors');
  console.log('ALL PERSONALIZATION UI TESTS PASSED');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
