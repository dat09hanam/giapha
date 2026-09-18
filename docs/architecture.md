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
- `GET /api/families/:slug` and authenticated `GET /api/families/:slug/tree`; the tree response includes tenant-scoped people and spousal relationships.
- `PATCH /api/families/:slug` and Person mutations: `MEMBER_PLUS` only.
- `POST /api/families/:slug/tree/design`: `MEMBER_PLUS` only. It saves the visible Person graph, parent links, spouse links and requested soft deletions atomically.

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

`Family` stores the public locator and clan-level record: `slug`, `name`, `description`, `status`,
the recurring death anniversary (`deathAnniversaryDay` and `deathAnniversaryMonth`), the ancestral
hall `address` and the clan origin (`ancestryOrigin`).

`Person` belongs to one Family and stores optional `fatherId` and `motherId` self-references. Both
foreign keys include `familyId`, preventing cross-Family parent links at the database boundary. A
Person carries the birth `name`, `nickname`, `courtesyName` (tên tự / hiệu / thụy), `gender`,
`birthDate`, `deathDate`, `isAlive`, `burialPlace`, `phone`, `avatarUrl`, `biography`, `generation`
and `orderInFamily`. The lunar death anniversary is stored as `lunarDeathDay` and `lunarDeathMonth`
rather than a single text field, so the Family's death-anniversary calendar can be queried by month.

`Relationship` records one spousal link: `husbandId`, `wifeId`, `marriageDate`, `status` and
`wifeOrder`. It carries its own `familyId` and both Person foreign keys are composite
`(familyId, personId)`, so a marriage can never span two Families. `(familyId, husbandId, wifeId)`
is unique.

`Media` is the Family library: `fileUrl`, `title`, `status` and the optional `personId` of the
Person credited with the item. It is Family-scoped with the same composite Person foreign key.

React Flow positions and edges remain a web concern derived from domain responses. The designer keeps temporary client IDs for unsaved cards; the API maps them to tenant-owned Person IDs inside one serializable transaction and never accepts a client-supplied family ID as authorization.

`Family`, `User` and `Media` are soft-deleted through a nullable `deletedAt`; every read path for
those models filters `deletedAt: null`. `Person` and `Relationship` are deleted outright, so the
genealogy tables never accumulate hidden rows. Because both are referenced by `Restrict` foreign
keys, removing a Person first clears the `fatherId`/`motherId` of its children, detaches `Media`,
and deletes the marriages it belongs to, all inside the same serializable transaction. `AuthSession`
is also exempt from soft delete because sessions are short-lived and logout must remove the row
outright.

File upload handling, account recovery, audit logs, forced password rotation and field-level privacy
remain follow-up work.
