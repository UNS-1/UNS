# LUMI — A Little World of Care | لومي — عالمٌ صغير من الرعاية

A bilingual (Arabic/English) **prototype** of a child-centered digital companion for children aged 5–12 living with chronic or serious illnesses, with a separate nursing dashboard.
نموذج أولي ثنائي اللغة (عربي/إنجليزي) لرفيق رقمي للأطفال (5–12 سنة) مع لوحة تمريض منفصلة.

## ⚠️ Important / تنبيه مهم
- Educational and supportive **prototype only**. It is not a diagnostic tool, treatment system or emergency service, and it does not replace healthcare professionals.
- **Not clinically approved and not legally reviewed.** All data shown is **fictional demonstration data**. Do not enter real patient information.
- Data lives in browser memory only and is lost on reload. There is no real login yet.
- نموذج تعليمي وداعم فقط، وليس أداة تشخيص أو علاج أو طوارئ. غير معتمد سريريًا ولا قانونيًا. كل البيانات وهمية.

## Live site
After enabling GitHub Pages: `https://<your-username>.github.io/<repository-name>/`

## Contents
- `index.html` — the whole prototype (single file, no build step).
- `backend/` — Supabase/PostgreSQL schema, row-level security policies, fictional seed data and technical documentation (not connected to the site yet).

## Not implemented yet
Real authentication and database connection, caregiver verification flow, admin content manager, audio narration/recording, relaxation corner (needs clinical review), licensed FPS-R artwork, independent clinical/legal/security review.

## Security rule
Never commit passwords, API secrets or the Supabase `service_role` key to this repository.
