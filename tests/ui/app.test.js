const { load, tick, assert, pass } = require('./load');
function mk(cfg) {
  const calls = []; let state = { aal: cfg.aal || 'aal1', next: cfg.next || 'aal1' };
  const q = rows => { const o = { select: () => o, eq: () => o, order: () => o, single: () => Promise.resolve({ data: rows, error: null }), insert: () => Promise.resolve({ error: null }), then: (f, r) => Promise.resolve({ data: rows, error: null }).then(f, r) }; return o; };
  const factory = () => ({
    auth: { getSession: async () => ({ data: { session: cfg.role ? { user: { id: 'u1' } } : null } }), signOut: async () => ({}),
      signInWithPassword: async () => ({ data: {}, error: cfg.signInError || null }), signUp: async () => ({ data: {}, error: cfg.signUpError || null }),
      mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: state.aal, nextLevel: state.next } }),
        enroll: async () => ({ data: { id: 'f1', totp: { qr_code: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>', secret: 'ABCDEF' } }, error: null }),
        challengeAndVerify: async ({ code }) => { if (code === '123456') { state = { aal: 'aal2', next: 'aal2' }; return { data: {}, error: null }; } return { data: null, error: { message: 'Invalid TOTP code' } }; },
        listFactors: async () => ({ data: { totp: cfg.next === 'aal2' ? [{ id: 'f1' }] : [] } }) } },
    from: t => t === 'profiles' ? q({ role: cfg.role, display_name: 'Test', nurse_code: 'N1ABCDE' }) : t === 'child_profiles' ? q(cfg.kids || []) : q([]),
    rpc: async (n, a) => { calls.push([n, a]); if (n === 'redeem_family_code') { if (cfg.lock) return { data: null, error: { message: 'too many attempts, try again later' } }; return { data: cfg.redeem === undefined ? null : cfg.redeem, error: null }; } if (n === 'nurse_verify_code') return { data: a.p === 'N1ABCDE' }; if (n === 'child_nurses') return { data: [{ display_name: 'Nurse A' }] }; return { data: null, error: null }; } });
  factory.calls = calls; return factory;
}
const run = async (cfg, seed) => { const m = mk(cfg); const w = load('app.html', { mock: () => ({ createClient: () => m() }), seed }); await tick(60); return { w, d: w.document, calls: m.calls }; };
const txt = d => d.querySelector('#app').textContent.replace(/\s+/g, ' ');
(async () => {
  let { w, d } = await run({ role: null, signInError: { message: 'Invalid login credentials' } });
  assert(d.querySelector('#em') && d.querySelector('#pw'));
  d.querySelector('#em').value = 'a@b.c'; d.querySelector('#pw').value = 'x'; await w.signIn(); assert(/غير صحيحة/.test(txt(d)) && !/Invalid login/.test(txt(d)), 'localized sign-in error');
  ({ w, d } = await run({ role: null, signInError: { message: 'Something obscure from the server' } })); d.querySelector('#em').value = 'a@b.c'; d.querySelector('#pw').value = 'x'; await w.signIn();
  assert(!/obscure|server/.test(txt(d)) && /حدث خطأ/.test(txt(d)), 'unknown errors never leak raw English');
  pass('sign-in errors are localized; unknown errors show a generic localized message');

  ({ w, d, calls: c } = await (async () => { const r = await run({ role: 'caregiver', kids: [{ id: 'k1', nickname: 'Lily', age_group: '8-10' }], redeem: null }); return { ...r, calls: r.calls }; })());
  var c = c; assert(/Lily/.test(txt(d)) && /Nurse A/.test(txt(d)));
  await w.loadAll(); await w.loadAll(); assert.strictEqual(c.filter(x => x[0] === 'log_access').length, 1, 'profile open is audited once per session');
  d.querySelector('#fc').value = 'ZZZZZ-ZZZZZ'; await w.redeem(); assert(/غير صحيح/.test(txt(d)));
  pass('caregiver sees child and nurse; profile access is audited once; wrong code message');
  ({ w, d } = await run({ role: 'caregiver', kids: [], lock: true })); d.querySelector('#fc').value = 'AAAAA-AAAAA'; await w.redeem(); assert(/محاولات خاطئة كثيرة/.test(txt(d)));
  pass('lockout message shown when the server rate-limits code attempts');

  ({ w, d, calls: c } = await run({ role: 'nurse', aal: 'aal1', next: 'aal1', kids: [{ id: 'k1', nickname: 'Lily', age_group: '8-10' }] }));
  assert(/التحقق بخطوتين/.test(txt(d)) && !/Lily/.test(txt(d)) && c.filter(x => x[0] === 'log_access').length === 0, 'nurse without verification sees no children');
  await w.enrollMfa(); const src = d.querySelector('#app img').getAttribute('src'); assert(/^data:image\/svg\+xml;charset=utf-8,%3Csvg/.test(src) && !/[<>"]/.test(src), 'QR is safely encoded');
  d.querySelector('#mc').value = '000000'; await w.verifyMfa(); assert(/غير صحيح/.test(txt(d)), 'bad code rejected');
  d.querySelector('#mc').value = '123456'; await w.verifyMfa(); assert(/كود الممرض|الرمز|nurse/i.test(txt(d)) || d.querySelector('#nc'), 'after MFA the nurse-code step appears');
  d.querySelector('#nc').value = 'n1abcde'; await w.verify(); assert(/Lily/.test(txt(d)), 'children appear after MFA and nurse code'); assert(c.some(x => x[0] === 'nurse_verify_code' && x[1].p === 'N1ABCDE'));
  assert(c.filter(x => x[0] === 'log_access').length === 1);
  pass('nurse flow: authenticator enrolment, code check, safely encoded QR, children shown only after MFA');
  ({ w, d } = await run({ role: 'admin', aal: 'aal1', next: 'aal2' })); assert(/6/.test(txt(d)) && d.querySelector('#mc'), 'admin must verify with the authenticator first');
  pass('admin is asked for the authenticator code before anything else');
  ({ w, d, calls: c } = await run({ role: 'caregiver', kids: [{ id: 'k1', nickname: 'Lily', age_group: '8-10' }, { id: 'k2', nickname: 'Omar', age_group: '11-12' }] }));
  assert.strictEqual(d.querySelectorAll('#app [onclick^="setAge"]').length, 6, 'three age-group buttons per child');
  assert(/older one|قديمة/.test(txt(d)) && d.querySelectorAll('#app .card.warn').length === 1, 'only the child with an older group is asked to confirm');
  await w.setAge('k1', '9-10'); assert(c.some(x => x[0] === 'set_child_age_group' && x[1].c === 'k1' && x[1].band === '9-10'), 'age group is saved through the server function');
  pass('caregiver can set each child\'s age group (7-8, 9-10, 11-12); legacy groups are flagged for confirmation');
  ({ w, d } = await run({ role: 'nurse', aal: 'aal2', next: 'aal2', kids: [] })); d.querySelector('#nc') && (d.querySelector('#nc').value = 'N1ABCDE', await w.verify());
  const opts = [...d.querySelectorAll('#kb option')].map(o => o.textContent); assert(opts.join() === '7-8,9-10,11-12', 'nurse registers children with the new age groups');
  pass('nurse registration offers the three new age groups');
  assert.deepStrictEqual(w.__errs, []); console.log('ALL APP TESTS PASSED');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
