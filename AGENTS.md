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

## Concurrent development protocol (mandatory)

**Core rule: one writer per file at a time.** Parallel work must be divided into explicit, non-overlapping path ownership. Never let two people or write-capable agents edit the same file concurrently.

### Before editing

- Work on a dedicated branch and preferably a dedicated Git worktree or clone. Never run parallel write tasks in the same working tree.
- Inspect `git status --short`, the current branch, and the relevant diff before making changes. Existing changes belong to another contributor unless the task explicitly says otherwise.
- Establish a change claim containing: task, owner, branch/worktree, and exact owned paths or globs. Publish the claim in the team's shared issue, ticket, or pull request before editing; the AI must repeat its claimed paths in its first progress update.
- Claim the narrowest practical scope. A directory-level claim is allowed only when the task genuinely spans that directory.
- If an active claim or existing uncommitted change overlaps the required paths, stay read-only for those paths, report the collision, and wait for an explicit handoff or reassignment. Do not overwrite, revert, stash, or move another contributor's work.

### While editing

- Edit only claimed paths. Request a handoff before crossing into another owner's scope, even for a small cleanup or formatting change.
- Do not perform repository-wide formatting, mechanical refactors, dependency upgrades, or generated-file refreshes unless their complete impact is part of the claim.
- Serialize coordination hotspots under one named owner: `package-lock.json`, root configuration, CI files, shared API contracts/types, `schema.prisma`, migrations, and generated artifacts.
- When frontend and backend work depend on a contract change, agree on the contract first, assign one contract owner, then let each side implement against that version in separate paths.
- Never resolve an unfamiliar merge conflict by choosing one side wholesale. Preserve both intents or stop and ask the affected owners.

### Handoff and integration

- Keep commits small and cohesive. Before handoff, synchronize with the target branch, resolve conflicts on the contributor's own branch, and run checks relevant to the claimed paths.
- Report the files changed, contract or migration impact, checks run, and any follow-up ownership needed.
- The integration owner merges one contribution at a time and runs the relevant checks after each merge. Shared hotspots are released only after their change is merged or explicitly handed off.

## Ticket workflow

- When the first non-empty user line is `/ticket <name>`, treat it as an alias for the repository `$ticket` skill and follow `.agents/skills/ticket/SKILL.md`.
- The ticket name is the remainder of the first line; subsequent lines contain the request or update.
- If `/ticket <name>` has no request body, resolve or initialize it as the active ticket for the current conversation and treat the next user message as its request or update. Do not modify application source until that requirement arrives.
- Resolve ticket names through the skill helper. For an existing ticket, read only its `memory.md`, `plan.md`, and `ticket.md` before inspecting referenced code. Do not scan unrelated ticket contents.
- Keep ticket state under `tickets/<slug>/`. Synchronize its requirements, plan, and memory before every handoff or final response.
- A ticket workspace and its claimed source paths follow the one-writer rule. Different tickets must not concurrently claim the same source file or coordination hotspot.

## Verification

- Run `npm run lint`, `npm run typecheck`, and relevant tests for changed workspaces.
- Run `npm run build` before handing off cross-workspace or release-facing changes.
- Database changes require `npm run db:generate` and a reviewed migration.

## Agent orchestration

- For complex tasks, delegate independent, bounded work to the relevant project agents in `.codex/agents/` and wait for their findings before integrating.
- Use read-only agents for exploration, architecture, QA review, and security review.
- Before starting write-capable agents, assign each one explicit, non-overlapping owned paths. Run tasks touching coordination hotspots sequentially.
- The primary agent owns integration and final verification; delegated agents must not edit outside their claim.
- Ask the `product_analyst` to turn new business requirements into acceptance criteria before implementation when scope is ambiguous.
- Ask `solution_architect` to review cross-cutting decisions, `frontend_engineer` for `apps/web`, `backend_engineer` for `apps/api`, and `database_engineer` for schema or migration work.
