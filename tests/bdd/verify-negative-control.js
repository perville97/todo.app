import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['run', 'test:bdd', '--', '--tags', '@progression'], {
  env: { ...process.env, TODO_BROKEN_APP: '1' },
  encoding: 'utf8',
});
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
if (result.error) throw result.error;
if (result.status === 0) {
  console.error('Échec du contrôle négatif : les scénarios BDD ont accepté une application cassée.');
  process.exitCode = 1;
} else {
  console.log('Contrôle négatif réussi : les scénarios BDD échouent lorsque le compteur est cassé.');
}
