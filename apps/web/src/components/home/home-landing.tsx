import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  PhoneCall,
  Quote,
  ScrollText,
  Smartphone,
  X,
} from 'lucide-react';

import { ArticleCard } from '@/components/articles/article-card';
import { PricingTable } from '@/components/pricing/pricing-table';
import { ContactLink } from '@/components/social/contact-link';
import { SITE_BRAND } from '@/lib/site-brand';
import { cn } from '@/lib/utils';
import type { ArticleSummary } from '@/types/article';
import type { PricingPlan } from '@/types/pricing';

import { Faq } from './faq';
import { FeatureShowcase } from './feature-showcase';
import {
  overview,
  paperVsOnline,
  questions,
  reasons,
  steps,
  testimonials,
} from './home-content';
import { HomeFooter } from './home-footer';
import { HomeHeader } from './home-header';
import styles from './home.module.css';

function Eyebrow({ children }: { children: string }) {
  return (
    <p className={styles.eyebrow}>
      <span aria-hidden="true" />
      {children}
      <span aria-hidden="true" />
    </p>
  );
}

function WhyDigital() {
  return (
    <section className={styles.story} id="vi-sao" aria-labelledby="story-title">
      <div className={cn(styles.storyCopy, styles.reveal)}>
        <Eyebrow>Vì sao nên số hóa</Eyebrow>
        <h2 id="story-title">Cuốn phả giấy chỉ có một, và mỗi năm lại mờ thêm một chút</h2>
        <p>
          Nhiều dòng họ chỉ còn một cuốn phả do Trưởng họ cất giữ. Người nhớ chuyện cũ thưa dần, con
          cháu thì ở khắp nơi. Đưa gia phả lên mạng để ai cũng xem được, và cả họ cùng giữ cho đầy
          đủ.
        </p>
      </div>
      <div className={styles.compare}>
        <article className={cn(styles.compareCard, styles.comparePaper, styles.reveal)}>
          <h3>
            <ScrollText size={18} aria-hidden="true" /> Gia phả giấy
          </h3>
          <ul>
            {paperVsOnline.paper.map((item) => (
              <li key={item}>
                <X size={16} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </article>
        <article className={cn(styles.compareCard, styles.compareOnline, styles.reveal)}>
          <h3>
            <Smartphone size={18} aria-hidden="true" /> Gia phả trực tuyến
          </h3>
          <ul>
            {paperVsOnline.online.map((item) => (
              <li key={item}>
                <Check size={16} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

function Guides({ guides }: { guides: readonly ArticleSummary[] }) {
  if (guides.length === 0) return null;
  return (
    <section className={styles.guides} id="huong-dan" aria-labelledby="guides-title">
      <div className={styles.guidesHead}>
        <div>
          <Eyebrow>Hướng dẫn</Eyebrow>
          <h2 id="guides-title">Kiến thức gia phả</h2>
        </div>
        <Link href="/thu-vien">
          Xem tất cả <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <ul className={styles.guideList}>
        {guides.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </ul>
    </section>
  );
}

function Testimonials() {
  if (testimonials.length === 0) return null;
  return (
    <section className={styles.testimonials} aria-labelledby="testimonials-title">
      <Eyebrow>Cảm nhận</Eyebrow>
      <h2 id="testimonials-title">Các dòng họ nói gì</h2>
      <ul>
        {testimonials.map(({ quote, name, role, avatar }) => (
          <li key={name} className={styles.reveal}>
            <Quote className={styles.quoteMark} size={28} aria-hidden="true" />
            <blockquote>{quote}</blockquote>
            <p>
              {avatar ? <Image src={avatar} alt="" width={44} height={44} /> : null}
              <span>
                <strong>{name}</strong>
                <small>{role}</small>
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomeLanding({
  pricingPlans,
  guides,
}: {
  pricingPlans: readonly PricingPlan[];
  guides: readonly ArticleSummary[];
}) {
  const hasPricing = pricingPlans.length > 0;
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
          sizes="(max-width: 1023px) 100vw, 65vw"
          preload
        />
        <span className={styles.sun} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <Eyebrow>Gìn giữ cội nguồn</Eyebrow>
          <h1 id="hero-title">
            <span>Gia phả</span>
            <span>Kết nối muôn đời</span>
          </h1>
          <p>{SITE_BRAND.description}</p>
          <div className={styles.heroActions}>
            <Link className={styles.primary} href="/gia-pha-mau">
              Xem gia phả mẫu <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <ContactLink className={styles.secondary}>
              <PhoneCall size={17} aria-hidden="true" /> Đăng ký cho dòng họ
            </ContactLink>
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

      <WhyDigital />

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
        <div className={cn(styles.introCopy, styles.reveal)}>
          <Eyebrow>Chức năng</Eyebrow>
          <h2 id="intro-title">
            Gia phả online
            <br />
            cho mọi dòng họ Việt
          </h2>
          <p className={styles.longCopy}>
            Chúng tôi cung cấp nền tảng gia phả trực tuyến giúp các dòng họ lưu giữ, quản lý và
            truyền lại giá trị lịch sử, văn hóa, gắn kết tình thân giữa các thế hệ một cách dễ dàng
            và tiện lợi. Không cần cài đặt, mở bằng trình duyệt trên máy tính, máy tính bảng hay
            điện thoại.
          </p>
          <p className={styles.shortCopy}>
            Lưu giữ lịch sử dòng họ, gắn kết các thế hệ. Vuốt để xem từng chức năng trên điện thoại.
          </p>
        </div>
        <figure className={cn(styles.devices, styles.reveal)} id="hinh-anh">
          <Image
            src="/images/decorations/devices-reference.png"
            alt="Cây gia phả hiển thị trên máy tính xách tay, máy tính bảng và điện thoại"
            width={1774}
            height={887}
            sizes="(max-width: 900px) 100vw, 55vw"
          />
        </figure>
        <FeatureShowcase />
      </section>

      <section className={styles.steps} id="cach-bat-dau" aria-labelledby="steps-title">
        <Eyebrow>Gìn Giữ Cội Nguồn</Eyebrow>
        <h2 id="steps-title">Tạo Gia Phả trực tuyến chỉ với 3 bước</h2>
        <ol className={styles.stepList}>
          {steps.map(({ title, text, image, alt, focus }, index) => (
            <li key={title} className={styles.reveal}>
              <span className={styles.stepNumber} aria-hidden="true">
                {index + 1}
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
              <span className={styles.stepShot}>
                <Image
                  src={image}
                  alt={alt}
                  fill
                  sizes="(max-width: 640px) 80vw, 280px"
                  style={{ objectPosition: focus }}
                />
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.reasons} id="y-nghia" aria-labelledby="reasons-title">
        <Eyebrow>Vì sao nên lưu giữ gia phả?</Eyebrow>
        <h2 id="reasons-title">Những giá trị bền vững cho hôm nay và mai sau</h2>
        <div className={styles.reasonGrid}>
          {reasons.map(({ icon: Icon, title, text }) => (
            <article key={title} className={styles.reveal}>
              <span className={styles.roundIcon}>
                <Icon size={26} aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <Testimonials />

      {hasPricing ? (
        <section className={styles.pricing} id="bang-gia" aria-labelledby="pricing-title">
          <Eyebrow>Bảng giá dịch vụ</Eyebrow>
          <h2 id="pricing-title">
            Chọn gói <em>phù hợp</em> với dòng họ của bạn
          </h2>
          <p className={styles.pricingLead}>
            Lưu giữ cội nguồn, kết nối các thế hệ với những tính năng thiết thực và dễ sử dụng.
          </p>
          <PricingTable plans={pricingPlans} />
        </section>
      ) : null}

      <Guides guides={guides} />

      <section className={styles.faq} id="hoi-dap" aria-labelledby="faq-title">
        <div className={styles.faqHead}>
          <Eyebrow>Câu hỏi thường gặp</Eyebrow>
          <h2 id="faq-title">Bạn hỏi, chúng tôi giải đáp</h2>
        </div>
        <Faq questions={questions} />
      </section>

      <HomeFooter />
    </main>
  );
}
