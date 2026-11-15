import { readFile, stat, writeFile } from 'node:fs/promises';

const readJson = async (path) => {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch { return null; }
};
const fileTime = async (path) => {
  try { return (await stat(path)).mtime.toISOString(); }
  catch { return null; }
};
const statusFromExit = (envName, fallback) => {
  if (process.env[envName] === undefined) return fallback;
  return Number(process.env[envName]) === 0 ? 'réussi' : 'échoué';
};

const vitest = await readJson('reports/vitest-results.json');
const coverage = await readJson('coverage/coverage-summary.json');
const cucumber = await readJson('reports/cucumber.json');
const mutationReport = await readJson('reports/mutation/mutation.json');

const vitestStatus = vitest
  ? (vitest.numFailedTests === 0 ? 'réussi' : 'échoué')
  : 'indisponible';
const tdd = {
  status: statusFromExit('TEST_TDD_EXIT', vitestStatus),
  total: vitest?.numTotalTests ?? null,
  passed: vitest?.numPassedTests ?? null,
  failed: vitest?.numFailedTests ?? null,
  coverage: coverage?.total ? Object.fromEntries(
    ['statements', 'branches', 'functions', 'lines'].map((key) => [key, coverage.total[key]?.pct ?? null]),
  ) : null,
  reportUpdatedAt: await fileTime('coverage/coverage-summary.json'),
};

function cucumberStats(features) {
  const scenarios = { total: 0, passed: 0, failed: 0, skipped: 0 };
  const steps = { total: 0, passed: 0, failed: 0, skipped: 0 };
  for (const feature of features ?? []) {
    for (const scenario of feature.elements ?? feature.children ?? []) {
      if (!['scenario', 'scenario_outline', undefined].includes(scenario.type) && !scenario.steps) continue;
      if (!scenario.steps) continue;
      scenarios.total += 1;
      let failed = false;
      let skipped = false;
      for (const step of scenario.steps) {
        steps.total += 1;
        const result = step.result?.status ?? step.result?.status;
        if (result === 'failed' || result === 'undefined' || result === 'ambiguous') {
          steps.failed += 1;
          failed = true;
        } else if (result === 'skipped' || result === 'pending') {
          steps.skipped += 1;
          skipped = true;
        } else {
          steps.passed += 1;
        }
      }
      if (failed) scenarios.failed += 1;
      else if (skipped) scenarios.skipped += 1;
      else scenarios.passed += 1;
    }
  }
  return { scenarios, steps };
}

const bddStats = cucumberStats(cucumber);
const bddStatusFromReport = cucumber
  ? (bddStats.scenarios.failed === 0 && bddStats.scenarios.total > 0 ? 'réussi' : 'échoué')
  : 'indisponible';
const bdd = {
  status: statusFromExit('TEST_BDD_EXIT', bddStatusFromReport),
  ...bddStats,
  reportUpdatedAt: await fileTime('reports/cucumber.json'),
};

const mutantStates = { killed: 0, survived: 0, noCoverage: 0, timedOut: 0, errors: 0, total: 0 };
for (const file of Object.values(mutationReport?.files ?? {})) {
  for (const mutant of Object.values(file.mutants ?? {})) {
    mutantStates.total += 1;
    if (mutant.status === 'Killed') mutantStates.killed += 1;
    else if (mutant.status === 'Survived') mutantStates.survived += 1;
    else if (mutant.status === 'NoCoverage') mutantStates.noCoverage += 1;
    else if (mutant.status === 'Timeout') mutantStates.timedOut += 1;
    else if (mutant.status === 'Error') mutantStates.errors += 1;
  }
}
const mutation = mutationReport ? {
  status: statusFromExit('TEST_MUTATION_EXIT', mutantStates.errors === 0 && mutantStates.timedOut === 0 ? 'terminé' : 'à examiner'),
  score: mutantStates.total ? Number((mutantStates.killed / mutantStates.total * 100).toFixed(2)) : null,
  ...mutantStates,
  reportUpdatedAt: await fileTime('reports/mutation/mutation.json'),
} : {
  status: 'non exécuté', score: null, ...mutantStates, reportUpdatedAt: null,
};

const summary = {
  updatedAt: new Date().toISOString(),
  tdd,
  bdd,
  mutation,
  explanation: 'Couverture = lignes/instructions/branches/fonctions exécutées. Score mutation = mutants tués ÷ mutants totaux. Un survivant correspond à un défaut que les tests n’ont pas détecté.',
};
await writeFile('test-results.json', `${JSON.stringify(summary, null, 2)}\n`);
console.log('Résumé consultable dans test-results.json');
