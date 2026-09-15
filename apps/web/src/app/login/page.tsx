import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Đăng nhập | Gia Phả',
  description: 'Đăng nhập để truy cập không gian dòng họ của bạn.',
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <AuthShell
      eyebrow="Tài khoản Gia Phả"
      title="Chào mừng trở lại"
      description="Đăng nhập bằng tài khoản Admin, Trưởng họ hoặc Thành viên. Quyền truy cập được kiểm tra lại theo từng dòng họ."
      footer={
        <>
          Chưa có không gian dòng họ?{' '}
          <Link href="/register" className="font-medium text-emerald-900 hover:underline">
            Đăng ký Trưởng họ
          </Link>
        </>
      }
    >
      <LoginForm nextPath={next} />
    </AuthShell>
  );
}
