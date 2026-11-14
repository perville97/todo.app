import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createDB } from '../src/db.js';
import { createMemoryRepository } from '../src/memory-repository.js';

let run = 0;
const factories = [
  ['fake mémoire', () => createMemoryRepository()],
  ['IndexedDB', () => createDB(`contract-${run++}`)],
];

for (const [label, createRepository] of factories) {
  describe(`contrat dépôt – ${label}`, () => {
    it('insère, liste, récupère, modifie et supprime les entités', async () => {
      const repository = createRepository();
      await repository.insertProject({ id: 'p1', name: 'Projet' });
      await repository.insertProject({ id: 'p2', name: 'Autre' });
      await repository.insertTask({ id: 't1', projectId: 'p1', title: 'Tâche', deadline: null, done: false, createdAt: 1 });
      await repository.insertTask({ id: 't2', projectId: 'p2', title: 'Isolée', deadline: null, done: false, createdAt: 2 });
      expect(await repository.listProjects()).toHaveLength(2);
      expect(await repository.getTask('t1')).toMatchObject({ title: 'Tâche', projectId: 'p1' });
      expect(await repository.listTasks('p1')).toHaveLength(1);
      await repository.updateTask('t1', { title: 'Modifiée', done: true });
      expect(await repository.getTask('t1')).toMatchObject({ title: 'Modifiée', done: true });
      await repository.deleteTask('t1');
      expect(await repository.getTask('t1')).toBeUndefined();
      await repository.deleteProject('p2');
      expect((await repository.listProjects()).map((project) => project.id)).toEqual(['p1']);
      expect(await repository.listTasks('p2')).toEqual([]);
    });
  });
}

it('oracle différentiel : même séquence produit le même état dans les deux dépôts', async () => {
  const repositories = [createMemoryRepository(), createDB(`diff-${run++}`)];
  const snapshots = [];
  for (const repository of repositories) {
    await repository.insertProject({ id: 'project', name: 'Projet' });
    await repository.insertTask({ id: 'task', projectId: 'project', title: 'Initiale', deadline: null, done: false, createdAt: 123 });
    await repository.updateTask('task', { title: 'Modifiée', deadline: '2032-04-03', done: true });
    snapshots.push({ projects: await repository.listProjects(), tasks: await repository.listTasks() });
  }
  expect(snapshots[0]).toEqual(snapshots[1]);
});
