const { load, tick, assert, pass, read } = require('./load');
(async () => {
  // --- static hygiene
  const idx = read('index.html'), app = read('app.html');
  for (const [n, h] of [['index.html', idx], ['app.html', app]]) {
    assert(!/fonts\.googleapis|fonts\.gstatic/.test(h), n + ' must not call Google Fonts');
    assert(/Content-Security-Policy/.test(h), n + ' needs a CSP meta tag');
    assert(/name="description"/.test(h) && /rel="icon"/.test(h), n + ' needs description and icon');
  }
  assert(!/nurseOld|function addN\(|\balert\(/.test(idx), 'dead code and alert() removed');
  pass('no third-party font requests; CSP, description and icon present; dead code and alert() removed');

  let w = load('index.html'); let d = w.document; await tick();
  assert.deepStrictEqual(w.__errs, []); assert.strictEqual(w.eval('ST.view'), 'landing');
  // --- routing
  w.go('album'); assert.strictEqual(w.location.hash, '#album');
  w.go('puzzle'); w.location.hash = '#album'; await tick(); assert.strictEqual(w.eval('ST.view'), 'album', 'hashchange (Back button) restores the view');
  w.location.hash = '#nonsense'; await tick(); assert.strictEqual(w.eval('ST.view'), 'landing');
  w.location.hash = '#petcare'; await tick(); assert.strictEqual(w.eval('ST.view'), 'pets', 'a state-dependent view falls back to its parent');
  w.location.hash = '#pzplay'; await tick(); assert.strictEqual(w.eval('ST.view'), 'puzzle');
  pass('URL routing: go() sets the hash, Back restores views, bad or state-less routes fall back safely');

  // --- themes
  w.go('home'); assert.strictEqual(d.querySelectorAll('#th .dot').length, 5);
  for (const k of ['gar', 'sea', 'cl', 'sun', 'sky']) { w.setTh(k); assert.strictEqual(d.documentElement.getAttribute('data-th'), k); }
  w.setTh('sea'); w.go('nurse'); assert.strictEqual(d.documentElement.getAttribute('data-th'), 'care'); assert(d.querySelector('#th').hidden);
  w.go('home'); assert.strictEqual(d.documentElement.getAttribute('data-th'), 'sea'); assert.strictEqual(w.localStorage.getItem('uns_theme'), 'sea');
  pass('5 themes from shared theme.js; calm care theme for nurse screens; choice persisted');

  // --- onboarding: 6 steps
  w.go('onb'); const next = () => d.querySelector('#app button.pri').click();
  assert(/1\/7/.test(d.querySelector('#app').textContent));
  next(); next(); next(); // -> step 3 (communication)
  assert.strictEqual(d.querySelectorAll('#app .chips button').length, 4); d.querySelectorAll('#app .chips button')[3].click();
  next(); assert.strictEqual(d.querySelectorAll('#app .chips button').length, 5); d.querySelectorAll('#app .chips button')[0].click(); d.querySelectorAll('#app .chips button')[3].click();
  next(); assert.strictEqual(d.querySelectorAll('#app .chips button').length, 3, 'age step offers 3 bands'); d.querySelectorAll('#app .chips button')[1].click();
  next(); assert.strictEqual(d.querySelectorAll('#app .grid .card').length, 8, 'guided tour lists 8 sections'); assert.strictEqual(w.eval('ST.ab'), '9-10');
  assert.strictEqual(JSON.stringify(w.eval('ST.fa')), '["draw","puzzle"]'); assert.strictEqual(w.eval('ST.cm'), 'mix');
  pass('onboarding has 7 steps: nickname, avatar, theme, communication mode, activities, age band, guided tour');

  // --- wishes without alert
  w.go('wish'); d.querySelectorAll('#app .chips button')[0].click(); assert(d.querySelector('#app [role=status]'), 'in-page confirmation');
  pass('wish confirmation is an in-page status message');

  // --- pets: per-child storage and hostile data
  w = load('index.html', { seed: { uns_pets_demo: JSON.stringify([{ type: 'cat', name: '<img src=x onerror=1>', m: [9, -3, 'x', 2], cl: { head: '<script>', face: '🕶️' }, bg: 'evil' }, { type: 'dragon', m: [1, 1, 1, 1] }]) } }); d = w.document; await tick();
  w.go('pets'); assert.strictEqual(w.eval('D.pets.length'), 1); assert(!d.querySelector('#app img') && !d.querySelector('#app script'));
  assert.strictEqual(JSON.stringify(w.eval('D.pets[0].m')), '[4,0,0,2]'); assert.strictEqual(JSON.stringify(Object.keys(w.eval('D.pets[0].cl'))), '["face"]');
  w.eval("ST.nick='Sara'"); w.go('adopt'); assert.strictEqual(w.eval('D.pets.length'), 0, 'a different nickname gets its own pets');
  w.eval("ST.pa='dog';ST.pn='Rex'"); w.adoptPet(); assert(w.localStorage.getItem('uns_pets_sara')); assert(JSON.parse(w.localStorage.getItem('uns_pets_demo'))[0].type === 'cat', 'other child data untouched');
  pass('pets: saved per child nickname, old data kept, hostile stored data sanitised');

  // --- album, palette, puzzle
  w = load('index.html'); d = w.document; await tick();
  const N = w.eval('COL.length'); assert(N >= 14);
  for (let k = 0; k < N; k++) { const x = new w.DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + w.eval(`blank(${k})`) + '</svg>', 'image/svg+xml'); assert(!x.querySelector('parsererror'), 'picture ' + k); }
  w.eval('G.cp=3'); w.go('color'); assert(d.querySelectorAll('.pal button').length >= 26 && d.querySelector('.pal input[type=color]'));
  w.go('draw'); const cv = d.querySelector('#cv'); d.querySelectorAll('.pal button')[5].click(); assert.strictEqual(d.querySelector('#cv'), cv, 'picking a color must not wipe the canvas');
  const ev = new w.KeyboardEvent('keydown', { key: ' ', bubbles: true }); cv.dispatchEvent(ev); cv.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.strictEqual(cv.getAttribute('tabindex'), '0');
  w.go('puzzle'); assert.strictEqual(d.querySelectorAll('#app .chips button').length, 13);
  for (let n = 0; n < 13; n++) { w.eval(`G.pc.n=${n};G.pc.p=${n % N}`); w.startPz(); let g = 0; while (g++ < 90) { const o = w.eval('G.pz.o.slice()'); const k = o.findIndex((v, i) => v !== i); if (k < 0) break; w.pzTap(o.indexOf(k)); w.pzTap(k); } assert(/🌟/.test(d.querySelector('#app').textContent), 'size ' + n); }
  pass(`album of ${N} well-formed pictures, 26-colour palette + picker, keyboard drawing, all 13 puzzle sizes solvable`);

  // --- i18n sweep: no raw keys in any view, both languages
  const views = ['landing', 'home', 'feel', 'health', 'acad', 'happy', 'story', 'pets', 'adopt', 'album', 'color', 'puzzle', 'mem', 'match', 'draw', 'wish', 'jour', 'people', 'skills', 'care', 'nurse', 'onb'];
  for (const lang of ['ar', 'en']) { if (w.eval('ST.lang') !== lang) w.L();
    for (const v of views) { w.go(v); const txt = d.querySelector('#app').textContent; const bad = txt.match(/\b[a-z]{1,4}_[a-z0-9_]+\b|\bn_[a-z]+\b/g); assert(!bad, `${lang}/${v}: untranslated ${bad}`); } }
  assert.deepStrictEqual(w.__errs, []);
  pass('every view renders in Arabic and English with no missing translations and no script errors');
  console.log('ALL UI SMOKE TESTS PASSED');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
