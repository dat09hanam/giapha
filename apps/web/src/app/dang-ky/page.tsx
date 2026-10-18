import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { GoogleSignupForm } from '@/components/auth/google-signup-form';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Đăng ký',
  description: 'Tạo gia phả miễn phí cho dòng họ bằng tài khoản Google.',
  path: '/dang-ky',
});

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Gói miễn phí"
      title="Tạo gia phả dòng họ"
      description="Đăng ký bằng tài khoản Google. Người đăng ký trở thành Trưởng họ của gia phả."
      footer="Gói miễn phí có thể nâng cấp bất cứ lúc nào."
      fullScreen
    >
      <GoogleSignupForm />
    </AuthShell>
  );
}
