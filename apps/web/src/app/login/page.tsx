import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Đăng nhập | Gia Phả',
  description: 'Đăng nhập để truy cập không gian dòng họ của bạn.',
};

export default function LoginPage() {
  return (
    <AuthShell
      brandTitle="Gia Phả Việt"
      brandTagline="Không gian lưu giữ và kết nối câu chuyện của mỗi dòng họ."
      highlights={[
        'Lưu giữ thông tin từng thành viên trong dòng họ',
        'Sơ đồ phả hệ trực quan, dễ tra cứu',
        'Phân quyền riêng cho Admin, Trưởng họ và Thành viên',
      ]}
      eyebrow="Tài khoản Gia Phả"
      title="Chào mừng trở lại"
      description="Đăng nhập bằng tài khoản Admin, Trưởng họ hoặc Thành viên. Quyền truy cập được kiểm tra lại theo từng dòng họ."
      footer="Tài khoản dòng họ được cấp khi Admin tạo gia phả."
    >
      <LoginForm />
    </AuthShell>
  );
}
