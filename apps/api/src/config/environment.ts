import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  DATABASE_URL: z.string().startsWith('mysql://'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(config: Record<string, unknown>): Environment {
  return environmentSchema.parse(config);
}
