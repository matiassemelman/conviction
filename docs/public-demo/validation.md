# Public demo rollout — 2026-09-18

User authorized anonymous link sharing and bounded paid inference. Base: 479ec8c. Public activation and public source release are complete.

## Policy
- Shared allowance: 20 admitted live executions per UTC day across assess and compare, all production instances and new deployments. Owner may set DEMO_DAILY_LIMIT to an integer 1–100.
- Network allowance: 5 admitted executions per fixed 10-minute window. The boundary can permit another window's allowance immediately after reset; this is not a sliding window.
- Admission uses one atomic Redis Lua script before any provider call. Failed or aborted provider runs retain their reservation; they may still consume provider tokens.
- Free Upstash store, auto-upgrade disabled, no eviction. Credential missing, malformed store result, network failure or timeout => 503 before models.
- DISABLE_LIVE_ANALYSIS=1 disables all live runs. Deploy a new production version after changing environment variables. The static case and benchmark stay visible.
- Additional Vercel Hobby firewall rule: /api/ prefix, 20 requests per 60-second fixed window per IP, 429 when exceeded. WAF counters are per-region; the Redis allowance supplies the application-wide cap.
- These are request quotas, not a guaranteed monetary invoice ceiling. Existing input size, output cap, deadlines and retries still bound each admitted execution.

## Privacy and trust
Only counters and HMAC-derived identifiers go to Redis; no notes or raw IPs. IP hashes rotate by UTC day, short-window keys expire at window end plus 60 seconds and daily counters expire at day end plus 60 seconds. Vercel overwrites the forwarded-IP headers used by the deployed handler. Notes still go to TypeSafe/OpenAI when visitors request live analysis; the UI asks for fictional, non-sensitive text.

## Evidence
- 39 automated tests pass, including rejection before paid calls, malformed/missing/unavailable store, emergency switch and input/origin validation before allowance consumption.
- Real Redis 7.0.15, isolated Unix socket with no persistence: 12 simultaneous requests shared across both endpoint paths admitted exactly 3 against allowance 3; 9 returned 429. Fresh handlers saw the same exhausted counter. A new UTC day admitted a run.
- Same-IP concurrency: 5 of 12 reservations admitted; 7 returned visitor-limit errors. The next 10-minute window admitted a run. No external model calls in these integration checks.
- Reproduce against disposable Redis with REDIS_TEST_SOCKET and REDIS_CLI using `web/scripts/check-demo-limits.ts`. This script does not delete data or call model providers.
- Local browser: missing quota configuration preserves the 271-character fictional note and returns a clear pause message; original sources and recorded benchmark remain visible.

## Activation prerequisite
Vercel CLI reported `integration_terms_acceptance_required` for the chosen free Upstash resource. Owner must accept marketplace terms at the Vercel-provided URL before the resource can be provisioned. No paid plan or automatic upgrade selected. The owner subsequently accepted terms; the Free resource was provisioned and connected to production.

## References
- [Upstash REST API](https://upstash.com/docs/redis/features/restapi)
- [Upstash script atomicity](https://upstash.com/docs/redis/features/key-locking)
- [Vercel forwarded headers](https://vercel.com/docs/headers/request-headers)
- [Vercel WAF limits](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- [Vercel deployment protection](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)

Final Standards review: 0 findings. Spec review prompted safe handling of non-JSON edge errors: 429 preserves UI state and shows a controlled retry message. Malformed successful responses are rejected safely. Typecheck, lint and the final deployed production build pass.

## Live activation evidence
- Deployment dpl_2Af2t9WCMAa8cTCqw9vv2viJyRBP is READY at https://conviction-kappa.vercel.app, source checkpoint f67b630.
- Upstash resource store_3gD2uzIedVP43Opz: Available, Free, connected to conviction production. Provisioned with autoUpgrade=false, eviction=false and prodPack=false. REST connectivity returned PONG.
- Managed Upstash concurrency check in the separate development namespace: 12 concurrent reservations, allowance 3, exactly 3 admitted and 9 limited. No model calls.
- Before public activation, protected production comparison completed for Jev, Luna and Terra.
- Public alias returned HTTP 200 with the app; browser without Vercel login completed a Jev run on three sources (312 ms measured provider stage).
- Old immutable URL conviction-e2jv5azls-matiassemelmans-projects.vercel.app and current immutable URL both returned HTTP 302 redirects to Vercel login, checked without following redirects.
- Anonymous invalid-input API burst: 19 HTTP 400 responses followed by HTTP 429 from the edge rule. Invalid requests did not reserve model allowance.

## Public source and final deployment
- GitHub visibility PUBLIC; anonymous GitHub API and raw README/comparison report returned HTTP 200. The repository About section links to the demo.
- All 19 relative README targets are tracked and exist. Exact configured-secret/pattern scan covered 244 historical blobs with no matches; independent semantic review found no confidential/client material.
- Header link points to https://github.com/matiassemelman/conviction. Desktop/mobile browser checks pass; mobile document clientWidth and scrollWidth both 341 CSS pixels in the browser test viewport.
- Final deployment dpl_6L9YDoxS6BYngNeRWDpTsWRXZRbS, checkpoint 3cff9e4. A cached build omitted new header CSS; rebuilding without cache restored the expected stylesheet and passed visual QA.
- Final public-source diff reviews: Standards 0 findings, Spec 0 findings. 39 tests, typecheck, lint and clean production build pass.
