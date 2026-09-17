---
name: ticket
description: Create or resume a named repository ticket workspace with compact plan and memory files. Use when the user invokes the ticket skill, sends the ticket slash alias, or asks to continue work on a named ticket; do not use for unrelated one-off questions.
---

# Ticket workflow

Use this skill to keep one ticket's intent, execution plan, and durable handoff context independent from chat history.

## Parse the invocation

- Accept `$ticket <name>` as the supported Codex skill invocation.
- Also treat a user message whose first non-empty line is `/ticket <name>` as an alias when the client sends it as plain text.
- The rest of the first line is the ticket name. All following lines are the request or update for that ticket.
- If the name is missing, ask for it. If the command has no request body, resolve or initialize the ticket, make it the active ticket for the current conversation, create no source changes, and wait for the next user message as its request or update.

## Resolve before reading code

1. Run `node .agents/skills/ticket/scripts/ticket.mjs resolve "<name>"` from the repository root.
2. If the ticket exists, read only its `memory.md`, `plan.md`, and `ticket.md` before inspecting code. Do not read other ticket directories.
3. If it does not exist, read [references/ticket-format.md](references/ticket-format.md), then run `node .agents/skills/ticket/scripts/ticket.mjs init "<name>"`. Immediately replace the initial content with the actual request, acceptance criteria, and an actionable plan before changing source code.
4. If an existing directory has a materially different canonical name despite the same normalized slug, stop and ask whether to reuse it or choose another name.

Ticket documents are compact navigation aids, not unquestionable truth. Verify referenced code and current diffs before editing. The user's latest explicit requirement overrides older ticket notes; record the change instead of silently discarding history.

## Execute the ticket

- For an existing ticket, give a short state recap, combine the new request with unfinished plan items, and continue from the recorded next action.
- For a new ticket, define the outcome, in-scope and out-of-scope behavior, acceptance criteria, risks, and verification before implementation.
- While a ticket is active in the current conversation, apply subsequent ticket requirements to it until the user selects another ticket or explicitly ends that context.
- When another contributor or write-capable agent is active at the same time, follow [docs/concurrency-protocol.md](../../../docs/concurrency-protocol.md) and claim the ticket directory and exact source paths before writing. Single-writer work does not need a claim.
- Inspect only code referenced by the ticket or needed for the active plan item. Expand the search when evidence shows the ticket context is stale or incomplete.
- Update `ticket.md` when requirements or acceptance criteria change, and `plan.md` as work items move. Update `memory.md` once, before a handoff or final response — not after every step.

## Memory rules

Keep `memory.md` useful to an engineer opening a fresh chat:

- Store current state, durable decisions and their reasons, touched files, contracts or migrations, verification results, blockers, and the exact next action.
- Store facts and conclusions only. Never store hidden reasoning, chain-of-thought, secrets, credentials, personal data, full command logs, or large code copies.
- Compact obsolete session notes instead of endlessly appending. Keep the file under 200 lines unless the ticket genuinely requires more.
- Mark a ticket `done` only when its acceptance criteria and required verification are complete. A blocked or partially verified ticket remains `in-progress` or `blocked` with a precise next action.

Before the final response, make the three ticket files agree with the actual repository state and report their paths to the user.
