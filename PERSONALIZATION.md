# UNS age-based personalization (ages 7-12)

## Principles
1. **Age is a starting point, never a ceiling.** It sets the first suggestion and the presentation. After a child has played, the level follows *how they actually play*.
2. **Nothing is blocked.** Every activity, picture, puzzle size (2-49), memory level (3-12 pairs), matching level and the deeper quiz question stays selectable at every age. Age only orders and highlights ("Suggested for you").
3. **No assessment.** Levels are play settings. The interface never shows scores, ratings or comparisons, and says so. A struggling child gets "practising is the point".
4. **Validated wording is never adapted.** The pain-scale instruction and the urgent-safety text are identical for every age group (tests enforce this).

## The three groups
| Group | Idea | Presentation | Starting suggestions |
|---|---|---|---|
| **7-8** Discovery | Foundational, short clear steps | Larger text and buttons, bigger tiles, picture-first, simplest coloring pictures first, shorter instructions, puzzle help on | Puzzle 6 pieces, memory 3 pairs, matching 3 options, one quiz question |
| **9-10** Exploration | Skill building, medium challenge | The base look | Puzzle 9, memory 4 pairs, matching 3 options, two quiz questions, puzzle help on |
| **11-12** Independence | Choice, control, bigger challenges | Compact, text-first, calmer tone (no exclamation marks), detailed pictures first, puzzle help off | Puzzle 16, memory 6 pairs, matching 4 options, two quiz questions plus a reflection prompt |
Home-screen order also differs by age (Health stays second for everyone). Legacy accounts stored as 5-7 or 8-10 map to 7-8 and 9-10 and are flagged for a caregiver to confirm.

## What adapts to *performance* (11 of 20 activities)
| Activity | Level means | Result used |
|---|---|---|
| Puzzle | 4, 6, 9, 16, 25, 36 or 49 pieces | Efficiency: fewest possible swaps divided by swaps used (no timer) |
| Memory cards | 3, 4, 6, 8, 10 or 12 pairs | Pairs divided by attempts |
| Match the picture | 3 to 5 options, four tiers of pictures | Share of pictures right on the first try |
| Academy (8 topics) | 1 question, 2 questions, 2 questions plus reflection | First-try answers |

**Rules** (`personalize.js`, unit-tested): a result is "strong" at or above a per-game threshold (puzzle .70, memory .50, matching .84, quiz 1.0). Two strong results in a row raise the level by 1; three very strong results can raise it by 2; two weak results in a row lower it by 1 (never below 1 or above the maximum). A very strong *first* play moves a child past the age start (not for quiz questions, which have two options and can be guessed). Results achieved with extra help do not count as strong; the age-appropriate default help does not count as extra. A child who chooses another size is judged against the level they actually played. "Keep my levels" freezes automatic changes; manual choice always works.

## What adapts to *age* only
Coloring (order and detail label), Drawing (ideas and starting brush), Story (reflection question for 9-12). **Layout and wording only:** My Feelings, My Health, Wishes, My People, Pets, Journey. The library lists exactly how each activity adapts.

## Where it is saved
| Data | Where | Who can write |
|---|---|---|
| Age group | `child_profiles.age_group` (Supabase) | Caregiver or the care nurse (with authenticator), only through `set_child_age_group()`; audited |
| Challenge style, puzzle help | `child_preferences.settings` (new column, validated keys) | The child or an active caregiver |
| Current level and last 5 results per game | `skill_levels` (new table) | The child or an active caregiver supervising play. Nurses do not read it by default |
| Fallback | Browser storage, per nickname | The device |
Saving to the account needs the caregiver's "collect entries" consent (enforced by the database); without it the site says so and keeps working on the device. The child's world links to the account when a caregiver (or later a child account) is signed in on the same browser; a single child is linked automatically, several are chosen in My Settings. A linked child's levels are not copied to local storage.

## Deploying
1. Back up (Database > Backups).
2. Run `backend/07_personalization.sql` once in the SQL Editor (additive, safe to run twice; keeps all accounts, children and data; old age groups stay valid).
3. Upload the site files (`index.html`, `app.html`, `personalize.js`, `personalize.css`, `catalog.js`, `config.js`, `supabase.js` and the rest).
4. In `app.html`, a caregiver confirms each child's age group; in the child's world, My Settings shows "Playing as ...".

## Honest limits
- The thresholds and level ladders are sensible heuristics, **not validated**. Test them with children and educators before relying on them, and review the Arabic wording with a native educator.
- Only puzzle, memory, matching and the Academy quiz follow performance; the other activities adapt by age or layout only. Story and Pets have little content depth to adapt.
- Children aged 5-6 are outside this scope; their old accounts map to 7-8.
- No child sign-in exists yet. Saving to the account works through a signed-in caregiver on the same browser (supervised play) or a future child login.
- Verified here with automated tests (engine, simulated browser, local PostgreSQL). Not yet tried on real devices or on your live Supabase project.
