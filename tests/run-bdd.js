import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

await mkdir('reports', { recursive: true });
const result = spawnSync('npm', [
  'exec', '--', 'cucumber-js',
  '--import', 'tests/bdd/support/**/*.js',
  '--import', 'tests/bdd/steps/**/*.js',
  'tests/bdd/features/**/*.feature',
  '--format', 'progress',
  '--format', 'html:reports/cucumber.html',
  '--format', 'json:reports/cucumber.json',
], { stdio: 'inherit', env: process.env });
const exitCode = result.error ? 1 : (result.status ?? 1);
spawnSync(process.execPath, ['scripts/build-test-summary.js'], {
  stdio: 'inherit',
  env: { ...process.env, TEST_BDD_EXIT: String(exitCode) },
});
if (result.error) console.error(result.error);
process.exitCode = exitCode;
