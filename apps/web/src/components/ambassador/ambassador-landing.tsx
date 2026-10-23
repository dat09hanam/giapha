import Image from 'next/image';
import {
  ArrowRight,
  BadgePercent,
  Check,
  HandCoins,
  HandHeart,
  Landmark,
  Mail,
  Megaphone,
  Plus,
  Share2,
  ShieldCheck,
  UserRoundPlus,
  Users,
  Wallet,
} from 'lucide-react';

import { commissionAmountFor } from '@/lib/pricing-plans';
import { SITE_BRAND } from '@/lib/site-brand';
import { formatVnd } from '@/lib/vietnamese-number';
import { cn } from '@/lib/utils';
import type { PricingPlan } from '@/types/pricing';

import { AmbassadorSignupButton } from './ambassador-signup';
import { CommissionLadder } from './commission-ladder';
import { EarningsCalculator } from './earnings-calculator';
import styles from './ambassador.module.css';

const PERKS = ['Miễn phí tham gia', 'Không cần vốn', 'Không giới hạn thu nhập'] as const;

const HIGHLIGHTS = [
  {
    icon: BadgePercent,
    title: 'Hoa hồng rõ ràng',
    text: 'Phần trăm hoa hồng công bố cho từng gói.',
  },
  { icon: UserRoundPlus, title: 'Đăng ký 1 phút', text: 'Chỉ cần họ tên, số điện thoại, email.' },
  { icon: Wallet, title: 'Chuyển khoản trực tiếp', text: 'Hoa hồng chuyển về tài khoản của bạn.' },
  {
    icon: ShieldCheck,
    title: 'Ghi nhận minh bạch',
    text: 'Mỗi gia phả qua mã của bạn đều được lưu.',
  },
] as const;

const STEPS = [
  {
    icon: UserRoundPlus,
    title: 'Đăng ký làm đại sứ',
    text: 'Điền họ tên, số điện thoại và email. Hoàn toàn miễn phí, không ràng buộc.',
  },
  {
    icon: Mail,
    title: 'Nhận mã qua email',
    text: 'Mã đại sứ riêng và đường link giới thiệu được gửi ngay vào hộp thư của bạn.',
  },
  {
    icon: Share2,
    title: 'Giới thiệu dòng họ',
    text: 'Chia sẻ mã hoặc link với người thân, bạn bè, các dòng họ bạn quen biết.',
  },
  {
    icon: HandCoins,
    title: 'Nhận hoa hồng',
    text: 'Khi gia phả được tạo bằng mã của bạn trên gói có hoa hồng, chúng tôi chuyển khoản cho bạn.',
  },
] as const;

const FITS = [
  {
    icon: Landmark,
    title: 'Trưởng họ, trưởng chi',
    text: 'Bạn quen biết nhiều dòng họ trong làng, xã, hội đồng gia tộc và các buổi giỗ tổ.',
  },
  {
    icon: Users,
    title: 'Người làm văn hóa, lịch sử',
    text: 'Nhà nghiên cứu, người biên soạn phả, cán bộ văn hóa, hướng dẫn viên di tích.',
  },
  {
    icon: Megaphone,
    title: 'Người có cộng đồng online',
    text: 'Chủ nhóm Facebook, Zalo, kênh TikTok, YouTube về cội nguồn, phong tục, tâm linh.',
  },
  {
    icon: HandHeart,
    title: 'Bất kỳ ai yêu cội nguồn',
    text: 'Chỉ cần bạn muốn lan tỏa việc giữ gìn gia phả. Không cần kinh nghiệm bán hàng.',
  },
] as const;

const QUESTIONS = [
  {
    question: 'Tham gia chương trình đại sứ có mất phí không?',
    answer:
      'Hoàn toàn miễn phí. Bạn chỉ cần đăng ký họ tên, số điện thoại và email để nhận mã đại sứ.',
  },
  {
    question: 'Làm sao để gia phả được tính cho tôi?',
    answer:
      'Khi đăng ký dịch vụ hoặc tạo gia phả, dòng họ nhập mã đại sứ của bạn vào ô "Mã đại sứ". Nếu họ mở đường link giới thiệu của bạn, mã sẽ được điền sẵn. Bạn cũng có thể báo mã cho chúng tôi khi chúng tôi liên hệ với dòng họ.',
  },
  {
    question: 'Khi nào tôi nhận được hoa hồng?',
    answer:
      'Hoa hồng được ghi nhận một lần, ngay khi dòng họ tạo gia phả bằng mã đại sứ của bạn, tính theo gói dòng họ chọn lúc đó. Việc gia hạn hay nâng cấp gói về sau không phát sinh thêm hoa hồng. Chúng tôi sẽ liên hệ để xác nhận tài khoản ngân hàng và chuyển khoản cho bạn.',
  },
  {
    question: 'Tôi có thể giới thiệu bao nhiêu dòng họ?',
    answer: 'Không giới hạn. Mỗi dòng họ được tạo bằng mã của bạn đều được ghi nhận riêng.',
  },
  {
    question: 'Tôi quên mã đại sứ thì làm sao?',
    answer:
      'Bạn chỉ cần đăng ký lại với đúng email đã dùng, hệ thống sẽ gửi lại mã đại sứ cũ vào hộp thư đó.',
  },
] as const;

type EarningPlan = PricingPlan & { commissionAmount: number };

/** Plans that pay a commission, with what it comes to in đồng. */
function commissionPlans(plans: readonly PricingPlan[]): EarningPlan[] {
  return plans
    .map((plan) => ({
      ...plan,
      commissionAmount: commissionAmountFor(plan.price, plan.commissionPercent),
    }))
    .filter((plan) => plan.commissionAmount > 0);
}

export function AmbassadorLanding({ plans }: { plans: readonly PricingPlan[] }) {
  const earning = commissionPlans(plans);
  const top = earning.reduce<EarningPlan | null>(
    (best, plan) =>
      !best ||
      plan.commissionPercent > best.commissionPercent ||
      (plan.commissionPercent === best.commissionPercent &&
        plan.commissionAmount > best.commissionAmount)
        ? plan
        : best,
    null,
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="ambassador-title">
        <Image
          className={styles.heroPattern}
          src="/images/home/hoa-sen.webp"
          alt=""
          aria-hidden="true"
          width={700}
          height={1050}
          sizes="(max-width: 1023px) 46vw, 560px"
        />
        <div>
          <p className={styles.eyebrow}>Chương trình Đại Sứ {SITE_BRAND.name}</p>
          <h1 id="ambassador-title">
            Lan tỏa cội nguồn,
            <span>nhận hoa hồng {top ? `đến ${top.commissionPercent}%` : 'hấp dẫn'}</span>
          </h1>
          <p className={styles.heroText}>
            Giới thiệu {SITE_BRAND.name} tới các gia đình, dòng họ bạn quen biết. Mỗi gia phả được
            tạo bằng <strong>mã đại sứ</strong> của bạn là một khoản hoa hồng, chuyển khoản trực
            tiếp về tài khoản của bạn.
          </p>
          <div className={styles.actions}>
            <AmbassadorSignupButton className={styles.cta}>
              Đăng ký làm đại sứ <ArrowRight size={18} aria-hidden="true" />
            </AmbassadorSignupButton>
            <a className={styles.ghost} href="#hoa-hong">
              Xem mức hoa hồng
            </a>
          </div>
          <ul className={styles.perks}>
            {PERKS.map((perk) => (
              <li key={perk}>
                <Check size={15} strokeWidth={3} aria-hidden="true" />
                {perk}
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.voucher} aria-hidden="true">
          <span className={styles.stamp}>
            Đại
            <br />
            Sứ
          </span>
          <p className={styles.voucherLabel}>Hoa hồng mỗi gia phả</p>
          <p className={styles.voucherAmount}>
            {top ? `${top.commissionPercent}% giá gói` : 'Hấp dẫn'}
            <small>
              {top
                ? `≈ ${formatVnd(top.commissionAmount)} với gói ${top.name}`
                : 'Theo từng gói dịch vụ'}
            </small>
          </p>
          <div className={styles.voucherCode}>
            <span>Mã đại sứ của bạn</span>
            <strong>DD••••••</strong>
          </div>
        </div>
      </section>

      <ul className={styles.stats}>
        {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
          <li key={title}>
            <span className={styles.roundIcon}>
              <Icon size={22} aria-hidden="true" />
            </span>
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
          </li>
        ))}
      </ul>

      <section
        className={cn(styles.section, styles.centered, styles.tiersSection)}
        id="hoa-hong"
        aria-labelledby="tiers-title"
      >
        <span className={styles.tiersMist} aria-hidden="true" />
        <Image
          className={cn(styles.tiersLotus, styles.tiersLotusLeft)}
          src="/images/home/hoa-sen.webp"
          alt=""
          aria-hidden="true"
          width={700}
          height={1050}
          sizes="220px"
        />
        <Image
          className={cn(styles.tiersLotus, styles.tiersLotusRight)}
          src="/images/home/hoa-sen.webp"
          alt=""
          aria-hidden="true"
          width={700}
          height={1050}
          sizes="220px"
        />
        <p className={cn(styles.eyebrow, styles.ornateEyebrow)}>Mức hoa hồng</p>
        <h2 className={styles.tiersHeading} id="tiers-title">
          Mỗi gia phả bạn giới thiệu là
          <em>một khoản thu nhập</em>
        </h2>
        <p className={styles.lead}>
          Hoa hồng là phần trăm giá gói dòng họ chọn khi tạo gia phả bằng mã đại sứ của bạn. Gói
          càng cao, bạn nhận càng nhiều.
        </p>
        {earning.length > 0 ? (
          <CommissionLadder plans={earning} />
        ) : (
          <p className={styles.empty}>
            Mức hoa hồng đang được cập nhật. Hãy đăng ký trước để nhận mã và thông báo sớm nhất.
          </p>
        )}
      </section>

      {earning.length > 0 ? (
        <section
          className={cn(styles.section, styles.centered, styles.calcWrap)}
          aria-labelledby="calc-title"
        >
          <p className={styles.eyebrow}>Ước tính thu nhập</p>
          <h2 className={styles.heading} id="calc-title">
            Bạn có thể nhận <em>bao nhiêu</em>?
          </h2>
          <EarningsCalculator
            plans={earning.map(({ id, name, commissionPercent, commissionAmount }) => ({
              id,
              name,
              commissionPercent,
              commissionAmount,
            }))}
          />
        </section>
      ) : null}

      <section className={cn(styles.section, styles.centered)} aria-labelledby="steps-title">
        <p className={styles.eyebrow}>Cách hoạt động</p>
        <h2 className={styles.heading} id="steps-title">
          Bắt đầu chỉ với <em>4 bước</em> đơn giản
        </h2>
        <ol className={styles.steps}>
          {STEPS.map(({ icon: Icon, title, text }) => (
            <li key={title} className={styles.step}>
              <span className={styles.stepIcon}>
                <Icon size={24} aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        className={cn(styles.section, styles.centered, styles.tight)}
        aria-labelledby="fits-title"
      >
        <p className={styles.eyebrow}>Ai phù hợp</p>
        <h2 className={styles.heading} id="fits-title">
          Đại sứ là <em>người kết nối</em> các dòng họ
        </h2>
        <ul className={styles.fits}>
          {FITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className={styles.fit}>
              <h3>
                <Icon size={20} aria-hidden="true" />
                {title}
              </h3>
              <p>{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        className={cn(styles.section, styles.centered, styles.tight)}
        aria-labelledby="faq-title"
      >
        <p className={styles.eyebrow}>Câu hỏi thường gặp</p>
        <h2 className={styles.heading} id="faq-title">
          Giải đáp cho đại sứ
        </h2>
        <div className={styles.faq}>
          {QUESTIONS.map(({ question, answer }) => (
            <details key={question}>
              <summary>
                {question}
                <Plus size={20} aria-hidden="true" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="closing-title">
        <h2 id="closing-title">Cùng gìn giữ cội nguồn cho muôn đời con cháu</h2>
        <p>
          Mỗi gia phả được lưu giữ là một dòng họ được kết nối. Đăng ký hôm nay để nhận mã đại sứ và
          bắt đầu lan tỏa.
        </p>
        <AmbassadorSignupButton className={styles.cta}>
          Đăng ký làm đại sứ ngay <ArrowRight size={18} aria-hidden="true" />
        </AmbassadorSignupButton>
      </section>
    </main>
  );
}
