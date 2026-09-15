import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthShell } from '@/components/auth/auth-shell';
import { RegisterClanHeadForm } from '@/components/auth/register-clan-head-form';

export const metadata: Metadata = {
  title: 'Đăng ký Trưởng họ | Gia Phả',
  description: 'Tạo tài khoản Trưởng họ và không gian gia phả mới.',
};

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Bắt đầu một gia phả"
      title="Tạo không gian dòng họ"
      description="Tài khoản đầu tiên là Trưởng họ và chỉ có quyền quản lý dòng họ vừa tạo. Thành viên tham gia bằng liên kết mời riêng."
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-medium text-emerald-900 hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <RegisterClanHeadForm />
    </AuthShell>
  );
}
