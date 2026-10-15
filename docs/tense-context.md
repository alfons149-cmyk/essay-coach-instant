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
