import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  BookOpen,
  Contact,
  FilePen,
  GitFork,
  GraduationCap,
  HandHeart,
  Heart,
  Images,
  Mail,
  MapPin,
  MessageCircleQuestion,
  LayoutGrid,
  ListChecks,
  Newspaper,
  Phone,
  Printer,
  Sprout,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import { HomeHeader, LogoMark } from './home-header';
import styles from './home.module.css';

/** One line per section, so the page can be taken in before scrolling. */
const overview = [
  {
    icon: LayoutGrid,
    title: '8 chức năng cho dòng họ',
    text: 'Phả đồ, hồ sơ, bảng tin, quỹ họ, công đức, album, in ấn và đề xuất.',
    href: '#gioi-thieu',
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
    title: 'Phả đồ trực quan',
    text: 'Cây gia phả nhiều đời, phân theo từng thế hệ.',
  },
  {
    icon: Contact,
    title: 'Hồ sơ từng người',
    text: 'Thông tin đầy đủ cho mỗi thành viên trên cây.',
  },
  {
    icon: Printer,
    title: 'Thiết kế & in gia phả',
    text: 'Đưa phả hệ ra giấy để treo, để tặng.',
  },
  {
    icon: Newspaper,
    title: 'Bảng tin dòng họ',
    text: 'Nơi con cháu chia sẻ tin tức, thông báo.',
  },
  {
    icon: Wallet,
    title: 'Quỹ họ minh bạch',
    text: 'Sổ thu chi chung, ai cũng xem được.',
  },
  {
    icon: HandHeart,
    title: 'Sổ công đức',
    text: 'Ghi nhận tấm lòng của con cháu.',
  },
  {
    icon: Images,
    title: 'Album & tư liệu',
    text: 'Kho ảnh và giấy tờ quý của dòng họ.',
  },
  {
    icon: FilePen,
    title: 'Đề xuất chỉnh sửa',
    text: 'Cả họ cùng giữ cho gia phả chính xác.',
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
    q: 'Làm sao để dòng họ tôi có gia phả trên Gia phả Việt?',
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

/**
 * Contact details shown in the footer. These are the design's placeholders; replace them with
 * the real address, mailbox, phone, social pages and policy pages before launch.
 */
const SITE_CONTACT = {
  address: 'Hà Nội, Việt Nam',
  email: 'support@giaphaviet.vn',
  phone: '0123 456 789',
  hours: 'Thứ 2 - Thứ 6: 8:00 - 17:00',
  facebook: '#',
  youtube: '#',
  privacy: '#',
  terms: '#',
};

const footerValues = [
  {
    icon: UsersRound,
    title: 'Gìn giữ di sản',
    text: 'Lưu truyền thông tin dòng họ qua nhiều thế hệ',
  },
  {
    icon: BookOpen,
    title: 'Lan tỏa giá trị',
    text: 'Giáo dục truyền thống cho thế hệ trẻ',
  },
  {
    icon: HandHeart,
    title: 'Kết nối cộng đồng',
    text: 'Gắn kết các thành viên dòng họ mọi miền',
  },
];

/** Brand marks lucide does not ship; drawn at the icon set's 24px grid. */
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8.1v3h2.5V21h2.9Z" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
    </svg>
  );
}

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

      <section className={styles.intro} id="gioi-thieu" aria-labelledby="intro-title">
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
          <Eyebrow>Giới thiệu</Eyebrow>
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

      <footer className={styles.footer} id="lien-he">
        <section className={styles.footerCta} aria-labelledby="footer-cta-title">
          <span className={styles.footerOrnament} aria-hidden="true" />
          <h2 id="footer-cta-title">Bắt đầu hành trình gìn giữ cội nguồn</h2>
          <p>Khám phá gia phả mẫu hoặc đăng nhập để vào không gian của dòng họ bạn.</p>
          <div className={styles.footerActions}>
            <Link className={styles.footerPrimary} href="/gia-pha-mau">
              Xem gia phả mẫu <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className={styles.footerSecondary} href="/login">
              Đăng nhập
            </Link>
          </div>
        </section>

        <div className={styles.footerMain}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <Link href="/" className={styles.footerLogo} aria-label="Gia phả Việt — Trang chủ">
                <span className={styles.footerMedal}>
                  <LogoMark />
                </span>
                <span>
                  <strong>
                    Gia phả <em>Việt</em>
                  </strong>
                  <small>Kết nối cội nguồn</small>
                </span>
              </Link>
              <p>
                Nơi lưu giữ, kết nối và lan tỏa giá trị truyền thống gia đình, dòng họ Việt Nam bằng
                công nghệ hiện đại.
              </p>
              <ul className={styles.footerSocial} aria-label="Mạng xã hội">
                <li>
                  <a href={SITE_CONTACT.facebook} aria-label="Facebook">
                    <FacebookIcon />
                  </a>
                </li>
                <li>
                  <a href={SITE_CONTACT.youtube} aria-label="YouTube">
                    <YoutubeIcon />
                  </a>
                </li>
                <li>
                  <a href={`mailto:${SITE_CONTACT.email}`} aria-label="Email">
                    <Mail size={18} aria-hidden="true" />
                  </a>
                </li>
              </ul>
              <nav className={styles.footerLinks} aria-label="Thông tin pháp lý">
                <a href={SITE_CONTACT.privacy}>Chính sách bảo mật</a>
                <a href={SITE_CONTACT.terms}>Điều khoản sử dụng</a>
                <a href="#lien-he">Liên hệ</a>
              </nav>
            </div>

            {footerValues.map(({ icon: Icon, title, text }) => (
              <article key={title} className={styles.footerValue}>
                <span className={styles.footerMedal}>
                  <Icon size={30} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}

            <div className={styles.footerContact}>
              <h3>Liên hệ</h3>
              <ul>
                <li>
                  <span>
                    <MapPin size={17} aria-hidden="true" />
                  </span>
                  {SITE_CONTACT.address}
                </li>
                <li>
                  <span>
                    <Mail size={17} aria-hidden="true" />
                  </span>
                  <a href={`mailto:${SITE_CONTACT.email}`}>{SITE_CONTACT.email}</a>
                </li>
                <li>
                  <span>
                    <Phone size={17} aria-hidden="true" />
                  </span>
                  <a href={`tel:${SITE_CONTACT.phone.replace(/\s+/g, '')}`}>{SITE_CONTACT.phone}</a>
                </li>
                <li>
                  <span>
                    <Clock size={17} aria-hidden="true" />
                  </span>
                  {SITE_CONTACT.hours}
                </li>
              </ul>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p>© {new Date().getFullYear()} Gia phả Việt. Giữ gìn cội nguồn. Kết nối muôn đời.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
