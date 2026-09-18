# Guided first review

Review base: 7ad5153d94a009581c35f68a147780d1c7f29363.
Status: implemented, reviewed and publicly verified. User approved the proposed flow and end-to-end implementation using minimal readable code and project conventions.

## Problem Statement
A new visitor has no context for Northstar or the task. The initial screen prioritizes model comparison and execution speed, then expects the visitor to interpret an unexplained report.

## Solution
Lead with one specific question about customer payments, show the fictional source documents before requesting analysis, and present a source-backed finding before technical detail. Then let the visitor add an editable fictional note and see what changed.

## User Stories
1. A visitor understands that Northstar is fictional logistics workflow software, what the founder claims and what they are reviewing without opening documentation.
2. The exact claim remains visible: at least three customers made product payments as of September 15, 2026.
3. The visitor reads all three original source texts before clicking Review the evidence. Contradictory information is not hidden.
4. The visitor knows analysis classifies source support/contradiction and does not independently verify payments.
5. After analysis, a substantive finding and explanation reflect the actual validated judgments, with named sources and unchanged original quotations. No prerecorded finding replaces a failed live run.
6. A concrete follow-up question is shown alongside the result. Support remains a source statement, not verification.
7. An editable example note explicitly concerns weekly usage; the visitor understands that adding usage evidence does not settle the separate payment disagreement.
8. After another successful run, changes are compared by assumption against the previous successful result. Unchanged findings and added evidence are distinguished, and previous sources remain visible.
9. Weekly usage and acquisition are secondary questions, available below the first review. The first review stays focused on payments.
10. Execution trace and model comparison are available at the end in collapsed disclosures. The recorded benchmark stays accessible without spending a live run, including when quota is unavailable.
11. Busy, failed and quota-limited states preserve drafts and previous results, visibly indicating that no new result was applied. Reset restores the initial case.
12. The English UI remains readable on mobile and keyboard-accessible, retaining the public GitHub link.

## Implementation Decisions
- Preserve the existing API, providers, source text, rubric, aggregation, quotas and live comparison behavior.
- Keep request state in the page; extract only the repeated evidence-review presentation. Authored explanatory copy and summary/change rules belong in a small pure presentation module, separate from JSX.
- Use the current visual system: navy #182b4b header, blue #304ec7 actions, slate #17243b text, #f3f5f9 canvas and white evidence surfaces. Keep Georgia for the question, Arial for reading text.
- Left-aligned reading flow: context → exact claim → original sources → analysis action → finding → editable note and change summary → other questions → optional technical details. At desktop, original sources can share a three-column row; stack on mobile.
- Do not add onboarding screens, routers, global stores, animations, new dependencies or additional model calls.

## Testing Decisions
- Use existing assessment/provider seams to verify that readable findings follow actual relations and changed-note summaries preserve conflicts. Add focused tests for the pure presentation seam used by the UI; routine seam selection is covered by the user's implementation authorization.
- Browser-check initial comprehension, live result, editable example, resulting before/after, error preservation, secondary questions, disclosures, reset and mobile layout.
- Run the existing suite, typecheck, lint and production build. Commit before one two-axis final review; correct verified findings, deploy and inspect the final page.

## Out of Scope
New models, generated prose, changed inference/aggregation, uploads, real customer evidence, accounts or expanded limits.
