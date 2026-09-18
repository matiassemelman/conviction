# Model comparison

Status: ready-for-agent. Model access verified after user enabled both models on 2026-09-18.
Base: dfa640a1656c215bba6163683fea4b9d19c7e946.

## Problem Statement
The analyst wants to compare Jev, GPT-5.6 Luna and GPT-5.6 Terra on the same evidence judgments, with inspectable cost, latency and correctness.

## Solution
A small comparison view using the existing case and trace, with independent provider results. A separate frozen synthetic evaluation set measures label accuracy; free-form notes show agreement, never an accuracy percentage.

## User Stories
1. Compare the same assumptions and sources across the three selected models.
2. Inspect each provider request, response, duration and errors.
3. See estimated USD cost computed from reported usage and dated public rates.
4. Retain successful provider results when another provider fails.
5. Inspect accuracy and individual errors against labels fixed before model execution.
6. Distinguish unmeasured, unavailable, failed and successfully evaluated models.

## Implementation Decisions
- Follow AI Hero to-spec → implement with tdd/codebase-design → one final two-axis code-review → browser QA. Setup already exists; no ticket decomposition or speculative architecture.
- Preserve current evidence judgment semantics, source isolation and deterministic aggregation. A shared evaluation interface, provider adapters, comparison measurement and display responsibilities are sufficient.
- Start OpenAI with structured output and reasoning none. No generated confidence numbers presented as equivalent to Jev's distributions.
- Same source grouping, concurrency and bounded timeout/retry policy; record actual model and settings.
- Price reported input/cache/output usage separately, with incomplete-cost labels for unreported failed/retried usage. Do not equate equal token counts across providers.
- Repeat held-out evaluations; report sample count, median/p95, successes/failures and per-class errors. Rotate model order. Existing calibration cases are development evidence only.
- No database, durable jobs, agent framework or automatic fallback to a different model.
- Vercel is the requested destination. Preserve private inference access. Configure provider secrets only in ignored local environment and Vercel environment variables.

## Testing Decisions
Reuse the evaluation and HTTP seams: validate typed outputs, source identity, isolated failures, deterministic metrics from known literal usage, and rejection before paid inference. Browser QA covers comparison and traces. These follow the already-authorized project separation and behavior contract; no additional interview is needed for routine implementation choices.

## Out of Scope
Public access, model training, arbitrary uploads, commercial accuracy claims, new billing subscriptions, bypassing model access restrictions.

## Access prerequisite — 2026-09-18
User explicitly selected enabling Luna/Terra first over using GPT-4.1 mini. The supplied project key authenticates. The model list exposes GPT-4.1 mini among the queried small-model families. GET requests for gpt-5.6-luna and gpt-5.6-terra both return HTTP 404 with 'That model does not exist'. This does not establish whether organization availability or project permissions is responsible. No inference calls were run with the new key.
OpenAI Platform redirected to login. Await user sign-in to inspect actual account/project settings. Do not request an admin key in chat. Vercel CLI authentication succeeds; current team is the user's Hobby team. No Vercel project/environment or deployment has been created for this change.

Access resolved: fresh GET lookups for both requested models now return 200. No fallback model is authorized. Migrate the runtime to standard Next.js for Vercel; preserve the existing React UI and server behavior. The old Sites manifest is retained only as an archival record.
