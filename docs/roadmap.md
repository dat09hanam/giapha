# Suggested delivery slices

1. Foundation: tenant route, read-only family tree, seed data, local MySQL, API documentation.
2. Identity: sign-in, tenant membership, roles, invitations, session security, audit trail.
3. Editing: people, parent-child and partnership commands with cycle and duplicate detection.
4. Privacy: per-person visibility, living-person safeguards, consent, export and deletion workflows.
5. Media and storytelling: avatars, documents, albums, biographies, events, storage lifecycle.
6. Scale and operations: large-tree layout, pagination/subtree loading, backups, observability, rate limits, deployment.

Each slice should begin with acceptance criteria from `product_analyst` and an isolation review from `solution_architect` or `security_reviewer`.
