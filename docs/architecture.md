# Architecture baseline

## System shape

The repository is an npm-workspaces monorepo:

- `apps/web`: Next.js App Router UI. Public Family pages use `/{slug}` and the platform dashboard uses `/admin`.
- `apps/api`: NestJS API with DTO validation, authorization guards and Prisma persistence.
- MySQL 8.4: relational storage configured by `DATABASE_URL`.

The browser keeps an opaque session token in an `HttpOnly`, `SameSite=Strict` cookie. Only its
SHA-256 digest is stored in `AuthSession`. Passwords use scrypt with an independent random salt and
plaintext credentials are never persisted.

## Family authorization boundary

`Family` is the root data boundary. Its globally unique slug is a public locator, not proof of
authorization. A session loads the trusted `User.familyId`; Family guards compare that ID with the
Family resolved from the URL before allowing access.

The three roles are stored directly on `User`:

- `ADMIN`: platform operator, always has `familyId = NULL`. It may create a Family but does not
  inherit access to private genealogy data.
- `MEMBER_PLUS`: the clan head, attached to one Family and allowed to mutate that Family.
- `MEMBER`: attached to one Family and read-only.

Every Family-owned query must use the server-trusted `familyId`. Client-supplied IDs and slugs are
never sufficient authorization.

## Authentication and Family provisioning

Authentication uses the globally unique `User.username`; email is not stored on the account and is
not accepted by the login contract. Unknown username, incorrect password, suspended account and
other invalid credentials produce the same authentication failure. Login is rate-limited per API
process.

Endpoints:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/families`: `ADMIN` only. It atomically creates one Family, one `MEMBER_PLUS` account and
  one `MEMBER` account.
- `GET /api/families/:slug` and authenticated `GET /api/families/:slug/tree`
- `PATCH /api/families/:slug` and Person mutations: `MEMBER_PLUS` only.

The old public clan-head registration and invitation endpoints are removed. Pending invitation
accounts are migrated to `SUSPENDED` and their tokens are discarded.

Family creation accepts a display name, a safe URL slug and a recurring death-anniversary in
`DD/MM`. The day and month are stored separately because no year is implied. The API validates real
month lengths and permits `29/02`.

The two initial usernames are deterministically derived from the accent-free PascalCase Family name
and `DDMM`, for example `TruongHoHoNguyen1003` and `ThanhVienHoNguyen1003`. Their requested initial
passwords are identical to their usernames. The response is `Cache-Control: no-store`, returns the
plaintext credentials once to the authenticated Admin, and the database stores only scrypt hashes.
If the slug or either username already exists, the entire transaction rolls back with a conflict.

This deterministic password rule is intentionally retained from the current product requirement,
but it is not suitable for production because the values are guessable. A forced first-login
password change with random temporary passwords is required before handling real private data.

Platform Admin accounts are provisioned or rotated with `npm run admin:bootstrap --workspace
@giapha/api` using `ADMIN_NICKNAME`, `ADMIN_PASSWORD` and `DATABASE_URL`.

## Genealogy model

`Person` belongs to one Family and stores optional `fatherId` and `motherId` self-references. Both
foreign keys include `familyId`, preventing cross-Family parent links at the database boundary.
React Flow positions and edges remain a web concern derived from domain responses.

Media storage, account recovery, audit logs, forced password rotation and field-level privacy remain
follow-up work.
