# Architecture baseline

## System shape

The repository is an npm-workspaces monorepo:

- `apps/web`: Next.js App Router UI. Public Family pages use `/{slug}` and the platform dashboard uses `/admin`.
- `apps/api`: NestJS API with DTO validation, authorization guards and Prisma persistence.
- MySQL 8.4: relational storage configured by `DATABASE_URL`.

The browser keeps an opaque session token in an `HttpOnly`, `SameSite=Strict` cookie. Only its
SHA-256 digest is stored in `AuthSession`. Passwords use scrypt with an independent random salt and
plaintext credentials are never persisted.

Quên mật khẩu: `POST /api/auth/password-reset` takes a `login` (username, or the account's email;
a username match wins) and mails a six-digit code to the account's `User.email` (set for the clan
head when the family is created, and optionally by the clan head for a member account on the
accounts tab; never for the shared account, whose holders could otherwise take it over; stored
lower-case and unique across accounts) over SMTP (`SMTP_*`,
`MAIL_FROM`; Mailpit in `docker-compose.yml` for development). By product decision it does reveal
whether an account exists: `404` when nothing matches, `403` for a suspended account, `400` when
the account has no email, and otherwise `200` with `{ sentTo }`, the email masked to its first six characters and domain (`nguyen***@gmail.com`)
so the answer does not hand out the full address; without `SMTP_HOST` it answers `503` for
everyone. `PasswordResetCode` keeps only a SHA-256 digest of the code bound to the user, one row per account (a new code or a reset deletes the older rows); only the
newest code works, for 10 minutes, at most five wrong guesses, and a new one is mailed no sooner
than two minutes after the last. `POST /api/auth/password-reset/verify` takes the same `login` and
the code and only checks it (a wrong guess counts), so the web form asks for the new password only
after a right code. `POST /api/auth/password-reset/confirm` takes the `login`, code and new
password, checks the code again, sets the password (clearing `mustChangePassword`) and signs the
account out everywhere. All three routes share the login throttle; `quen-mat-khau` is the web page and a reserved Family slug.

## Family authorization boundary

`Family` is the root data boundary. Its globally unique slug is a public locator, not proof of
authorization. A session loads the trusted `User.familyId`; Family guards compare that ID with the
Family resolved from the URL before allowing access.

The three roles are stored directly on `User`:

- `ADMIN`: platform operator, always has `familyId = NULL`. It may create a Family but does not
  inherit access to private genealogy data, except the sample Family (below).
- `MEMBER_PLUS`: the clan head, attached to one Family and allowed to mutate that Family.
- `MEMBER`: attached to one Family and read-only, except as a branch manager (below).

### Chi/nhánh managers

The clan head creates `MEMBER` accounts and puts each in charge of one or more chi/nhánh through
`BranchManager` rows (`familyId`, `userId`, `rootPersonId`). A branch is the root Person, every
descendant through either parent, and the spouses married into that lineage; spouses do not extend
the branch. A root belongs to at most one account, and an assignment is refused when its branch
contains, or sits inside, a branch already given out (including the same account's other roots).
Assignments go away with the account, the root Person or the Family.

The rule lives in `apps/api/src/branches/branch-scope.ts` and is mirrored for display in
`apps/web/src/lib/branch-scope.ts`. The API is the authority: on `tree/design` a branch manager's
changes to people outside the branch are dropped, roots and married-in spouses keep their parents,
deletions must be inside the branch and exclude roots, and the save rolls back if anyone added, or
anyone who was in the branch, ends up outside it.

Every Family-owned query must use the server-trusted `familyId`. Client-supplied IDs and slugs are
never sufficient authorization.

### Gia phả mẫu (the public sample Family)

The sample Family the public home page offers visitors is the one exception to both rules above.
The platform `ADMIN` creates it from the Gia phả mẫu tab of `/admin` (`POST /api/families` with
`isDemo: true`), which stores `Family.isDemo`; the request is refused while a sample already
exists, so there is at most one. It gets no `MEMBER_PLUS` or `MEMBER` accounts. Instead
`FamilyAccessGuard` lets the platform `ADMIN` into that one Family, and only that one, acting with
`MEMBER_PLUS` rights, so the admin edits its tree (`/{slug}/thiet_ke`), details and phả đồ directly;
every other Family still refuses the admin.

`GET /api/demo-family` and `GET /api/demo-family/tree` are public and read-only. They resolve the
Family by the mark alone, never by a slug the visitor sends, and the tree omits `phone` and
`avatarUrl` (photos stay behind the member-only media route). The web shows it at `/gia-pha-mau`
with every member-only section hidden. The sample Family must hold sample data, not real people.

## Authentication and Family provisioning

Authentication accepts the globally unique `User.username` or the account's unique `User.email` in
the login's `username` field (`findUserByLogin`, shared with Quên mật khẩu; a username match wins,
since usernames may contain `@`). Unknown username, incorrect password, suspended account and
other invalid credentials produce the same authentication failure. Login is rate-limited per API
process.

Endpoints:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/password`: the signed-in account replaces its own password (current password
  required); its other sessions are signed out and `mustChangePassword` is cleared.
- `POST /api/families`: `ADMIN` only. It atomically creates one Family, one `MEMBER_PLUS` account and
  one `MEMBER` account.
- `/api/families/:slug/accounts`: `MEMBER_PLUS` only. `GET` lists the Family's accounts with their
  branches; `POST` creates a `MEMBER` account from a typed `usernamePrefix` (e.g. `adminchi1`) plus
  the family's suffix, giving `adminchi1HoPham1503`. The suffix (`GET username-suffix`) is what the
  family's generated accounts share after `ThanhVien`/`TruongHo`, so it keeps the origin when the
  slug needed one and survives a rename; families without them fall back to name and anniversary.
  `GET username-check?usernamePrefix=` answers `{ username, available }` for the create form's live
  green/red check (usernames are global, so it looks past the tenant but reveals only that a name is
  taken); `PATCH :userId` renames or suspends/reactivates it;
  `POST :userId/password` resets it to a generated password and signs it out; `PUT :userId/branches` replaces its
  branch roots; `DELETE :userId` removes it so the username can be reused. The clan head's own
  account is never changed here. Password responses are `Cache-Control: no-store`.
- `GET /api/families/:slug/tree/scope`: `MEMBER` and `MEMBER_PLUS`; `fullAccess` for the clan head,
  otherwise the account's branch root IDs.
- `GET /api/families/:slug` and authenticated `GET /api/families/:slug/tree`; the tree response includes tenant-scoped people and spousal relationships.
- `PATCH /api/families/:slug` and Person mutations: `MEMBER_PLUS` only.
- `POST /api/families/:slug/tree/design`: `MEMBER_PLUS`, and `MEMBER` accounts that manage a branch (held to it as described above). It saves the visible Person graph, parent links, spouse links and requested soft deletions atomically.
- `POST /api/families/:slug/people/:personId/suggestions`: `MEMBER` and `MEMBER_PLUS`. Proposes a change to a Person for the clan head.
- `GET /api/families/:slug/suggestions` and `PATCH /api/families/:slug/suggestions/:suggestionId`: `MEMBER_PLUS` only. Lists the newest suggestions and sets their status.
- `/api/families/:slug/feed` (Bảng tin): `MEMBER` and `MEMBER_PLUS`. `GET` pages posts (with comments and reaction summaries); `POST posts`, `PATCH|DELETE posts/:postId`, `POST posts/:postId/comments`, `PATCH|DELETE comments/:commentId`, and `POST|DELETE posts/:postId/reaction` / `comments/:commentId/reaction`. Writes need the `X-Feed-Key` device header described below.
- `GET /api/families/:slug/fund` (Quỹ họ): `MEMBER` and `MEMBER_PLUS`; the ledger with income, expense and balance totals. `POST fund/entries` and `PATCH|DELETE fund/entries/:entryId`: `MEMBER_PLUS` only.
- `/api/families/:slug/merit` (Công đức): `GET` (events with totals) and `GET events/:eventId` (one event with its donations) for `MEMBER` and `MEMBER_PLUS`; `POST events`, `PATCH|DELETE events/:eventId`, `POST events/:eventId/donations` and `PATCH|DELETE donations/:donationId` for `MEMBER_PLUS` only.
- `/api/families/:slug/library` (Album và tư liệu): `GET` (albums and documents) and `GET albums/:albumId` for `MEMBER` and `MEMBER_PLUS`; `POST albums/:albumId/photos` for both, where a `MEMBER`'s photo is stored `PENDING` until the clan head approves it with `POST items/:itemId/approve`; `DELETE items/:itemId` for both, a `MEMBER` only withdrawing their own pending photo; `POST albums`, `PATCH|DELETE albums/:albumId`, `POST documents`, `PATCH items/:itemId` and the approval for `MEMBER_PLUS` only. Lists and photo counts show `ACTIVE` items only; the album detail adds `pendingPhotos` (all of them for the clan head, a member's own for a member).

The old public clan-head registration and invitation endpoints are removed. Pending invitation
accounts are migrated to `SUSPENDED` and their tokens are discarded.

Family creation accepts a display name, a recurring death-anniversary in `DD/MM`, an optional
origin (`ancestryOrigin`, stored on the Family) and the clan head's email (`headEmail`, required
except for the sample family, stored as the head account's `User.email` for password reset). The day and month are stored separately because no
year is implied. The API validates real month lengths and permits `29/02`.

The API derives the slug; clients no longer send one (only the sample family's path is chosen by
the admin form). It tries the accent-free kebab-case name plus the anniversary, `ho-nguyen-10-03`,
then the same with the origin's first comma-separated part appended, `ho-nguyen-10-03-thanh-loc`,
and takes the first whose slug and usernames are all unused, soft-deleted rows included so an old
link never points at another clan. When none is free it answers `409` asking for (a more specific)
origin; the unique indexes still catch a concurrent create. `GET /api/families/slug-check` (platform
`ADMIN` only, `no-store`) runs the same choice for `name`, `deathAnniversary` and `ancestryOrigin`
and returns `{ slug, available, withOrigin }`, so the create form marks the path green or red while
the admin types; `slug-check` is therefore a reserved Family slug.

The two initial usernames are deterministically derived from the accent-free PascalCase Family name
and `DDMM`, for example `TruongHoHoNguyen1003` and `ThanhVienHoNguyen1003`, with the origin's
PascalCase place appended when the slug needed it (`TruongHoHoNguyen1003ThanhLoc`). The clan head's password is
always generated, `truongho` plus six random digits (`truongho305917`), and must be replaced on the
first sign-in; nobody types another person's password. The shared `MEMBER`
account (`User.isShared`) gets `thanhvien` plus six random digits (`thanhvien042817`), easy to pass
around the clan; it is never forced to change, and the clan head can reset it to a new one of the
same form (which signs every device out). Families created earlier keep a password identical to the
username until it is reset. The response is `Cache-Control: no-store`, returns the plaintext credentials once to
the authenticated Admin, and the database stores only scrypt hashes.

`User.mustChangePassword` marks a password someone else saw: it is set for the new clan head, every
account the clan head creates, and every reset. While it is set, `SessionAuthGuard` answers 403 to
every route except those marked `@AllowPendingPasswordChange()` (`auth/me`, `auth/logout`,
`auth/password`), and the web app sends the account to `/doi-mat-khau` from every page. The shared
member account is never marked, since its password is meant to be shared with the whole clan.

Platform Admin accounts are provisioned or rotated with `npm run admin:bootstrap --workspace
@giapha/api` using `ADMIN_NICKNAME`, `ADMIN_PASSWORD` and `DATABASE_URL`.

## Genealogy model

`Family` stores the public locator and clan-level record: `slug`, `name`, `description`, `status`, `isDemo` (see Gia phả mẫu above),
the recurring death anniversary (`deathAnniversaryDay` and `deathAnniversaryMonth`), the ancestral
hall `address` and the clan origin (`ancestryOrigin`). `introduction` (JSON) is the clan head's formatted
Giới thiệu: a structured document of blocks (paragraph, heading, subheading, quote, bulleted and
numbered lists, optional alignment) holding styled text runs (bold, italic, underline, strike and a
`#rrggbb` colour), never HTML. `PATCH /api/families/:slug` validates it strictly
(`common/validation/rich-text.ts`) and derives `description` from it as plain text, which the
printed book and page metadata keep using; a `description` sent alone clears the formatting. Clients
render the document element by element, so typed text cannot become markup. It is returned by the
public `GET /api/families/:slug`, like `description`, and shown on `/{slug}/gioi-thieu`. It also stores the phả đồ background the
clan head chose: a nullable foreign key `posterBackgroundId` into the decoration library (null shows
plain paper), plus the optional family-specific vertical inscriptions `posterLeftText` and
`posterRightText`.

The platform `ADMIN` switches Family sections on or off for every Family at once. `PlatformFeature`
is a platform-level table (not tenant-owned) keyed by feature: `feed`, `fund`, `merit`, `library`,
`editSuggestions` and `printBook`; a feature without a row is on. `GET /api/platform-features` is
public, because every Family page reads it to build its menu; `PATCH` is `ADMIN` only and accepts a
partial map. A controller or route marked `@RequiresFamilyFeature(...)` is refused by
`FamilyAccessGuard` with 404 while its switch is off; the web app hides the section from the menu
and answers its pages with not found. Switching a section off keeps its data.

`PosterDecoration` is the platform-wide background library and is deliberately **not**
tenant-owned: every Family chooses from the same rows. Every row has `kind` `BACKGROUND` and is an
uploaded raster image (`imageFile` under `MEDIA_ROOT/poster-decorations/`) with a `backgroundMode`;
there are no built-in, code-drawn backgrounds. Only the platform `ADMIN` creates, edits, hides or deletes rows
(`/api/poster-decorations`); signed-in users list active rows; images are served publicly because
they are shared artwork, not family data. Deleting a row sets the families using it to null. A
family head may only pick an active row.

`Article` holds the public site's own reading: Mẫu bài cúng (`category` `PRAYER`) and Thư viện
(`LIBRARY`). Like `PosterDecoration` it is platform-level and **not** tenant-owned: it has no
`familyId`, is written only by the platform `ADMIN` (the Bài viết tab of `/admin`), and must not hold
any Family's data. Its body is the same validated rich-text document as `Family.introduction`, and
an optional cover image lives under `MEDIA_ROOT/articles/`. `GET /api/articles?category=` and
`GET /api/articles/:category/:slug` are public and only ever return published rows (a draft is a
404); `GET /api/articles/admin` and the writes are `ADMIN` only; covers are served publicly. The web
shows them at `/mau-bai-cung` and `/thu-vien` (both reserved Family slugs) under the home page's
masthead; `slug` is unique per category, and `publishedAt` is set on first publication and kept.

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
`birthDate` and `deathDate` are free text of up to 100 characters (`15/03/1920`, `03/1920`,
`1850`, `khoảng 1850`), because early ancestors are often remembered only by year; the web reads a
year or sort key out of them (`apps/web/src/lib/partial-date.ts`) and the API only checks that the
death year is not before the birth year.
A Person also carries a profile for the member editor: `maritalStatus`, `education`,
`occupation`, `hometown` (nguyên quán, free text rather than administrative-unit pickers, since
units are renamed and merged), `currentAddress`, `mapUrl` (http(s) only), and for the deceased
`ageAtDeath` (null means derive it from the dates), `worshipPlace`, `deathAnniversaryText` and
`worshipKeeperId`. The keeper is another Person of the same Family through the composite
`(familyId, worshipKeeperId)` foreign key, cleared with the other inbound links when a Person is
deleted. The demo tree hides `currentAddress` and `mapUrl` along with phone numbers.

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
their album. Every member reads the library; only `MEMBER_PLUS` writes it, except that a member
may send photos into an album: they are stored with `status` `PENDING` and `uploadedById` (the
sending User, set null if the account is deleted) and show to others only once the clan head
approves them. Photos are shrunk on the
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
Personal accounts (the clan head and branch managers) always post, comment and react under their
account's `displayName`: the API replaces any typed author or reactor name, and the web does not ask.

`FundEntry` is one line of the family fund ledger (Quỹ họ): `content`, `kind` (`INCOME` or
`EXPENSE`), a positive whole-đồng `amount` (`BIGINT UNSIGNED`, capped at 10^13 so it stays exact
as a JSON number) and `occurredOn`, the day the money moved (`DATE`, entered by the clan head; the
ledger is ordered by it). The balance is never stored: the API sums the whole ledger on every read.

`MeritEvent` is an occasion the family collects merit donations for (Công đức): `title`, an
optional `description` and an optional `heldOn` day. `MeritDonation` is one donation to an event,
Family-scoped through a composite `(familyId, eventId)` foreign key and removed with its event or
Family. `donorName` is typed, since donors are often outside the tree. `kind` is `CASH`, which sets
a positive whole-đồng `amount`, or `ITEM`, which sets `itemContent`, a free-text description of
the goods; either may carry an optional `note`. A database CHECK constraint keeps the two shapes
apart. Totals
(cash sum and count, goods count) are summed on every read.
Công đức is separate from Quỹ họ: recording a cash donation does not write a fund ledger line.

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
