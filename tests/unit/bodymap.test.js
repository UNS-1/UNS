// Unit tests for bodymap.js (figures and marks).
const fs = require('fs'), path = require('path'), assert = require('assert'); const { JSDOM } = require('jsdom');
const B = new Function(fs.readFileSync(path.join(__dirname, '..', '..', 'bodymap.js'), 'utf8') + ';return {FIGP,BM_ZONES,BM_MAX_STROKES,BM_MAX_POINTS,BM_MAX_TOTAL,bmTotal,figGeo,zoneCenter,bodySvg,strokesSvg,cleanStrokes,packMarks,cleanMarks,bmClamp}')();
const pass = m => console.log('PASS ' + m); const dom = new JSDOM(''); const xml = s => dom.window.eval ? new dom.window.DOMParser().parseFromString(s, 'image/svg+xml') : null;
const AGES = ['7-8', '9-10', '11-12'], VIEWS = ['front', 'back'];
// --- figures are valid SVG, differ by age, and fit the canvas
const heads = {};
for (const a of AGES) for (const v of VIEWS) { const s = B.bodySvg(a, v, [], { label: 'x', areas: ['head', 'chest', 'stomach', 'back', 'arms', 'legs'] }); assert(!xml(s).querySelector('parsererror'), a + '/' + v + ' is well-formed SVG'); heads[a + v] = s; }
assert(new Set(AGES.map(a => heads[a + 'front'])).size === 3 && new Set(AGES.map(a => heads[a + 'back'])).size === 3, 'a different figure for each age group');
assert(B.FIGP['7-8'].hr > B.FIGP['9-10'].hr && B.FIGP['9-10'].hr > B.FIGP['11-12'].hr, 'younger figure: bigger head, rounder proportions');
assert(B.FIGP['7-8'].pen > B.FIGP['9-10'].pen && B.FIGP['9-10'].pen > B.FIGP['11-12'].pen && B.FIGP['7-8'].tool === 'dot' && B.FIGP['11-12'].tool === 'draw', 'bigger marker and dot-first for the youngest, finer pen for the oldest');
for (const a of AGES) { const g = B.figGeo(a); assert(g.s > 0 && (8 + g.bottom * g.s) <= 400 && g.s * 90 > 20, a + ' fits the 200x400 canvas'); assert(/<circle[^>]*r="[\d.]+"[^>]*\/><circle|<path d="M [\d.]+ [\d.]+ A/.test(heads[a + 'front']));
  assert(heads[a + 'front'].includes('Q ') && !heads[a + 'back'].includes('Q '), 'front shows a face, back shows hair only'); }
pass('three well-formed, different figures (front and back) that fit the canvas; face only on the front');
// --- zones
for (const a of AGES) { const c = z => B.zoneCenter(a, 'front', z);
  assert(c('head')[1] < c('chest')[1] && c('chest')[1] < c('stomach')[1] && c('stomach')[1] < c('legs')[1], a + ': zones are in anatomical order');
  assert(Math.abs(c('head')[0] - 500) <= 2 && Math.abs(c('stomach')[0] - 500) <= 2, 'centred');
  assert(B.zoneCenter(a, 'back', 'chest') === null && B.zoneCenter(a, 'front', 'back') === null && B.zoneCenter(a, 'back', 'back') !== null && B.zoneCenter(a, 'front', 'other') === null, 'front-only and back-only zones');
  for (const v of VIEWS) for (const z of B.BM_ZONES[v]) { const p = B.zoneCenter(a, v, z); assert(p && p.every(n => n >= 0 && n <= 1000)); } }
const front = B.bodySvg('9-10', 'front', [], { areas: ['back', 'chest'] }), backv = B.bodySvg('9-10', 'back', [], { areas: ['back', 'chest'] });
assert((front.match(/stroke-dasharray/g) || []).length === 1 && (backv.match(/stroke-dasharray/g) || []).length === 1, 'only zones that exist on this side are highlighted');
pass('zones lie in anatomical order and centre; chest/stomach appear only on the front, back only on the back');
// --- strokes and sanitising
const s = B.strokesSvg([[[500, 500]], [[100, 100], [200, 200]]], B.FIGP['9-10']); assert(!xml('<svg xmlns="http://www.w3.org/2000/svg">' + s + '</svg>').querySelector('parsererror') && s.includes('<circle') && s.includes('<polyline'));
const evil = { v: 1, fig: '<x>', front: [[[1e9, -5], ['a', null]], 'bad', [[1, 2]], ...Array(60).fill([[5, 5]])], back: [Array(300).fill([10, 10])] };
const m = B.cleanMarks(evil); assert.strictEqual(m.fig, '9-10'); assert(m.front.length <= 40 && m.back[0].length === 120);
assert.strictEqual(JSON.stringify(m.front[0]), '[[1000,0],[0,0]]'); assert(m.front.every(st => st.every(q => q.length === 2 && q.every(n => Number.isInteger(n) && n >= 0 && n <= 1000))));
assert.strictEqual(B.cleanMarks({ v: 2 }), null); assert.strictEqual(B.cleanMarks(null), null); assert.strictEqual(B.cleanMarks('x'), null); assert.strictEqual(B.packMarks('9-10', { front: [], back: [] }), null, 'no marks means no marks object');
assert.strictEqual(B.packMarks('7-8', { front: [[[1, 2]]] }).fig, '7-8');
const worst = B.packMarks('9-10', { front: Array(40).fill(Array(120).fill([1000, 1000])), back: Array(40).fill(Array(120).fill([1000, 1000])) });
assert.strictEqual(B.bmTotal(worst), 600, 'at most 600 points in all, front and back together'); assert(JSON.stringify(worst).length < 8000, 'the true worst case is under 8 KB: ' + JSON.stringify(worst).length);
pass('marks are clamped to 0-1000, capped at 40 strokes, 120 points and 600 points in all, rebuilt from scratch; hostile data cannot reach the page; the true worst case is under 8 KB');
console.log('ALL BODYMAP UNIT TESTS PASSED');
