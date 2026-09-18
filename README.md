# Conviction

## Objective
Build a small, convincing MVP to show Loop3: help an analyst see what supports or contradicts an assumption, identify what remains unknown and choose a useful next question. New evidence should visibly update the evaluation.

Matias selected this concept on 2026-09-16 and approved starting the proposed AI Hero workflow. Minimal code and maintainability are explicit requirements.

## Confirmed and proposed
Confirmed: product direction, Loop3 audience, demonstrable MVP, minimal code.
Proposed, not yet confirmed: one fictional startup, three assumptions, prepared source documents plus a new text note, English UI, a 90-second self-serve flow. Detailed state semantics and acceptance criteria remain open.

## First round of questions
1. Self-serve interactive link or a demo Matias drives during a meeting?
2. Prepared case plus free-text note, or arbitrary document uploads?
3. Resolved 2026-09-18: Matias reports TypeSafe access enabled after completing the waitlist form. API key configuration and a real API request are not yet verified. Never capture a key in chat or docs.

On 2026-09-18 Matias authorized end-to-end planning and execution. For this MVP the agent selected self-serve + prepared case and free-text notes under that delegation. See .scratch/mvp/spec.md; this supersedes the pending interview for the current implementation.

## Workflow
Setup complete using the local Markdown configuration recommended in the accepted sequence. Next: grill-with-docs → bounded logic prototype if needed → compact to-spec → implement with TDD/codebase-design → exact-diff code-review and browser QA. To-tickets only if the actual spec needs it.

Planning report: /home/matias/Documents/Codex/2026-09-16/c/outputs/Conviction-secuencia-skills-MVP.md.

TypeSafe integration research and proposed scope: [docs/typesafe-fit.md](docs/typesafe-fit.md). Official documentation reviewed on 2026-09-18; no live inference tested. The recommendation preserves the pending product decisions above.

## Evidence and limits
Loop3 publishes sourcing, historical snapshots and contextual intelligence: https://www.loop3.ai/case-studies/sourcing-platform and https://www.loop3.ai/news/the-real-ai-advantage-isn-t-chat-gpt-or-claude-it-s-context . Conviction is our portfolio hypothesis, not a Loop3 commission or validated buyer request.
Jev documentation: https://docs.typesafe.ai/introduction . Account access was confirmed by Matias on 2026-09-18; runtime integration remains unverified. Classification is distinct from generating the next question; the latter's simplest useful implementation must be settled in shaping.

## Skills provenance
Ten project-local skills from mattpocock/skills, commit 959a8e9f1edc3adbe2f7e3054bb6fbefa6696260. Their support files were installed with them. Global skills untouched. No implementation, deployed product, provider execution or external contact is claimed.


## TypeSafe skill
Installed the official typesafe-ai skill locally for Codex on 2026-09-18 using only `npx skills add typesafe-ai/skills --skill typesafe-ai --agent codex --yes`. Entry: `.agents/skills/typesafe-ai/SKILL.md`; source and content hash recorded in `skills-lock.json`. Read in full after installation. Use it alongside the AI Hero workflow for this project. No API call or credential change was made during installation.
