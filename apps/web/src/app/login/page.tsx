import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';
import { NO_INDEX } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập để truy cập không gian dòng họ của bạn.',
  robots: NO_INDEX,
};

type LoginPageProps = {
  searchParams: Promise<{ reason?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { reason } = await searchParams;
  const initialError =
    reason === 'session-expired'
      ? 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
      : null;
  return (
    <AuthShell
      eyebrow="Tài khoản Gia Phả"
      title="Chào mừng trở lại"
      description="Đăng nhập bằng tài khoản Trưởng họ hoặc Thành viên."
      footer="Tài khoản dòng họ được cấp khi Admin tạo gia phả."
      fullScreen
    >
      <LoginForm initialError={initialError} />
    </AuthShell>
  );
}
