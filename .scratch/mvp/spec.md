# Conviction MVP

Status: ready-for-agent. Authorized 2026-09-18: plan, create repository, implement end-to-end, code review, involve Jev at each stage. User explicitly requires API key never committed.

## Problem Statement
A venture analyst needs to distinguish what source material supports, contradicts or leaves unknown about a startup, and choose the next useful question.

## Solution
An interactive English workspace for one clearly fictional startup, three fixed assumptions, short prepared sources and up to four new text notes. Run live Jev judgments, inspect original sources, preserve contradictions and show what changed. No investment recommendation or truth score.

## User Stories
1. As an analyst, I can open the fictional case and see its assumptions and sources.
2. As an analyst, I can explicitly run a live analysis and see loading and failure states.
3. As an analyst, I can inspect each source's exact text and its relation to the selected assumption.
4. As an analyst, I can see conflicting sources together, without automatically privileging the newest.
5. As an analyst, I can see a useful next question tied to the selected assumption's current state.
6. As an analyst, I can add a bounded free-text note and rerun analysis.
7. As an analyst, I can see before/after changes while retaining older evidence.
8. As an analyst, I can recover from a service failure without losing the last successful assessment or draft.
9. As an analyst, I can reset the case to its initial, unevaluated state.
10. As a mobile or keyboard user, I can operate the same flow with readable labels and visible focus.
11. As the owner, I can reproduce automated checks, live evaluation, and independent review without exposing credentials.

## Implementation Decisions
- One TypeScript/React application with a server endpoint, one Jev adapter and pure domain aggregation. Sites scaffold in web/; root contains project documentation and review evidence.
- Author-selected defaults under the user's end-to-end delegation: self-serve working surface, prepared fictional case + free text, English UI, private hosted audience. These resolve earlier shaping questions for this MVP; they are not claimed as individually user-selected answers.
- Jev Choice evaluates a source against an assumption as supports, contradicts, mixed or insufficient. Source attribution always retained. Confidence is distribution concentration and is not correctness; no arbitrary automatic verification threshold.
- Aggregate with conflicts first, then support, contradiction, insufficient. A mixed source creates conflict. Original text is rendered as text, never HTML.
- Three fixed assumptions and source identities owned by server; user may add max four notes, each 2–2000 trimmed characters. No arbitrary provider instructions accepted.
- Authored questions depend on assumption + aggregated state. No generated prose or universal conviction score.
- No silent replay. All analysis initiated explicitly, live results labeled; provider failures remain errors. Reset does not call provider.
- Secret only in ignored local environment files and private hosting secret store. No secret in client code, artifacts, Git history, logs or Jev state.
- Restrict POST origin, enforce streaming body limit, schema checks, timeout, bounded retries/concurrency; private hosting access preserved. No public paid-inference endpoint.
- Re-run evidence when adding notes; complete analysis bounded by at most 21 logical judgments across at most seven source-isolated evaluations, at most three concurrent. A single retry on 429/529 permits up to 14 HTTP attempts / 42 transmitted questions in the worst case; the entire analysis still has a 40-second deadline. Any latency/cost claims require actual measurement.

## Testing Decisions
Use the end-to-end authorization to choose test seams without a new approval gate: assess-case behavior with an injected provider; HTTP input/error behavior; browser flow. Test observable output, errors, conflict preservation and freshness. Run a separate labeled live Jev corpus; do not confuse mocked tests with model accuracy. TDD in vertical slices where applicable. Browser QA is required by project contract. Jev advises planning, source semantics, UI wording and final review classification; deterministic tests and independent reviewers remain the correctness evidence.

## Out of Scope
PDF uploads, CRM, scraping, database, billing, autonomous agents, public access, investor outreach and real company claims. No extra providers required.

## Premortem
Likely failure: a confident label masks a weak or contradictory source. Mitigation: per-source judgments and visible original text; no verification label. Dangerous failure: browser or Git exposes the key. Mitigation: server-only environment access and exact-secret scans before every commit and build artifact handoff. Hidden assumption: model performance and latency fit this small case. Validate live corpus before final UX claims.

## Visual direction
Working analyst notebook: deep navy navigation, white evidence canvas, cobalt active selection, plum conflict and teal supporting accents. System sans with restrained Georgia case title. Two-column hypothesis/evidence workspace, clear source list rather than decorative cards; no hero, stock imagery or fake metrics. Mobile stacks the panels.

## Completion
Production build and behavior tests pass; live Jev case and corpus recorded with failures honestly reported; desktop/mobile browser flow checked; nonempty committed diff reviewed on Standards and Spec axes; findings fixed and affected checks repeated; private repository and usable app delivered if services permit.

## Observed implementation adjustment
Browser QA caught cross-source attribution in the original shared-state batch. The provider adapter now isolates each source, while batching its three independent assumption questions. A regression test enforces this request invariant; live evaluation checks the resulting per-source labels.
