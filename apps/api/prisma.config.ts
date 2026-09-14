import 'dotenv/config';
import { defineConfig } from 'prisma/config';

process.env.DATABASE_URL ??= 'mysql://giapha:giapha_dev_password@localhost:3306/giapha';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
