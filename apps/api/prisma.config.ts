import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Do not use env() here — missing DATABASE_URL would crash `prisma generate` on Vercel.
const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  'postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
});
