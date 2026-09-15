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

Authenticated mutations use an opaque session token stored in an `HttpOnly`, `SameSite=Strict`
cookie. Only a SHA-256 digest of the token is stored in `AuthSession`; passwords use Node's
memory-hard scrypt implementation with a per-password random salt.

## Tenancy boundary

Shared-schema multi-tenancy is the initial strategy. Tenant-owned records contain `tenantId`, and application services must add it to every read and mutation. A slug is a public locator, not an authorization credential. Private operations added later must resolve both the tenant and the authenticated membership.

Identity and authorization are deliberately separate. There are three effective business roles:

- `Admin` (`User.systemRole=ADMIN`) is a global website-operations role. Admin accounts have no
  tenant memberships and do not inherit access to private genealogy data.
- `MemberPlus` (`TenantMembership.role=MEMBER_PLUS`) may mutate data only inside its resolved tenant.
- `TenantMembership.role=MEMBER` is read-only.
- `User.systemRole=USER` is an internal non-admin marker, not a fourth business role; the effective
  role of a non-admin account is determined by its membership in the selected tenant.
- A session guard loads the current account from the database. A tenant guard then resolves the URL
  slug server-side and loads the active membership by `(tenantId, userId)`. It explicitly rejects
  Admin even if malformed data contains a membership. Services still constrain
  every mutation by that trusted `tenantId` as defense in depth.

Indexes start with `tenantId` because family-tree tables will grow across many independent clans. Database constraints prevent duplicate slugs, duplicate membership, and duplicate relationships; service-level checks must also reject cross-tenant references.

## API boundary

The API returns domain objects (`people`, `parentChildRelationships`, and `partnerships`). It does not expose React Flow node positions or edge types. This keeps presentation choices replaceable and lets mobile or export clients reuse the same API.

Public endpoints:

- `GET /api/health`
- `GET /api/tenants/:slug`
- `GET /api/docs`

Authentication and private mutation endpoints:

- `POST /api/auth/register/clan-head`: atomically creates a user, a new tenant, its primary family,
  a `MEMBER_PLUS` membership, and a session. The client cannot submit a role or tenant ID.
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/tenants/:slug/tree?familyId=<uuid>`: authenticated `MEMBER_PLUS` and `MEMBER`
  memberships in that tenant only; the Next.js Server Component forwards only the opaque session
  cookie and redirects unauthenticated visitors to login.
- `POST /api/tenants/:slug/invitations`: `MEMBER_PLUS` only; issues a time-limited, one-use member
  invitation. Delivery by email remains an integration concern; the MVP returns the token to the
  authenticated clan head. The token is entered directly on the member registration page and is
  not placed in a URL query string.
- `POST /api/auth/invitations/accept`: atomically consumes an invitation and creates a `MEMBER`.
- `POST /api/auth/invitations/join`: lets an already authenticated account with the invited email
  atomically consume the invitation and join as `MEMBER`; platform admins cannot join.
- `PATCH /api/tenants/:slug`: `MEMBER_PLUS` only.
- `POST|PATCH|DELETE /api/tenants/:slug/people`: `MEMBER_PLUS` only and tenant-scoped.
- `POST|PATCH|DELETE /api/tenants/:slug/relationships/parents` and
  `/partnerships`: `MEMBER_PLUS` only; endpoints check both people belong to the same tenant and
  family, and prevent parent-child ancestry cycles.

Platform administrator accounts have no public registration endpoint. They must be provisioned by
the `admin:bootstrap` API workspace command using `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and
`DATABASE_URL` from a secure operator environment. It creates an admin without tenant membership;
an existing tenant user cannot be promoted by this command. Admins use separate
platform-management endpoints when those are introduced.

The auth profile exposes `platformRole=ADMIN` only for Admin accounts, and tenant memberships with
`MEMBER_PLUS` or `MEMBER` roles for clan accounts. It does not expose the internal `USER` marker.
The role-label change is an append-only migration that backfills previous values before narrowing
the MySQL enums; stop old API instances before applying it.

The onboarding MVP activates a newly created tenant before email ownership verification and
returns an invitation token to the clan head for private delivery. Before public production
signup, introduce email verification, outbound invitation delivery, and a shared/trusted-edge
rate limiter. The current in-process limiter is suitable only for one local API process. Review
existing tenants for exactly one legacy `OWNER` before applying the role migration; coordinate
deployment so old application instances cannot write legacy enum values during contraction.

Media storage, outbound invitation email, audit logs, account recovery, and
field-level privacy policies remain follow-up work.

## Data model notes

- A tenant owns families, people, relationships, and memberships.
- A family is a named tree inside one tenant. The model supports more than one tree per tenant without changing the URL strategy.
- Parent-child and partnership records are explicit join entities so relationship type and historical dates can evolve.
- Partial or unknown genealogy dates remain nullable.
- The starter layout is deterministic and client-side. Large trees should later use viewport-based loading and a dedicated layout worker.
