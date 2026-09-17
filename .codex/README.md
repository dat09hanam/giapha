# Project-scoped Codex agents

Codex loads the TOML files in `.codex/agents/` as specialized, project-scoped agents.
They inherit the parent model unless a future task explicitly selects another model.

Delegation is opt-in. By default the primary session does the work itself; every agent below
starts with an empty context and re-reads the repository, so each one you spawn multiplies
token cost. Use them when isolated parallel work across non-overlapping paths is genuinely
worth that cost, and name the files each agent needs so it does not re-explore the repo.

Suggested prompts:

- `Use product_analyst to turn this ambiguous requirement into acceptance criteria: ...`
- `Delegate the web UI to frontend_engineer and the endpoint to backend_engineer; integrate after both finish. Owned paths below.`
- `Have database_engineer review tenant isolation for this schema change in schema.prisma.`
- `Have security_reviewer check apps/api/src/auth for tenant-isolation gaps; report only actionable findings.`

Write-heavy agents own separate areas. Do not ask multiple agents to edit the same files concurrently.

## Required concurrency prompt

Before delegating a write task, include an explicit ownership block:

```text
Task: <bounded outcome>
Owner: <person or agent>
Branch/worktree (chosen and created by the developer): <name or path>
Owned paths: <exact files or narrow globs>
Coordination hotspots: <shared contract, lockfile, schema, migration, or none>
```

`docs/concurrency-protocol.md` enforces one writer per file at a time. If two ownership blocks overlap, keep the later task read-only until the first owner merges or explicitly hands off the affected paths.
