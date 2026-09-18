# Public demo with bounded live usage

Authorized 2026-09-18: user accepted making the demo usable by anyone with the link and limiting paid inference. Base: 479ec8c34f61ab93ef0345f0d553a9b216185a11.

## Behavior
- The production alias opens without a Vercel login. Keep preview and immutable deployment URLs protected, including older versions without these guards.
- Both /api/assess and /api/compare require an atomic central reservation after origin/body validation and before calling any model. Same quota across routes, deployments and instances.
- Default shared allowance: 20 live executions per UTC day, pending optional user preference. Each successful reservation counts once even if provider inference later fails. No refund races.
- Per-IP allowance: 5 executions per fixed 10-minute window. Store HMAC identifiers and counts only, never source notes or raw addresses. Expire short-window keys.
- Missing configuration, invalid store responses, timeouts or store failure block live inference. Clear 429/503 response preserves existing case, draft and comparison; static case and recorded benchmark stay accessible.
- Explicit server-side kill switch disables paid inference without hiding the app. No client-provided quota/bypass.
- Preserve existing maximum input length, provider timeout/retry policy and output cap. Quota limits executions, not a guaranteed dollar invoice cap.

## Implementation
Use one small admission module and the existing shared HTTP seam. Free Upstash Redis selected with auto-upgrade off; one Lua EVAL checks both counters and reserves atomically. Vercel Hobby edge rate rule additionally limits API bursts before application calls. No user accounts, history database or model fallback.

## Premortem
Likely failure: in-memory limits reset across Vercel instances. Use centralized atomic counters and test concurrent requests. Dangerous failure: public callers reach an old unguarded deployment. Preserve protection on immutable/preview deployments and verify old URLs after exposing only the production alias. Hidden assumption: the free quota store is configured and available; fail closed and verify its actual paid-call gate before opening the alias. Upstash installation currently requires owner acceptance of marketplace terms; implementation and validation can continue independently.

## Validation
Under existing end-to-end authorization, use existing HTTP/provider seams and a quota-store HTTP adapter seam. Tests prove rejection before paid calls, central shared counters, failed/missing-store behavior and safe messages. Verify the Lua concurrency behavior against Redis before release. Browser checks: public page, live success, quota rejection preserving existing content and mobile layout. Final committed diff gets one AI Hero Standards/Spec review. No new paid subscription.
