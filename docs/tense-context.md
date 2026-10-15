> Current behaviour: v5.4 uses focused feedback and server-generated brief signal reminders. Detailed tense/clauses sections below describe historical versions, not the active model contract.

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
