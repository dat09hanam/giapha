import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { NO_INDEX } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Quên mật khẩu',
  description: 'Đặt lại mật khẩu bằng mã xác nhận gửi qua email.',
  robots: NO_INDEX,
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Tài khoản Gia Phả"
      title="Quên mật khẩu"
      description="Nhận mã xác nhận qua email đã đăng ký để đặt mật khẩu mới."
      footer="Chưa đăng ký email? Hãy liên hệ Admin để được đặt lại mật khẩu."
      fullScreen
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
