import { spawnSync } from 'node:child_process';
import { mkdir, copyFile } from 'node:fs/promises';

await mkdir('reports', { recursive: true });
const result = spawnSync('npm', [
  'exec', '--', 'vitest', 'run', '--coverage', '--reporter=default', '--reporter=json', '--outputFile.json=reports/vitest-results.json',
], { stdio: 'inherit', env: process.env });
const exitCode = result.error ? 1 : (result.status ?? 1);
try { await copyFile('coverage/coverage-summary.json', 'coverage/vitest-coverage.json'); } catch { /* No coverage file when Vitest fails before reporting. */ }
spawnSync(process.execPath, ['scripts/build-test-summary.js'], {
  stdio: 'inherit',
  env: { ...process.env, TEST_TDD_EXIT: String(exitCode) },
});
if (result.error) console.error(result.error);
process.exitCode = exitCode;
