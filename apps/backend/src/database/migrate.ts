import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const pool = new Pool({ connectionString: databaseUrl });
try {
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  console.log('Database migrations complete');
} finally {
  await pool.end();
}
