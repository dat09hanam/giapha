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
- `POST /api/families/:slug/people/:personId/suggestions`: `MEMBER` and `MEMBER_PLUS`. Proposes a change to a Person for the clan head.
- `GET /api/families/:slug/suggestions` and `PATCH /api/families/:slug/suggestions/:suggestionId`: `MEMBER_PLUS` only. Lists the newest suggestions and sets their status.
- `/api/families/:slug/feed` (Bảng tin): `MEMBER` and `MEMBER_PLUS`. `GET` pages posts (with comments and reaction summaries); `POST posts`, `PATCH|DELETE posts/:postId`, `POST posts/:postId/comments`, `PATCH|DELETE comments/:commentId`, and `POST|DELETE posts/:postId/reaction` / `comments/:commentId/reaction`. Writes need the `X-Feed-Key` device header described below.
- `GET /api/families/:slug/fund` (Quỹ họ): `MEMBER` and `MEMBER_PLUS`; the ledger with income, expense and balance totals. `POST fund/entries` and `PATCH|DELETE fund/entries/:entryId`: `MEMBER_PLUS` only.
- `/api/families/:slug/library` (Album và tư liệu): `GET` (albums and documents) and `GET albums/:albumId` for `MEMBER` and `MEMBER_PLUS`; `POST albums`, `PATCH|DELETE albums/:albumId`, `POST albums/:albumId/photos`, `POST documents` and `PATCH|DELETE items/:itemId` for `MEMBER_PLUS` only.

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
hall `address` and the clan origin (`ancestryOrigin`). It also stores the phả đồ background the
clan head chose: a nullable foreign key `posterBackgroundId` into the decoration library (null shows
plain paper), plus the optional family-specific vertical inscriptions `posterLeftText` and
`posterRightText`.

`PosterDecoration` is the platform-wide background library and is deliberately **not**
tenant-owned: every Family chooses from the same rows. Every row has `kind` `BACKGROUND` and is an
uploaded raster image (`imageFile` under `MEDIA_ROOT/poster-decorations/`) with a `backgroundMode`;
there are no built-in, code-drawn backgrounds. Only the platform `ADMIN` creates, edits, hides or deletes rows
(`/api/poster-decorations`); signed-in users list active rows; images are served publicly because
they are shared artwork, not family data. Deleting a row sets the families using it to null. A
family head may only pick an active row.

An uploaded background may carry `insetTop/Right/Bottom/Left` (percent, all four or none): the tree
area the `ADMIN` drew over the art. The web app's `poster-geometry.ts` sizes the 16:9 sheet so the
tree fills exactly that area at any tree size; without one the tree sits inside the frame band.

It may also carry a name area (`nameInsetTop/Right/Bottom/Left`, all four or none) with `nameCurve`
(how far the middle of the text rises, in percent of the area's height; negative bends it down) and
`nameColor`. The web app writes the family's `name` there along that arc, sized to the area, so the
clan head only edits the name in the family profile. Two further optional areas
(`leftTextInsetTop/Right/Bottom/Left` and `rightTextInsetTop/Right/Bottom/Left`, each all four or
none) and their colors place the family's left and right inscriptions vertically. The platform
`ADMIN` defines these areas on uploaded backgrounds; the clan head supplies only the two texts.

`Person` belongs to one Family and stores optional `fatherId` and `motherId` self-references. Both
foreign keys include `familyId`, preventing cross-Family parent links at the database boundary. A
Person carries the birth `name`, optional `honorific` (danh xưng như Cụ tổ, Cụ, Ông, Bà),
`nickname`, `courtesyName` (tên tự / hiệu / thụy), `gender`,
`birthDate`, `deathDate`, `isAlive`, `burialPlace`, `phone`, `avatarUrl`, `biography`, `generation`
and `orderInFamily`. The lunar death anniversary is stored as `lunarDeathDay` and `lunarDeathMonth`
rather than a single text field, so the Family's death-anniversary calendar can be queried by month.

`Relationship` records one spousal link: `husbandId`, `wifeId`, `marriageDate`, `status` and
`wifeOrder`. It carries its own `familyId` and both Person foreign keys are composite
`(familyId, personId)`, so a marriage can never span two Families. `(familyId, husbandId, wifeId)`
is unique.

Genealogy invariants enforced by the API on every save: a father is `MALE` and a mother is
`FEMALE`; in a Relationship the husband is `MALE` and the wife is `FEMALE` (a man may have several
wives, ordered by `wifeOrder`); no one is their own parent and parent links never form a cycle; and
no two people in a design share the same normalized name, birth date, father and mother. The
designer applies the same rules before saving.

`Media` is the Family library (Album và tư liệu): a `PHOTO` in an `Album`, or a `DOCUMENT` such as
a scanned genealogy book, a royal decree or a PDF (`kind`). Each row holds its `fileUrl`, a small
`thumbUrl` JPEG for grids (none for PDFs), `contentType`, `sizeBytes`, `width`/`height`, a `title`,
`description`, `takenOn` day and the optional `personId` of the Person it is about. `Album` groups
photos (`title`, `description`); its cover is its first photo and `updatedAt` moves when photos are
added. Both are Family-scoped through composite `(familyId, …)` foreign keys; photos cascade from
their album. Every member reads the library; only `MEMBER_PLUS` writes it. Photos are shrunk on the
phone and sent one per request (2 MB, with the thumbnail); PDFs are capped at 4 MB to stay under the
API's 6 MB body limit. PDFs are served with `Content-Security-Policy: sandbox` so script inside them
cannot run with the API's origin.

`EditSuggestion` is a change to one Person proposed by a family member: `proposerName`, free-text
`content`, `status` (`PENDING`, `RESOLVED`, `DISMISSED`), `createdAt` and `reviewedAt`. The whole
family shares one `MEMBER` account, so the proposer's name is typed in rather than taken from the
session. Suggestions are never applied automatically: the clan head edits the tree in the designer
and then marks the suggestion handled. It is Family-scoped with the composite Person foreign key and
is deleted with its Person (`Cascade`). At most 200 suggestions may be pending per Family, which
bounds what a shared account can queue.

The family news feed (Bảng tin) is `FeedPost` (author name, text, `editedAt`), `FeedImage` (up to
four photos per post, stored under the family's media folder with their size), `FeedComment` (a
nullable `parentId` naming a top-level comment keeps replies one level deep; answering a reply
records `replyToName`) and `FeedReaction` (one of seven types per device per post or comment). All
four are Family-scoped through composite `(familyId, id)` foreign keys and cascade from their post,
comment or Family; deleting a post also removes its photo files. Because members share one
account, each browser keeps a random key and sends it as `X-Feed-Key`; only its SHA-256
(`authorKeyHash`, `reactorKeyHash`) is stored. It decides which posts and comments a device may edit
or delete and which reaction is its own. It identifies a device, not a person, and is not an
authorization boundary between relatives; the clan head (`MEMBER_PLUS`) may delete anything.

`FundEntry` is one line of the family fund ledger (Quỹ họ): `content`, `kind` (`INCOME` or
`EXPENSE`), a positive whole-đồng `amount` (`BIGINT UNSIGNED`, capped at 10^13 so it stays exact
as a JSON number) and `occurredOn`, the day the money moved (`DATE`, entered by the clan head; the
ledger is ordered by it). The balance is never stored: the API sums the whole ledger on every read.

React Flow positions and edges remain a web concern derived from domain responses. The designer keeps temporary client IDs for unsaved cards; the API maps them to tenant-owned Person IDs inside one serializable transaction and never accepts a client-supplied family ID as authorization.

`Family` and `User` are soft-deleted through a nullable `deletedAt`; every read path for those
models filters `deletedAt: null`. Library `Media` rows and `Album`s are deleted outright together
with their files, so a removed photo does not linger on disk; `Media.deletedAt` remains in the
schema, is always null, and reads still filter on it. `Person` and `Relationship` are deleted outright, so the
genealogy tables never accumulate hidden rows. Because both are referenced by `Restrict` foreign
keys, removing a Person first clears the `fatherId`/`motherId` of its children, detaches `Media`,
and deletes the marriages it belongs to, all inside the same serializable transaction. `AuthSession`
is also exempt from soft delete because sessions are short-lived and logout must remove the row
outright.

File upload handling, account recovery, audit logs, forced password rotation and field-level privacy
remain follow-up work.
