# Parents area: child activity summary (ملخص نشاط الطفل)

**Added in v2026-11-19-e (owner request).** A section of the parents area (`insParent()` in `index.html`) with five parts:
1. Activities and interactions (last 7 days): active days, games finished, challenges done.
2. Areas of interest (last 14 days): drawing and colouring, stories, brain games, Little Academy, my pets, my journey.
3. Skills being practised (last 28 days), plus the ones not tried yet; games show the current difficulty.
4. Progress over time: activities per week (4 weeks) and a difficulty curve per game (needs 2+ days of play).
5. Four suggested activities to do together (interests, least-practised skill, connection; gentle defaults when empty).

## Where the data comes from
A small local log per child (`uns_ins_<child>`, last 120 days), written by `enter()` (visits to play/learning areas), `record()` (game plays + level at the time),
`dtMark()` (daily challenges) and the family-challenge credit. Counters only: **no text, no answers, no timestamps finer than a day.**

## Privacy rules (kept from the existing design)
- **Never logged:** My Feelings, My Health, My Wishes, My People, private messages. The section says so in its own note.
- Feelings/health summaries stay behind the existing consent switches of the parents area; this section does not widen them.
- Stored values are untrusted: they are sanitised on load (whitelisted keys, integers only, valid dates).
- The "sample" button shows invented data for display only; it is labelled and never saved.

## Honest limits
- **Demo only:** the log lives in the browser on this device. The real version needs the child-account decision, a table with row-level security, and the `data_collection` consent
  (same as the participation data already planned).
- The difficulty shown is the level the app sets automatically (see `record()` in `personalize.js`). It is **not** a mark or a test result; the text says so.
  `FRAMEWORK.md` states "play, not assessment": this section keeps to it by showing the child's own trend, never a score or a comparison with other children.
- "Interest" counts visits to an area, so a long visit and a short one weigh the same. "Skills" map games and challenges to the framework objectives by a fixed table
  (`INS_SK`), a simplification that needs educational review.
- Suggestions are fixed, reviewed-by-hand sentences (`INS_S`), for play and togetherness only. They need clinical and educational review before real use.
