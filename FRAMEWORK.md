# UNS five-dimension development framework

Generated from `catalog.js` (do not edit by hand; run `node tools/gen_framework.js`).

## Principles
- **Real objectives, not decorative tags.** An activity's dimensions are *derived* from its objectives; each objective belongs to exactly one dimension. An activity can support several dimensions.
- **Play, not assessment.** Nothing in UNS scores, tests, rates or diagnoses a child. The library shows what an activity practises and what the child has tried, never a result.
- **Age groups** are 7-8 (Discovery), 9-10 (Exploration) and 11-12 (Independence). Age sets the starting point and presentation, never access.
- **Classification fields** for every activity: id, type, primary dimension, objectives (hence all dimensions), age bands, a one-sentence description of what it practises, and the screen it opens.
- **Honest coverage.** The coverage map below lists objectives that no activity supports yet; they are gaps to fill, not hidden.

## Dimensions and objectives

### 🧠 Cognitive development
Memory, attention, thinking, problem-solving and creativity.

| Objective | Activities | 7-8 | 9-10 | 11-12 |
|---|---|---|---|---|
| Memory | 3 | 3 | 2 | 1 |
| Attention | 2 | 2 | 1 | 0 |
| Concentration | 2 | 2 | 2 | 1 |
| Logical reasoning | 2 | 2 | 2 | 2 |
| Creativity | 2 | 2 | 2 | 1 |
| Critical thinking | **not covered yet** | 0 | 0 | 0 |
| Problem-solving | 1 | 1 | 1 | 1 |

### 💗 Emotional and psychological development
Understanding, expressing and regulating feelings, resilience and confidence.

| Objective | Activities | 7-8 | 9-10 | 11-12 |
|---|---|---|---|---|
| Recognizing emotions | 1 | 1 | 1 | 1 |
| Expressing emotions | 4 | 4 | 4 | 3 |
| Emotional awareness | 4 | 4 | 4 | 3 |
| Emotional regulation | 2 | 2 | 2 | 2 |
| Resilience | 2 | 2 | 2 | 2 |
| Confidence | 2 | 2 | 2 | 2 |
| Self-esteem | 1 | 1 | 1 | 1 |

### 🤝 Social development
Communication, empathy, cooperation, respect and resolving conflict.

| Objective | Activities | 7-8 | 9-10 | 11-12 |
|---|---|---|---|---|
| Communication | 8 | 8 | 8 | 8 |
| Empathy | 2 | 2 | 2 | 1 |
| Cooperation | 1 | 1 | 1 | 1 |
| Friendship | **not covered yet** | 0 | 0 | 0 |
| Respect | 1 | 1 | 1 | 1 |
| Teamwork | **not covered yet** | 0 | 0 | 0 |
| Conflict resolution | **not covered yet** | 0 | 0 | 0 |

### 🖐️ Physical and motor development
Coordination, balance, motor skills and healthy physical habits.

| Objective | Activities | 7-8 | 9-10 | 11-12 |
|---|---|---|---|---|
| Hand-eye coordination | 3 | 3 | 3 | 2 |
| Balance | **not covered yet** | 0 | 0 | 0 |
| Fine motor skills | 3 | 3 | 3 | 2 |
| Gross motor skills | **not covered yet** | 0 | 0 | 0 |
| Movement | **not covered yet** | 0 | 0 | 0 |
| Healthy physical habits | 1 | 1 | 1 | 1 |

### 🌱 Life skills
Independence, responsibility, decisions, organization, safety and healthy habits.

| Objective | Activities | 7-8 | 9-10 | 11-12 |
|---|---|---|---|---|
| Independence | 6 | 6 | 6 | 6 |
| Responsibility | 2 | 2 | 2 | 2 |
| Decision-making | 3 | 3 | 3 | 2 |
| Organization | **not covered yet** | 0 | 0 | 0 |
| Time management | **not covered yet** | 0 | 0 | 0 |
| Personal safety | 2 | 2 | 2 | 2 |
| Healthy habits | 2 | 2 | 2 | 2 |

## Activities (20)

| Id | Activity | Type | Primary | All dimensions | Objectives | Suggested ages | Adapts |
|---|---|---|---|---|---|---|---|
| memory | Memory Cards | Game | Cognitive development | Cognitive development | Memory, Attention, Concentration | 7-8, 9-10 | perf |
| match | Match the Picture | Game | Cognitive development | Cognitive development | Attention, Memory | 7-8 | perf |
| puzzle | Puzzle Game | Game | Cognitive development | Cognitive development, Physical and motor development | Logical reasoning, Problem-solving, Concentration, Fine motor skills, Hand-eye coordination | 7-8, 9-10, 11-12 | perf |
| coloring | Coloring Album | Creative | Physical and motor development | Physical and motor development, Cognitive development, Emotional and psychological development | Fine motor skills, Hand-eye coordination, Creativity, Expressing emotions | 7-8, 9-10 | age |
| drawing | Drawing Canvas | Creative | Emotional and psychological development | Emotional and psychological development, Cognitive development, Physical and motor development | Expressing emotions, Creativity, Fine motor skills, Hand-eye coordination | 7-8, 9-10, 11-12 | age |
| story | Interactive Story | Story | Emotional and psychological development | Emotional and psychological development, Social development, Life skills | Emotional awareness, Empathy, Decision-making | 7-8, 9-10 | age |
| feelings | My Feelings | Express and communicate | Emotional and psychological development | Emotional and psychological development, Social development | Recognizing emotions, Expressing emotions, Emotional awareness, Communication | 7-8, 9-10, 11-12 | ui |
| health | My Health | Express and communicate | Life skills | Life skills, Social development | Personal safety, Communication, Independence | 7-8, 9-10, 11-12 | ui |
| wishes | My Little Wishes | Express and communicate | Life skills | Life skills, Social development | Decision-making, Communication, Independence | 7-8, 9-10, 11-12 | ui |
| people | My People | Express and communicate | Social development | Social development | Communication, Cooperation | 7-8, 9-10, 11-12 | ui |
| pets | My Pets | Care and role-play | Life skills | Life skills, Social development | Responsibility, Empathy, Decision-making, Healthy habits | 7-8, 9-10, 11-12 | ui |
| journey | My Journey | Express and communicate | Emotional and psychological development | Emotional and psychological development | Emotional awareness, Self-esteem, Confidence | 7-8, 9-10, 11-12 | ui |
| acad-0 | Why does my heart beat? | Learning | Cognitive development | Cognitive development, Life skills | Memory, Independence | 7-8, 9-10, 11-12 | perf |
| acad-1 | My hospital room | Learning | Emotional and psychological development | Emotional and psychological development, Social development, Life skills | Resilience, Communication, Independence | 7-8, 9-10, 11-12 | perf |
| acad-2 | Why do nurses check my temperature? | Learning | Cognitive development | Cognitive development, Life skills | Logical reasoning, Independence | 7-8, 9-10, 11-12 | perf |
| acad-3 | Who is my nurse? | Learning | Social development | Social development, Emotional and psychological development | Communication, Respect, Confidence | 7-8, 9-10, 11-12 | perf |
| acad-4 | What is a blood test? | Learning | Emotional and psychological development | Emotional and psychological development, Social development | Emotional regulation, Communication, Resilience | 7-8, 9-10, 11-12 | perf |
| acad-5 | Who decides my medicine? | Learning | Life skills | Life skills | Personal safety, Responsibility | 7-8, 9-10, 11-12 | perf |
| acad-6 | Washing my hands | Learning | Life skills | Life skills, Physical and motor development | Healthy habits, Healthy physical habits, Independence | 7-8, 9-10, 11-12 | perf |
| acad-7 | When I feel worried | Learning | Emotional and psychological development | Emotional and psychological development, Social development | Emotional awareness, Emotional regulation, Expressing emotions, Communication | 7-8, 9-10, 11-12 | perf |

## Gaps
- **No activity yet:** Critical thinking, Friendship, Teamwork, Conflict resolution, Balance, Gross motor skills, Movement, Organization, Time management.
- **Physical and motor** currently covers only fine-motor and hand-eye skills. Gross-motor, balance and movement activities need **clinical review** before being offered to children with medical conditions (same rule as breathing exercises).
- **Social** objectives such as friendship, teamwork and conflict resolution need peer or scripted-scenario activities; peer messaging is deliberately excluded for child safeguarding.
- **Ages 11-12** have few challenging activities: 10 of 34 objectives have none for this band.

## Adding an activity
Add one `A(...)` line to `catalog.js` with objectives that the activity genuinely practises, a plain-language description, and the real age bands; the screen, filters, coverage map, tests and SQL follow automatically. `npm test` rejects missing objectives, unknown keys and empty descriptions.
