# UNS (أُنس) — A Little World of Care | عالمٌ صغير من الرعاية

A bilingual (Arabic/English) **prototype** of a child-centered digital companion for children aged 5–12 living with chronic or serious illnesses, with a nursing dashboard and a caregiver area protected by nurse-issued family codes.
نموذج أولي ثنائي اللغة (عربي/إنجليزي) لرفيق رقمي للأطفال (5–12 سنة) مع لوحة تمريض ومنطقة أهل تُفتح بكود يعطيه الممرض.

## ⚠️ Important / تنبيه مهم
- Educational and supportive **prototype only**. Not a diagnostic tool, treatment system or emergency service; it does not replace healthcare professionals.
- **Not clinically approved and not legally reviewed.** All data is **fictional demonstration data**. Do not enter real patient information.
- The website keeps data in browser memory only (lost on reload). Codes in the website are a **demonstration**: real code security (hashing, expiry, rate limits) is implemented in `backend/` and still has to be connected.
- نموذج تعليمي وداعم فقط، غير معتمد سريريًا ولا قانونيًا، وكل البيانات وهمية.

## Try the demo flow
1. Open **Nurse dashboard** (button *For Parents & Nurses*) and enter the demo nurse code shown on screen.
2. Open the **Family code** tab and create a code.
3. Open the **Caregiver area** and enter that code.

## Real accounts (connected to Supabase)
`app.html` is the connected app: real sign-up/sign-in, nurse code, nurse registers children and creates single-use family codes, caregivers link with a code and manage consents. `config.js` holds the public URL and publishable key only (never the secret/service_role key). `supabase.js` is a pinned local copy of supabase-js.

## Folders
`fonts/` self-hosted fonts · `theme.css`/`theme.js` shared themes · `tests/` (run `npm install` then `npm test`; `npm run test:db` needs PostgreSQL) · `BODYMAP.md` (body figure for My Health: design, data, limits) · `bodymap.js` · `PERSONALIZATION.md` (age-based personalization design, rules and limits) · `personalize.js`/`personalize.css` (engine and age presentation) · `catalog.js` (the five-dimension framework: dimensions, objectives, every activity's classification) · `FRAMEWORK.md` (generated; includes the coverage map and known gaps) · `tools/` · `REMEDIATION.md` audit fixes · `backend/README.md` database deployment order.

## Contents
- `index.html` — the whole prototype (single file, no build step).
- `backend/` — PostgreSQL/Supabase schema, row-level security, nurse codes and family codes, fictional seed data, technical documentation (not connected to the site yet).

## Security rule
Never commit passwords, API secrets or the Supabase `service_role` key to this repository.
