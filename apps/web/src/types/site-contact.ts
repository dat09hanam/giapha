/** The platform's contact details, as `GET /api/site-contact` returns them. */
export type SiteContact = {
  phone: string;
  /** Zalo number when it differs from the hotline; null means "use the hotline". */
  zalo: string | null;
  email: string;
  address: string;
  hours: string;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
};

export type SiteContactInput = SiteContact;
