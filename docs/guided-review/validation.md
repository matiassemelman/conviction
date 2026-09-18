# Guided first review — validation

Base: 7ad5153. Scope and acceptance: [.scratch/guided-review/spec.md](../../.scratch/guided-review/spec.md).

## Implementation
- Existing source documents, model interfaces, rubric, aggregation and quotas retained.
- One evidence-review component renders the claim, derived finding and original quotations for both the payment question and secondary questions.
- A small pure presentation module owns authored status descriptions, source attribution and before/after comparison. It makes no model calls.
- Payment follow-up wording asks for dated payment records without assuming which sources caused the disagreement.
- Native disclosures put technical details at the end. Existing comparison/trace implementations remain intact.

## Local browser evidence
- Initial screen explains Northstar, marks the case fictional, states the exact three-customer/date claim, shows all three source texts, and explains Review the evidence before the action.
- Real Jev base run: mixed payment finding, founder supports / finance contradicts / interviews insufficient. Focus moves to the substantive finding; timing is secondary. Provider stage approximately 1.5 seconds.
- The editable 271-character weekly-usage example is visible before submission. After adding it, weekly usage changes from evidence gap to supported by sources; payments remain conflicting. Four original-plus-added sources stay visible. Provider stage approximately 2.3 seconds.
- Secondary question selection displays usage/acquisition findings without a new request. Trace remains inspectable in the collapsed technical section.
- Live comparison on four sources completed for Jev, Luna and Terra; main case unchanged.
- Development quota was deliberately limited to three shared runs using the development namespace. Fourth assess and subsequent compare returned HTTP 429 without further model inference. The 90-character unsent draft, four-source case and all three completed comparison results remained visible; the page explicitly says no new finding was applied.
- Reset clears findings, notes, comparison and before/after; all secondary disclosures return to collapsed.
- Desktop and mobile visual checks passed. At the mobile test width, document clientWidth and scrollWidth both measured 375 CSS pixels. No browser console errors were recorded.

## Automated checks
42 tests pass, including three new checks across assessment and presentation interfaces: summaries follow actual source identities/relations rather than an expected demo answer; added usage evidence changes the usage finding while preserving payment conflict and original sources; an internally conflicting single source is not described as disagreement between documents. Typecheck and lint pass. The pre-review production build passed.

## Final review and deployment
Final two-axis review found one issue per axis, both fixed and independently closed:
- Spec: Reset must remain available when comparison is used before the first analysis. It is now always visible and still locked during requests.
- Standards: mixed evidence can arise within one source. The three mixed headlines now describe conflicting evidence without inventing disagreement between separate documents; a focused regression covers all three assumptions.

Standards and Spec: 0 findings pending. Production verification remains pending. Technical QA is separate from owner acceptance of the new experience.
