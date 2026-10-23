'use client';

import { useEffect } from 'react';

import { rememberReferralCode } from '@/lib/referral';

/** Remembers an ambassador's `?ref=` code from a shared link on whichever page it lands. */
export function ReferralCapture(): null {
  useEffect(() => {
    rememberReferralCode(new URLSearchParams(window.location.search).get('ref'));
  }, []);
  return null;
}
