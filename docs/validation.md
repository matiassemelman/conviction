# Conviction validation — 2026-09-18

## Standards

Independent read-only reviewer: APPROVE, zero findings on the exact implementation diff `95712924084c61c488589c63b7dfaa084cc699b5...0894059b026bda11e04ec4fee3daba6aa9ab146e`. Reviewed 13 authored application/test/evaluation files plus configuration and project contracts. Provider errors remain failures; source identities and text are retained; no HTML execution of notes or client credential exposure found. This review does not certify model accuracy or hosted access configuration.

## Spec

Independent read-only reviewer found one P2 documentation mismatch: seven logical source evaluations can require up to fourteen HTTP attempts when each retries once after 429/529. The spec and README now distinguish 21 logical judgments from at most 42 transmitted questions. Added the retry-budget regression test. Focused reviewer closure: RESOLVED; 15/15 tests passed. No remaining spec finding.

## Deterministic validation

- 15/15 behavior tests pass, including conflicts, source preservation, failures, body/note limits, origin checks, invalid provider responses, source isolation and bounded retries.
- Typecheck, application lint and production build pass. Generated untouched UI catalog is excluded from lint; consumed components are typechecked and exercised in browser.
- Dependency audit after compatible security updates: zero known vulnerabilities reported by npm. This is a point-in-time scanner result, not a security guarantee.
- Exact configured key absent from all 91 production output files in the inspected build. Staged credential scan passed before each implementation commit; final history scan passed across all local revisions; the packaged archive scan passed across all 91 files.

## Live Jev evaluation

Receipts under `docs/jev/` contain inputs, model, usage and outputs, never credentials.

- Planning: bounded scope and false-verification risk classification.
- Design: source-support wording and minimal architecture classification.
- Initial synthetic corpus: 10/11. A mixed-source excerpt was incorrectly reduced to contradiction.
- Revised rubric and source-isolated requests: 11/11 on that same small corpus. This is development-set performance after an adjustment, not held-out accuracy.
- Live case flow: payments remains conflicting; weekly usage changes from insufficient to source-supported after the activity note; acquisition remains contradicted. Exact per-source labels were inspected, not only aggregate statuses.
- Advisory review: Jev identified conflict preservation, source isolation and server-side credential sourcing in the supplied code excerpts. This does not replace the independent code review or tests.

Measured live case runs in the retained receipt took 527 ms initially and 819 ms after the note; browser observations included 1.1 s and 4.0 s. These are individual observations, not an SLA. Token usage is retained in receipts; no currency cost is claimed.

## Browser QA

Used the same local browser tab at `http://localhost:3001/` throughout.

- Initial run: conflict on payments, evidence gap on weekly usage, one relevant contradicting source on acquisition.
- Added the fictional activity note: four sources remain visible; weekly usage changes to supported; old payment contradiction remains.
- Inspected original source text, follow-up question and change notice.
- Earlier browser QA caught cross-source contamination in a shared-state request. Corrected by isolating sources; added an invariant test and repeated the live case and browser flow.
- Responsive viewport override at 390 × 844: panels stack, source review precedes the note entry, content stays within the viewport. Read-only DOM measurement found no horizontal overflow. Restored the viewport afterwards.
- Controlled network failure with the local server stopped: previous result and unsent draft remained unchanged. Improved the generic network error wording to an actionable message.
- Keyboard Enter activates Reset case and clears the draft; reset does not call Jev.

## Limits

The synthetic corpus and fictional case do not prove real-world diligence accuracy or prompt-injection resistance. No automatic correctness threshold is calibrated. Results require human review. Notes are not persisted. Private hosting is required for this demo; origin checks and per-isolate concurrency are not a substitute for a public API access/budget design. Owner acceptance remains separate from technical QA.


## Private delivery

- GitHub: https://github.com/matiassemelman/conviction — private, main pushed.
- Live app: https://conviction-matias.matiassemelman.chatgpt.site
- Sites source revision: `d026c2a08bb5e2492ed1c60e94df4d98a17f829e`, a source-only split of the validated web directory. Version 1; deployment `appgdep_6aad5556c5c08191afd137d0188757de` succeeded with environment revision 1.
- Access readback: owner role; custom policy with one allowed user, no groups and no external viewers. Unauthenticated POST to the inference endpoint returned 401.
- Published browser run succeeded with live Jev: initial analysis 0.9 seconds, added-note analysis 1.2 seconds. Weekly usage changed from evidence gap to source-supported; payment conflict remained. These are individual observations.
- API key configured as a secret in the hosting environment; value was not returned by the settings tool and is absent from source/build/archive.
- Delivery-stage Jev advisory receipt confirms bounded summary wording and owner-only audience; actual deployment success and access evidence come from the hosting service and browser, not Jev.
