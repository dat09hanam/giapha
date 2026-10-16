import {
  BookOpen,
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

import type { ImageFit } from './phone-frame';

/** Illustrations for the "Cách bắt đầu" section. */
const STEPS_DIR = '/images/home';

export const overview = [
  {
    icon: LayoutGrid,
    title: '9 chức năng cho dòng họ',
    text: 'Cây gia phả, hồ sơ, tin tức, quỹ chung, công đức, tư liệu, vai vế, in ấn và góp ý.',
    href: '#chuc-nang',
  },
  {
    icon: ListChecks,
    title: 'Bắt đầu trong 3 bước',
    text: 'Tạo gia phả, nhập phả hệ và mời con cháu cùng xem.',
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
  /** Picture for the feature; features without one show an illustrated phone screen. */
  image?: string;
  /**
   * How the picture is framed: `'phone'` (default) puts it inside the phone, `'print'` shows it
   * as a landscape printed sheet, `'none'` shows the picture on its own with no frame.
   */
  frame?: FeatureFrame;
  /**
   * How the picture fills its box: `'cover'` fills it and crops the overflow, `'contain'` shows the
   * whole picture inside the box, `'width'` spans the full width and lets the height follow the
   * picture (the sides are never cut). Defaults to `'cover'` in the phone and `'contain'` with
   * `frame: 'none'`.
   */
  fit?: ImageFit;
  /**
   * CSS object-position: which part of the picture stays in view with `'cover'` or `'contain'`,
   * e.g. `'top center'` (default), `'center'`, `'left center'`, `'30% 60%'`. Ignored with `'width'`.
   */
  focus?: string;
};

type FeatureFrame = 'phone' | 'print' | 'none';

const FEATURES_DIR = '/images/features';

const featureImages: readonly (string | undefined)[] = [
  `${FEATURES_DIR}/function1.png`,
  `${FEATURES_DIR}/function2.webp`,
  `${FEATURES_DIR}/function3.webp`,
  `${FEATURES_DIR}/function4.webp`,
  `${FEATURES_DIR}/function5.webp`,
  `${FEATURES_DIR}/function6.webp`,
  `${FEATURES_DIR}/function7.webp`,
  `${FEATURES_DIR}/function8.webp`,
  `${FEATURES_DIR}/function9.webp`,
];

export const features: readonly Feature[] = [
  {
    icon: GitFork,
    title: 'Cây Gia Phả Dòng Họ',
    text: 'Cây gia phả nhiều đời, phân theo từng thế hệ.',
    group: 'pha-he',
    image: featureImages[0],
    frame: 'none', // 'phone' | 'print' | 'none'
    fit: 'width', // 'cover' | 'contain' | 'width'
    focus: 'top center', // 'center', 'left center', '30% 60%'
  },
  {
    icon: Contact,
    title: 'Hồ Sơ Thành Viên',
    text: 'Thông tin đầy đủ cho mỗi thành viên trên cây.',
    group: 'pha-he',
    image: featureImages[1],
    frame: 'phone',
    fit: 'cover',
    focus: 'top center',
  },
  {
    icon: MessagesSquare,
    title: 'Tra Cứu Vai Vế',
    text: 'Chọn hai người để biết nên gọi nhau thế nào.',
    group: 'pha-he',
    image: featureImages[2],
    frame: 'phone',
    fit: 'cover',
    focus: 'top center',
  },
  {
    icon: Newspaper,
    title: 'Tin Tức Dòng Họ',
    text: 'Nơi con cháu chia sẻ tin tức, thông báo.',
    group: 'sinh-hoat',
    image: featureImages[3],
    frame: 'phone',
    fit: 'cover',
    focus: 'top center',
  },
  {
    icon: Wallet,
    title: 'Quỹ Chung Dòng Họ',
    text: 'Sổ thu chi chung, minh bạch, ai cũng xem được.',
    group: 'sinh-hoat',
    image: featureImages[4],
    frame: 'phone',
    fit: 'cover',
    focus: 'top center',
  },
  {
    icon: HandHeart,
    title: 'Sổ Vàng Công Đức',
    text: 'Ghi nhận tấm lòng của con cháu.',
    group: 'sinh-hoat',
    image: featureImages[5],
    frame: 'phone',
    fit: 'cover',
    focus: 'top center',
  },
  {
    icon: Images,
    title: 'Ảnh & Tư Liệu Dòng Họ',
    text: 'Kho ảnh và giấy tờ quý của dòng họ.',
    group: 'luu-tru',
    image: featureImages[6],
    frame: 'phone',
    fit: 'cover',
    focus: 'top center',
  },
  {
    icon: FilePen,
    title: 'Góp Ý Gia Phả',
    text: 'Cả họ cùng giữ cho gia phả chính xác.',
    group: 'luu-tru',
    image: featureImages[7],
    frame: 'phone',
    fit: 'cover',
    focus: 'top center',
  },
  {
    icon: Printer,
    title: 'In & Xuất Gia Phả',
    text: 'In phả đồ khổ lớn hoặc xuất cả quyển ra PDF.',
    group: 'luu-tru',
    image: featureImages[8],
    frame: 'phone',
    fit: 'cover',
    focus: 'top center',
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
    title: 'Khởi Tạo Gia Phả',
    text: 'Tạo không gian gia phả riêng cho dòng họ, lưu giữ thông tin tổ tiên và thiết lập tài khoản Trưởng họ.',
    image: `${STEPS_DIR}/step-1-khoi-tao.webp`,
    alt: 'Minh hoạ tạo gia phả mới cho dòng họ và tài khoản Trưởng họ',
    focus: 'center',
  },
  {
    title: 'Gìn Giữ Cội Nguồn',
    text: 'Bổ sung các thế hệ, thông tin thành viên, tiểu sử, hình ảnh và những câu chuyện của dòng họ.',
    image: `${STEPS_DIR}/step-2-gin-giu.webp`,
    alt: 'Minh hoạ cây gia phả nhiều đời kèm ảnh và tiểu sử',
    focus: 'center',
  },
  {
    title: 'Kết Nối Cháu Con',
    text: 'Mời con cháu cùng tìm hiểu cội nguồn, tra cứu quan hệ họ hàng và chung tay gìn giữ truyền thống.',
    image: `${STEPS_DIR}/step-3-ket-noi.webp`,
    alt: 'Minh hoạ con cháu ở xa kết nối với gia phả qua điện thoại',
    focus: 'center',
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
