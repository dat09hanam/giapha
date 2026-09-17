# API workspace guidance

- Controllers validate transport input and delegate; business and tenancy rules belong in services.
- Resolve a tenant by public slug, then use its server-resolved `id` in every tenant-owned query.
- Keep response DTOs domain-oriented and avoid returning Prisma records wholesale.
- Never accept `tenantId` as proof of access. Authenticated mutations added later must verify tenant membership and role.
- Prisma migrations are append-only once created. Destructive database commands require explicit user approval.
- After substantive changes run `npm run lint`, `npm run typecheck`, and `npm run test --workspace @giapha/api`, plus `npm run prisma:validate --workspace @giapha/api` when the schema changed. Run the API build only before a release-facing handoff.
