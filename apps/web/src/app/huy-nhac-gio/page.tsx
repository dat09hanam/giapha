import type { Metadata } from 'next';

import { UnsubscribeReminder } from '@/components/anniversaries/unsubscribe-reminder';
import { AuthShell } from '@/components/auth/auth-shell';
import { NO_INDEX } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Hủy nhắc lịch giỗ',
  robots: NO_INDEX,
};

type UnsubscribePageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token } = await searchParams;
  return (
    <AuthShell
      eyebrow="Lịch giỗ"
      title="Hủy nhắc lịch giỗ"
      description="Ngừng nhận email nhắc trước ngày giỗ."
      footer="Muốn nhắc lại? Đăng nhập, vào mục Lịch giỗ của dòng họ và bấm “Nhắc tôi”."
      fullScreen
    >
      <UnsubscribeReminder token={typeof token === 'string' ? token : ''} />
    </AuthShell>
  );
}
