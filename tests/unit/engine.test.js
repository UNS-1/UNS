// Unit tests for personalize.js (no browser needed): the adaptation rules are the heart of the system.
const fs = require('fs'), path = require('path'), assert = require('assert');
const E = new Function(fs.readFileSync(path.join(__dirname, '..', '..', 'personalize.js'), 'utf8') +
  ';return {AGES,normAge,GAMES,PUZ_PIECES,MEM_PAIRS,MEM_COLS,MEM_EMO,puzLevelOf,newProfile,levelOf,record,setLevel,permMinSwaps,hintsOn,cleanProfile,MATCHPOOL,MATCH_OPTS,buildMatch,ACX,AGEI,DRAW_PROMPTS,AGEP}')();
let n = 0; const pass = m => console.log('PASS ' + m);
const seeded = () => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

// --- ages
assert.deepStrictEqual([...E.AGES], ['7-8', '9-10', '11-12']);
assert.strictEqual(E.normAge('5-7'), '7-8'); assert.strictEqual(E.normAge('8-10'), '9-10'); assert.strictEqual(E.normAge('11-12'), '11-12'); assert.strictEqual(E.normAge('3-4'), ''); assert.strictEqual(E.normAge(undefined), '');
pass('age groups 7-8, 9-10, 11-12; legacy stored values (5-7, 8-10) map to the nearest group; unknown values are ignored');

// --- age sets only the starting level
const p = E.newProfile();
assert.strictEqual(E.levelOf(p, 'puzzle', '7-8'), 2); assert.strictEqual(E.levelOf(p, 'puzzle', '9-10'), 3); assert.strictEqual(E.levelOf(p, 'puzzle', '11-12'), 4); assert.strictEqual(E.levelOf(p, 'puzzle', ''), 3);
assert(E.PUZ_PIECES[E.levelOf(p, 'puzzle', '7-8') - 1] < E.PUZ_PIECES[E.levelOf(p, 'puzzle', '11-12') - 1]);
pass('age only chooses the first level (puzzle: 6, 9 or 16 pieces); unknown age falls back to the middle group');

// --- performance moves the level, and then age no longer matters
let r = E.record(p, 'puzzle', 1, false, '7-8');                // very strong first try
assert.strictEqual(r.change, 1); assert.strictEqual(p.levels.puzzle, 3, 'placement: past the 7-8 start');
E.record(p, 'puzzle', .85, false, '7-8'); r = E.record(p, 'puzzle', .9, false, '7-8');
assert.strictEqual(r.change, 1); assert.strictEqual(p.levels.puzzle, 4);
const q = E.newProfile(); E.record(q, 'puzzle', .5, false, '11-12'); E.record(q, 'puzzle', .3, false, '11-12'); r = E.record(q, 'puzzle', .2, false, '11-12');
assert.strictEqual(r.change, -1); assert.strictEqual(q.levels.puzzle, 3, 'a struggling 11-12 child is stepped down below the 11-12 start');
assert.strictEqual(E.levelOf(p, 'puzzle', '11-12'), 4); assert.strictEqual(E.levelOf(q, 'puzzle', '7-8'), 3, 'after the first play, age is ignored');
pass('a 7-8 child who plays strongly reaches the level of an 11-12 start; an 11-12 child who struggles goes below it; age is ignored after the first play');

// --- rules in detail
const a = E.newProfile(); E.record(a, 'memory', .3, false, '9-10'); assert.strictEqual(a.levels.memory, 2, 'one ordinary result changes nothing');
E.record(a, 'memory', .6, false, '9-10'); r = E.record(a, 'memory', .6, false, '9-10'); assert.strictEqual(a.levels.memory, 3, 'two strong results in a row: +1'); assert.deepStrictEqual(a.recent.memory, [], 'history restarts after a change');
const b = E.newProfile(); b.levels.memory = 2; E.record(b, 'memory', .9, false); E.record(b, 'memory', .9, false); E.record(b, 'memory', .9, false);
assert(b.levels.memory >= 3 && b.levels.memory <= 4, 'three very strong results can jump two levels (stops at the +1 rule first: ' + b.levels.memory + ')');
const c = E.newProfile(); c.levels.match = 1; E.record(c, 'match', 0, false); E.record(c, 'match', 0, false); assert.strictEqual(c.levels.match, 1, 'never below level 1');
const d = E.newProfile(); d.levels.quiz = 3; E.record(d, 'quiz', 1, false); E.record(d, 'quiz', 1, false); assert.strictEqual(d.levels.quiz, 3, 'never above the maximum');
const h = E.newProfile(); h.levels.puzzle = 3; E.record(h, 'puzzle', .95, true); E.record(h, 'puzzle', .95, true); assert.strictEqual(h.levels.puzzle, 3, 'results achieved with extra help do not raise the level');
const k = E.newProfile(); k.settings.challenge = 'keep'; E.record(k, 'puzzle', 1, false, '9-10'); E.record(k, 'puzzle', 1, false, '9-10'); E.record(k, 'puzzle', 1, false, '9-10'); assert.strictEqual(k.levels.puzzle, 3, '"keep my levels" freezes adaptation');
const m = E.newProfile(); E.record(m, 'puzzle', 1, false, '9-10', 5); assert.strictEqual(m.levels.puzzle, 6, 'a strong result is judged against the level actually played (25 pieces): +1 from there');
E.setLevel(m, 'puzzle', 99); assert.strictEqual(m.levels.puzzle, 7); E.setLevel(m, 'puzzle', -4); assert.strictEqual(m.levels.puzzle, 1);
const qz = E.newProfile(); E.record(qz, 'quiz', 1, false, '9-10'); assert.strictEqual(qz.levels.quiz, 2, 'one perfect quiz answer set is not enough (guessing a two-option question)'); E.record(qz, 'quiz', 1, false, '9-10'); assert.strictEqual(qz.levels.quiz, 3, 'two in a row raise the depth');
pass('adaptation rules: placement, +1 after two strong, jump after three, -1 after two weak, bounds, help does not count, keep-mode, played-level, manual set');

// --- the puzzle score: minimum swaps
assert.strictEqual(E.permMinSwaps([0, 1, 2, 3]), 0); assert.strictEqual(E.permMinSwaps([1, 0, 2, 3]), 1); assert.strictEqual(E.permMinSwaps([1, 2, 0]), 2); assert.strictEqual(E.permMinSwaps([1, 0, 3, 2]), 2);
assert.strictEqual(E.puzLevelOf(4), 1); assert.strictEqual(E.puzLevelOf(12), 3, '12 is nearest to 9 or 16'); assert.strictEqual(E.puzLevelOf(49), 7);
pass('minimum swaps of a permutation and the nearest puzzle level are correct');

// --- hints default by age, still overridable
assert.strictEqual(E.hintsOn(E.newProfile(), '7-8'), true); assert.strictEqual(E.hintsOn(E.newProfile(), '11-12'), false);
const hp = E.newProfile(); hp.settings.hints = true; assert.strictEqual(E.hintsOn(hp, '11-12'), true);
pass('puzzle hints are on by default for 7-10 and off for 11-12, and the child can always change it');

// --- matching game levels
for (let L = 1; L <= 4; L++) { const rounds = E.buildMatch(L, seeded()); assert.strictEqual(rounds.length, 6);
  for (const x of rounds) { assert.strictEqual(x.opts.length, E.MATCH_OPTS[L - 1]); assert(x.opts.includes(x.item)); assert.strictEqual(new Set(x.opts.map(o => o[0])).size, x.opts.length, 'no duplicate options'); assert(x.item[4] <= L && x.opts.every(o => o[4] <= L)); }
  if (L > 1) assert(rounds.filter(x => x.item[4] === L).length >= 3, 'level ' + L + ' features its newest pictures'); assert.strictEqual(new Set(rounds.map(x => x.item[0])).size, 6, 'six different pictures'); }
pass('matching game: 6 different pictures per round, more options and harder pictures at higher levels, no duplicate options');

// --- content integrity
assert.strictEqual(E.ACX.length, 8); for (const x of E.ACX) assert(x.length === 4 && x[0] && x[1] && x[2][0] && x[2][1] && x[3][0] && x[3][1]);
assert.strictEqual(E.MEM_EMO.length, 12); assert.strictEqual(new Set(E.MEM_EMO).size, 12); assert.strictEqual(Math.max(...E.MEM_PAIRS), 12);
for (const g of E.AGES) { assert(E.AGEP[g].name.length === 2 && E.AGEP[g].brush > 0); }
for (const g of ['7-8', '9-10', '11-12']) assert(E.DRAW_PROMPTS[g].length >= 4);
for (const g of ['7-8', '11-12']) for (const lang of ['ar', 'en']) { assert(!('fpsr' in E.AGEI[g][lang]) && !('safe' in E.AGEI[g][lang]), 'pain-scale and safety wording is never age-adapted'); assert.deepStrictEqual(Object.keys(E.AGEI['7-8'].ar).sort(), Object.keys(E.AGEI[g][lang]).sort()); }
pass('content banks complete in both languages; validated pain-scale and safety wording is never changed by age');

// --- stored or server data is never trusted
const dirty = E.cleanProfile({ levels: { puzzle: 99, memory: -2, match: 'x', quiz: 2.4 }, recent: { puzzle: [{ s: 7, h: 1 }, 'bad', { s: -3 }] .map(o => typeof o === 'object' ? o : { s: 0 }) }, settings: { challenge: '<img>', hints: 'yes' } });
assert.deepStrictEqual(dirty.levels, { quiz: 2 }); assert.strictEqual(dirty.settings.challenge, 'auto'); assert.strictEqual(dirty.settings.hints, null); assert(dirty.recent.puzzle.every(o => o.s >= 0 && o.s <= 1));
assert.deepStrictEqual(E.cleanProfile(null).levels, {}); assert.deepStrictEqual(E.cleanProfile('x').levels, {});
pass('settings loaded from storage or the server are sanitised: out-of-range levels, odd types and unknown values are dropped');
console.log('ALL ENGINE TESTS PASSED');
