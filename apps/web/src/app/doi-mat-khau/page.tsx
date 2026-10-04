import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth/auth-shell';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { LogoutButton } from '@/components/auth/logout-button';
import { ApiUnauthorizedError, getAuthProfile } from '@/lib/api';
import { CHANGE_PASSWORD_PATH, type AuthProfile } from '@/lib/auth-api';
import { loginHref } from '@/lib/login-redirect';

export const metadata: Metadata = {
  title: 'Đổi mật khẩu | Gia Phả',
  description: 'Đặt mật khẩu riêng cho tài khoản Gia Phả của bạn.',
};

export const dynamic = 'force-dynamic';

type ChangePasswordPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

/**
 * Where an account signs in to first when its password was given by someone else (a new account,
 * or one the clan head reset); every other page sends it here until it sets its own.
 */
export default async function ChangePasswordPage({ searchParams }: ChangePasswordPageProps) {
  const { next } = await searchParams;
  const nextPath = typeof next === 'string' ? next : null;
  const sessionToken = (await cookies()).get('giapha_session')?.value;
  if (!sessionToken) redirect(loginHref(CHANGE_PASSWORD_PATH, false));

  let profile: AuthProfile;
  try {
    profile = await getAuthProfile(sessionToken);
  } catch (error: unknown) {
    if (error instanceof ApiUnauthorizedError) redirect(loginHref(CHANGE_PASSWORD_PATH, true));
    throw error;
  }

  const required = profile.mustChangePassword;
  return (
    <AuthShell
      brandTitle="Gia Phả Việt"
      brandTagline="Không gian lưu giữ và kết nối câu chuyện của mỗi dòng họ."
      eyebrow={profile.displayName}
      title={required ? 'Đặt mật khẩu của riêng bạn' : 'Đổi mật khẩu'}
      description={
        required
          ? 'Mật khẩu hiện tại do người khác cấp. Hãy đổi sang mật khẩu chỉ mình bạn biết trước khi tiếp tục.'
          : 'Nhập mật khẩu hiện tại và mật khẩu mới. Các thiết bị khác sẽ bị đăng xuất.'
      }
      footer={<LogoutButton />}
    >
      <ChangePasswordForm next={nextPath} />
    </AuthShell>
  );
}
