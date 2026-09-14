# Ticket workspaces

Ticket workspaces let Codex resume a feature without rediscovering the entire repository. Each ticket keeps its specification, current plan, and compact factual memory in an isolated directory.

## Invoke

The supported Codex invocation is:

```text
$ticket quan-ly-thanh-vien
Add member search and pagination to the tenant admin page.
```

The repository also recognizes this plain-text alias when the client sends it to the model:

```text
/ticket quan-ly-thanh-vien
Add member search and pagination to the tenant admin page.
```

You can also select the ticket first and send the requirement in the next message:

```text
/ticket quan-ly-thanh-vien
```

```text
Add member search and pagination to the tenant admin page.
```

The selected ticket remains active in that conversation until you select another ticket or explicitly end its context.

If the IDE intercepts or rejects the custom `/ticket` text, use `$ticket`; native arbitrary slash commands are not repository-scoped in Codex.

Use the same ticket name to resume it later:

```text
$ticket quan-ly-thanh-vien
Continue the next unfinished plan item.
```

## Stored context

```text
tickets/<ticket-slug>/
  ticket.md    Requirements, scope, and acceptance criteria
  plan.md      Work items, ownership, verification, and next action
  memory.md    Decisions, touched files, results, blockers, and handoff
```

Ticket folders are intended to be committed with the code so the whole team shares the same context. Memory must contain concise engineering facts only—never credentials, personal data, hidden reasoning, or full chat transcripts.

Each writer owns one ticket directory and explicitly claimed source paths. Do not update the same ticket from two write-capable sessions at once.
