# UNS backend (Supabase / PostgreSQL)

| File | Purpose | State on your live project |
|---|---|---|
| `00_reset.sql` | Removes everything created by 01 and 02 (**deletes data**, test projects only) | Do not run on live |
| `01_schema.sql` | Tables, functions, triggers | Applied |
| `02_rls.sql` | Privileges and row-level security (includes the storage policies you already ran) | Applied |
| `02b_storage.sql` | Storage policies only, for projects where 02 could not create them | **Do not run again** (already applied) |
| `03_seed_demo.sql` | Fictional demo data | Not for live data |
| `04_make_nurse_and_admin.sql` | Promote signed-up users to nurse/admin | Run per person |
| `05_hardening.sql` | Authenticator (MFA, aal2) required for nurse and admin access; longer new nurse codes | **New: see order below** |
| `05_rollback.sql` | Undo 05 if needed | Emergency only |
| `06_activity_framework.DRAFT.sql` | Stores the five-dimension framework in `activities` | **Draft, not applied** (needs approval and a staging test) |
| `08_body_marks.sql` | Body-map marks column on `symptom_reports` with validation | Run when symptom reports are connected (safe earlier) |
| `07_personalization.sql` | Age groups 7-8 / 9-10 / 11-12, `child_preferences.settings`, `skill_levels`, `set_child_age_group()` | **New: run once** (after 01, 02, 05; back up first) |

## Deploying 05 (order matters)
1. Back up first (Supabase dashboard > Database > Backups, or `pg_dump`). 05 changes no data, but keep a restore point.
2. Upload the updated website (`app.html` now has the authenticator screen).
3. In Supabase, check Authentication > Multi-Factor: TOTP must be enabled.
4. Run `05_hardening.sql` once in the SQL Editor.
5. Sign in as a nurse: the site asks you to set up an authenticator app, then the nurse code.
Until step 4 runs, nothing is enforced server-side; after it runs, a nurse or admin session without the authenticator sees no children and cannot create anything.

## Migration rules
- Never edit a file that has already been applied. Add the next number (`06_...sql`).
- Every file is additive or `create or replace`; none may drop a table or delete rows.
- Try each new file on a staging project first, then run the tests below.
- Baseline: export the live schema once (`supabase db dump --schema public` or `pg_dump --schema-only`) and keep it in the repository as `baseline_live.sql`.

## Tests
`tests/db/run.sh` builds a scratch PostgreSQL database (with stand-ins for Supabase's auth/storage), applies 01, 02 and 05, and runs the whole suite (consent gate, code lockout, MFA enforcement, caregiver privacy, append-only records, purge, framework draft, personalization, body-map marks). It does not talk to your Supabase project. Run the same flows on a **staging** Supabase project before relying on them in production.
