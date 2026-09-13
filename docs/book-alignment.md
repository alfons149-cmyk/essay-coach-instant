# EssayCoach book aligned with the Writing Course

Author: Alfons Sergeant · English Straightforward

This edition makes the existing HTML book the explanatory companion to the four revised Basisroute PDFs. The book stays in HTML; the PDFs are referenced by supplied filename and page rather than copied into the public repository.

## Student route

| Course part | Book units | PDF route guide |
| --- | --- | --- |
| 1: Sentence construction | 1–4 | 01-Part-1-Basisroute.pdf, p. 125 |
| 2: Planning and development | 5, 7, 9–10, 13–14 | 05-Part-2-Basisroute.pdf, p. 45 |
| 3: Paragraph endings and connections | 6, 8, 15, 19 | 06-Part-3-Basisroute.pdf, p. 61 |
| 4: Revision and independent writing | 11–12, 16–18, 20 | 07-Part-4-Basisroute.pdf, p. 48 |

The student home page includes a short entry task, a route by skill, exam-specific routes, a feedback routine and exit guidance. Each unit has a linked PDF reference, an attempt, a collapsed hint, a collapsed possible response and independent transfer. Existing exposition is retained where useful. Duplicated or unrelated summaries are replaced; the exam chapters are rewritten where their premises were incorrect.

## Editorial corrections

- Distinguish clause foundations from universal claims about explicit subjects; distinguish default word order from other grammatical positions.
- Clarify independent clauses, linking adverbs and comma choices. A spoken pause alone is not a punctuation rule.
- Align paragraph development with claim, explanation, concrete support and a purposeful ending. No compulsory extra closing sentence or fixed PEEL sequence.
- Replace the incorrect C1 “two input texts/two opposing opinions” premise with selecting two listed points and justifying a priority.
- Clarify B2 supplied points plus a distinct own idea and whole-paper timing.
- Replace the under-length C1/C2 models. B2, C1 and C2 models have counted word totals within their task ranges; these are teaching models, not officially graded scripts.
- Supply two original approximately 100-word extracts for the C2 model. Distinguish summary, relationship and evaluation; integration need not mean mentioning both texts in every paragraph.
- Recast the source-less Unit 20 example as a short style exercise, not a complete exam model.
- Remove score guarantees and several unsupported improvement promises. Retain meaning and qualifiers when revising.
- Correct headings, chapter navigation and feedback destinations. Existing section IDs remain available as aliases for older saved links.

## Technical scope

- Updated `assets/book` and limited book-link/feedback wording in `js/app.js` and `feedback/mistake-map.js`.
- No changes to correction requests, payment logic, API credentials or score calculations.
- Reader handles deep links, next/previous navigation, browser history, mobile layout, hidden hints, failed-load retry and a same-origin app return link.
- The existing mobile build copies the updated book automatically.
- This is an editorial/integration update, not a new access-control or payment implementation.

## Verification

Run `node tests/book-integrity.mjs` to check 20 units, metadata, internal targets, all feedback anchors and complete model word totals.

Static checks passed for all twenty units and feedback links, and JavaScript syntax checks passed. The available cloud browser could not open the local preview, so desktop/mobile rendering and interaction checks remain to be run before release. A pilot is still needed to evaluate learning outcomes; technical checks cannot establish student independence or an examination pass rate.

## Review before release

Open `assets/book/index.html` through a local web server, or serve the branch as a preview. Review the revised exam models and a foundation unit. The author has explicitly authorised upload of this revised book to the public EssayCoach repository as a separate review version. Merge into the live site remains a separate release step.
