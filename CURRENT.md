# Current

Stage: MVP plus inspectable execution trace implemented, reviewed and privately deployed on 2026-09-18.
Owner: README.md. Specs: .scratch/mvp/spec.md and .scratch/trace/spec.md.
App: https://conviction-matias.matiassemelman.chatgpt.site
Repository: https://github.com/matiassemelman/conviction (private, main).
Scope: self-serve fictional case, three assumptions, prepared sources plus up to four text notes; English UI; owner-only access.
Jev: real planning/design/review/delivery judgments plus live product evaluation. Source-isolated requests fix cross-source contamination discovered in browser QA. Development corpus 11/11; 21 deterministic tests, lint/typecheck/build pass.
Review: initial MVP closed. Trace review found two P2 issues (first-failure Reset and interrupted response-body classification), both corrected and independently closed. Evidence: docs/validation.md, docs/trace-validation.md and docs/jev/.
Deployment: Sites version 2; deployment succeeded using environment revision 1. Published trace browser run completed with three real Jev calls in 1.28 s, with source details visible. Added-note before/after trace and failure reset passed locally. Unauthenticated inference returned 401. Access confirms one owner, no groups or external viewers.
Credential: ignored local environment files and Sites secret store only; absent from Git history and deployment archive. No credential committed.
Trace: latest-run request bodies, validated answers, shared timing bars, HTTP attempts, reported usage and deterministic before/after rules. No durable history or hidden reasoning.
Next: owner acceptance of the fictional case and interaction. Public sharing, arbitrary uploads and real company evidence remain out of scope.
