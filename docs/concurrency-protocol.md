# Concurrent development protocol

This protocol applies only when more than one person or write-capable agent works in the
repository at the same time. For single-writer work it is unnecessary overhead; do not load
it into an agent's context unless parallel writers are actually involved.

**Core rule: one writer per file at a time.** Parallel work must be divided into explicit,
non-overlapping path ownership. Never let two people or write-capable agents edit the same
file concurrently.

## Before editing

- The developer owns branch and worktree layout and sets it up before parallel work starts. Agents work on the branch already checked out and never create or switch one. Never run parallel write tasks in the same working tree; if separate trees are needed, the developer creates them first.
- Inspect `git status --short`, the current branch, and the relevant diff before making changes. Existing changes belong to another contributor unless the task explicitly says otherwise.
- Establish a change claim containing: task, owner, the branch or worktree the developer assigned, and exact owned paths or globs. Publish the claim in the team's shared issue, ticket, or pull request before editing; the AI must repeat its claimed paths in its first progress update.
- Claim the narrowest practical scope. A directory-level claim is allowed only when the task genuinely spans that directory.
- If an active claim or existing uncommitted change overlaps the required paths, stay read-only for those paths, report the collision, and wait for an explicit handoff or reassignment. Do not overwrite, revert, stash, or move another contributor's work.

## While editing

- Edit only claimed paths. Request a handoff before crossing into another owner's scope, even for a small cleanup or formatting change.
- Do not perform repository-wide formatting, mechanical refactors, dependency upgrades, or generated-file refreshes unless their complete impact is part of the claim.
- Serialize coordination hotspots under one named owner: `package-lock.json`, root configuration, CI files, shared API contracts/types, `schema.prisma`, migrations, and generated artifacts.
- When frontend and backend work depend on a contract change, agree on the contract first, assign one contract owner, then let each side implement against that version in separate paths.
- Never resolve an unfamiliar merge conflict by choosing one side wholesale. Preserve both intents or stop and ask the affected owners.

## Handoff and integration

- Before handoff, run the checks relevant to the claimed paths and report exactly which files are left modified. Commits, branch synchronization, and conflict resolution are the developer's call — do them only when asked.
- Report the files changed, contract or migration impact, checks run, and any follow-up ownership needed.
- The integration owner merges one contribution at a time and runs the relevant checks after each merge. Shared hotspots are released only after their change is merged or explicitly handed off.

## Ticket interaction

A ticket workspace and its claimed source paths follow the one-writer rule. Different tickets
must not concurrently claim the same source file or coordination hotspot.

## Delegated agents

Before starting write-capable agents, assign each one explicit, non-overlapping owned paths.
Run tasks touching coordination hotspots sequentially. The primary agent owns integration and
final verification; delegated agents must not edit outside their claim.
