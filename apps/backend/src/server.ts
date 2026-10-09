import { existsSync } from 'node:fs';
import { buildApp } from './app.js';
import { createPostgresStore } from './database/postgres-store.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const { store, close } = createPostgresStore(databaseUrl);
const app = await buildApp(store);
const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`API listening on port ${port}`);
} catch (error) {
  console.error(error);
  await close();
  process.exitCode = 1;
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close();
    await close();
    process.exit(0);
  });
}
