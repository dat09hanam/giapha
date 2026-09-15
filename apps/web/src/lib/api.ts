import { cache } from 'react';

import type { FamilySummary, FamilyTreeResponse } from '@/types/family-tree';
import type { AuthProfile } from '@/lib/auth-api';

const API_URL = (process.env.API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export class ApiNotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} was not found`);
    this.name = 'ApiNotFoundError';
  }
}

export class ApiUnauthorizedError extends Error {
  constructor() {
    super('Authentication is required');
    this.name = 'ApiUnauthorizedError';
  }
}

async function getJson<T>(path: string, sessionToken?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (sessionToken) {
    headers.Cookie = `giapha_session=${encodeURIComponent(sessionToken)}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers,
    cache: 'no-store',
  });

  if (response.status === 404) {
    throw new ApiNotFoundError(path);
  }

  if (response.status === 401 || response.status === 403) {
    throw new ApiUnauthorizedError();
  }

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export const getFamily = cache((slug: string) =>
  getJson<FamilySummary>(`/families/${encodeURIComponent(slug)}`),
);

export const getFamilyTree = cache((slug: string, sessionToken?: string) =>
  getJson<FamilyTreeResponse>(`/families/${encodeURIComponent(slug)}/tree`, sessionToken),
);

export const getAuthProfile = cache((sessionToken: string) =>
  getJson<AuthProfile>('/auth/me', sessionToken),
);
