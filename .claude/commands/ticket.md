---
description: Tạo mới hoặc tiếp tục một ticket trong tickets/<slug>/
argument-hint: <ten-ticket> [yêu cầu hoặc cập nhật]
---

Invocation arguments: $ARGUMENTS

Follow `.agents/skills/ticket/SKILL.md` exactly — it is the authoritative definition of this
workflow. Parse the arguments the way that skill describes: the first line (or first word) is the
ticket name, and everything after it is the request or update for that ticket.

1. Run `node .agents/skills/ticket/scripts/ticket.mjs resolve "<name>"` from the repository root.
2. If the result says `"exists": true`, read only `memory.md`, `plan.md` and `ticket.md` inside that
   ticket directory, give a short state recap, then continue from the recorded next action. Do not
   read other ticket directories.
3. If it says `"exists": false`, read `.agents/skills/ticket/references/ticket-format.md`, run
   `node .agents/skills/ticket/scripts/ticket.mjs init "<name>"`, then replace the placeholder
   content with the real request and acceptance criteria before changing any source.
4. If no request body was given, make this the active ticket for the conversation and wait for the
   next message as its request. Do not modify application source yet.

The repository rules in `AGENTS.md` apply, including the developer-owned branch rules.
