# Architecture baseline

## System shape

The repository is an npm-workspaces monorepo:

- `apps/web`: Next.js App Router application. It owns the public `/{slug}` route and maps domain data to React Flow nodes and edges.
- `apps/api`: NestJS REST API. It owns input validation, tenant resolution, business rules, and persistence through Prisma.
- MySQL 8.4: persistent relational storage, configured locally through `docker-compose.yml`.

The browser-facing path is:

```text
GET /demo
  -> Next.js app/[slug]/page.tsx
  -> GET /api/tenants/demo/tree
  -> tenant resolved by slug
  -> every family query constrained by tenantId
  -> domain tree response
  -> frontend layout maps people and relationships to React Flow
```

## Tenancy boundary

Shared-schema multi-tenancy is the initial strategy. Tenant-owned records contain `tenantId`, and application services must add it to every read and mutation. A slug is a public locator, not an authorization credential. Private operations added later must resolve both the tenant and the authenticated membership.

Indexes start with `tenantId` because family-tree tables will grow across many independent clans. Database constraints prevent duplicate slugs, duplicate membership, and duplicate relationships; service-level checks must also reject cross-tenant references.

## API boundary

The API returns domain objects (`people`, `parentChildRelationships`, and `partnerships`). It does not expose React Flow node positions or edge types. This keeps presentation choices replaceable and lets mobile or export clients reuse the same API.

Initial public endpoints:

- `GET /api/health`
- `GET /api/tenants/:slug`
- `GET /api/tenants/:slug/tree?familyId=<uuid>`
- `GET /api/docs`

Authentication, invitations, editing, media storage, audit logs, and privacy policies remain intentionally out of scope until their business rules are specified.

## Data model notes

- A tenant owns families, people, relationships, and memberships.
- A family is a named tree inside one tenant. The model supports more than one tree per tenant without changing the URL strategy.
- Parent-child and partnership records are explicit join entities so relationship type and historical dates can evolve.
- Partial or unknown genealogy dates remain nullable.
- The starter layout is deterministic and client-side. Large trees should later use viewport-based loading and a dedicated layout worker.
