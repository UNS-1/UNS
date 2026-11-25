# My Planner (مخططي): integration notes

> **UPDATE v2026-11-19-d (owner request):** the planner moved to the **parents' area** (a section inside `careMain`, after the family code).
> The child no longer has a planner tile, view or route (`#planner` opens the start page). The child only sees the 5th card of "Challenge of the Day",
> which shows **exactly the tasks the family set for today** (non-medical categories only) with one tick button per time. Medicine, appointments and
> consultations stay in the parents' area: never shown to the child, never counted, no reminder banner on the child screen.
> If the family set nothing for today the card says so and counts as done (no sticker is paid for an empty day), so the child is never blocked.
> Everything below describes the earlier child-owned design and is kept as history. Persistence still needs the child-account decision (phases 4-5).

**Status:** phases 1-3 done in the demo (in memory, nothing saved to any account). Phases 4-7 are NOT done.

## Behaviour requested by the owner (implemented in the demo)
- A task with several times a day (e.g. medicine 4 times) is ONE card with one button per dose; pressing a button ticks that dose.
  A medicine tick by the child is shown as "waiting for a caregiver to confirm" (the caregiver confirms in phase 4).
- Edit / reschedule / cancel are folded into a "⋯ Options" section so cards stay short.
- "Upcoming" shows only today + the next 3 days (constant `PL_UP`); completed items are folded away.
- One reward system: finishing the child's PERSONAL planner tasks for today is the 5th of the 5 daily tasks (`planner` in `D.dt.ids`).
  It completes by itself and pays the same sticker progress as the other daily tasks, at most once per calendar day.
  Medicine, appointments and consultations never count toward the reward (no incentive to tick a dose that was not taken).
- The five daily tasks are now 4 from the skills catalog + the planner (`dtPick`), so the Star Rocket game unlock also needs the planner task.

## What was added (and nothing was replaced)
- `index.html`: one block of planner code before the final init calls; small hooks in the daily tasks (`dtPick`, `dtLoad`, `dtCard`, `dtLaunch`); one tile (`planner`, 📅) in each age order on the home screen
  (health stays 2nd); `enter()` calls `plInit()` for the new view; the new keys `n_pl, pl_*, pc_*, rp_*, d_*` are added with `Object.assign(T.ar/T.en)`.
  Nothing else in `index.html` changed.
- `backend/09_planner.DRAFT.sql`: proposed tables `planner_tasks` and `planner_completions` (draft, never executed).
- Tests: `tests/ui/planner.test.js` (new). Updated counts: `personalize.test.js` (10 sections), `smoke.test.js` (view list).

## Integration points found in the existing code
Routing `go()` + `#hash` + `V` views + `NEEDS`; state `ST` (screen state) and `D` (in-memory data); `t()` with `T.ar/T.en`;
home tiles `ORD`/`C`; age group `ageNow()`; shared helpers `back()`, `chip()`, `tg()`, `esc()`; themes are CSS variables (no new CSS was needed).

## Database findings (read-only inspection)
- Reusable: `child_profiles`, `caregiver_relationships`, `consent_records` (`data_collection`), helpers `is_child_self / is_caregiver_of / has_consent`,
  trigger `require_collection_consent`, `audit_change`. No new auth, no duplicate children.
- **No child login exists**, so `is_child_self()` is never true today: child-side persistence needs the pending child-account decision.
  Caregiver-side writes would work.
- `07_personalization.sql` (age groups 7-8 / 9-10 / 11-12) is prepared but not known to be applied.
- Decision needed: may a **nurse** see medication schedules? The draft says no.

## Demo behaviour (matches the draft policies)
- Child can create/edit/cancel/complete: health routine, education, personal goal, personal activity.
- Medication, medical appointment, consultation: shown read-only with a lock; the child cannot create, edit, cancel or complete them.
  The three examples are labelled "example only".
- Rewards: no separate stars; the shared sticker system is used. Completing is reversible; no ranking; overdue items are simply not shown.
- Reminders: in-app banner once per occurrence (while the app is open); browser notifications only if the child taps the opt-in button.
- Medication reminders, the caregiver planner screen, and Supabase persistence are phases 4-5 and need approval first.
