import type { Metadata } from 'next';
import Link from 'next/link';

import { AcceptInvitationForm } from '@/components/auth/accept-invitation-form';
import { AuthShell } from '@/components/auth/auth-shell';

export const metadata: Metadata = {
  title: 'Tham gia dòng họ | Gia Phả',
  description: 'Nhận lời mời và tạo tài khoản Thành viên.',
};

export default function MemberRegistrationPage() {
  return (
    <AuthShell
      eyebrow="Lời mời Thành viên"
      title="Tham gia dòng họ"
      description="Thành viên có thể xem thông tin của dòng họ nhưng không thể tạo, sửa hoặc xóa dữ liệu."
      footer={
        <Link href="/login" className="font-medium text-emerald-900 hover:underline">
          Đã có tài khoản? Đăng nhập
        </Link>
      }
    >
      <AcceptInvitationForm />
    </AuthShell>
  );
}
