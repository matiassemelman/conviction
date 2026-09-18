# Execution trace

User request 2026-09-18: analysis is too fast to appreciate; show a trace of what occurred and observability.
Base: aa9afda0fa0d844fdfbc4ef119a4295e12dc274f.

## Behavior
After an analysis, an expanded Execution trace panel remains visible above the case. It shows a run ID/time, measured server duration, successful response token usage, actual source request spans on a common timeline, retry attempts and HTTP outcomes, model identity, inspectable request bodies and validated structured answers, and the deterministic aggregation/next-question outcomes. Selected source details expand without new inference. No fake delays, simulated progress or invented chain-of-thought.

A failed provider run returns its partial trace while keeping the last successful case and unsent draft. Never display a previous trace as belonging to a failed/unrecorded attempt. Show unavailable usage explicitly for failures; no estimated money cost. Timing is locally measured request/processing latency, not an internal provider profiler. Up to three sources remain concurrent. No global telemetry, database or third-party logging service; trace lives in the current browser session and resets with the case. No public access change.

Credentials, headers and raw provider error bodies must never enter trace data. Request bodies contain only the case sources, assumptions, rubric and requested model. Responses expose only validated fields. Use actual measured status/timing per attempt, including 429/529 retry, network failure and invalid response. A known HTTP status and reported usage survive validation failures when safely available. Not-started sources are explicitly marked skipped if the run aborts before their batch.

Tests at existing seams: provider request/response behavior, assessCase trace propagation, HTTP failure serialization. Regression tests verify retries, source identity under parallel completion, no secret leakage, partial failure and successful aggregation. Browser QA checks persistent trace, expanding source details, mobile layout and unchanged primary flow. Exact committed diff gets Standards/Spec review; existing private Site is updated after validation. Jev contributes a bounded design sanity check and a live product trace.
