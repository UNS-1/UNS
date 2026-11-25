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

## Daily tasks and Star Sky (index.html)
- Home shows 5 daily tasks drawn from My Skills (one per growth area, age-appropriate), progress out of 100%, and a brain button that shows/hides a 24h countdown.
- Tasks renew 24 hours after they were created (checked every second while the timer is visible, and on every screen change / when the tab regains focus). State is saved in this browser only (`uns_dt_<child>`); nothing goes to Supabase.
- Finishing all 5 unlocks "Star Sky" in My Happy Space (locked tile, `go('star')` and `#star` are refused while locked). It locks again when tasks renew.
- Star Sky is calm by design: no losing, no timer, no score; 6 sky friends appear as stars are collected.
- Nurse dashboard: "Home" no longer locks it; new explicit lock button. Caregiver "leave" ends the session (family codes are single-use) and now says so. Home has big adult-area buttons.

## My Wishes and My People (index.html)
- **My Wishes:** the child can type a wish in their own words (up to 200 characters, HTML-escaped) in addition to the five ready wishes. Typed wishes reach the nurse dashboard tagged "written by the child" and the child sees whether the care team has seen them. A note under the box says not to write full name/address/phone and that wishes are not for emergencies.
- **My People:** a calm circle of person cards (name and/or who they are to the child, up to 12), a card per person with "what we like to do together", a "time together" idea generator, confirmed removal, messages and the memory album. `D.fam` is now a list of `{id,name,rel,loves}` objects. Kept in browser memory only (lost on reload); the nurse dashboard shows names and relation, and the child is told so.
- **Nurse reply:** under each wish the nurse can pick one of five preset replies; it marks the wish as seen and appears under the child's wish in My Wishes ("Reply from the care team"). Replies are fixed, non-promising texts and need clinical/educational review before real use.
- Daily tasks never include My Health, My Feelings or My Wishes (`DT_SKIP`): they send reports to the care team, and a percentage or a game reward must not push a child to report symptoms or feelings.
