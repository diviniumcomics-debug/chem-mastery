# Chem Mastery
Phone-first PWA (no backend). 13 tracks: 12 textbooks in 5 modules + a Chemical Safety & Hazards track (part of Module 1, so it gates everything after it).

## Run
Any static host. Locally: `python3 -m http.server 8765` then open http://localhost:8765 . On a phone, open the HTTPS URL and use "Add to Home Screen". Progress is stored in this browser's localStorage (`chemMastery.v1`); use More → Backup to export/import JSON.

## Extend the question bank
Files: `data/q/<bookId>.json` → `{"book":"cts","questions":[...]}`. Topic ids are in `data/curriculum.json`.
Multiple choice: `{"id":"cts-30","t":"thermo","d":3,"q":"...","c":["CORRECT","wrong","wrong","wrong"],"e":"explanation"}` — **first choice is always the correct one**; the app shuffles. Need ≥3 choices and `e`.
Short answer (self-graded): `{"id":"cts-31","t":"thermo","d":4,"q":"...","m":"model answer"}`.
`d` = difficulty 1–5. Ids must be unique. Aim for every topic to have ≥8 questions and some d4–d5 items.
Without editing files: More → Import question pack (same JSON format, `"book"` at top or `"b"` per question).
Bump `chem-mastery-vN` in `sw.js` after changing data so phones refresh.

## Other data
- `data/abilities.json`: `"book.topic": [["what you can now do", levelThreshold], ...]` (toast + list entry at that skill level).
- `data/drills.json`: arrow-pushing and spectra prompts. `drills.js`: generated numeric problems (add a generator + put it in DRILL_SETS).
- `data/curriculum.json`: modules, books, topics + checklist focus items, titles, capstone, summit.

## Safety scope
The safety track is conceptual hazard recognition (GHS/SDS, toxicity, incompatibilities and why, runaway reactions, flammability limits, PPE/response, HAZOP). It contains no procedures for making hazardous, explosive or illegal substances.

## Deploy
Upload the folder as-is to Netlify/Vercel/Cloudflare Pages/GitHub Pages (all free, HTTPS). No build step.
