# Execution trace validation — 2026-09-18

Scope: .scratch/trace/spec.md. Implementation checkpoint: 2c8b538; two independently reviewed corrections follow it.

## Evidence
- 21 deterministic tests pass, including partial failures, source identity, retry accounting, invalid JSON and HTTP 200 followed by interrupted body. Lint, typecheck and production build pass.
- Local live run: three sources, model jev-1.13.0; trace API receipt in docs/jev/trace-live.json. Browser run completed in 1.17 s and retained an expanded trace with inspectable request and response.
- Added-note browser run: four sources, 1.63 s; fourth source follows the first concurrent group. Application-rule detail shows weekly usage changing from evidence gap to supported, while payments remain conflicting. Timings are individual observations, not a benchmark.
- Desktop and 390×844 mobile visually inspected. Mobile content fit without horizontal page overflow.
- Controlled missing-key browser run returned 502 with failed trace and zero outbound attempts. First run had no prior result or draft; Reset was enabled and cleared error and trace without another request. Local key configuration was restored afterward.
- Standards review found body-read failures incorrectly classified as invalid response. Corrected and independently closed; two targeted regressions pass.
- Spec review found Reset disabled after a first failed run. Corrected and independently closed; browser scenario passed.
- Jev advisory design/review receipts are retained separately from automated tests and independent review.

## Limits
Latest trace only; no durable history, export, streaming progress, distributed tracing or hidden reasoning. Payload text is visible to the current private-site viewer. Only whitelisted response fields are retained; no authorization headers or raw provider errors. Usage can omit failed/retried consumption and is explicitly labeled partial. Semantic rubric is unchanged; the earlier synthetic corpus was not rerun as a general accuracy claim.

Publication: Sites version 2 succeeded (environment revision 1). Published browser run 1074e1cb-932b-4dd2-900a-e5d8991a96a9 completed in 1.28 s with three sources, 4338 input / 472 output tokens, model jev-1.13.0; source detail expanded and visually checked. Unauthenticated POST returned 401. Access remains owner-only. Full Git history and deployment archive scanned without finding the configured credential.
