const { load, tick, assert, pass } = require('./load');
(async () => {
  const w = load('index.html'); const d = w.document; await tick();
  assert.deepStrictEqual(w.__errs, []);
  w.eval("ST.lang='ar';ST.nick='Sam'");

  // --- wishes in the child's own words
  w.go('wish');
  assert(d.querySelector('#wt'), 'wish box is shown');
  w.eval("ST.wtxt='  أتمنى   أن ألعب  '"); w.addOwnWish();
  assert.strictEqual(w.eval("D.wishes.filter(x=>x.txt!=null).length"), 1);
  assert.strictEqual(w.eval("D.wishes.filter(x=>x.txt!=null)[0].txt"), 'أتمنى أن ألعب', 'spaces are tidied');
  assert.strictEqual(w.eval('ST.wtxt'), '', 'box is cleared after sending');
  assert(d.querySelector('#app').textContent.includes('أتمنى أن ألعب'), 'sent wish is listed for the child');
  pass('a child can send a wish in their own words; it is tidied, cleared and listed');

  w.addOwnWish(); assert.strictEqual(w.eval("D.wishes.filter(x=>x.txt!=null).length"), 1, 'empty wish is not sent');
  assert.strictEqual(w.eval('ST.wmsg'), 2);
  w.eval("ST.wtxt='x'.repeat(500)"); w.addOwnWish();
  assert.strictEqual(w.eval("D.wishes.filter(x=>x.txt!=null)[1].txt.length"), 200, 'wish is capped at 200 characters');
  w.eval("ST.wtxt='<img src=x onerror=window.__x=1>'"); w.addOwnWish(); w.go('wish');
  assert.strictEqual(w.__x, undefined, 'wish text is escaped, never run as HTML');
  assert(!d.querySelector('#app img[src=x]'));
  pass('empty wishes are refused, long ones capped at 200, HTML is escaped');

  // --- My People circle
  w.go('people');
  assert.strictEqual(w.eval('D.fam.length'), 0);
  w.eval("ST.pn='';ST.pr=''"); w.pSave();
  assert.strictEqual(w.eval('D.fam.length'), 0, 'needs a name or a relation'); assert.strictEqual(w.eval('ST.pmsg'), 1);
  w.eval("ST.pn='ماما';ST.pr='mom'"); w.pSave();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(w.eval('D.fam[0]'))), { id: 1, name: 'ماما', rel: 'mom', loves: [] });
  w.eval("ST.pn='';ST.pr='gpa'"); w.pSave();
  assert.strictEqual(w.eval('pName(D.fam[1])'), 'جدّي', 'relation alone shows the relation name');
  w.pLove(1, 2); w.pLove(1, 2); assert.deepStrictEqual(w.eval('D.fam[0].loves'), [], 'toggle on/off');
  w.pLove(1, 3); assert.deepStrictEqual(w.eval('D.fam[0].loves'), [3]);
  assert(/\S/.test(w.eval('pIdea()')));
  pass('people: add with name and/or relation, toggle shared activities, idea text');

  w.eval("ST.pn='<b id=zz>x</b>';ST.pr='fr'"); w.pSave(); w.go('people');
  assert(!d.querySelector('#zz'), 'person name is escaped');
  for (let i = 0; i < 20; i++) { w.eval("ST.pn='p'+" + i + ";ST.pr='fr'"); w.pSave(); }
  assert.strictEqual(w.eval('D.fam.length'), 12, 'circle is capped at 12');
  w.pRemove(1); assert.strictEqual(w.eval('D.fam.length'), 11); assert(!w.eval('D.fam.some(p=>p.id===1)'));
  pass('names are escaped, the circle is capped at 12, a person can be removed');

  assert.deepStrictEqual(w.__errs, []);
  console.log('ALL WISHES/PEOPLE TESTS PASSED');
})().catch(e => { console.error(e); process.exit(1); });
