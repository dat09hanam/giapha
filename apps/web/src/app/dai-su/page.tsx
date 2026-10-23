import type { Metadata } from 'next';

import { AmbassadorLanding } from '@/components/ambassador/ambassador-landing';
import { getPricingPlans } from '@/lib/api';
import { pageMetadata } from '@/lib/seo';
import { SITE_BRAND } from '@/lib/site-brand';
import type { PricingPlan } from '@/types/pricing';

export const metadata: Metadata = pageMetadata({
  title: 'Đại Sứ Đời Đời',
  description: `Trở thành Đại Sứ ${SITE_BRAND.name}: giới thiệu gia phả trực tuyến tới các dòng họ và nhận hoa hồng cho mỗi gia phả được tạo bằng mã đại sứ của bạn. Đăng ký miễn phí.`,
  path: '/dai-su',
});

export const dynamic = 'force-dynamic';

/** The page still invites sign-ups when the plans cannot be loaded; only the tiers are missing. */
async function loadPlans(): Promise<PricingPlan[]> {
  try {
    return await getPricingPlans();
  } catch {
    return [];
  }
}

export default async function AmbassadorPage() {
  return <AmbassadorLanding plans={await loadPlans()} />;
}
