# UNS backend: technical documentation (Phase 2)

UNS is an educational and supportive nursing-intervention **prototype**. It is not a diagnostic tool, a treatment system or an emergency service. It has **not** been clinically approved or legally reviewed, and must not be described that way until independent reviews are actually completed. Use synthetic data only.

## 1. Files and deployment

| File | Purpose |
|---|---|
| `01_schema.sql` | Tables, constraints, helper functions, controlled operations, triggers |
| `02_rls.sql` | Privileges, row-level security policies, private storage buckets |
| `03_seed_demo.sql` | Fictional demo profiles (Lily, age band 8-10), labelled `is_demo = true` |

The project is named **UNS** (أُنس).

Run them in order in the Supabase SQL editor (or `supabase db push`). Create the first administrator by hand: sign up a user, then in the SQL editor run `update profiles set role='admin' where id='<user id>';`. After that, roles change only through `admin_set_role()`.

The front end uses only the **anon key** and the user's session. Never put the service-role key in browser code.

## 2. Role matrix (what the database enforces)

| Data | Child | Caregiver | Nurse (assigned) | Admin |
|---|---|---|---|---|
| Own child profile | read / limited update | read / limited update | read | id + nickname only (`admin_list_children`) |
| Emotional check-ins, symptom reports | create, read own | **no direct access**; consent-gated summaries only | read | none |
| Drawings, memories | create, read, delete | read, delete | none by default | none |
| Family messages | read | create, read | read | none |
| Wishes | create, read | read, set status | read, set status | none |
| Nursing notes, report reviews | none | none | create, read | none |
| Consent records | none | create, read | read | none |
| Notifications | none | none | own only | none |
| Educational content | approved only | approved only | approved only | full management |
| Audit logs | none | none | none | read |

Rules that are structural rather than policy-only:
- **No collection without consent.** A trigger rejects inserts into check-ins, symptom reports, drawings, memories, wishes and preferences unless the latest `data_collection` consent for that child is granted. Photos also need `media_photos`.
- **Family access comes from the nurse.** The nurse registers the child (`nurse_create_child()`), which links the child to that nurse. The nurse then issues a single-use family code (`nurse_create_family_code()`). A caregiver gets access only by entering that code (`redeem_family_code()`), which links the caregiver to the child and records which nurse verified them. `admin_verify_caregiver()` remains as an exception path.
- **Append-only records.** Check-ins, symptom reports, nursing notes, consent records, report reviews and audit logs cannot be edited or deleted. Corrections to notes are new notes with `amends_id`. The only exception is `purge_child_data()` (admin, under the approved retention policy).
- **Child-generated data and professional documentation are different tables.** Whether a nurse has reviewed something is a row in `report_reviews`, not a flag on the child's report.

## 2b. Nurse codes, family codes, and "one database per child"

**Nurse code.** Every nurse gets a private code (format `N` + 5 characters) generated automatically when the account's role becomes `nurse`. It is unique and cannot be edited by the user. `nurse_verify_code()` can be used as an extra step before the nursing dashboard opens, in addition to normal sign-in (it never replaces authentication).

**Family code.** The nurse creates a code for the child's family (format `XXXXX-XXXXX`, 14-day expiry, single use). Only a SHA-256 hash is stored, so the readable code is shown to the nurse once at creation and cannot be recovered later: if lost, create a new one. Nurses can see code status (active, used, expired) but never the code or hash. Wrong entries are counted: after 5 failures in 15 minutes the caregiver (or nurse code check) is locked out for the rest of the window. A code stops working if the nurse's assignment to the child ends.

**How the chain is linked:** `nurse_assignments` (child to nurse) and `caregiver_relationships` (child to caregiver, with `verified_by` = the issuing nurse). Revoking a caregiver is `nurse_revoke_caregiver()`.

**"A database for each child."** All children live in one PostgreSQL database, but every row carries a `child_id`, and row-level security means a nurse sees only assigned children and a caregiver sees only the child linked through a redeemed code. This gives each child's records a separate, access-controlled space linked to their family and nurse. Physically separate databases per child are not recommended: they multiply backups, security patching and audit effort without making access control stronger.

## 3. Saved, notified, reviewed

These are three different states and the interface must never blur them:
1. **Saved**: a row exists in `emotional_checkins` or `symptom_reports`.
2. **Notified**: `emit_signals()` created a row in `notifications` for each assigned nurse. This only means "a human should look".
3. **Reviewed**: a nurse created a `report_reviews` row.

`emit_signals()` rules (scared; asked to talk or wants a nurse; pain score above 0; could not use the scale or needs help) are a **starting point to be set with the supervising clinical team**. They never decide urgency, and an unreported symptom is never treated as "no symptom". A notification must never be the only safety mechanism: the child-facing safety text and the unit's own urgent-reporting procedure remain essential. There is no real-time monitoring promise.

## 4. Clinical data rules

- Pain uses the FPS-R scoring values 0, 2, 4, 6, 8, 10 only (a database constraint rejects anything else). `pain_unable = true` records that the child could not use the scale and needs professional assessment. Scores and the scale name are never altered.
- The prototype's face drawings are not the official FPS-R artwork. Obtain the licensed, validated version and check its administration requirements before any clinical use.
- Educational content cannot be set to `approved` unless `reviewer_name`, `reviewed_at` and `source_reference` are filled (database constraint). Never mark content reviewed unless that review happened.
- No diagnosis, no dosing, no automatic "this is safe" logic anywhere in the schema.

## 5. Privacy and safeguarding

Minimal data: nickname, age band, avatar, theme, preferences. No legal name or birth date. No public profiles, comments, direct messaging, advertising or third-party analytics. Files live in private buckets under `<child_id>/...`, with no public URLs.

Audit: sensitive writes are logged automatically (metadata only, never report content). Reads cannot be logged by RLS, so **the application must call `log_access(child_id, 'OPEN_PROFILE')` whenever a nurse or caregiver opens a child's profile.**

Retention and deletion: set the retention period with the hospital and legal advisers (not decided here). Children and caregivers can delete drawings and memories themselves. Clinical-style records are deleted only by `purge_child_data()`, which also requires deleting the child's files through the Storage API. Audit rows are kept without content.

## 6. Mapping from the prototype to tables

| Prototype state | Table / column |
|---|---|
| Feeling check-in (`f`, `txt`, `w`) | `emotional_checkins.feelings`, `free_text`, `wanted_support` (key `dk` becomes `dont_know`, `fam` becomes `family`) |
| Health report (`a`, `pain`, `q`, `s`, `h`) | `symptom_reports.body_areas`, `pain_score` / `pain_unable`, `quality`, `symptoms`, `wants` (`nurse` becomes `tell_nurse`, `parent` becomes `tell_parent`, `help` becomes `need_help`) |
| Wishes | `wishes` |
| Saved drawings and colorings | `saved_drawings` + `child-media` bucket |
| Family code, nurse code | `family_codes`, `profiles.nurse_code`, `code_attempts` |
| Family tree and messages | `family_messages`, `memories` (family tree storage is not yet modelled) |
| Nursing notes and follow-up plan | `nursing_notes` (`kind`, `body`, `follow_up_plan`) |
| Marking a report reviewed | `report_reviews` |
| Academy topics | `educational_content` |

## 7. Testing performed

Run on PostgreSQL 16 with a stubbed `auth` and `storage` schema (not on a live Supabase project). Confirmed:
- both SQL files and the demo seed run without errors;
- an unverified relationship does not grant access; the admin can read no health data;
- nurse codes are generated, unique and absent for non-nurses; a nurse can create a child and a family code; another nurse cannot issue codes for or see that child;
- a caregiver cannot see the child before redeeming; a wrong code returns nothing and is counted; the sixth attempt in the window is blocked even with the right code; the right code works once (case and dash ignored), after which the code is rejected; a revoked caregiver loses access; an expired code is rejected; the audit log contains no code values;
- a child's insert is rejected before consent and accepted after;
- a pain score of 3 is rejected;
- a caregiver has no direct read, and the summary returns nothing without consent and returns only feelings (no free text) with consent;
- the assigned nurse reads reports, receives notifications, writes notes and review rows; edits to a child's report are refused;
- an unrelated user sees nothing; a child cannot read nursing notes or audit logs;
- a user cannot change their own role;
- `purge_child_data()` removes the child's records and audit rows remain.

Still to test on a real Supabase project: storage policies, signup flow, session handling, MFA, and an independent security review.

## 8. Not yet done (be explicit)

- Front end is still the in-memory prototype; it must be rewired to Supabase with `supabase-js` (auth, inserts, RPC calls, `log_access`).
- Family tree table, retention scheduler, admin content-management screens, audio narration and recording storage workflow.
- MFA and short session lifetimes for nurses and admins; rate limiting; backups; an incident-response plan.
- Child sign-in design (accounts are created by an admin and linked with `admin_link_child_user()`; a supervised-session alternative may suit younger children).
- Clinical review of all content and signal rules, licensed FPS-R artwork, legal and data-protection review for the deployment country, and ethics approval if used with real patients.
