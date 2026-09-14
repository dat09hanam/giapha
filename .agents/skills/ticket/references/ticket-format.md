# Ticket file format

Each ticket lives in its own deterministic directory:

```text
tickets/<normalized-ticket-name>/
  ticket.md
  plan.md
  memory.md
```

The helper normalizes Vietnamese text to lowercase ASCII kebab-case. Always resolve through the helper instead of inventing a second folder name.

## `ticket.md`

Use YAML frontmatter with these fields:

```yaml
---
name: 'Canonical ticket name'
slug: 'canonical-ticket-name'
status: 'new'
created: 'YYYY-MM-DD'
updated: 'YYYY-MM-DD'
---
```

Allowed statuses are `new`, `planned`, `in-progress`, `blocked`, and `done`.

Keep these sections:

- Request: the original request plus dated requirement changes.
- Outcome: concise user-visible result.
- Scope: explicit in and out boundaries.
- Acceptance criteria: checkable behavior, not implementation steps.

## `plan.md`

Keep these sections:

- Current objective.
- Work items as checkboxes.
- Owned paths and coordination hotspots.
- Verification commands or manual checks.
- Next action containing one concrete continuation step.

The plan is mutable. Reorder or replace items when evidence changes the implementation approach, while preserving completed work that is still valid.

## `memory.md`

Keep these sections:

- Snapshot: status, last update, current result, and next action.
- Decisions: durable choices with short reasons.
- Files and contracts: only paths and interfaces relevant to resuming.
- Verification: latest meaningful results.
- Blockers and risks.
- Handoff: what the next session must do first.

Memory is a compact factual handoff, not a transcript. Do not place environment secrets, personal data, full logs, or chain-of-thought in it.
