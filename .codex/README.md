# Project-scoped Codex agents

Codex loads the TOML files in `.codex/agents/` as specialized, project-scoped agents.
They inherit the parent model unless a future task explicitly selects another model.

Suggested prompts:

- `Use product_analyst and solution_architect to refine this feature before coding: ...`
- `Delegate the web UI to frontend_engineer and the endpoint to backend_engineer; integrate after both finish.`
- `Have database_engineer review tenant isolation for this schema change.`
- `Run qa_reviewer and security_reviewer in parallel, then summarize only actionable findings.`

Write-heavy agents own separate areas. Do not ask multiple agents to edit the same files concurrently.

## Required concurrency prompt

Before delegating a write task, include an explicit ownership block:

```text
Task: <bounded outcome>
Owner: <person or agent>
Branch/worktree: <name or path>
Owned paths: <exact files or narrow globs>
Coordination hotspots: <shared contract, lockfile, schema, migration, or none>
```

The repository-level `AGENTS.md` enforces one writer per file at a time. If two ownership blocks overlap, keep the later task read-only until the first owner merges or explicitly hands off the affected paths.
