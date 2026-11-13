# UNS body map (My Health)

After a child chooses where it hurts, a new step lets them **show the exact place on a body figure**, front and back. It is optional, and it is a way to *communicate*: it is not a diagnosis, nothing interprets the marks, and they never decide urgency.

## What the child sees
1. **Where does it hurt?** (unchanged) chips for head, chest, stomach, back, arms, legs, other. A reminder: for a private part of the body, tell the nurse or a trusted grown-up.
2. **Show the place on the body** (new). The urgent-safety text stays on screen. The figure shows the chosen areas as soft dashed outlines (chest and stomach on the front, back on the back). The child switches **Front / Back**, picks **Dot** or **Draw**, and can **Undo**, **Clear this side**, **Skip drawing** or continue.
3. The pain faces, quality, other symptoms and "what would you like" follow **exactly as before**. The pain-scale wording and the safety text are never changed by age.

Keyboard users focus the figure, move a visible cursor with the arrow keys, press **Enter** for a dot, and **Space** to start or stop a line. No pointer is needed.

## One figure per age group
| | 7-8 | 9-10 | 11-12 |
|---|---|---|---|
| Proportions | Large head, short limbs, rounder | Balanced child | Slimmer, longer limbs, smaller head |
| Default tool | Dot (a tap) | Draw | Draw |
| Marker size | Largest | Medium | Finest |
| Instruction | "Tap or draw on the place that bothers you." | "Draw on the body where you feel it." | "Mark the exact place... switch between front and back." |
The figures are clothed, gender-neutral and simple (face on the front, hair on the back). Any child can still use any tool.

## What is stored
The marks are tiny vectors, not a picture: `{"v":1,"fig":"9-10","front":[[[x,y],...],...],"back":[...]}` on a 0-1000 grid, with the figure's age group so the nurse sees the same figure the child drew on. Limits: 40 strokes per side, 120 points per stroke, **600 points in all** (under 8 KB as text). In the demo the marks are kept with the report in memory and drawn next to it on the nurse dashboard ("Symptom Reports" tab).

**Database (`backend/08_body_marks.sql`)** adds one nullable column, `symptom_reports.body_marks`, with a trigger that rejects anything malformed or oversized (wrong figure or version, extra or missing fields, empty strokes, points outside 0-1000, non-numbers, too many strokes or points). Existing reports are untouched. Reads follow the existing rules: the child and the **assigned nurse (with the authenticator)** can read a report and its marks; a caregiver never reads reports directly, and the caregiver summary **never includes the drawing**. Reports remain append-only.

## Deploying
The website change is only in `index.html` plus the new `bodymap.js` (upload both). **Run `08_body_marks.sql` when you connect symptom reports to Supabase**; until then nothing in the database uses the column, so it is safe to wait or to run it now (back up first; run once or twice).

## Honest limits
- The figures are **simple illustrations, not anatomical drawings**, and the dashed zones are approximate. A mark shows what the child pointed at; its accuracy depends on the child.
- **Have paediatric nurses and child-life specialists review** the figures, the wording and the handling of private areas, and review the Arabic text with a native educator, before use with patients. Cultural expectations about modesty and representation should be checked with your hospital's own staff.
- Tested here with automated checks (unit, simulated browser with simulated touch/pointer and keyboard events, local PostgreSQL). **Not yet tried on real phones or tablets**, where finger size, scrolling and palm touches matter.
- Symptom reports are not yet saved to Supabase by the child's world (no child login yet), so marks reach the nurse dashboard only in the demo today.
