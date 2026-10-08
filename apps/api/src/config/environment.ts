import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  DATABASE_URL: z.string().startsWith('mysql://'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  /** Directory that holds uploaded family media. Relative paths resolve from the API workspace. */
  MEDIA_ROOT: z.string().min(1).default('./media'),
  /**
   * Outgoing mail (password reset codes). Without `SMTP_HOST` the API runs, but a reset request
   * answers that email is not configured.
   */
  SMTP_HOST: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  SMTP_PORT: z.coerce.number().int().positive().max(65535).default(587),
  /** `true` for implicit TLS (usually port 465); otherwise STARTTLS is used when offered. */
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().min(1).default('Gia Phả <no-reply@giapha.local>'),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(config: Record<string, unknown>): Environment {
  return environmentSchema.parse(config);
}
