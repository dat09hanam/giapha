'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { DEFAULT_SITE_CONTACT } from '@/lib/site-contact';
import type { SiteContact } from '@/types/site-contact';

const SiteContactContext = createContext<SiteContact>(DEFAULT_SITE_CONTACT);

/** Hands the contact details the root layout loaded to every client component below it. */
export function SiteContactProvider({
  contact,
  children,
}: {
  contact: SiteContact;
  children: ReactNode;
}) {
  return <SiteContactContext.Provider value={contact}>{children}</SiteContactContext.Provider>;
}

export function useSiteContact(): SiteContact {
  return useContext(SiteContactContext);
}
