import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('coverage', { recursive: true });
try {
  await copyFile('coverage/coverage-summary.json', 'coverage/vitest-coverage.json');
} catch {
  // Vitest n’a pas généré le fichier si la suite a échoué avant le rapport.
}
