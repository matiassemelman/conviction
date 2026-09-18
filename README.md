# Conviction

Private demo: https://conviction-matias.matiassemelman.chatgpt.site

A small venture diligence workspace powered by TypeSafe Jev. Inspect three assumptions about a fictional startup, read the sources behind each judgment, surface conflicts and add a note to see what changes.

## Run locally

Requires Node 24 and npm. From `web/`, run `npm ci`, copy `.env.example` to `.dev.vars`, set your TypeSafe key there, and run `npm run dev`. Use the printed local URL. Never commit `.dev.vars` or `.env*` files. To run the live evaluation script, place the same key in the ignored `.env.local` file.

1. Click **Analyze with Jev**.
2. Inspect the payment contradiction and the weekly-usage evidence gap.
3. Select **Usage becomes a weekly habit**.
4. Click **Use a fictional activity note**, then **Add note & analyze**.
5. Inspect the changed assessment and original source trail.

Notes live only in browser memory and are sent to TypeSafe when you analyze. Refreshing or resetting clears them. This is a fictional demonstration, not an investment recommendation. Supported by a source does not mean independently verified.

## Architecture

`web/app/page.tsx` owns the interaction. `web/lib/assessment.ts` aggregates source judgments and selects authored follow-up questions. `web/lib/server/jev.ts` calls the official TypeSafe HTTP API, checks the typed response and limits each request to one source. `web/app/api/assess/route.ts` keeps credentials on the server.

Each source gets one request containing the three independent assumption questions. Up to three requests run concurrently, with a 40-second overall timeout. At most seven logical source evaluations (21 judgments) are needed; one retry per source on 429/529 permits at most 14 HTTP attempts (42 transmitted questions). Sources are never placed together in one provider request: browser QA caught cross-source contamination in the earlier batch design. At most four notes of 2000 characters are accepted; all existing sources remain visible. No database, vector store, autonomous agents or second model.

The deployment is owner-private through Sites. The request origin check and per-isolate concurrency guard are defense in depth, not a public API authentication system. Do not expose this paid-inference endpoint publicly without adding appropriate access and usage controls.

## Checks

From `web/`:

- `npm test`: behavior, source preservation, provider validation and HTTP input/error tests.
- `npm run typecheck` and `npm run lint`: application checks. The untouched generated UI catalog and its mobile hook are excluded from lint; the consumed primitives are covered by typechecking and browser QA.
- `npm run build`: production build.
- `node --env-file=.env.local --experimental-strip-types scripts/evaluate.ts`: real Jev calls on the labeled synthetic corpus and the before/after demo. Uses your provider quota. Writes non-secret receipts under `docs/jev/`.

Run `python3 scripts/check-secrets.py` from the repository root before every commit. It scans staged files for the configured key and credential-shaped strings. Production output is separately scanned before packaging.

## Scope and evidence

Implementation spec: [.scratch/mvp/spec.md](.scratch/mvp/spec.md). Current state: [CURRENT.md](CURRENT.md). TypeSafe research: [docs/typesafe-fit.md](docs/typesafe-fit.md). Live stage receipts: [docs/jev](docs/jev).

Matias selected Conviction on 2026-09-16 and authorized end-to-end planning, repository creation, implementation and code review on 2026-09-18. Self-serve flow, prepared fictional case, text notes, English UI and private hosting were selected under that delegation. Jev contributes typed judgments at planning, design, implementation/evaluation and review stages; it does not generate this application or replace deterministic checks and independent code review.

The live corpus is small and synthetic. Initial prompt: 10/11; the conflicting-statements case needed a clearer rubric. These results are iteration evidence, not an estimate of general investment-analysis accuracy. See [the validation and review report](docs/validation.md) for current results and limits.

## Provenance

Project-local AI Hero skills are pinned to `mattpocock/skills` revision `959a8e9f1edc3adbe2f7e3054bb6fbefa6696260` (see `AGENTS.md` for the full canonical revision). Official TypeSafe skill installed through `npx skills` on 2026-09-18 and recorded in `skills-lock.json`.

Sites scaffold retains its provided UI primitives and lockfile. Vulnerable scaffold dependencies were updated together to compatible patched releases; no forced dependency overrides were used.

Conviction is a portfolio hypothesis for the Loop3 opportunity, not a Loop3 commission or a validated buyer request.
