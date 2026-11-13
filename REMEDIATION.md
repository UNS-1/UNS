# Remediation log for the Phase 1 audit

Status: **Fixed** (done and tested here) · **Partial** · **Your action** (needs something only you can do) · **Decision** (waiting for your approval).

| ID | Finding | Status | What was done / what is left |
|---|---|---|---|
| S1 | Nurse gate client-side only | **Fixed** (deploy order matters) | Authenticator (MFA) screen in `app.html`; `backend/05_hardening.sql` makes nurse and admin access require an aal2 session. Tested on local PostgreSQL and with a mocked client; **not yet tested on your live project** |
| S2 | Open sign-up, code guessing | **Partial / Your action** | Optional Cloudflare Turnstile support added (`captchaSiteKey` in `config.js`). You must create the key, paste it, and enable CAPTCHA in Supabase Auth. Turn on email confirmation and review rate limits in the dashboard |
| S3 | Weak nurse codes | **Fixed (reframed)** | MFA is now the security factor; the code is an identifier. New codes are 8 characters. Existing codes were not changed |
| S4 | Google Fonts, no CSP | **Fixed** | Fonts are self-hosted (OFL, `fonts/`). CSP meta tags added. `unsafe-inline` remains because of inline handlers (T4) |
| S5 | Never tested on real Supabase | **Your action / Decision** | Needs a staging project. Test suites are ready (`tests/`) |
| S6 | `log_access` never called | **Fixed** | Called once per child per session for nurses (after MFA) and caregivers |
| S7, S8 | Helper functions callable; public schema | **Accepted** | Low risk, unchanged |
| S9 | No migration history | **Partial / Your action** | Rules and `backend/README.md` added. Please export a baseline of the live schema |
| T1 | Duplicated code | **Partial** | Shared `theme.css`, `theme.js`, `fonts/`. Per-page i18n and base CSS remain |
| T2 | No URL routing | **Fixed** | Hash routes; Back button and safe fallbacks |
| T3 | Dead code | **Fixed** | Removed `nurseOld`, `addN` and 9 unused translation keys |
| T4 | Monolithic file | **Decision** | Splitting or moving to React/TypeScript waits for your decision |
| T5 | `alert()` | **Fixed** | In-page status message |
| T6 | Hard-coded demo name | **Fixed** | One constant |
| T7 | Onboarding incomplete | **Partial** | Now 6 steps (communication mode, activities, guided tour added). Age-band step waits for the age-scope decision |
| T8 | 8 tiles vs 6 sections | **Decision** | Information architecture choice |
| T9 | Raw English errors | **Fixed** (`app.html`) | Errors are localized; raw text only goes to the browser console |
| T10 | Earlier login error | **Your action** | Still need the exact error text and the email-confirmation setting |
| T11 | Pets shared per device | **Fixed** | Stored per nickname; old data is kept. Not a security boundary |
| T12 | Content review, FPS-R art | **Blocked** | Needs clinicians and the licensed artwork |
| T13 | 02 / 02b confusion | **Fixed** | `backend/README.md` says 02b must not be re-run |
| T14 | No tests | **Fixed** | `tests/ui` (14 flow checks), `tests/db` (13 checks) |
| T15 | Dark mode overridden | **Reverted by request** | The dark theme variants were removed. All themes stay light, as in the first version, whatever the device setting |
| A11y | Drawing keyboard path, small screens | **Fixed / Partial** | Keyboard drawing added; breakpoints added. Still open: audio and captions, formal WCAG audit, real-device tests |

Not started (waiting for decisions): Phases 2-6 of the roadmap (child sign-in, connecting child modules to Supabase, progress tracking, the 7-12 experience). The body-map front/back illustration from the original specification is still not implemented.
