/** Public origin of the website, used for absolute links in the sitemap and robots.txt. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://giaphadoidoi.pro.vn').replace(
  /\/$/,
  '',
);
