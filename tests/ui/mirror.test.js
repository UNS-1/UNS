// My Emotional Mirror (extension of My Feelings). jsdom checks; the real-browser run is tools/mirror_e2e.py.
const { load, tick, assert, pass } = require('./load');
const ev = (w, c) => w.eval(c);
const boot = async (age, lang) => { const w = load('index.html'); await tick(40); w.eval(`ST.ab='${age}'`); if (lang === 'en') w.L(); w.go('feel'); return w; };
const click = (w, k) => w.document.querySelector(`[data-mk="${k}"]`).click();
(async () => {
  for (const age of ['7-8', '9-10', '11-12']) for (const lang of ['ar', 'en']) {
    const w = await boot(age, lang), d = w.document;
    assert.strictEqual(d.querySelectorAll('.mm-card').length, 12, 'eleven emotions plus "I don\'t know"');
    assert(d.querySelector('.mm-mirror svg'), 'mirror is drawn');
    const faces = new Set();
    for (const e of ['happy', 'sad', 'angry', 'scared', 'worried', 'calm', 'lonely', 'tired', 'confused', 'excited', 'pain']) { click(w, 'e:' + e); faces.add(d.querySelector('.mm-mirror svg').innerHTML); assert(ev(w, 'ST.f.length') <= { '7-8': 2, '9-10': 3, '11-12': 4 }[age], 'age limits how many feelings are held at once'); }
    assert.strictEqual(faces.size, 11, 'the face changes for every emotion');
    assert.deepStrictEqual(w.__errs, [], age + lang + ' script errors');
  }
  pass('3 ages x 2 languages: 11 emotions, mirror changes per emotion, age caps, no script errors');
  let w = await boot('9-10', 'en'), d = w.document; ev(w, "D.fam=[{id:1,name:'',rel:'mom',loves:[]}];R()");
  click(w, 'e:pain'); d.querySelector('.mm-act .pri').click(); click(w, 'c:body'); d.querySelector('.mm-act .pri').click();
  click(w, 'w:fam'); click(w, 'w:teddy'); assert.strictEqual(d.querySelectorAll('.mm-who button').length, 1, 'people from My People'); click(w, 'p:1'); d.querySelector('.mm-act .pri').click();
  assert(d.querySelector('.mm-act .pri').disabled, 'sending waits for a sharing choice'); const n0 = ev(w, 'D.reports.length');
  click(w, 's:p'); d.querySelector('.mm-act .pri').click(); assert.strictEqual(ev(w, 'D.reports.length'), n0, 'private: nothing is saved');
  w = await boot('9-10', 'en'); d = w.document; ev(w, "D.fam=[{id:1,name:'',rel:'mom',loves:[]}];R()");
  click(w, 'e:pain'); d.querySelector('.mm-act .pri').click(); d.querySelector('.mm-act .pri').click(); click(w, 'w:fam'); click(w, 'w:nurse'); click(w, 'p:1'); d.querySelector('.mm-act .pri').click();
  click(w, 's:n'); click(w, 's:c'); d.querySelector('.mm-act .pri').click();
  const r = ev(w, 'D.reports[D.reports.length-1]'); assert.strictEqual(r.sh, 'nc'); assert.deepStrictEqual(JSON.parse(JSON.stringify(r.rl)), ['mom']); assert(ev(w, 'flagged(D.reports[D.reports.length-1])'), 'pain is a nurse signal');
  ev(w, "ST.nok=1;ST.nt=1;R();go('nurse')"); assert(d.querySelectorAll('.mm-mini svg').length >= 1, 'nurse sees the faces');
  ev(w, "ST.cok=1;D.cons.f=1;go('care');ST.ct='set';R()"); assert(d.querySelector('.mm-care'), 'caregiver sees faces only with consent'); ev(w, 'D.cons.f=0;R()'); assert(!d.querySelector('.mm-care'));
  assert.deepStrictEqual(w.__errs, []);
  pass('sharing: private saves nothing; nurse/care choice respected; nurse sees faces and flags pain; caregiver needs consent');
  console.log('ALL MIRROR UI TESTS PASSED');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
