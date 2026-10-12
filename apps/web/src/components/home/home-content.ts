import {
  BadgeCheck,
  BookOpen,
  FileDown,
  KeyRound,
  Network,
  Contact,
  FilePen,
  GitFork,
  GraduationCap,
  HandHeart,
  Heart,
  Images,
  LayoutGrid,
  ListChecks,
  MessageCircleQuestion,
  MessagesSquare,
  Newspaper,
  Printer,
  Sprout,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import { SITE_BRAND } from '@/lib/site-brand';

/** Screenshots come from the demo family via `scripts/capture-home-screens.mjs`. */
const SCREEN = '/images/decorations';

export const overview = [
  {
    icon: LayoutGrid,
    title: '9 chức năng cho dòng họ',
    text: 'Cây gia phả, hồ sơ, tin tức, quỹ chung, công đức, tư liệu, vai vế, in ấn và góp ý.',
    href: '#chuc-nang',
  },
  {
    icon: ListChecks,
    title: 'Bắt đầu trong 4 bước',
    text: 'Tạo gia phả, nhập phả hệ, cấp tài khoản và mời con cháu cùng xem.',
    href: '#cach-bat-dau',
  },
  {
    icon: Heart,
    title: 'Giá trị bền vững',
    text: 'Bảo tồn lịch sử, giáo dục thế hệ trẻ, gắn kết gia đình.',
    href: '#y-nghia',
  },
  {
    icon: MessageCircleQuestion,
    title: 'Giải đáp thắc mắc',
    text: 'Cài đặt, xem thử, chỉnh sửa, ngày giỗ và in gia phả.',
    href: '#hoi-dap',
  },
] as const;

export type FeatureGroup = 'pha-he' | 'sinh-hoat' | 'luu-tru';

export const featureGroups: readonly { id: FeatureGroup; label: string }[] = [
  { id: 'pha-he', label: 'Phả hệ' },
  { id: 'sinh-hoat', label: 'Sinh hoạt họ' },
  { id: 'luu-tru', label: 'Lưu trữ & in ấn' },
];

export type Feature = {
  icon: LucideIcon;
  title: string;
  text: string;
  group: FeatureGroup;
  /** Phone-sized screenshot; features without one show an illustrated screen. */
  image?: string;
  /** Landscape artwork shown as a printed sheet instead of a phone. */
  print?: string;
};

export const features: readonly Feature[] = [
  {
    icon: GitFork,
    title: 'Cây Gia Phả Dòng Họ',
    text: 'Cây gia phả nhiều đời, phân theo từng thế hệ.',
    group: 'pha-he',
    image: `${SCREEN}/screen-tree.webp`,
  },
  {
    icon: Contact,
    title: 'Hồ Sơ Thành Viên',
    text: 'Thông tin đầy đủ cho mỗi thành viên trên cây.',
    group: 'pha-he',
    image: `${SCREEN}/screen-profile.webp`,
  },
  {
    icon: MessagesSquare,
    title: 'Tra Cứu Vai Vế',
    text: 'Chọn hai người để biết nên gọi nhau thế nào.',
    group: 'pha-he',
    image: `${SCREEN}/screen-kinship.webp`,
  },
  {
    icon: Newspaper,
    title: 'Tin Tức Dòng Họ',
    text: 'Nơi con cháu chia sẻ tin tức, thông báo.',
    group: 'sinh-hoat',
  },
  {
    icon: Wallet,
    title: 'Quỹ Chung Dòng Họ',
    text: 'Sổ thu chi chung, minh bạch, ai cũng xem được.',
    group: 'sinh-hoat',
  },
  {
    icon: HandHeart,
    title: 'Sổ Vàng Công Đức',
    text: 'Ghi nhận tấm lòng của con cháu.',
    group: 'sinh-hoat',
  },
  {
    icon: Images,
    title: 'Ảnh & Tư Liệu Dòng Họ',
    text: 'Kho ảnh và giấy tờ quý của dòng họ.',
    group: 'luu-tru',
  },
  {
    icon: FilePen,
    title: 'Góp Ý Gia Phả',
    text: 'Cả họ cùng giữ cho gia phả chính xác.',
    group: 'luu-tru',
  },
  {
    icon: Printer,
    title: 'In & Xuất Gia Phả',
    text: 'In phả đồ khổ lớn hoặc xuất cả quyển ra PDF.',
    group: 'luu-tru',
    print: `${SCREEN}/screen-poster.webp`,
  },
];

/** `focus` is the CSS object-position that keeps the meaningful part of a tall screenshot. */
export const steps: readonly {
  title: string;
  text: string;
  image: string;
  alt: string;
  focus: string;
}[] = [
  {
    title: 'Tạo gia phả',
    text: 'Quản trị tạo không gian cho dòng họ, với đường dẫn riêng, và cấp tài khoản Trưởng họ.',
    image: `${SCREEN}/screen-poster.webp`,
    alt: 'Phả đồ mang tên dòng họ trên không gian riêng',
    focus: 'center',
  },
  {
    title: 'Nhập phả hệ',
    text: 'Trưởng họ thêm từng người, từng đời, viết lời giới thiệu và lịch sử dòng họ.',
    image: `${SCREEN}/screen-profile.webp`,
    alt: 'Hồ sơ một thành viên với đời, thứ bậc và quan hệ gia đình',
    focus: 'center 64%',
  },
  {
    title: 'Cấp tài khoản',
    text: 'Trưởng họ cấp tài khoản cho thành viên, giao người quản lý từng chi, nhánh.',
    image: `${SCREEN}/screen-login.webp`,
    alt: 'Màn hình đăng nhập tài khoản gia phả',
    focus: 'center 64%',
  },
  {
    title: 'Cùng gìn giữ',
    text: 'Con cháu xem phả đồ, đọc bảng tin, đóng góp quỹ và gửi đề xuất bổ sung.',
    image: `${SCREEN}/screen-kinship.webp`,
    alt: 'Tra cứu cách xưng hô giữa hai thành viên',
    focus: 'center 80%',
  },
];

export const reasons = [
  {
    icon: BookOpen,
    title: 'Bảo tồn lịch sử',
    text: 'Giữ gìn những câu chuyện, sự kiện và dấu ấn của dòng họ.',
  },
  {
    icon: GraduationCap,
    title: 'Giáo dục thế hệ trẻ',
    text: 'Nuôi dưỡng lòng tự hào, biết ơn và ý thức gìn giữ cội nguồn.',
  },
  {
    icon: Heart,
    title: 'Gắn kết gia đình',
    text: 'Tăng cường sự kết nối, đoàn kết giữa các thành viên trong dòng họ.',
  },
  {
    icon: Sprout,
    title: 'Truyền lại giá trị văn hóa',
    text: 'Giữ gìn phong tục, nét đẹp truyền thống cho các thế hệ mai sau.',
  },
] as const;

/** Paper book versus the online tree, for the “why go digital” story. */
export const paperVsOnline = {
  paper: [
    'Chỉ một cuốn, do một người cất giữ',
    'Giấy mủn, mực phai theo năm tháng',
    'Con cháu ở xa khó được xem',
    'Thêm một người phải chép lại cả trang',
  ],
  online: [
    'Cả họ cùng xem trên điện thoại, máy tính',
    'Ngày giỗ ghi theo âm lịch, không lo quên',
    'Cập nhật ngay khi có thành viên mới',
    'In phả đồ khổ lớn hoặc xuất PDF khi cần',
  ],
} as const;

/** Answers to the usual worries about putting family records online. */
export const trustPoints = [
  {
    icon: KeyRound,
    q: 'Người lạ có xem được gia phả không?',
    a: 'Không. Gia phả của dòng họ chỉ mở được khi đăng nhập bằng tài khoản do Trưởng họ cấp.',
  },
  {
    icon: BadgeCheck,
    q: 'Ai được sửa thông tin?',
    a: 'Chỉ người được giao quyền. Thành viên khác gửi đề xuất, Trưởng họ duyệt rồi mới cập nhật.',
  },
  {
    icon: Network,
    q: 'Họ lớn nhiều chi thì quản lý sao?',
    a: 'Trưởng họ giao người quản lý cho từng chi, nhánh để cùng nhập và giữ phả hệ.',
  },
  {
    icon: FileDown,
    q: 'Dòng họ có giữ được một bản riêng?',
    a: 'Có. Xuất cả quyển gia phả ra PDF hoặc in phả đồ bất cứ lúc nào để cất giữ.',
  },
] as const;

export const heroFacts = [
  { value: 9, label: 'chức năng' },
  { value: 4, label: 'bước bắt đầu' },
  { value: 3, label: 'loại thiết bị' },
] as const;

export type Testimonial = { quote: string; name: string; role: string; avatar?: string };

/**
 * Only add real quotes from family heads who agreed to be shown publicly.
 * The section stays hidden while this list is empty.
 */
export const testimonials: readonly Testimonial[] = [];

export const questions = [
  {
    q: `Làm sao để dòng họ tôi có gia phả trên ${SITE_BRAND.name}?`,
    a: 'Liên hệ quản trị để được tạo gia phả. Trưởng họ sẽ nhận tài khoản để bắt đầu nhập phả hệ và cấp tài khoản cho con cháu.',
  },
  {
    q: 'Tôi có cần cài đặt phần mềm không?',
    a: 'Không cần cài đặt. Bạn có thể mở gia phả bằng trình duyệt trên máy tính, máy tính bảng hoặc điện thoại.',
  },
  {
    q: 'Tôi có thể xem thử trước khi đăng nhập không?',
    a: 'Có. Chọn “Xem gia phả mẫu” để khám phá dòng họ mẫu và làm quen với cây gia phả.',
  },
  {
    q: 'Tôi có thể chỉnh sửa gia phả không?',
    a: 'Việc chỉnh sửa cần đăng nhập bằng tài khoản được cấp quyền quản lý dòng họ. Thành viên vẫn có thể gửi đề xuất chỉnh sửa để Trưởng họ duyệt.',
  },
  {
    q: 'Ngày giỗ được ghi theo lịch nào?',
    a: 'Ngày giỗ của từng người được ghi theo âm lịch, đúng với cách các gia đình Việt vẫn làm giỗ.',
  },
  {
    q: 'Tôi có thể in gia phả ra giấy không?',
    a: 'Có. Bạn có thể thiết kế phả đồ dạng tranh để in khổ lớn, hoặc xuất cả quyển gia phả để in hay lưu thành PDF.',
  },
] as const;
