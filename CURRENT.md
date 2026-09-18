# Current

Stage: MVP, execution traces and Jev/Luna/Terra comparison implemented, reviewed and publicly deployed on 2026-09-18.
Owner: README.md. Specs: .scratch/mvp/spec.md, .scratch/trace/spec.md and .scratch/comparison/spec.md.
App: https://conviction-kappa.vercel.app
Repository: https://github.com/matiassemelman/conviction (public release authorized, main).
Scope: fictional self-serve case, three assumptions, three original sources plus up to four notes; English UI; public production alias with centralized quotas; Vercel Authentication on preview and immutable deployment URLs.

Comparison: Jev, GPT-5.6 Luna and GPT-5.6 Terra use the same source-isolated rubric and deterministic aggregation. Separate results, traces, bounded retries/timeouts and estimated USD costs; failed providers do not erase successful peers. No fallback model. OpenAI reasoning disabled and storage disabled.
Benchmark: 16 frozen synthetic cases, three repetitions; all models 48/48, zero API failures. This small ceiling does not establish equal general accuracy. Jev has the lowest median and estimated cost in this sample. See docs/comparison/validation.md, frozen labels and raw receipts.

Validation: 33 tests, lint, typecheck and Next.js production build pass. Browser checks covered the added note, all-model success, a real partial timeout, reset, request/response traces and mobile layout. Both final AI Hero review axes identified one shared P2 (never-sent benchmark cases counted as failures); corrected and independently closed.
Deployment: Vercel dpl_6NBycK4KrYasW2imSeKM8bXFqSmd, code checkpoint 53f1676, production READY. Authenticated production API smoke completed with all three requested models and three sources each; unauthenticated POST returned 401. Receipt: docs/comparison/production-smoke.json.
Credential: ignored local files (0600), encrypted Vercel production/preview environment. Configured keys absent from Git history and client build. Do not commit or expose credentials.
Runtime: standard Next.js; old Sites manifest archived in docs/sites-hosting-archive.json. Previous https://conviction-matias.matiassemelman.chatgpt.site remains an older trace-only release and was not republished.
Next: owner acceptance. Public sharing is active. Arbitrary uploads and real company evidence remain out of scope.

## Public sharing active

User authorized anonymous sharing with paid-inference limits on 2026-09-18. New admission guard uses atomic centralized daily/per-network quotas, blocks before providers on any store failure, and preserves UI state. Default 20 executions/day and 5/network/10 minutes; optional preference question remains unanswered. 39 tests and real Redis concurrency checks pass. See .scratch/public-demo/spec.md and docs/public-demo/validation.md.

Owner accepted marketplace terms. Upstash resource conviction-demo-limits is provisioned on Free and connected to production. Guarded deployment dpl_2Af2t9WCMAa8cTCqw9vv2viJyRBP passed all-three-model smoke before exposing the alias. Anonymous page/browser analysis works; current and old immutable URLs redirect to Vercel login. WAF burst probe returned 19 invalid-input 400s then 429 without model calls.

Final Standards review: 0 findings. Spec review prompted safe handling of non-JSON edge errors: 429 preserves UI state and shows a controlled retry message. Malformed successful responses are rejected safely. Final typecheck, lint and deployed production build pass. Managed Redis concurrent probe admitted exactly 3/12 with test allowance 3 in the development namespace.
