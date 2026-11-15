import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['exec', '--', 'stryker', 'run'], {
  stdio: 'inherit',
  env: process.env,
});
const exitCode = result.error ? 1 : (result.status ?? 1);
spawnSync(process.execPath, ['scripts/build-test-summary.js'], {
  stdio: 'inherit',
  env: { ...process.env, TEST_MUTATION_EXIT: String(exitCode) },
});
if (result.error) console.error(result.error);
process.exitCode = exitCode;
