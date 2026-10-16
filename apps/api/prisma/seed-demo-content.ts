/**
 * Fills the public sample family (`ho-nguyen-mau`) with believable clan activity — news feed,
 * shared fund, merit book, photo library, documents and edit suggestions — so the landing page
 * screenshots and the demo show every section with real content.
 *
 *   npx tsx prisma/seed-demo-content.ts   (from apps/api)
 *
 * Re-running it replaces only the rows it created (fixed ids); anything else in the family is left
 * alone. All names are fictional. Pictures come from `prisma/demo-content/` and are copied into the
 * family's media folder under `MEDIA_ROOT`.
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FeedReactionType, PrismaClient } from '@prisma/client';

process.env.DATABASE_URL ??= 'mysql://giapha:giapha_dev_password@localhost:3306/giapha';
const prisma = new PrismaClient();

const DEMO_SLUG = 'ho-nguyen-mau';
const MEDIA_ROOT = resolve(process.env.MEDIA_ROOT ?? './media');
const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'demo-content');

/** Fixed ids so a re-run updates the same rows instead of piling up copies. */
const id = (group: number, n: number): string =>
  `00000000-0000-4000-8${group.toString(16).padStart(3, '0')}-${n.toString(16).padStart(12, '0')}`;

const day = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
const at = (iso: string): Date => new Date(`${iso}:00.000+07:00`);
const authorKey = (name: string): string =>
  createHash('sha256').update(`demo:${name}`).digest('hex');

type Picture = { file: string; width: number; height: number };

const pictures = {
  gate: { file: 'photo-gate.jpg', width: 1600, height: 900 },
  pagoda: { file: 'photo-pagoda.jpg', width: 1100, height: 1000 },
  lotus: { file: 'photo-lotus.jpg', width: 770, height: 770 },
  mountain: { file: 'photo-mountain.jpg', width: 770, height: 960 },
  river: { file: 'photo-river.jpg', width: 1000, height: 560 },
  sen: { file: 'photo-sen.jpg', width: 700, height: 1050 },
  giaPha: { file: 'doc-gia-pha.jpg', width: 900, height: 1200 },
  vanTe: { file: 'doc-van-te.jpg', width: 900, height: 1200 },
  soCongDuc: { file: 'doc-so-cong-duc.jpg', width: 900, height: 1200 },
} as const satisfies Record<string, Picture>;

type PictureKey = keyof typeof pictures;

/** Stored file name per picture: a fixed UUID, as the media API expects. */
const storedName = (key: PictureKey): string =>
  `${id(0xd00, Object.keys(pictures).indexOf(key) + 1)}.jpg`;
const mediaUrl = (key: PictureKey): string => `/media/${storedName(key)}`;

async function copyPictures(familyId: string): Promise<number> {
  const directory = join(MEDIA_ROOT, familyId);
  await mkdir(directory, { recursive: true });
  let added = 0;
  for (const key of Object.keys(pictures) as PictureKey[]) {
    const target = join(directory, storedName(key));
    const exists = await stat(target).then(
      () => true,
      () => false,
    );
    await copyFile(join(CONTENT_DIR, pictures[key].file), target);
    if (!exists) added += (await stat(target)).size;
  }
  return added;
}

const feedPosts: {
  author: string;
  postedAt: string;
  content: string;
  images: PictureKey[];
  comments: { author: string; at: string; content: string }[];
  reactions: { name: string; type: FeedReactionType }[];
}[] = [
  {
    author: 'Nguyễn Văn Khải',
    postedAt: '2026-10-14T19:30',
    content:
      'Kính báo toàn thể con cháu: Lễ giỗ Tổ họ Nguyễn năm nay tổ chức vào ngày 12 tháng Giêng (tức Chủ nhật 01/03/2026) tại nhà thờ họ. Các chi vui lòng báo số người tham dự cho trưởng chi trước ngày 20/02 để ban tổ chức chuẩn bị cỗ.',
    images: ['gate'],
    comments: [
      {
        author: 'Nguyễn Thị Hạnh',
        at: '2026-10-14T20:05',
        content: 'Chi hai nhà con đăng ký 14 người ạ.',
      },
      {
        author: 'Nguyễn Văn Phúc',
        at: '2026-10-14T21:12',
        content: 'Con ở Sài Gòn sẽ về sớm một hôm để phụ dọn dẹp nhà thờ.',
      },
    ],
    reactions: [
      { name: 'Nguyễn Thị Hạnh', type: FeedReactionType.LIKE },
      { name: 'Nguyễn Văn Phúc', type: FeedReactionType.LOVE },
      { name: 'Nguyễn Văn Đức', type: FeedReactionType.LIKE },
      { name: 'Nguyễn Thị Mai', type: FeedReactionType.CARE },
      { name: 'Nguyễn Văn Hòa', type: FeedReactionType.LIKE },
    ],
  },
  {
    author: 'Nguyễn Thị Mai',
    postedAt: '2026-10-11T08:45',
    content:
      'Sáng nay ao sen trước nhà thờ họ nở rộ, con chụp gửi cả nhà ở xa xem cho đỡ nhớ quê 🌸',
    images: ['lotus', 'pagoda', 'sen'],
    comments: [
      {
        author: 'Nguyễn Văn Thịnh',
        at: '2026-10-11T09:20',
        content: 'Đẹp quá cháu ơi, nhìn mà nhớ những mùa hè hồi nhỏ.',
      },
    ],
    reactions: [
      { name: 'Nguyễn Văn Thịnh', type: FeedReactionType.LOVE },
      { name: 'Nguyễn Văn Khải', type: FeedReactionType.LOVE },
      { name: 'Nguyễn Thị Thu', type: FeedReactionType.WOW },
      { name: 'Nguyễn Văn Lộc', type: FeedReactionType.LIKE },
    ],
  },
  {
    author: 'Nguyễn Văn Đức',
    postedAt: '2026-10-05T16:10',
    content:
      'Chúc mừng cháu Nguyễn Minh Anh (chi ba) đỗ thủ khoa đầu vào Đại học Y Hà Nội. Họ sẽ trao phần thưởng khuyến học trong buổi giỗ Tổ năm tới. Mong các cháu noi gương chăm ngoan học giỏi!',
    images: [],
    comments: [
      {
        author: 'Nguyễn Thị Hạnh',
        at: '2026-10-05T17:00',
        content: 'Giỏi quá! Chúc mừng gia đình chi ba.',
      },
      {
        author: 'Nguyễn Văn Hòa',
        at: '2026-10-05T18:42',
        content: 'Tự hào lắm cháu ơi 👏',
      },
    ],
    reactions: [
      { name: 'Nguyễn Thị Hạnh', type: FeedReactionType.LOVE },
      { name: 'Nguyễn Văn Hòa', type: FeedReactionType.LIKE },
      { name: 'Nguyễn Văn Khải', type: FeedReactionType.LIKE },
      { name: 'Nguyễn Thị Mai', type: FeedReactionType.LOVE },
      { name: 'Nguyễn Văn Phúc', type: FeedReactionType.LIKE },
      { name: 'Nguyễn Văn Lộc', type: FeedReactionType.CARE },
    ],
  },
  {
    author: 'Nguyễn Văn Lộc',
    postedAt: '2026-09-28T10:00',
    content:
      'Đường làng mới đổ bê tông xong, từ đầu làng vào nhà thờ họ giờ đi lại thuận tiện hơn nhiều. Cảm ơn các gia đình đã góp công góp của.',
    images: ['river', 'mountain'],
    comments: [],
    reactions: [
      { name: 'Nguyễn Văn Đức', type: FeedReactionType.LIKE },
      { name: 'Nguyễn Thị Thu', type: FeedReactionType.LIKE },
    ],
  },
];

const fundEntries: { on: string; kind: 'INCOME' | 'EXPENSE'; amount: number; content: string }[] = [
  { on: '2026-01-05', kind: 'INCOME', amount: 15_000_000, content: 'Quỹ năm cũ chuyển sang' },
  {
    on: '2026-02-20',
    kind: 'INCOME',
    amount: 12_500_000,
    content: 'Đóng góp đinh suất năm 2026 (125 suất)',
  },
  {
    on: '2026-03-01',
    kind: 'EXPENSE',
    amount: 8_200_000,
    content: 'Chi lễ giỗ Tổ: lễ vật, cỗ, hương hoa',
  },
  {
    on: '2026-03-01',
    kind: 'INCOME',
    amount: 6_000_000,
    content: 'Con cháu công đức trong ngày giỗ Tổ',
  },
  {
    on: '2026-04-12',
    kind: 'EXPENSE',
    amount: 2_500_000,
    content: 'Thay ngói, sửa máng nước mái nhà thờ',
  },
  {
    on: '2026-05-30',
    kind: 'EXPENSE',
    amount: 3_000_000,
    content: 'Phần thưởng khuyến học cho 12 cháu',
  },
  {
    on: '2026-07-27',
    kind: 'EXPENSE',
    amount: 1_200_000,
    content: 'Hương hoa lễ Vu Lan, thắp hương mộ tổ',
  },
  {
    on: '2026-08-15',
    kind: 'INCOME',
    amount: 5_000_000,
    content: 'Chi trưởng ủng hộ quỹ khuyến học',
  },
  {
    on: '2026-09-10',
    kind: 'EXPENSE',
    amount: 1_800_000,
    content: 'Thăm hỏi các cụ cao tuổi dịp Trung thu',
  },
  { on: '2026-10-02', kind: 'INCOME', amount: 3_500_000, content: 'Con cháu ở xa gửi về góp quỹ' },
];

const meritEvents: {
  title: string;
  description: string;
  heldOn: string;
  donations: { donor: string; on: string; amount?: number; item?: string; note?: string }[];
}[] = [
  {
    title: 'Trùng tu nhà thờ họ năm 2026',
    description:
      'Thay hệ mái, sơn thếp lại hoành phi câu đối và lát lại sân gạch. Dự kiến hoàn thành trước giỗ Tổ năm Đinh Mùi.',
    heldOn: '2026-08-01',
    donations: [
      { donor: 'Ông Nguyễn Văn Khải', on: '2026-08-02', amount: 20_000_000, note: 'Chi trưởng' },
      {
        donor: 'Gia đình anh Nguyễn Văn Phúc',
        on: '2026-08-05',
        amount: 10_000_000,
        note: 'TP. Hồ Chí Minh',
      },
      { donor: 'Bà Nguyễn Thị Hạnh', on: '2026-08-06', amount: 5_000_000 },
      { donor: 'Ông Nguyễn Văn Lộc', on: '2026-08-09', item: 'Một bộ đỉnh đồng và đôi hạc thờ' },
      { donor: 'Ông Nguyễn Văn Đức', on: '2026-08-12', amount: 8_000_000 },
      {
        donor: 'Bà Nguyễn Thị Thu',
        on: '2026-08-15',
        item: 'Đôi câu đối gỗ mít sơn son thếp vàng',
      },
      { donor: 'Con cháu chi ba', on: '2026-08-20', amount: 12_000_000 },
      { donor: 'Anh Nguyễn Văn Hòa', on: '2026-09-01', amount: 3_000_000 },
      { donor: 'Chị Nguyễn Thị Mai', on: '2026-09-03', amount: 2_000_000 },
      {
        donor: 'Ông Nguyễn Văn Thịnh',
        on: '2026-09-18',
        item: '2.000 viên gạch Bát Tràng lát sân',
      },
    ],
  },
  {
    title: 'Giỗ Tổ họ Nguyễn — Bính Ngọ 2026',
    description: 'Công đức của con cháu trong ngày giỗ Tổ 12 tháng Giêng.',
    heldOn: '2026-03-01',
    donations: [
      { donor: 'Ông Nguyễn Văn Đức', on: '2026-03-01', amount: 2_000_000 },
      { donor: 'Bà Nguyễn Thị Hạnh', on: '2026-03-01', amount: 1_000_000 },
      { donor: 'Anh Nguyễn Văn Phúc', on: '2026-03-01', amount: 1_500_000 },
      { donor: 'Chị Nguyễn Thị Mai', on: '2026-03-01', item: 'Mâm ngũ quả và hoa tươi' },
      { donor: 'Anh Nguyễn Văn Hòa', on: '2026-03-01', amount: 1_500_000 },
    ],
  },
];

const albums: {
  title: string;
  description: string;
  photos: { picture: PictureKey; title: string; description: string; takenOn: string }[];
}[] = [
  {
    title: 'Nhà thờ họ Nguyễn',
    description: 'Hình ảnh nhà thờ họ và cảnh quan quanh từ đường qua các năm.',
    photos: [
      {
        picture: 'gate',
        title: 'Cổng nhà thờ họ',
        description: 'Cổng tam quan sau đợt trùng tu năm 2026.',
        takenOn: '2026-09-20',
      },
      {
        picture: 'pagoda',
        title: 'Ao sen trước từ đường',
        description: 'Ao sen và thủy đình nhìn từ sân nhà thờ.',
        takenOn: '2026-06-14',
      },
      {
        picture: 'river',
        title: 'Bến sông đầu làng',
        description: 'Nơi các cụ ngày trước lập làng, khai khẩn ruộng đất.',
        takenOn: '2026-04-03',
      },
    ],
  },
  {
    title: 'Quê hương bốn mùa',
    description: 'Cảnh sắc quê nhà do con cháu khắp nơi gửi về.',
    photos: [
      {
        picture: 'lotus',
        title: 'Sen nở tháng Sáu',
        description: 'Mùa sen đẹp nhất trong năm.',
        takenOn: '2026-06-20',
      },
      {
        picture: 'sen',
        title: 'Đóa sen trắng',
        description: 'Sen trắng trong ao làng.',
        takenOn: '2026-06-21',
      },
      {
        picture: 'mountain',
        title: 'Núi Tổ buổi sớm',
        description: 'Dãy núi sau làng, nơi đặt mộ cụ Thủy tổ.',
        takenOn: '2026-02-11',
      },
    ],
  },
];

const documents: { picture: PictureKey; title: string; description: string; takenOn: string }[] = [
  {
    picture: 'giaPha',
    title: 'Gia phả họ Nguyễn chép tay',
    description: 'Bản gia phả chữ Hán do cụ Nguyễn Văn Khiêm chép lại, lưu ở nhà thờ họ.',
    takenOn: '1938-03-15',
  },
  {
    picture: 'vanTe',
    title: 'Văn tế Thủy tổ',
    description: 'Bài văn tế đọc trong lễ giỗ Tổ hằng năm vào ngày 12 tháng Giêng.',
    takenOn: '2026-03-01',
  },
  {
    picture: 'soCongDuc',
    title: 'Sổ công đức trùng tu năm 1998',
    description: 'Danh sách con cháu công đức trong lần trùng tu nhà thờ họ năm Mậu Dần.',
    takenOn: '1998-05-10',
  },
];

/**
 * A fully filled-in profile for the founding ancestor, the member the landing page screenshot
 * opens. Only these fields are written; the name and family links stay as the tree has them.
 */
const FEATURED_PERSON = 'Nguyễn Văn Tài';
/** The ancestor's placeholder name before this seed first renamed him. */
const FEATURED_PLACEHOLDER = 'Thành viên khởi điểm';
const FEATURED_KEEPER = 'Thành viên thứ 3';
const featuredProfile = {
  name: FEATURED_PERSON,
  honorific: 'Cụ',
  courtesyName: 'Phúc Thiện',
  nickname: 'Cả Khiêm',
  birthDate: '1902-03-18',
  deathDate: '1978-02-19',
  isAlive: false,
  lunarDeathDay: 12,
  lunarDeathMonth: 1,
  burialPlace: 'Nghĩa trang dòng họ, chân núi Tổ, thôn Đông',
  worshipPlace: 'Nhà thờ họ Nguyễn, thôn Đông, xã Thanh Lâm',
  hometown: 'Thôn Đông, xã Thanh Lâm, huyện Thanh Liêm, tỉnh Hà Nam',
  maritalStatus: 'MARRIED',
  education: 'Hán học, đỗ Tú tài khoa Nhâm Tý',
  occupation: 'Thầy đồ, Lý trưởng làng Đông',
  biography:
    'Cụ sinh năm Nhâm Dần (1902) trong một gia đình nhà nho ở thôn Đông. Thuở nhỏ theo học chữ Hán, ' +
    'đỗ Tú tài rồi về làng mở lớp dạy học, nhiều học trò sau này thành đạt. Năm 1938 cụ đứng ra ' +
    'chép lại gia phả họ Nguyễn và vận động con cháu dựng nhà thờ họ trên nền đất cũ của tổ tiên.\n\n' +
    'Cụ sống thanh bạch, trọng chữ tín, được dân làng kính trọng. Lúc sinh thời cụ thường dặn con ' +
    'cháu: "Cây có cội, nước có nguồn — dù đi đâu cũng phải nhớ về quê cha đất tổ." Cụ mất ngày 12 ' +
    'tháng Giêng năm Mậu Ngọ (1978), hưởng thọ 76 tuổi.',
} as const;

const suggestions: {
  person: string;
  proposer: string;
  at: string;
  status: 'PENDING' | 'RESOLVED';
  content: string;
}[] = [
  {
    person: FEATURED_PERSON,
    proposer: 'Nguyễn Văn Khải',
    at: '2026-10-13T09:15',
    status: 'PENDING',
    content:
      'Theo bản gia phả chép tay, cụ mất ngày 12 tháng Giêng chứ không phải ngày 15. Đề nghị sửa lại ngày giỗ.',
  },
  {
    person: 'Thành viên thứ 3',
    proposer: 'Nguyễn Thị Hạnh',
    at: '2026-10-09T20:40',
    status: 'PENDING',
    content: 'Bổ sung tên chữ của ông là Đức Hậu, và nơi an táng tại nghĩa trang thôn Đông.',
  },
  {
    person: 'Thành viên thứ 11',
    proposer: 'Nguyễn Văn Phúc',
    at: '2026-09-30T15:05',
    status: 'RESOLVED',
    content: 'Cập nhật địa chỉ hiện tại: 25 Lê Lợi, phường Bến Thành, TP. Hồ Chí Minh.',
  },
];

async function main(): Promise<void> {
  const family = await prisma.family.findUniqueOrThrow({
    where: { slug: DEMO_SLUG },
    select: { id: true },
  });
  const familyId = family.id;

  const addedBytes = await copyPictures(familyId);

  const people = await prisma.person.findMany({
    where: {
      familyId,
      name: {
        in: [
          ...suggestions.map((s) => s.person),
          FEATURED_PERSON,
          FEATURED_PLACEHOLDER,
          FEATURED_KEEPER,
        ],
      },
    },
    select: { id: true, name: true },
  });
  const personId = new Map(people.map((p) => [p.name, p.id]));
  const featured = personId.get(FEATURED_PERSON) ?? personId.get(FEATURED_PLACEHOLDER);
  if (featured) personId.set(FEATURED_PERSON, featured);

  const postIds = feedPosts.map((_, i) => id(0xf00, i + 1));
  const fundIds = fundEntries.map((_, i) => id(0xf10, i + 1));
  const eventIds = meritEvents.map((_, i) => id(0xe00, i + 1));
  const albumIds = albums.map((_, i) => id(0xa00, i + 1));
  const documentIds = documents.map((_, i) => id(0xa10, i + 1));
  const suggestionIds = suggestions.map((_, i) => id(0x500, i + 1));

  await prisma.$transaction(async (tx) => {
    // Children cascade from posts, events and albums.
    await tx.feedPost.deleteMany({ where: { familyId, id: { in: postIds } } });
    await tx.fundEntry.deleteMany({ where: { familyId, id: { in: fundIds } } });
    await tx.meritEvent.deleteMany({ where: { familyId, id: { in: eventIds } } });
    await tx.media.deleteMany({ where: { familyId, id: { in: documentIds } } });
    await tx.album.deleteMany({ where: { familyId, id: { in: albumIds } } });
    await tx.editSuggestion.deleteMany({ where: { familyId, id: { in: suggestionIds } } });

    for (const [p, post] of feedPosts.entries()) {
      const postId = postIds[p]!;
      await tx.feedPost.create({
        data: {
          id: postId,
          familyId,
          authorName: post.author,
          authorKeyHash: authorKey(post.author),
          content: post.content,
          createdAt: at(post.postedAt),
        },
      });
      await tx.feedImage.createMany({
        data: post.images.map((key, sortOrder) => ({
          id: id(0xf01, (p + 1) * 16 + sortOrder),
          familyId,
          postId,
          url: mediaUrl(key),
          width: pictures[key].width,
          height: pictures[key].height,
          sortOrder,
        })),
      });
      for (const [c, comment] of post.comments.entries()) {
        await tx.feedComment.create({
          data: {
            id: id(0xf02, (p + 1) * 16 + c),
            familyId,
            postId,
            authorName: comment.author,
            authorKeyHash: authorKey(comment.author),
            content: comment.content,
            createdAt: at(comment.at),
          },
        });
      }
      await tx.feedReaction.createMany({
        data: post.reactions.map((reaction, r) => ({
          id: id(0xf03, (p + 1) * 16 + r),
          familyId,
          postId,
          reactorKeyHash: authorKey(reaction.name),
          reactorName: reaction.name,
          type: reaction.type,
          createdAt: at(post.postedAt),
        })),
      });
    }

    await tx.fundEntry.createMany({
      data: fundEntries.map((entry, i) => ({
        id: fundIds[i]!,
        familyId,
        content: entry.content,
        kind: entry.kind,
        amount: BigInt(entry.amount),
        occurredOn: day(entry.on),
      })),
    });

    for (const [e, event] of meritEvents.entries()) {
      await tx.meritEvent.create({
        data: {
          id: eventIds[e]!,
          familyId,
          title: event.title,
          description: event.description,
          heldOn: day(event.heldOn),
        },
      });
      await tx.meritDonation.createMany({
        data: event.donations.map((donation, d) => ({
          id: id(0xe01, (e + 1) * 32 + d),
          familyId,
          eventId: eventIds[e]!,
          donorName: donation.donor,
          kind: donation.item ? 'ITEM' : 'CASH',
          amount: donation.amount === undefined ? null : BigInt(donation.amount),
          itemContent: donation.item ?? null,
          note: donation.note ?? null,
          donatedOn: day(donation.on),
        })),
      });
    }

    for (const [a, album] of albums.entries()) {
      await tx.album.create({
        data: { id: albumIds[a]!, familyId, title: album.title, description: album.description },
      });
      for (const [i, photo] of album.photos.entries()) {
        await tx.media.create({
          data: {
            id: id(0xa01, (a + 1) * 16 + i),
            familyId,
            albumId: albumIds[a]!,
            kind: 'PHOTO',
            fileUrl: mediaUrl(photo.picture),
            contentType: 'image/jpeg',
            width: pictures[photo.picture].width,
            height: pictures[photo.picture].height,
            title: photo.title,
            description: photo.description,
            takenOn: day(photo.takenOn),
          },
        });
      }
    }

    for (const [i, doc] of documents.entries()) {
      await tx.media.create({
        data: {
          id: documentIds[i]!,
          familyId,
          kind: 'DOCUMENT',
          fileUrl: mediaUrl(doc.picture),
          contentType: 'image/jpeg',
          width: pictures[doc.picture].width,
          height: pictures[doc.picture].height,
          title: doc.title,
          description: doc.description,
          takenOn: day(doc.takenOn),
        },
      });
    }

    for (const [i, suggestion] of suggestions.entries()) {
      const target = personId.get(suggestion.person);
      if (!target) continue;
      await tx.editSuggestion.create({
        data: {
          id: suggestionIds[i]!,
          familyId,
          personId: target,
          proposerName: suggestion.proposer,
          content: suggestion.content,
          status: suggestion.status,
          createdAt: at(suggestion.at),
          reviewedAt: suggestion.status === 'RESOLVED' ? at(suggestion.at) : null,
        },
      });
    }

    if (featured) {
      await tx.person.update({
        where: { id: featured },
        data: { ...featuredProfile, worshipKeeperId: personId.get(FEATURED_KEEPER) ?? null },
      });
    }

    if (addedBytes > 0) {
      await tx.family.update({
        where: { id: familyId },
        data: { storageUsedBytes: { increment: addedBytes } },
      });
    }
  });

  console.log(
    `Seeded ${DEMO_SLUG}: ${feedPosts.length} posts, ${fundEntries.length} fund entries, ` +
      `${meritEvents.length} merit events, ${albums.length} albums, ${documents.length} documents, ` +
      `${suggestions.length} suggestions, featured profile for "${FEATURED_PERSON}".`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('Failed to seed the demo content:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
