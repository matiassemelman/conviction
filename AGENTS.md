# Conviction

Read CURRENT.md, then README.md and CONTEXT.md.

Build the agreed MVP with minimal, readable code. Keep product rules out of UI components and provider details behind one small interface. Avoid speculative abstractions. Preserve user changes.

## Agent skills

Use the AI Hero versions under .agents/skills/ for this project; do not silently substitute same-named global skills. Upstream revision: 959a8e9f1edc3adbe2f7e3054bb6fbefa6696260.

### TypeSafe
Use `.agents/skills/typesafe-ai/SKILL.md` when designing or implementing Conviction’s TypeSafe-powered behavior, as explicitly requested by Matias on 2026-09-18. Read relevant live documentation and cookbook before integration; preserve the minimal MVP scope. Official source: typesafe-ai/skills; installation is tracked in skills-lock.json.

### Issue tracker
Local Markdown, configured in docs/agents/issue-tracker.md.

### Domain docs
Single context; see docs/agents/domain.md. CONTEXT.md is only a glossary.

## Delivery rules
Use existing conversation decisions. Product questions still open in README.md require answers before dependent work. Runtime failures and unsupported AI outputs must remain visible. Fictional data and replay are clearly identified. No external publication, contact or spending is authorized by local preparation.

When implementing, capture the Git base, verify behavior, create a local checkpoint before the one final code-review so its base..HEAD diff contains the implementation. Correct verified findings and rerun affected checks. Browser QA is required for the demonstrable flow.
