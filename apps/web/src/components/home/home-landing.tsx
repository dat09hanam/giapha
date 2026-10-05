import Image from 'next/image';
import localFont from 'next/font/local';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronUp,
  GitFork,
  Leaf,
  MonitorSmartphone,
  Sprout,
} from 'lucide-react';

import { HomeHeaderMenu } from './home-header-menu';
import styles from './home.module.css';

const heroScript = localFont({
  src: '../../../public/fonts/home/Pacifico-Regular.ttf',
  weight: '400',
  display: 'swap',
});

function PeachBlossoms() {
  const flowers = [
    [28, 40, 1.1], [54, 93, 0.7], [89, 120, 1], [46, 161, 0.65],
    [116, 188, 0.85], [149, 216, 1.05], [182, 201, 0.65], [212, 239, 0.85],
    [162, 282, 0.6], [227, 308, 1], [262, 326, 0.7], [283, 376, 0.9],
    [320, 389, 0.65], [110, 95, 0.6], [65, 236, 0.65], [337, 440, 0.75],
  ];

  return (
    <svg className={styles.blossoms} viewBox="0 0 420 560" aria-hidden="true">
      <g fill="none" stroke="#77745d" strokeLinecap="round" strokeLinejoin="round">
        <path strokeWidth="6" d="M-12 0Q75 60 59 154T157 273Q224 320 275 369T362 469" />
        <path strokeWidth="3" d="M59 148 112 91M64 179 24 244M112 236 202 216 250 242M164 283 151 333M239 341 303 324M284 379 330 399 378 398" />
      </g>
      <g fill="#df8a80" opacity=".85">
        {flowers.map(([x, y, scale], index) => (
          <g key={index} transform={`translate(${x} ${y}) rotate(${index * 31}) scale(${scale})`}>
            {[0, 72, 144, 216, 288].map((angle) => (
              <path key={angle} transform={`rotate(${angle})`} d="M0 2C-17-5-17-20-7-22Q0-26 5-20C17-21 18-7 0 2Z" />
            ))}
            <circle r="5" fill="#f9e6b7" />
            <circle r="2" fill="#bf9260" />
          </g>
        ))}
      </g>
      <g fill="#e9988c" opacity=".7">
        <path d="M33 325q20-12 15 8q-12 12-15-8M103 375q-17-14-19 4q12 14 19-4M365 284q21-20 15 4q-7 14-15-4M204 441q-19-7-12 10q13 6 12-10M56 490q15-19 13 1q-7 13-13-1" />
      </g>
    </svg>
  );
}

function Landscape() {
  return (
    <svg
      className={styles.landscape}
      viewBox="0 0 1600 850"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <filter id="paper">
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".09" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
        <linearGradient id="mountain" x2="0" y2="1">
          <stop stopColor="#a4b5af" stopOpacity=".32" />
          <stop offset="1" stopColor="#b7cbc4" stopOpacity=".05" />
        </linearGradient>
        <linearGradient id="water" x2="0" y2="1">
          <stop stopColor="#a4c9c4" stopOpacity=".45" />
          <stop offset="1" stopColor="#f8efdc" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        fill="url(#mountain)"
        d="M0 650 95 535 130 567 232 405 300 500 370 474 450 628 680 710 965 565 1070 615 1190 378 1230 425 1330 214 1420 380 1480 312 1600 500V850H0Z"
      />
      <path fill="url(#water)" d="M0 600Q190 540 380 629T800 606T1200 583T1600 574V850H0Z" />
      <path
        fill="none"
        stroke="#fcfaf1"
        strokeWidth="35"
        opacity=".8"
        d="M-50 780Q230 701 580 793T1200 786T1660 752"
      />
      <g fill="none" stroke="#65755a" strokeLinecap="round" opacity=".38">
        <path strokeWidth="5" d="M1560 850Q1480 732 1494 665M1510 775 1405 728M1494 703 1545 653" />
      </g>
      <g stroke="#6c8077" fill="none" strokeWidth="2" opacity=".5">
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M${720 + i * 39} ${286 + ((i * 23) % 70)}q5 -7 10 0q5 -7 10 0`} />
        ))}
      </g>
      <path d="M950 760q70 30 130 0l-22 24h-84Z" fill="#6b8072" opacity=".35" />
      <rect width="1600" height="850" fill="transparent" filter="url(#paper)" />
    </svg>
  );
}

const features = [
  {
    icon: GitFork,
    title: 'Phả đồ trực quan',
    text: 'Theo dấu từng thế hệ, khám phá những nhánh nối dài của dòng họ trên cây gia phả tương tác.',
  },
  {
    icon: BookOpen,
    title: 'Lưu giữ chuyện gia đình',
    text: 'Một không gian để ghi lại tiểu sử, những dấu mốc và ký ức quý giá của mỗi thành viên.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Kết nối mọi lúc, mọi nơi',
    text: 'Truy cập gia phả ngay trên trình duyệt, từ máy tính, máy tính bảng đến điện thoại.',
  },
];

export function HomeLanding() {
  return (
    <main className={styles.home} id="top">
      <section className={styles.hero}>
        <Landscape />
        <header className={styles.header}>
          <Link href="/" className={styles.logo} aria-label="Gia Phả Đại Việt Online — Trang chủ">
            <Image
              src="/images/home/logo-dai-viet.png"
              alt="Gia Phả Đại Việt Online"
              width={2172}
              height={724}
              sizes="(max-width: 760px) 220px, 340px"
              priority
              className={styles.logoImage}
            />
          </Link>
          <HomeHeaderMenu />
        </header>
        <div className={styles.heroContent}>
          <PeachBlossoms />
          <div className={styles.copy}>
            <p className={styles.eyebrow}>Phần mềm gia phả trực tuyến</p>
            <h1 className={heroScript.className}>Gắn Kết Mọi Thế Hệ</h1>
            <h2>Gìn giữ cội nguồn, viết tiếp mai sau</h2>
            <p className={styles.description}>
              Tạo phả đồ, lưu trữ gia phả và xây dựng website riêng cho dòng họ — tất cả trực
              tuyến, không cần cài đặt, truy cập mọi lúc mọi nơi.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/demo">
                Trải nghiệm gia phả <ArrowRight size={18} />
              </Link>
              <a className={styles.secondary} href="#tinh-nang">
                Khám phá tính năng
              </a>
            </div>
            <div className={styles.reassurance}>
              <span>
                <Check size={15} /> Không cần cài đặt
              </span>
              <span>
                <Check size={15} /> Dễ dàng sử dụng
              </span>
            </div>
          </div>
          <div
            className={styles.devices}
            role="group"
            aria-label="Minh họa cây gia phả trên máy tính, máy tính bảng và điện thoại"
          >
            <Image
              className={styles.deviceImage}
              src="/images/home/devices-reference.png"
              alt="Laptop viền bạc có bàn phím, iPad nằm ngang phía trước và hai điện thoại nghiêng hiển thị gia phả"
              width={1774}
              height={887}
              sizes="(max-width: 760px) 100vw, 55vw"
              priority
            />
            <p>Mỗi dòng họ, một không gian lưu giữ yêu thương</p>
            <label className={styles.motionControl}>
              <input type="checkbox" />
              <span>Tạm dừng chuyển động</span>
            </label>
          </div>
        </div>
        <div className={styles.cloudScene}>
          <div className={styles.cloudSky} aria-hidden="true">
            {[0, 1, 2, 3].map((cloud) => (
              <span key={cloud} className={styles.cloud} />
            ))}
          </div>
          <label className={styles.cloudControl}>
            <input type="checkbox" />
            <span>Tạm dừng mây</span>
          </label>
        </div>
        <a className={styles.scrollHint} href="#tinh-nang">
          <Leaf size={17} /> Cùng viết tiếp câu chuyện dòng họ <span>↓</span>
        </a>
      </section>
      <section className={styles.features} id="tinh-nang">
        <p className={styles.sectionLabel}>TRÂN TRỌNG QUÁ KHỨ · GẮN KẾT TƯƠNG LAI</p>
        <h2>Một nơi lưu giữ, muôn đời nhớ thương</h2>
        <div className={styles.featureGrid}>
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <span className={styles.featureIcon}>
                <Icon size={25} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.demoSection} id="gia-pha">
        <div>
          <p className={styles.sectionLabel}>CÂU CHUYỆN BẮT ĐẦU TỪ CỘI NGUỒN</p>
          <h2>Hình dung gia phả của dòng họ bạn</h2>
          <p>Khám phá cây gia phả mẫu để tìm hiểu cách các thế hệ được kết nối.</p>
        </div>
        <Link href="/demo" className={styles.primary}>
          Xem gia phả mẫu <ArrowRight size={18} />
        </Link>
      </section>
      <section className={styles.guide} id="huong-dan">
        <p className={styles.sectionLabel}>BA BƯỚC ĐỂ BẮT ĐẦU</p>
        <h2>Bắt đầu khám phá thật dễ dàng</h2>
        <ol>
          <li>
            <span>01</span>
            <h3>Mở gia phả mẫu</h3>
            <p>Chọn “Trải nghiệm gia phả” để bước vào không gian dòng họ mẫu.</p>
          </li>
          <li>
            <span>02</span>
            <h3>Khám phá các thế hệ</h3>
            <p>Di chuyển và phóng to cây gia phả để theo dõi các nhánh trong gia đình.</p>
          </li>
          <li>
            <span>03</span>
            <h3>Tìm hiểu thành viên</h3>
            <p>
              Đọc thông tin hiển thị trên từng thẻ thành viên và theo dõi các đường nối quan hệ.
            </p>
          </li>
        </ol>
      </section>
      <section className={styles.faq} id="cau-hoi" aria-labelledby="faq-heading">
        <div className={styles.faqIntro}>
          <p className={styles.sectionLabel}>CÙNG BẠN GÌN GIỮ GIA PHẢ</p>
          <h2 id="faq-heading">Bạn hỏi, chúng tôi giải đáp</h2>
          <p>Một vài điều hữu ích trước khi bắt đầu câu chuyện của dòng họ.</p>
          <Link href="/demo" className={styles.secondary}>Khám phá gia phả mẫu <ArrowRight size={18} /></Link>
        </div>
        <div className={styles.faqList}>
          <details>
            <summary>Tôi có cần cài đặt phần mềm không?</summary>
            <p>Không cần cài đặt. Bạn có thể mở gia phả bằng trình duyệt trên máy tính, máy tính bảng hoặc điện thoại.</p>
          </details>
          <details>
            <summary>Tôi có thể xem thử trước khi đăng nhập không?</summary>
            <p>Có. Chọn “Trải nghiệm gia phả” để khám phá dòng họ mẫu và làm quen với cây gia phả.</p>
          </details>
          <details>
            <summary>Làm thế nào để xem các nhánh của dòng họ?</summary>
            <p>Trong phả đồ, bạn có thể di chuyển và phóng to để theo dõi các thế hệ. Chọn thành viên để tìm hiểu thông tin được hiển thị.</p>
          </details>
          <details>
            <summary>Tôi có thể chỉnh sửa gia phả không?</summary>
            <p>Việc chỉnh sửa cần đăng nhập bằng tài khoản được cấp quyền quản lý dòng họ. Hãy liên hệ người quản lý gia phả của bạn để được cấp quyền phù hợp.</p>
          </details>
        </div>
      </section>
      <footer className={styles.footer}>
        <Link href="/" className={styles.footerBrand}>
          <Sprout size={20} /> Gia Phả Đại Việt
        </Link>
        <p>Gìn giữ cội nguồn. Kết nối mai sau.</p>
        <a href="#top" aria-label="Về đầu trang">
          <ChevronUp size={20} />
        </a>
      </footer>
    </main>
  );
}
