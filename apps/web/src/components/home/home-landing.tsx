import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Contact,
  FilePen,
  GitFork,
  GraduationCap,
  HandHeart,
  Heart,
  Images,
  MessageCircleQuestion,
  MessagesSquare,
  LayoutGrid,
  ListChecks,
  Newspaper,
  Printer,
  Sprout,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import { HomeFooter } from './home-footer';
import { HomeHeader } from './home-header';
import styles from './home.module.css';

/** One line per section, so the page can be taken in before scrolling. */
const overview = [
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
];

type Feature = { icon: LucideIcon; title: string; text: string };

const features: readonly Feature[] = [
  {
    icon: GitFork,
    title: 'Cây Gia Phả Dòng Họ',
    text: 'Cây gia phả nhiều đời, phân theo từng thế hệ.',
  },
  {
    icon: Contact,
    title: 'Hồ Sơ Thành Viên',
    text: 'Thông tin đầy đủ cho mỗi thành viên trên cây.',
  },
  {
    icon: Newspaper,
    title: 'Tin Tức Dòng Họ',
    text: 'Nơi con cháu chia sẻ tin tức, thông báo.',
  },
  {
    icon: Wallet,
    title: 'Quỹ Chung Dòng Họ',
    text: 'Sổ thu chi chung, minh bạch, ai cũng xem được.',
  },
  {
    icon: HandHeart,
    title: 'Sổ Vàng Công Đức',
    text: 'Ghi nhận tấm lòng của con cháu.',
  },
  {
    icon: Images,
    title: 'Ảnh & Tư Liệu Dòng Họ',
    text: 'Kho ảnh và giấy tờ quý của dòng họ.',
  },
  {
    icon: FilePen,
    title: 'Góp Ý Gia Phả',
    text: 'Cả họ cùng giữ cho gia phả chính xác.',
  },
  {
    icon: MessagesSquare,
    title: 'Tra Cứu Vai Vế',
    text: 'Chọn hai người để biết nên gọi nhau thế nào.',
  },
  {
    icon: Printer,
    title: 'In & Xuất Gia Phả',
    text: 'In phả đồ khổ lớn hoặc xuất cả quyển ra PDF.',
  },
];

const steps = [
  {
    title: 'Tạo gia phả',
    text: 'Quản trị tạo không gian cho dòng họ, với đường dẫn riêng, và cấp tài khoản Trưởng họ.',
  },
  {
    title: 'Nhập phả hệ',
    text: 'Trưởng họ thêm từng người, từng đời, viết lời giới thiệu và lịch sử dòng họ.',
  },
  {
    title: 'Cấp tài khoản',
    text: 'Trưởng họ cấp tài khoản cho thành viên, giao người quản lý từng chi, nhánh.',
  },
  {
    title: 'Cùng gìn giữ',
    text: 'Con cháu xem phả đồ, đọc bảng tin, đóng góp quỹ và gửi đề xuất bổ sung.',
  },
];

const reasons = [
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
];

const questions = [
  {
    q: 'Làm sao để dòng họ tôi có gia phả trên Gia Phả Đời Đời?',
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
];

function Eyebrow({ children }: { children: string }) {
  return (
    <p className={styles.eyebrow}>
      <span aria-hidden="true" />
      {children}
      <span aria-hidden="true" />
    </p>
  );
}

export function HomeLanding() {
  return (
    <main className={styles.home} id="top">
      <HomeHeader />

      <section className={styles.hero} aria-labelledby="hero-title">
        <Image
          className={styles.heroArt}
          src="/images/decorations/family-about-hero.webp"
          alt=""
          aria-hidden="true"
          width={1920}
          height={1080}
          sizes="(max-width: 760px) 100vw, 65vw"
          priority
        />
        <span className={styles.sun} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <Eyebrow>Gìn giữ cội nguồn</Eyebrow>
          <h1 id="hero-title">
            <span>Gia phả</span>
            <span>Kết nối muôn đời</span>
          </h1>
          <p>
            Nơi lưu giữ, xây dựng và lan tỏa giá trị truyền thống gia đình, dòng họ Việt Nam bằng
            công nghệ hiện đại.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primary} href="/gia-pha-mau">
              Xem gia phả mẫu <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <nav className={styles.overview} aria-label="Tổng quan">
        {overview.map(({ icon: Icon, title, text, href }) => (
          <a key={title} href={href}>
            <span className={styles.roundIcon}>
              <Icon size={26} aria-hidden="true" />
            </span>
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
          </a>
        ))}
      </nav>

      <section className={styles.intro} id="chuc-nang" aria-labelledby="intro-title">
        <Image
          className={styles.bamboo}
          src="/images/decorations/bamboo-grove.png"
          alt=""
          aria-hidden="true"
          width={480}
          height={1383}
          sizes="210px"
        />
        <div className={styles.introCopy}>
          <Eyebrow>Chức năng</Eyebrow>
          <h2 id="intro-title">
            Gia phả online
            <br />
            cho mọi dòng họ Việt
          </h2>
          <p>
            Chúng tôi cung cấp nền tảng gia phả trực tuyến giúp các dòng họ lưu giữ, quản lý và
            truyền lại giá trị lịch sử, văn hóa, gắn kết tình thân giữa các thế hệ một cách dễ dàng
            và tiện lợi. Không cần cài đặt: mở bằng trình duyệt trên máy tính, máy tính bảng hay
            điện thoại.
          </p>
        </div>
        <figure className={styles.devices} id="hinh-anh">
          <Image
            src="/images/decorations/devices-reference.png"
            alt="Cây gia phả hiển thị trên máy tính xách tay, máy tính bảng và điện thoại"
            width={1774}
            height={887}
            sizes="(max-width: 900px) 100vw, 55vw"
          />
        </figure>
        <div className={styles.featureGrid}>
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <span className={styles.squareIcon}>
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.steps} id="cach-bat-dau" aria-labelledby="steps-title">
        <Eyebrow>Cách bắt đầu</Eyebrow>
        <h2 id="steps-title">Có gia phả trực tuyến trong 4 bước</h2>
        <ol className={styles.stepList}>
          {steps.map(({ title, text }, index) => (
            <li key={title}>
              <span className={styles.stepNumber} aria-hidden="true">
                {index + 1}
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.reasons} id="y-nghia" aria-labelledby="reasons-title">
        <Eyebrow>Vì sao nên lưu giữ gia phả?</Eyebrow>
        <h2 id="reasons-title">Những giá trị bền vững cho hôm nay và mai sau</h2>
        <div className={styles.reasonGrid}>
          {reasons.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <span className={styles.roundIcon}>
                <Icon size={24} aria-hidden="true" />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.faq} id="hoi-dap" aria-labelledby="faq-title">
        <div>
          <Eyebrow>Câu hỏi thường gặp</Eyebrow>
          <h2 id="faq-title">Bạn hỏi, chúng tôi giải đáp</h2>
        </div>
        <dl className={styles.faqList}>
          {questions.map(({ q, a }) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <HomeFooter />
    </main>
  );
}
