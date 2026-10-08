import Link from 'next/link';
import { BookOpen, Clock, HandHeart, Mail, MapPin, Phone, UsersRound } from 'lucide-react';

import { ContactLink } from '@/components/social/contact-link';
import { RingingPhone } from '@/components/social/ringing-phone';
import { FacebookIcon, YoutubeIcon, ZaloIcon } from '@/components/social/social-icons';
import { SITE_CONTACT, phoneHref, zaloHref } from '@/lib/site-contact';

import { LogoMark } from './home-header';
import styles from './home.module.css';

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

/**
 * The public site's footer: a call to get in touch, the brand, its values and the contact
 * details. Shared by the home page, Mẫu bài cúng and Thư viện.
 */
export function HomeFooter() {
  return (
    <footer className={styles.footer} id="lien-he">
      <section className={styles.footerCta} aria-labelledby="footer-cta-title">
        <span className={styles.footerOrnament} aria-hidden="true" />
        <h2 id="footer-cta-title">Bắt đầu hành trình gìn giữ cội nguồn</h2>
        <p>
          Liên hệ để được tạo gia phả cho dòng họ, hoặc đăng nhập để vào không gian của dòng họ bạn.
        </p>
        <div className={styles.footerActions}>
          <ContactLink className={styles.footerPrimary}>
            Tạo gia phả <RingingPhone size={18} />
          </ContactLink>
          <Link className={styles.footerSecondary} href="/login">
            Đăng nhập
          </Link>
        </div>
      </section>

      <div className={styles.footerMain}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.footerLogo} aria-label="Gia Phả Đời Đời — Trang chủ">
              <span className={styles.footerMedal}>
                <LogoMark />
              </span>
              <span>
                <strong>
                  Gia Phả <em>Đời Đời</em>
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
                <a
                  href={zaloHref(SITE_CONTACT.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Zalo"
                >
                  <ZaloIcon size={22} />
                </a>
              </li>
              {SITE_CONTACT.facebook ? (
                <li>
                  <a href={SITE_CONTACT.facebook} aria-label="Facebook">
                    <FacebookIcon />
                  </a>
                </li>
              ) : null}
              {SITE_CONTACT.youtube ? (
                <li>
                  <a href={SITE_CONTACT.youtube} aria-label="YouTube">
                    <YoutubeIcon />
                  </a>
                </li>
              ) : null}
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
                <a href={phoneHref(SITE_CONTACT.phone)}>{SITE_CONTACT.phone}</a>
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
          <p>© {new Date().getFullYear()} Gia Phả Đời Đời. Giữ gìn cội nguồn. Kết nối muôn đời.</p>
        </div>
      </div>
    </footer>
  );
}
