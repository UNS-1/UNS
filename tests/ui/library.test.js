const { load, tick, assert, pass } = require('./load');
(async () => {
  const w = load('index.html'); const d = w.document; await tick(); w.eval("ST.lang='ar';ST.ab='9-10'");
  w.eval("ST.ls=null"); w.go('acad'); assert.strictEqual(d.querySelectorAll('#app [role=tablist] button').length, 7, '6 sections + questions tab'); assert.strictEqual(d.querySelectorAll('#app .grid > button.nav').length, 3, 'the first section shows its articles'); w.eval("ST.ls='q';R()"); assert.strictEqual(d.querySelectorAll('#app .grid > button.nav').length, 8, 'the questions tab shows the 8 academy topics'); w.eval("ST.ls='body';R()");
  for (const s of ['جسمي', 'أعضائي', 'المستشفى', 'غسل اليدين والوقاية', 'الغذاء الصحي']) assert(d.querySelector('#app').textContent.includes(s), s);
  w.libOpen('wash'); assert(/20/.test(d.querySelector('#app').textContent)); w.libOpen('team'); assert(/السابق/.test(d.querySelector('#app').textContent) && /التالي/.test(d.querySelector('#app').textContent), 'previous/next'); w.libOpen('wash'); assert.strictEqual(d.querySelectorAll('#app .grid .card').length, 5, 'handwashing has 5 picture steps'); assert(/20/.test(d.querySelector('#app').textContent));
  assert(d.querySelector('#app details'), 'extra facts are folded'); for (const a of ['lungs', 'bones', 'tummy', 'skin', 'plate', 'xray', 'drip']) { w.eval(`go('acad');libOpen('${a}')`); assert(d.querySelector('#app svg[role=img]'), 'diagram for ' + a); } w.eval("go('acad')"); w.eval("ST.lb=null"); w.openAcad(0); assert.strictEqual(w.eval('ST.top'), 0, 'the original academy topics still open');
  for (const lang of ['ar', 'en']) for (const a of w.eval('LIB.map(x=>x.i)')) { w.eval(`ST.lang='${lang}';go('acad');libOpen('${a}')`); assert(!/undefined|NaN/.test(d.querySelector('#app').textContent), lang + a); }
  w.eval("ST.lang='ar';go('acad');libOpen('skin')"); assert(d.querySelector('video[src="video/skin-ar.mp4"]'), 'each article shows its video in the current language'); w.eval("ST.lang='en';go('acad');libOpen('skin')"); assert(d.querySelector('video[src="video/skin-en.mp4"]'));
  assert(/media-src 'self'/.test(d.querySelector('meta[http-equiv="Content-Security-Policy"]').content), 'the page policy allows our own audio/video');
  assert(!/🔊/.test(d.querySelector('#app').textContent), 'no listen button until an audio file is found'); assert.strictEqual(w.eval('window._la||null'), null);
  w.go('home'); w.go('acad'); assert.strictEqual(w.eval('ST.lb'), null, 'the library opens on its home page');
  pass('library: 6 sections, 20 articles (AR/EN), handwashing steps, academy topics intact'); console.log('ALL LIBRARY TESTS PASSED'); w.close();
})().catch(e => { console.error(e); process.exit(1); });
