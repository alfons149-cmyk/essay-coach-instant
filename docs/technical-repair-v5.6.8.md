# EssayCoach v5.6.8: C2 audit of an additive linker

## Observed failure

The live v5.6.7 homeschooling run returned HTTP 200 after task reading, assessment and two review attempts. Its source review correctly separated the reversed overall claim of source 2 (`distorted`) from the accurately reported reasons (`covered`). One language correction still changed a valid semicolon into `, and` while removing an unsuitable opening `Although,` and adding the missing comma after `what is more`. The review supplied two exact fragments that reconstructed its edited sentence, so the existing reconstruction and maximum two changes per fragment checks accepted the optional rewrite.

The captured fragment and response are in `/tmp/essaycoach-v567-audit/homeschooling-nl-1792342442960-1.json` in the testing workspace. This is a live observation of v5.6.7, not a live test of v5.6.8.

## Change

The independent review instruction now says to retain a valid semicolon before an additive linker when removing a malformed concessive opener. The server validates that relationship for `what is more`, `moreover`, `furthermore`, and `in addition`. It rejects a replacement that removes the opener, keeps the linker, but drops the semicolon; the review receives `UNNECESSARY_CORRECTION` and can repair it within the existing attempt limit. Exact source quotations, fragment reconstruction, punctuation evidence and all final checks remain in place. There is no text substitution performed by this rule and no increase in time or token budgets.

This is deliberately scoped to an original sentence starting with `Although,` or `Even though,` and having a semicolon before one of those additive linkers. Other semicolon constructions are untouched. The model can still make other optional or incorrect changes, and v5.6.8 has not been measured against the live model.

## Verification

The captured two-span failure is rejected although its fragments reconstruct the unwanted draft. A corrected two-span output preserves the semicolon. A different sentence about a policy exercises the same rule, and an already grammatical additive-linker sentence remains unchanged. A mocked full Worker request demonstrates that a rejected review can repair the edit and return only the reconstructed corrected draft. Existing causal `for`, concessive `however`, and `; therefore,` regressions pass.

Local syntax, Worker, coaching, language-audit, v5.6.1 regression, frontend writing-coach and tense-feedback suites pass. The audit suite has 50 checks; all model calls in these tests are mocks. `npm --prefix apps/worker run build` passes. The standalone paste file `downloads/essaycoach-worker-v5.6.8.txt` is byte-identical to `apps/worker/src/worker.js`.

## Release check

After a separate production deployment, check `/api/health` for `2026-10-18-coaching-v5.6.8`, then run the homeschooling live feedback case and inspect the source claims and S11 edit. A successful HTTP status alone does not prove the lesson is correct; verify the corrected sentence, explanations, and phase diagnostics. No v5.6.8 live AI result is claimed here.
