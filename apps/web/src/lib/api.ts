import { cache } from 'react';

import type { FamilyTreeResponse, TenantSummary } from '@/types/family-tree';

const API_URL = (process.env.API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export class ApiNotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} was not found`);
    this.name = 'ApiNotFoundError';
  }
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (response.status === 404) {
    throw new ApiNotFoundError(path);
  }

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export const getTenant = cache((slug: string) =>
  getJson<TenantSummary>(`/tenants/${encodeURIComponent(slug)}`),
);

export const getFamilyTree = cache((slug: string) =>
  getJson<FamilyTreeResponse>(`/tenants/${encodeURIComponent(slug)}/tree`),
);
