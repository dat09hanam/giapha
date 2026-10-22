import {
  CircleAlert,
  FileQuestion,
  Hourglass,
  Home,
  LockKeyhole,
  LogIn,
  RefreshCw,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ErrorState, MAINTENANCE_COPY } from '@/components/ui/error-state';
import { ApiRequestError, isSystemFailure } from '@/lib/api-error';

type ApiErrorStateProps = {
  /** What the page was loading, e.g. "Chưa thể tải quỹ họ". */
  title: string;
  error: unknown;
  retryHref: string;
};

type UserProblem = {
  icon: LucideIcon;
  title: string;
  message: string;
  action: 'login' | 'home' | 'retry';
};

function userProblem(error: ApiRequestError): UserProblem {
  switch (error.status) {
    case 401:
      return {
        icon: LogIn,
        title: 'Phiên đăng nhập đã hết hạn',
        message: 'Vì lý do bảo mật, vui lòng đăng nhập lại để tiếp tục.',
        action: 'login',
      };
    case 403:
      return {
        icon: LockKeyhole,
        title: 'Bạn chưa có quyền xem trang này',
        message: error.message,
        action: 'home',
      };
    case 404:
      return {
        icon: FileQuestion,
        title: 'Không tìm thấy nội dung',
        message: 'Nội dung có thể đã bị xoá, đổi đường dẫn hoặc chưa được công khai.',
        action: 'home',
      };
    case 429:
      return {
        icon: Hourglass,
        title: 'Bạn thao tác hơi nhanh',
        message: 'Vui lòng chờ một chút rồi tải lại trang.',
        action: 'retry',
      };
    default:
      return {
        icon: CircleAlert,
        title: 'Yêu cầu chưa hợp lệ',
        message: error.message,
        action: 'retry',
      };
  }
}

function HomeButton({ variant }: { variant: 'default' | 'outline' }) {
  return (
    <Button asChild variant={variant}>
      <Link href="/">
        <Home className="size-4" aria-hidden="true" />
        Về trang chủ
      </Link>
    </Button>
  );
}

function RetryButton({ href }: { href: string }) {
  return (
    <Button asChild>
      <Link href={href}>
        <RefreshCw className="size-4" aria-hidden="true" />
        Thử tải lại
      </Link>
    </Button>
  );
}

/**
 * The page-level state for a failed API load: maintenance when the system is at fault,
 * a plain explanation with the next step when the visitor's request is.
 */
export function ApiErrorState({ title, error, retryHref }: ApiErrorStateProps) {
  if (!(error instanceof ApiRequestError) || isSystemFailure(error)) {
    return (
      <ErrorState
        tone="system"
        icon={Wrench}
        context={title}
        {...MAINTENANCE_COPY}
        actions={
          <>
            <RetryButton href={retryHref} />
            <HomeButton variant="outline" />
          </>
        }
      />
    );
  }

  const problem = userProblem(error);
  return (
    <ErrorState
      tone="notice"
      icon={problem.icon}
      context={title}
      title={problem.title}
      message={problem.message}
      actions={
        problem.action === 'login' ? (
          <Button asChild>
            <Link href={`/login?next=${encodeURIComponent(retryHref)}&reason=session-expired`}>
              <LogIn className="size-4" aria-hidden="true" />
              Đăng nhập lại
            </Link>
          </Button>
        ) : problem.action === 'retry' ? (
          <>
            <RetryButton href={retryHref} />
            <HomeButton variant="outline" />
          </>
        ) : (
          <HomeButton variant="default" />
        )
      }
    />
  );
}
