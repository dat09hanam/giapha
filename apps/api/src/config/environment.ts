import { z } from 'zod';

import { SITE_BRAND } from '../common/site-brand.js';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  DATABASE_URL: z.string().startsWith('mysql://'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  MEDIA_ROOT: z.string().min(1).default('./media'),
  SESSION_COOKIE_DOMAIN: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  SMTP_HOST: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  SMTP_PORT: z.coerce.number().int().positive().max(65535).default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().min(1).default(`${SITE_BRAND.name} <no-reply@giapha.local>`),
  /** Telegram bot that tells the admin about sign-ups and plan requests; both empty turns it off. */
  TELEGRAM_BOT_TOKEN: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  /** One chat id, or several separated by commas (a group id starts with "-"). */
  TELEGRAM_CHAT_ID: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  /** Admin inboxes for the same notices, comma-separated; needs SMTP. */
  ADMIN_NOTIFY_EMAIL: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  /** SePay webhook "API Key"; SePay sends it as `Authorization: Apikey <key>`. */
  SEPAY_WEBHOOK_API_KEY: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  /** The receiving bank account linked to SePay, for the VietQR shown to the clan head. */
  SEPAY_BANK: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  SEPAY_ACCOUNT_NUMBER: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  SEPAY_ACCOUNT_NAME: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  /** Leading letters of every payment code; must match the prefix set in SePay. */
  SEPAY_CODE_PREFIX: z
    .string()
    .regex(/^[A-Z]{2,6}$/)
    .default('GPDD'),
  GOOGLE_CLIENT_ID: z
    .string()
    .optional()
    .transform((value) => value || undefined),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(config: Record<string, unknown>): Environment {
  return environmentSchema.parse(config);
}
