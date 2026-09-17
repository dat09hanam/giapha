# Gia Pha engineering guidance

## Product and architecture invariants

- This repository is a multi-tenant family tree application. The public tenant URL is `/{slug}`.
- Use Next.js App Router, React, TypeScript, Tailwind CSS, and shadcn/ui patterns in `apps/web`.
- Use NestJS, TypeScript, Prisma, and MySQL in `apps/api`.
- Keep tenant isolation explicit. Every tenant-owned database query must include a trusted `tenantId`; never authorize data access from a client-supplied tenant ID alone.
- Keep API contracts independent from React Flow. Convert domain responses to graph nodes and edges in the web app.
- Treat genealogy data as sensitive personal data. Avoid logging biographies, dates of birth, credentials, or private member details.

## Working agreements

- Inspect the nearest `AGENTS.md` before editing a workspace.
- Prefer small modules, strict TypeScript, DTO validation, and explicit return types at public boundaries.
- Do not use `any` unless an external library makes it unavoidable and the reason is documented.
- Do not add a dependency when a small, readable local implementation is sufficient.
- Do not create `*.spec.ts` files. Verify changes without adding files that use this test naming convention.
- Preserve unrelated user changes. Never rewrite an existing migration after it may have been applied.
- Update `docs/architecture.md` when changing a system boundary, tenancy strategy, or core data model.

## When to ask, and when to decide

- Default to deciding. Make routine judgment calls the way a careful engineer would, state the assumption in one line, and keep going. Do not ask for confirmation of something the request already implies.
- Never ask "should I proceed?", "is this okay?", or "do you want me to continue?" after the work has been requested. Do the work and report what was done.
- Ask only in two cases: a permission or credential that cannot be obtained otherwise, or a genuine fork where two readings of the request lead to materially different work.
- When it is a genuine fork, do not ask an open question. Present 2-4 concrete named options with their trade-offs and say which one you recommend and why.
- Ask everything in one round, not one question at a time. Before asking, finish every part of the task that does not depend on the answer.
- If a concern is raised and the user restates the request, treat that as the decision and proceed with the full request.

## Version control (developer-owned)

- Branches belong to the developer. Never create, switch, rename, or delete a branch, and never create a Git worktree. Work on whatever branch is already checked out, including `main`.
- A new request is not a reason to start a new branch. Ask the developer if the current branch looks wrong for the task; do not switch on your own.
- Do not stage, commit, push, or open a pull request unless the user asks for it in that message. Leave changes in the working tree and say what you changed.
- Never `stash`, `reset`, `revert`, `checkout --`, or otherwise discard uncommitted work.

## Searching the repository

- Exclude `node_modules`, `.next`, `dist`, and `apps/api/src/generated` from every search, listing, and file walk. Use `rg` (which honors `.gitignore`) rather than bare `find` or `grep -r`.
- Read the specific region you need rather than whole large files.

## Ticket workflow

- When the first non-empty user line is `/ticket <name>`, treat it as an alias for the repository `$ticket` skill and follow `.agents/skills/ticket/SKILL.md`.
- The ticket name is the remainder of the first line; subsequent lines contain the request or update.
- If `/ticket <name>` has no request body, resolve or initialize it as the active ticket for the current conversation and treat the next user message as its request or update. Do not modify application source until that requirement arrives.
- Resolve ticket names through the skill helper. For an existing ticket, read only its `memory.md`, `plan.md`, and `ticket.md` before inspecting referenced code. Do not scan unrelated ticket contents.
- Keep ticket state under `tickets/<slug>/`. Bring its requirements, plan, and memory up to date once, before the final response or handoff.

## Verification

- Run checks scoped to what you changed: `npm run lint --workspace @giapha/api` or `--workspace @giapha/web`, and the matching `npm run typecheck`. Run the root-level `npm run lint`/`npm run typecheck` only when both workspaces changed.
- Run `npm run build` only before a release-facing handoff or when a change plausibly breaks the build. Pipe its output through `tail -20`; do not paste a full build log into context.
- Database changes require `npm run db:generate` and a reviewed migration.
- Report failures with the relevant output, not the whole log.

## Agent orchestration

- Delegation is opt-in. Do the work in the current session by default, even when the task is large; every subagent starts with an empty context and re-reads the same code, which multiplies token cost.
- Delegate to the agents in `.codex/agents/` only when the user explicitly asks for it, or when a task genuinely needs isolated parallel work across non-overlapping paths — then say so before starting.
- When you do delegate, give each agent a bounded scope and the exact files it needs, so it does not re-explore the repository.

## Concurrent work

When more than one person or write-capable agent works in this repository at the same time,
follow [docs/concurrency-protocol.md](docs/concurrency-protocol.md): one writer per file,
explicit non-overlapping path claims, and serialized coordination hotspots. Single-writer work
does not need that protocol.
