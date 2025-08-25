import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  // Schema configuration - specify the path to your Prisma schema
  schema: path.join('prisma', 'schema.prisma'),
  
  // Migrations configuration with seed
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: path.join('prisma', 'seed.ts'),
  },
  
  // Views configuration (for database views)
  views: {
    path: path.join('prisma', 'views'),
  },
  
  // TypedSQL configuration (for the typedSql preview feature)
  typedSql: {
    path: path.join('prisma', 'queries'),
  },
});