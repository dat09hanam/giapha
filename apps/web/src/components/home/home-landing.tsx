import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  ChevronUp,
  GitFork,
  Globe,
  GraduationCap,
  Heart,
  MonitorSmartphone,
  Sprout,
  UsersRound,
} from 'lucide-react';

import { HomeHeaderMenu } from './home-header-menu';
import styles from './home.module.css';

/** The brand mark: an old tree inside a cloud-scroll frame. */
function LogoMark() {
  return (
    <svg className={styles.logoMark} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        d="M24 4c5 0 7 3 8 5 4-1 8 2 8 6 3 1 5 4 4 8 2 3 1 8-3 9 0 5-4 8-9 7-2 3-5 4-8 4s-6-1-8-4c-5 1-9-2-9-7-4-1-5-6-3-9-1-4 1-7 4-8 0-4 4-7 8-6 1-2 3-5 8-5Z"
      />
      <g fill="currentColor">
        <path d="M22.6 39V28.5c-2.8-.4-5.2-2-6.4-4.4 2.6.7 5 .5 6.4-.6v-3.4c-2 .8-4.6.6-6.5-.8 2.2-.6 4.4-1.6 5.6-3.3-1.5-.7-2.6-2-3-3.6 2 .8 4 .8 5.3.1 1.3.7 3.3.7 5.3-.1-.4 1.6-1.5 2.9-3 3.6 1.2 1.7 3.4 2.7 5.6 3.3-1.9 1.4-4.5 1.6-6.5.8v3.4c1.4 1.1 3.8 1.3 6.4.6-1.2 2.4-3.6 4-6.4 4.4V39Z" />
        <path d="M15 39.5h18v1.6H15Z" />
      </g>
    </svg>
  );
}

/** Misty mountains along the bottom of a section. */
function Mountains({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
      <path
        fill="#cdbf9f"
        opacity=".35"
        d="M0 160V96l70-40 60 30 90-62 80 52 70-20 90 48 120-30 100 36 90-58 110 56 80-26 110 44 90-50 110 44 90-28 80 30v106Z"
      />
      <path
        fill="#b9a982"
        opacity=".3"
        d="M0 160v-34l110-34 120 40 140-30 160 36 150-24 170 30 140-36 170 30 150-22 130 24v50Z"
      />
    </svg>
  );
}

const values = [
  {
    icon: Sprout,
    title: 'Lưu giữ cội nguồn',
    text: 'Ghi chép, bảo tồn thông tin các thế hệ trong dòng họ.',
  },
  {
    icon: UsersRound,
    title: 'Kết nối con cháu',
    text: 'Tạo cầu nối gắn kết giữa các thế hệ, dù ở bất cứ nơi đâu.',
  },
  {
    icon: BookOpen,
    title: 'Lan tỏa giá trị truyền thống',
    text: 'Giáo dục con cháu về lịch sử, văn hóa và đạo lý gia đình.',
  },
  {
    icon: Heart,
    title: 'Xây dựng tương lai',
    text: 'Cùng nhau gìn giữ và phát triển dòng họ ngày càng vững mạnh.',
  },
];

const highlights = [
  { icon: GitFork, title: 'Phả đồ trực quan', text: 'Theo dõi từng thế hệ' },
  { icon: MonitorSmartphone, title: 'Mọi thiết bị', text: 'Không cần cài đặt' },
  { icon: Globe, title: 'Phục vụ', text: 'Cộng đồng người Việt' },
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
    q: 'Tôi có cần cài đặt phần mềm không?',
    a: 'Không cần cài đặt. Bạn có thể mở gia phả bằng trình duyệt trên máy tính, máy tính bảng hoặc điện thoại.',
  },
  {
    q: 'Tôi có thể xem thử trước khi đăng nhập không?',
    a: 'Có. Chọn “Xem gia phả mẫu” để khám phá dòng họ mẫu và làm quen với cây gia phả.',
  },
  {
    q: 'Tôi có thể chỉnh sửa gia phả không?',
    a: 'Việc chỉnh sửa cần đăng nhập bằng tài khoản được cấp quyền quản lý dòng họ. Hãy liên hệ người quản lý gia phả của bạn để được cấp quyền phù hợp.',
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
      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="Gia phả Việt — Trang chủ">
          <LogoMark />
          <span>Gia phả Việt</span>
        </Link>
        <HomeHeaderMenu />
      </header>

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
            <Link className={styles.primary} href="/demo">
              Xem gia phả mẫu <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a className={styles.secondary} href="#gioi-thieu">
              Tìm hiểu thêm
            </a>
          </div>
        </div>
      </section>

      <section className={styles.values} id="tinh-nang" aria-label="Giá trị cốt lõi">
        {values.map(({ icon: Icon, title, text }) => (
          <article key={title}>
            <span className={styles.roundIcon}>
              <Icon size={26} aria-hidden="true" />
            </span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </section>

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
            và tiện lợi.
          </p>
          <ul className={styles.highlights}>
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <Icon size={24} aria-hidden="true" />
                <span>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
              </li>
            ))}
          </ul>
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
      </section>

      <section className={styles.reasons} id="y-nghia" aria-labelledby="reasons-title">
        <Mountains className={styles.mountains} />
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

      <section className={styles.faq} aria-labelledby="faq-title">
        <div>
          <Eyebrow>Câu hỏi thường gặp</Eyebrow>
          <h2 id="faq-title">Bạn hỏi, chúng tôi giải đáp</h2>
        </div>
        <div className={styles.faqList}>
          {questions.map(({ q, a }) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className={styles.footer} id="lien-he">
        <div className={styles.footerCta}>
          <h2>Bắt đầu hành trình gìn giữ cội nguồn</h2>
          <p>Khám phá gia phả mẫu hoặc đăng nhập để vào không gian của dòng họ bạn.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primary} href="/demo">
              Xem gia phả mẫu <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className={styles.secondary} href="/login">
              Đăng nhập
            </Link>
          </div>
        </div>
        <div className={styles.footerBar}>
          <Link href="/" className={styles.logo}>
            <LogoMark />
            <span>Gia phả Việt</span>
          </Link>
          <p>Gìn giữ cội nguồn. Kết nối muôn đời.</p>
          <p className={styles.credit}>
            Ảnh rừng tre:{' '}
            <a href="https://commons.wikimedia.org/wiki/File:Arashiyama_Bamboo_Grove.jpg">
              Mitchwandrew
            </a>
            ,{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" rel="license">
              CC BY 4.0
            </a>
          </p>
          <a href="#top" aria-label="Về đầu trang" className={styles.toTop}>
            <ChevronUp size={20} />
          </a>
        </div>
      </footer>
    </main>
  );
}
