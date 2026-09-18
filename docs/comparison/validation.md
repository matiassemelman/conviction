# Comparison validation — 2026-09-18

## Method and measured results
16 synthetic held-out cases, four per relation, labeled before execution. Three repetitions, rotating provider order, source-isolated requests, up to three concurrent calls per provider. Same rubric and source text, provider-native output formats. OpenAI reasoning disabled. Prompt not tuned against these results. Dataset SHA256: `4680da4a230cc492ff760f2e08791ae17c0fcdd5659c393441a9ca5ea390d23f`.

| Model | Correct / attempted | Median | p95 | Estimated total USD |
| --- | --- | --- | --- | --- |
| Jev 1.13.0 | 48/48 | 314.55 ms | 1805.7 ms | 0.001301706 |
| GPT-5.6 Luna | 48/48 | 1224.5 ms | 1945.4 ms | 0.004518 |
| GPT-5.6 Terra | 48/48 | 1389.6 ms | 1541.7 ms | 0.04518 |

Zero failed benchmark calls. Repeated cases are not 48 independent examples. Labels were prepared by an agent and inspected during implementation, not independently validated by a human domain expert. The accuracy ceiling is inconclusive about relative general quality. Timing includes network and validation, not model-only execution. A one-question benchmark request differs from the app's three-question source request. Cost is estimated from reported tokens and public rates checked September 18, not invoices. Rates and links are in `web/lib/comparison.ts`. Full traces are in `receipts.json`; UI summary and individual outputs are in `web/evaluation/results.json`.

## Verification
- 33 deterministic tests, lint, typecheck and Next.js production build pass.
- Real browser comparison on the three-source case: Jev and Luna completed; Terra had a real 20-second source timeout. Successful results remained inspectable, Terra showed partial usage and a failed trace. Reset cleared all comparison output.
- Adding the fictional activity note completed Jev analysis on four sources and changed weekly usage to supported, retaining the original evidence.
- Four-source live comparison: all models completed (Jev 3.13 s, Luna 4.05 s, Terra 5.54 s), all identified supported weekly usage. Jev retried one request and correctly showed incomplete cost.
- Mobile layout checked at a 390-pixel configured viewport (355 CSS pixels in the app browser); document width 341, no page overflow.

## Architecture and deployment
Small shared provider transport and rubric, Jev and OpenAI adapters, deterministic comparison/cost modules, and a separate display component reusing the trace UI. No automatic model substitution. Vercel Authentication is configured for all deployments. Server environment variables are encrypted in Vercel and excluded from source uploads. Old Sites deployment remains unchanged.

## Final review
AI Hero two-axis review of dfa640a..1a97809 independently identified the same P2: future benchmark runs with early failure counted never-sent cases as API failures. Added explicit completed/failed/unmeasured/unavailable sample states, attempted counts and separate UI reporting, with a regression test. Existing 144 successful measured answers, costs and timings are unchanged; sample statuses were added from their verified receipts. No new live benchmark was run for this correction.

Both review axes independently confirmed the correction with offline early-error reproductions: three attempted calls and thirteen unmeasured cases. Zero pending findings. Final table/mobile QA repeated after the correction.

## Production release
Vercel deployment `dpl_6NBycK4KrYasW2imSeKM8bXFqSmd` reached READY; alias https://conviction-kappa.vercel.app. Uploaded code checkpoint: `53f1676`. Project Authentication was verified as `deploymentType: all` before publication.

Authenticated production API smoke (three sources, three assumptions per source) completed using Jev 1.13.0, GPT-5.6 Luna and GPT-5.6 Terra. Elapsed: 473.3 ms / 3060 ms / 5562.9 ms; estimated USD: 0.000182196 / 0.00075 / 0.0075. This is one deployment check, separate from the frozen benchmark. Full safe receipt: `production-smoke.json`. Unauthenticated POST to `/api/compare` returned 401. The browser redirects to Vercel login; local browser interaction and layout were validated, while authenticated production browser review awaits the owner session.

Both configured keys were scanned against every Git revision and the client build with no matches. Vercel upload exclusions omit local env, build output and dependencies; only server-side encrypted environment variables supply provider credentials.
