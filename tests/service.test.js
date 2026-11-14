import { describe, expect, it } from 'vitest';
import { createTodoService } from '../src/service.js';
import { createMemoryRepository } from '../src/memory-repository.js';
import { generatePairwise, assertPairwiseComplete } from './support/pairwise.js';

const factors = {
  titleClass: ['empty', 'spaces', 'one', 'max', 'over'],
  deadlineClass: ['absent', 'valid', 'leap', 'nonLeapLeapDay', 'impossibleDay', 'badFormat'],
  operation: ['add', 'edit'],
};
const cases = generatePairwise(factors);
assertPairwiseComplete(cases, factors);
const title = {
  empty: '', spaces: '  ', one: 'x', max: 't'.repeat(120), over: 't'.repeat(121),
};
const deadline = {
  absent: undefined, valid: '2032-01-15', leap: '2024-02-29',
  nonLeapLeapDay: '2023-02-29', impossibleDay: '2024-04-31', badFormat: '15/01/2032',
};
let id = 0;
const setup = () => {
  id = 0;
  const repository = createMemoryRepository();
  const service = createTodoService({
    repository,
    clock: () => new Date('2032-01-01T00:00:00.000Z'),
    idGenerator: () => `id-${++id}`,
  });
  return { repository, service };
};

// Tous les cas d’oracle de validation proviennent du jeu pairwise vérifié ci-dessus.
describe('service – oracle de référence pairwise', () => {
  it.each(cases)('$operation: titre $titleClass × échéance $deadlineClass', async ({ titleClass, deadlineClass, operation }) => {
    const { repository, service } = setup();
    const projectId = await service.createProject('Projet');
    let taskId;
    if (operation === 'edit') taskId = await service.addTask({ projectId, title: 'initial' });
    const before = structuredClone({ projects: await repository.listProjects(), tasks: await repository.listTasks() });
    const input = { title: title[titleClass], deadline: deadline[deadlineClass] };
    const titleOkay = input.title.trim().length > 0 && input.title.trim().length <= 120;
    const dateOkay = input.deadline === undefined || input.deadline === '2032-01-15' || input.deadline === '2024-02-29';
    if (!titleOkay || !dateOkay) {
      await expect(operation === 'add'
        ? service.addTask({ projectId, ...input })
        : service.updateTask(taskId, input)).rejects.toThrow();
      expect({ projects: await repository.listProjects(), tasks: await repository.listTasks() }).toEqual(before);
      return;
    }
    if (operation === 'add') await service.addTask({ projectId, ...input });
    else await service.updateTask(taskId, input);
    const tasks = await repository.listTasks(projectId);
    const saved = tasks.at(-1);
    expect(saved.title).toBe(input.title.trim());
    expect(saved.deadline ?? null).toBe(input.deadline ?? null);
  });
});

// Ce test réflexif couvre les écritures idempotentes indépendamment de la matrice oracle.
describe('service – propriétés réflexives', () => {
  it('modifier avec ses propres valeurs et cocher deux fois ne change pas le résultat', async () => {
    const { repository, service } = setup();
    const projectId = await service.createProject('Perso');
    const taskId = await service.addTask({ projectId, title: 'Lire', deadline: '2032-01-15' });
    const original = await repository.getTask(taskId);
    await service.updateTask(taskId, { title: original.title, deadline: original.deadline, projectId });
    await service.setTaskDone(taskId, true);
    await service.setTaskDone(taskId, true);
    expect(await repository.getTask(taskId)).toMatchObject({ title: 'Lire', done: true, deadline: '2032-01-15' });
  });
});
