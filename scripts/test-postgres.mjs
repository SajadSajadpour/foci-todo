import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const databaseUrl = 'postgres://foci_test:foci_test_local_only@127.0.0.1:5434/foci_todo_test';
const compose = ['compose', '-f', 'compose.test.yaml'];

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: repositoryRoot, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited with status ${result.status}`);
}

try {
  run('docker', [...compose, 'up', '--wait', '-d', 'db']);
  run('npm', ['run', 'db:migrate', '-w', '@foci/backend'], { ...process.env, DATABASE_URL: databaseUrl });
  run('npm', ['run', 'test:postgres', '-w', '@foci/backend'], { ...process.env, TEST_DATABASE_URL: databaseUrl });
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  try {
    run('docker', [...compose, 'down', '--volumes']);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
