import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rootEnv = fileURLToPath(new URL('../.env', import.meta.url));
const backendEnv = fileURLToPath(new URL('../apps/backend/.env', import.meta.url));

if (existsSync(rootEnv) && existsSync(backendEnv)) {
  chmodSync(rootEnv, 0o600);
  chmodSync(backendEnv, 0o600);
  console.log('Local environment files already exist.');
} else if (existsSync(rootEnv) || existsSync(backendEnv)) {
  console.error('Only one local environment file exists. Set the same DB password in .env and apps/backend/.env.');
  process.exitCode = 1;
} else {
  const password = randomBytes(24).toString('hex');
  writeFileSync(rootEnv, `DB_PASSWORD=${password}\n`, { flag: 'wx', mode: 0o600 });
  writeFileSync(
    backendEnv,
    `DATABASE_URL=postgres://foci:${password}@localhost:5433/foci_todo\nPORT=3000\nNODE_ENV=development\n`,
    { flag: 'wx', mode: 0o600 },
  );
  console.log('Created matching local database settings in .env and apps/backend/.env.');
}
