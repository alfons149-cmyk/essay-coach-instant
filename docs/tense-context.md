> Current behaviour: v5.5.3 retains the v5.5 UI, source IDs, bounded task reclassification and server word metrics. It extends causal-for protection to combined edits, separates the review prompt, and allows up to 60 seconds per AI call within the unchanged 180-second total deadline. Detailed tense/clauses sections below describe historical versions, not the active model contract.

## v5.5.3: repair findings from live v5.5.2 tests

Six requests were sent to the deployed v5.5.2 Worker with the user-confirmed gpt-5.4 setting.
Five returned feedback: the morning sentence (~33 seconds), tense email (~46 seconds), source-only
homeschooling in EN (~95 seconds) and ES (~107 seconds), and the explicit CPE task in NL (~94 seconds).
The source-only NL request timed out during assessment (~52 seconds overall, 45 seconds for that call).
The successful essays correctly identified the source-2 reversal and did not penalise the 256-word
count. Source-only EN/ES recovered from an initial task-classification disagreement.

All three successful essays nevertheless replaced valid causal for with because while also changing
"performance of schools" to "performance in schools". The previous whole-sentence comparison missed
this combined edit. The Spanish corrected draft also retained although between two reinforcing
historical facts, with an incorrect explanation claiming that the relation was logical. Captured
edits are retained in tests/fixtures/v552-live-corrections.json.

Changes:

- Match the local causal connector, recognised subject and finite verb independently of other
  changes in the sentence. Reject the observed optional substitution even in a combined edit and
  request reassessment of dependent criticism. Comma repair and unrelated corrections remain possible.
  This remains a narrow safeguard, not a complete grammar parser.
- Give the review phase a distinct audit system prompt, with the original task, essay, source
  evidence and candidate unchanged. Ask it to verify necessity, preserved meaning and the actual
  relationship expressed by connectors. Explicitly distinguish additive historical facts from
  genuine concessions; do not treat punctuation alone as repairing an illogical although.
- The reviewer also distinguishes source-faithful wording from necessary grammar corrections,
  does not require choosing a winning source, and avoids teaching that all verbs in one sentence
  must share a tense. These are model instructions, not deterministic semantic guarantees.
- Allow each AI call up to 60 seconds, capped by the remaining 180-second total budget. Attempt
  limits remain unchanged. This reduces premature per-call timeouts but does not guarantee completion.

Verification: 72 Worker + 35 coaching + 8 writing-coach DOM + 6 tense DOM checks pass (121).
New tests replay all three combined edits, verify repair-before-output, check the distinct review
request retains original evidence, and check the per-call/shared time budgets. Model calls are mocked.
The although fixture documents an observed failure; prompt assertions do NOT prove it is now fixed.
Live semantic testing is still required after deployment. No model setting, API key or UI is changed.
Standalone deployment file: downloads/essaycoach-worker-v5.5.3.txt, identical to Worker source.

## v5.5.2: recover task classification and address the GPT-5.4 comparison findings

Live v5.5.1 tests were repeated after the user reported changing OPENAI_MODEL from gpt-4o-mini
 to gpt-5.4. The endpoint does not expose the upstream model ID; the setting is user-confirmed.
The short morning sample and tense email returned HTTP 200 (about 36 and 53 seconds). All three
source-only homeschooling requests (EN/NL/ES) failed after contradictory task classifications.
With explicit CPE instructions added, the NL request returned HTTP 200 after about 119 seconds
and correctly diagnosed the reversed source-2 position and weak evaluation. It nevertheless
called the 256-word essay too short and wrongly treated causal for -> because as a correction.
The short morning sample also invented checking emails/leaving home in a teaching example.
Selected real outputs are retained in tests/fixtures/v551-gpt54-live-results.json. The rejected
raw model candidates are not available, so their exact reasoning is not inferred from diagnostics.

Changes:

- A source-only reading is provisional. If assessment or review disagrees with its task type or
  explicit/assumed/missing basis, re-read the ORIGINAL TASK without the essay or the rejected
  feedback. Pass only the two disputed classifications as a neutral recheck hint. Discard the
  candidate, rebuild its source catalogue/schema and reassess after the new reading. If readers
  still disagree, return a clear error rather than unchecked feedback. The existing TOTAL budgets
  remain task 2 / assessment 3 / review 2, sharing 180 seconds and 45 seconds per call. No unbounded
  retry, forced source interpretation, or task-specific homeschooling answer is introduced.
- Task reading explicitly allows two C2 source bodies without instructions, with basis assumed.
  Diagnostic failures expose the classification and recheck count, not provider secrets.
- The server supplies inputWords, a recognised explicit word range or assumed C2 source-essay
  range, and lengthStatus. Narrow EN/NL/ES checks reject explicit whole-essay too-short/too-long
  claims when the count is in range, requesting reconsideration of dependent penalties. This
  is not a complete multilingual semantic detector. Argument development remains separately
  assessable, and no automatic word-count mark deduction is introduced.
- A narrow guard rejects pure causal-for substitutions with because/as/since for recognised
  subject/finite-verb patterns (ignoring comma differences). A comma-only repair remains allowed,
  as do independent changes such as adding an infinitive. This is not a complete grammar parser
  and does not detect every combination of connector substitution plus other simultaneous edits.
- Ambiguous morning examples without source links receive conditional guidance across language,
  task-response, organisation and style teaching categories. No personal events are added. Real
  correction examples and distinct source-interpretation findings remain separate. For a lone
  ambiguous sentence without a real correction, the language reason also uses the conditional
  explanation instead of blanket approval. Scores are not fabricated or overridden.

Verification: 72 Worker + 31 coaching + 8 writing-coach DOM + 6 tense DOM checks pass (117).
These include real-output regression fixtures and mocked model calls. This demonstrates the
recovery/guard behaviour, not that GPT-5.4 will produce correct feedback after deployment.
Live retesting remains required. No model setting, API key, or frontend is changed by this patch.
Standalone deployment file: downloads/essaycoach-worker-v5.5.2.txt, identical to Worker source.

## v5.5.1: repair the failures observed after v5.5 deployment

The actual homeschooling requests in EN, NL and ES returned HTTP 502 after three assessment
attempts. Diagnostics identified missing exact key-point quotes, unmatched learning source quotes
and mismatched keyFocus/first learning-point evidence. The standalone morning sentence was
incorrectly rejected as unsuitable (422). A C1 email request succeeded but returned English
teaching fields for a Dutch request and treated task instructions as a source author.
Captured error diagnostics are in `tests/fixtures/v55-live-failures.json`; these records do not
contain the raw model assessments, which the production endpoint does not expose.

- After the source-only reading, the server assigns stable IDs such as `T1P1` to its key points.
  The assessment schema requires a `sourceReviewById` object with EVERY point ID as a required
  property. Learning points use a constrained `sourcePointId`, or an empty string for no source.
  The server resolves exact quotations from the already validated source reading. Unknown/missing
  IDs still fail; there is no fuzzy quote matching and no fabricated coverage. The public response
  retains the existing sourceReview/learningPoints quotes, so no frontend change is required.
- The review receives the model's original ID-based answer in the same wire schema. Source reading
  now prioritises the author's actual position over incidental statistics as a central key point.
- Presentation order is normalised from valid existing evidence. A supported source-misreading
  lesson is first, and its exercise/explanation supplies keyFocus. Otherwise an existing lesson
  matching keyFocus is first. Invalid sentence IDs are never silently repaired.
- Each learner-facing explanation field in the schema explicitly names the requested language;
  English examples and original quotations remain English. This guides generation but is not a
  deterministic language detector or a guarantee that every output field will comply.
- A recognised single English morning/perfect practice sentence is constrained to sampleSuitable
  true. The validator requests reassessment if the model nevertheless rejects it. Limited length
  must be explained, not treated as non-English. This is deliberately narrow, not a universal
  language recogniser. Existing morning context guidance and tense preservation remain in place.
- For a declared non-source task without a distortion finding, instruction-only sourceReview
  entries and source_accuracy checks are removed; task_coverage remains the appropriate check.
  Missing learning-point fields now receive field-specific repair diagnostics.

Verification: 68 Worker, 20 coaching, 8 writing-coach renderer and 6 tense renderer checks pass
(102 total). Model calls are mocked; the new live pipeline and teaching quality must be checked
after deployment. All original source/correction consistency gates remain active. These changes
fix evidence plumbing and demonstrated rejection paths; they do not prove semantic correctness.

Standalone deployment file: `downloads/essaycoach-worker-v5.5.1.txt`, identical to Worker source.

## v5.5: task achievement and learning feedback

### Basis and scope

Official references checked 15 October 2026:

- [Cambridge C2 Proficiency exam format](https://www.cambridgeenglish.org/exams-and-tests/qualifications/proficiency/format/): Part 1 integrates source summary, evaluation and the writer's own ideas in a coherent 240–280-word essay.
- [Cambridge teacher writing guide](https://assets.cambridgeenglish.org/schools/CER_6647_V1e_JUL20_Teacher%20Guide%20for%20Writing_C2_Proficiency_FINAL2.pdf): Content, Communicative Achievement, Organisation and Language; the guide's sample discussions connect source use, evaluation, cohesion and language control.

These references inform the instructions; the app is not an official Cambridge assessor. It does
not impose a particular paragraph count, PEEL, compulsory opposing positions, ornate vocabulary
or a ban on first person. B2/C1 and C2 non-essay tasks retain their own task requirements.

### Worker and UI contract

- Every C2 request with a nonempty task starts with a source-only model call. It receives TASK,
  level and feedback language, never the learner essay. It identifies task type, whether writing
  instructions are explicit/assumed/missing, the actual source positions and one or two central
  points per source. Exact full-body/point quotes are checked against TASK; source bodies may not
  overlap. A misleading heading must be read against the whole body, not adopted as its position.
- The existing assessment and review then compare the ORIGINAL essay against the original sources
  and provisional source reading. Non-C2 requests and missing-task requests keep the two-pass path.
  C2 usually takes three calls. Source reading gets at most two attempts, assessment three and
  review two, sharing the existing 180-second deadline and 45-second per-call timeout.
- `taskReview` states what response is expected, an explicit/assumed/missing basis, a verdict and
  evidence-backed requirement checks. Missing tasks cannot receive task scores. Source-only C2
  prompts can be assessed provisionally, with a visible assumption notice. A central distortion,
  unmet check or missing central source point cannot coexist with “fully answered”. Declared
  central distortion cannot coexist with Content 5. This is consistency checking, not a score formula.
- `sourceReview` is now visible. It compares literal source evidence with server-resolved learner
  quotations. Misinterpretations are expanded initially. There is no compulsory opposing opinion:
  accurate alternative readings and genuinely developed evaluations must be credited.
- `learningPoints` gives at most three prioritised what/why/how explanations, English examples,
  a specific rewrite instruction and a reasoning question. Central source misreading outranks
  cosmetic edits. Language correction examples must match an applied edit; source interpretation
  examples must match sourceReview evidence. Examples of argument development are labelled and
  never inserted automatically as the learner's own views.
- `nextDraft` remains a draft with language corrections only. A prominent adjacent notice explains
  when task/content revision is still needed or task achievement is unknown. It is not silently
  presented as a fully correct answer. Students rewrite in the existing essay field and resubmit.
- `js/writing-coach.js` renders the new sections in EN/NL/ES using text nodes. Reset/edit clears
  stale results. v5.4.1 responses remain usable and simply hide the unavailable new section.
- `teachingSignals` offers duration/start-time reminders only for recognised duration or date
  phrases. `for single parents`, `for parents observe` and ambiguous causal `since` do not trigger
  these reminders. This deliberately conservative recogniser omits some valid time expressions.
- Instructions distinguish necessary corrections from optional alternatives, including causal
  `for` versus `as`, and check the meaning of `although` rather than only its punctuation.

### Tests and limitations

Run `node tests/worker.test.mjs` (68), `node tests/coaching.test.mjs` (14),
`node tests/writing-coach.test.mjs` (8) and `node tests/tense-feedback.test.mjs` (6).
`npm run mobile:build` includes the new script and markup. The regression input is the supplied
homeschooling task and original learner essay in `tests/fixtures/homeschooling-c2.json`.

All model calls in these tests are mocked. They verify evidence constraints, contradictions,
source-first sequencing, bounded failures, preservation of earlier fixes and the rendering
contract. The DOM harness is not a browser layout test. These tests do NOT establish that a live
model correctly interprets the sources. No source/essay-specific answer is hardcoded into the
production Worker. The model can still make semantic mistakes or give weak examples/reasons.

After manual deployment, repeat the homeschooling case in EN/NL/ES and the earlier tense tests.
Inspect the actual source interpretation, evaluation advice, example accuracy and score reasons,
not merely HTTP 200. Check that the extra source-reading call stays within the shared timeout.

Standalone deployment file: `downloads/essaycoach-worker-v5.5.txt`, byte-identical to Worker source.
The existing Cloudflare OpenAI secret and model configuration are retained. Frontend publication
alone does not update the Worker; manual Worker deployment is still required.

## v5.4.1: block the two observed false-correction families

Live v5.4 returned successful HTTP responses but incorrectly replaced past `read` with
`studied`, and repeated `have been studying` with `have studied`. Both passed the model's
second review. Request success and review completion are not evidence of grammatical accuracy.

- Both model passes now explicitly distinguish a necessary correction from an alternative
  interpretation. Past `read` retains its spelling; repeated activity in an open period can
  use the present perfect continuous. Do not invent completion or penalise a valid time choice.
- `correctionPreservations` recognises narrow, defensible verb phrases in the ORIGINAL input:
  pronoun + `read` with a reading object and a local past-time adjunct; correctly agreed present
  perfect continuous with selected dynamic verbs, an open-period expression and repeated activity.
  It handles common contractions, ignores explicitly closed times in the same recognised clause,
  and excludes stative verbs. It is neither an exhaustive tense recogniser nor a grammar parser.
- The model receives those preservation constraints from the first call. The server also checks
  them independently before accepting either pass and again before building `nextDraft`.
  Unsupported changes trigger reassessment of the FULL answer, including dependent criticism,
  score reasons and insights. The server does not silently delete an edit while retaining its
  explanation. If bounded retries fail, return an explicit error, never the rejected draft.
- Only the recognised verb phrase is protected. Other errors in the sentence remain correctable.
  The whole sentence is not declared correct. Spelling errors, subject disagreement and closed-time
  problems outside the recogniser still go through the existing assessment and review.
- No extra routine model call, model change, API credential change or frontend change.

Verification: `node tests/worker.test.mjs` passes 68 checks, including captured v5.4 edits,
the real `eat` → `ate` correction, variants, contractions, other errors in protected sentences,
assessment/review retries and refusal to return persistent false corrections. Model calls in
these tests are mocked; they do not establish live model accuracy. Rerun the original NL and ES
requests and the ambiguous morning request after deploying the new Worker. The preservation
rules do not catch every possible false correction or unsupported prose claim.

Standalone deployment file: `downloads/essaycoach-worker-v5.4.1.txt` (identical to Worker source).

# Time frames and signal words

EssayCoach v5.2.1 adds Alfons' context-based tense teaching to both model passes and exposes `tenseAnalysis` as an additive field in response schema version 2. The existing assessment, correction-only next draft, evidence checks, source review and vocabulary fields are preserved.

The Worker source is based on the standalone v5.1 source (`2026-09-29-assessment-v5.1`), whose version matches the service checked on 15 October 2026. The older Worker previously in this repository did not contain that assessment contract. The build entry point and deployment workflow now use the actual JavaScript Worker, rather than the missing `src/index.ts` entry point.

## Behaviour

Read the entire passage, establish the opening time frame, carry it forward while the context continues, and reconsider it at signals or changes of meaning. Distinguish time reference from grammatical form. Signals are teaching heuristics, not automatic replacement rules.

Important examples covered in the instructions:

- Present perfect opening, then `ago`, `so now`, and `tomorrow`.
- Dynamic duration with `for/since`, stative simple forms, completed durations and results.
- Context-dependent `today` and `this morning`; no use of the server clock to infer the narrator's morning.
- Consistent coordinated past actions, legitimate mixed tenses and subordinate-clause scope.
- Future arrangements, timetables, future time clauses and indirect questions.

For suitable writing, the model returns 1–8 selected teaching entries in text order. The opening anchor and up to five sentences containing major time expressions are mandatory teaching targets, including correct sentences. These lexical selectors require an explanation, never impose a tense or correction. Each entry references a supplied sentence ID and optionally up to three context IDs. Signal excerpts must occur literally in those sentences. `status=correction` requires a corresponding correction edit. The server attaches original quotations and the corrected sentence. It does not mechanically infer grammar errors from keyword matches.

The client presents the entries in a separate card, highlights literal signals, and offers expandable context. All content uses text nodes. Unsupported quotations and corrections are omitted. Older responses without `tenseAnalysis` leave the card hidden. Clear, edits to the input and level changes clear stale results.

`feedbackLanguage` accepts `en`, `es` or `nl` and defaults to `en`. It selects the language of the new tense explanations; English quotations and tense names remain English. Other assessment explanations retain their previous language behaviour. Switching the UI language updates labels; submitting again requests new model explanations in that language.

## Verification

Run `node tests/worker.test.mjs` for the Worker contract and regression checks (mocked model responses). Run `npm run mobile:build` for the mobile web bundle. The tests verify integration and preservation of supplied valid fixtures; they do not establish a model's grammatical accuracy.

Live checks after deployment should include these original examples:

1. `I have just arrived in Bristol. I have been travelling for a month. I left York a week ago. I stayed with a friend. So now I am here. Tomorrow I am visiting my cousin.` Expect a present → past → present → future account, preserving the arrangement.
2. `I went home and eat a sandwich.` Expect `ate`, with an explanation of the shared past event.
3. `I have known her since 2010. I will call as soon as I know. Tomorrow we are visiting friends who are building a house.` Preserve stative simple and future time-clause forms; distinguish the ongoing relative clause.
4. `This morning I have had a coffee.` Explain the dependence on an unfinished morning without inventing the narrator's time of day.
5. `I will be taking an exam later today, so I read my textbook last night.` Preserve the legitimate mixed time frames.

The GitHub Worker deployment uses existing `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` Actions secrets. It explicitly fails before deployment if either is missing. `OPENAI_API_KEY` remains a Cloudflare secret, and `keep_vars` preserves existing dashboard variables. The Worker can also be pasted as a complete ES module into the existing Cloudflare Worker editor.

## v5.3: complete chart and evidence checks (15 October 2026)

- `tenses.html` is the EN/NL/ES reference guide: 12 forms, searchable signal groups,
  perfect simple/continuous comparison, dynamic verbs, work/live/study/teach,
  stative meanings and changed-meaning examples. It is linked before the task input
  and from tense feedback. The mobile bundle includes it.
- The owner authorised publishing their chart. `assets/tenses/alfons-original-chart.png`
  reproduces PDF page 1; `alfons-original-tenses.pdf` is the unchanged five-page source.
  The photographed third-party gap-fill exercise is NOT included in the published assets.
  The readable guide adds contextual qualifications (including hope, understood,
  continuous activities that just stopped, and unfinished mornings).
- The Worker recognises literal candidate clues across the chart, passes them to the model,
  and rejects analyses that substitute verbs for all available temporal/connecting clues.
  Recognition selects teaching evidence; it never chooses or changes a tense by itself.
- `tenseAnalysis[].clauses` contains exact original clause excerpts, semantic timeFrame
  and the English form label. Validation rejects aggregate frames that contradict the
  reported clause frames. It does not constitute a full syntactic parser or prove that
  the model analysed every clause correctly.
- A conservative guard rejects the observed perfect-to-past rewrite with `this morning`
  when the essay has no explicit recognised closed-morning evidence. It never uses the
  server clock. A separate heuristic rejects clearly English explanations requested
  in NL/ES; this is not a complete language detector.
- Regression tests cover the observed wrong output, signal catalogue, exact clause
  evidence, locale and existing assessment contract. Model calls in tests are mocked;
  live semantic evaluation of v5.3 requires Cloudflare deployment.
- Worker remains a standalone file for Cloudflare's editor. Existing OPENAI_API_KEY
  stays in Secrets. Version: `2026-10-15-tense-context-v5.3`.


## v5.3.1: independent assessment and review budgets (15 October 2026)

The live v5.3 checks returned `ASSESSMENT_INCOMPLETE` in both NL and ES. One
response had no validation issues: the first valid assessment arrived on attempt
three, queued a review, and then exhausted the shared loop before running it.

- Assessment now has three attempts; review has two separate attempts. A valid
  third assessment proceeds to review. Normal success still uses two model calls;
  the maximum is five, subject to a shared 180-second deadline and 45 seconds per
  request. Provider failures and timeouts remain errors, never unchecked success.
- Each repair receives the original input, the latest complete candidate and the
  current defects. Earlier incorrect drafts do not accumulate in the prompt.
  Truncated review output does not replace the complete assessment.
- `diagnostics.phaseAttempts` records assessment/review counts. Exhausted validation
  reports the failing phase and nonempty issues; only valid reviewed output has
  `reviewCompleted: true`.
- Structured Outputs now bounds the arrays already limited by server validation,
  including three evidence IDs per criterion. Redundant valid evidence is deduplicated
  and capped defensively. Unknown IDs are retained for rejection, not silently hidden.
- The ambiguous-morning guard is also represented in the response schema. A correction
  to a protected sentence must retain a present-perfect auxiliary (including contractions).
  Suggestions remain optional; other sentence corrections remain possible. This is a
  conservative guard for the observed regression, not a complete grammatical parser.
  Explicit recognised closed-morning context disables the guard.
- Regression coverage includes third-attempt assessment success followed by review,
  review repair on the fifth call, exhausted review, truncated review, evidence overflow,
  and contracted perfect preservation. All 62 checks use mocked model responses.
  These tests establish control flow and contracts, not live model assessment quality.

Deploy the complete `downloads/essaycoach-worker-v5.3.1.txt` into the existing Worker.
After deployment, `/api/health` should report `2026-10-15-tense-context-v5.3.1`.
Repeat the NL/ES live examples above before considering live assessment verified.
Existing model settings and the Cloudflare OpenAI secret are unchanged.


## v5.3.2: completion diagnostics and clause evidence (15 October 2026)

Observed on live v5.3.1: the short NL correction succeeded; the ES assessment passed
review but labelled `By the time she visits tomorrow` as future perfect and omitted
its main clause. The full NL request failed after three reportedly incomplete
outputs. An isolated `This morning I have had a coffee.` also failed quickly;
the full NL passage without that sentence produced complete but invalid outputs.
This implicates the special schema path, but does NOT establish the upstream cause:
v5.3.1 discarded the actual finish reason and usage.

Changes:

- Removed content-dependent regex/anyOf branches from the response schema. Array
  limits and strict structural output remain; the ambiguous-morning server guard
  and explicit preservation instructions remain. No model/key change.
- Treat `length`, `content_filter`, refusal and unexpected responses separately.
  Only `length` enables compact-output instructions and raises the next output
  ceiling from 6,000 to 10,000 tokens. Attempt limits and the overall deadline remain.
  Filtering/refusal stops immediately; partial JSON is never returned or continued.
- Diagnostics records an allowlisted finish reason, token count (when supplied),
  output ceiling and phase for each completed provider response. No raw provider
  text, API key, refusal message or arbitrary finish reason is exposed.
- Clause quotations must cover the selected sentence, allowing conjunctions between
  quotes. Repeated quotations are assigned to separate occurrences. Forms in the
  entry and the clause list must agree after normalising simple naming variants.
- A conservative lexical check rejects a future-perfect label when its quote lacks
  future + perfect auxiliaries; contracted/negative/question/passive forms are supported.
  Coordinating ellipsis and corrected-original quotations defer to review. This is
  an evidence check, not a complete parser or a guarantee of grammatical accuracy.
- Prompts explicitly distinguish future TIME from present simple FORM, with both
  clauses of `By the time she visits tomorrow, I will have finished the project`.

`tests/fixtures/tense-v531-live-es.json` captures the synthetic live test input and
returned tense analysis. Tests reject its observed mistakes and accept the repaired
analysis without changing the student text. There are 74 passing checks, with mocked
model calls, including overflow recovery, filter/refusal handling, unknown/malformed
responses, deadlines, third-attempt review and no unchecked-success fallback.

Deploy `downloads/essaycoach-worker-v5.3.2.txt` to Cloudflare, then verify health version
`2026-10-15-tense-context-v5.3.2`. Repeat the short NL, full NL, isolated morning and
full ES tests. New live results are required to confirm the repair end to end;
the synthetic replay and mock tests alone do not establish live quality.


## v5.3.3: explicit morning guidance and restrained suggestions (15 October 2026)

Live v5.3.2 completed all three test requests. Remaining failures were a blanket
approval of the isolated morning sentence, a collapsed `as soon as I know` clause,
and optional rewrites adding unsupported experiences/plans. The synthetic observed
outputs are captured in `tests/fixtures/tense-v532-feedback.json`.

- A deterministic EN/ES/NL feedback policy supplies the finished/open-morning
  distinction and the explicit finished-morning example `This morning I had a coffee.`
  Protected morning entries cannot retain `status=correct`. For a one-sentence sample,
  fixed conditional guidance replaces blanket model feedback. Relevant practice
  insights and key focus use the same guidance unless there is another actual correction.
  This does not force a past-tense change or deduct marks when the time context is absent.
- `contextNotes` is added to the v2 response and the same explanation precedes general
  feedback. The frontend displays it directly above the corrected draft, and before
  the original quote in context-needed tense entries. Notes are cleared with results;
  all note content uses text nodes, never HTML. Existing clients still receive the
  explanation in `feedback`, even without the new adjacent note box.
- A narrow boundary check requires separate main/time-clause entries for future
  main clauses followed by `as soon as` + a pronoun clause. It requires a present-form
  label for that subordinate clause, allowing present perfect as well as simple.
  This is deliberately not a general parser and excludes indirect questions.
- The edits schema now allows corrections only. Optional rewritten sentences are
  removed defensively, and suggestion insights have an empty `betterVersion`.
  Optional practice instructions/questions and vocabulary alternatives remain.
  This prevents the observed optional replacement sentences from being displayed;
  it does not prove that every model-generated claim is grounded.
- 83 backend regression checks pass, including captured outputs, all three feedback
  languages, closed-morning corrections, and supported future time clauses.
  `node tests/tense-feedback.test.mjs` checks rendering order, contextual notes, stale
  state and text-only insertion using a minimal DOM harness. The mobile build passes.
  A full visual browser check was not performed: local Chromium installation failed.
  Real AI calls must be repeated after the new Worker is deployed.

The website changes are published through GitHub Pages. Deploy the complete standalone
`downloads/essaycoach-worker-v5.3.3.txt` into the existing Cloudflare Worker to activate
server policy and `contextNotes`. No key or model change is required.


## v5.4: focused feedback by user request (15 October 2026)

The user requested less depth to reduce incorrect explanations and failures. The
model no longer generates `tenseAnalysis`, clause quotations, tense labels, an
exhaustive timeline, or mandatory teaching-target entries. Their schema fields,
validator dependencies and prompt requirements have been removed. This is a
feature reduction, not acceptance of previously rejected analysis: obsolete
analysis is discarded and never shown.

- The core assessment, one key focus, justified corrections, evidence checks,
  source comparison when needed, and independent review remain. General feedback
  is requested in 50–90 words, with at most one optional insight and vocabulary item.
- `feedbackMode: focused` and `signalHints` are returned. Up to three brief fixed
  EN/ES/NL reminders reference real detected words. The server selects these without
  classifying the student's clauses or inventing explanations. They never select
  or apply a verb correction. Context warnings and corrected sentences get priority.
- The fixed morning explanation, `contextNotes`, and protection against unsupported
  perfect-to-past changes remain. Optional invented rewritten sentences remain excluded.
- `tenseAnalysis: []` preserves the v2 client contract. The frontend shows simple
  reminders without tense badges, per-clause labels or blanket correctness verdicts.
  The full tenses reference guide remains available as a separate study resource.
- The old exported clause-analysis helpers and tests specifically requiring the removed
  feature have been retired. Core validation, correction preservation, evidence,
  review, timeout, truncation and provider-error tests remain. New tests confirm that
  stale invalid clause data neither blocks nor leaks into focused output, while bad
  correction IDs still fail. There are 55 backend checks and six DOM-harness checks.
  The mobile build also passes. These are mocked-model/renderer tests, not live proof.

Deploy `downloads/essaycoach-worker-v5.4.txt`. Health should report
`2026-10-15-tense-context-v5.4`. Repeat the NL correction passage, isolated morning
sentence and ES passage after deployment. Reduced depth reduces failure surfaces;
it does not guarantee error-free model judgements. No model or API key change.
