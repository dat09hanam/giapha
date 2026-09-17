export type UserRole = 'ADMIN' | 'MEMBER_PLUS' | 'MEMBER';

export type AuthProfile = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  family: { id: string; slug: string; name: string } | null;
};

type LoginInput = { username: string; password: string };

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

function errorMessage(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = body.message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message.join('. ');
    }
  }

  return `Yêu cầu không thành công (${status})`;
}

async function post<T>(path: string, input?: object): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: input ? JSON.stringify(input) : undefined,
  });
  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(errorMessage(body, response.status));
  }

  return body as T;
}

export function login(input: LoginInput): Promise<AuthProfile> {
  return post<AuthProfile>('/auth/login', input);
}

export function profileDestination(profile: AuthProfile): string {
  if (profile.role === 'ADMIN') {
    return '/admin';
  }

  if (!profile.family) {
    return '/';
  }

  const familySlug = encodeURIComponent(profile.family.slug);
  return profile.role === 'MEMBER_PLUS' ? `/admin/${familySlug}` : `/${familySlug}`;
}
