import { describe, expect, it } from 'vitest';
import { createTodoService } from '../src/service.js';
import { createMemoryRepository } from '../src/memory-repository.js';
import { summarize } from '../src/rules.js';
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
const oracleFactors = {
  oracle: ['reflexive', 'homothety', 'permutation', 'move', 'partition', 'mutant-homothetic', 'mutant-detectable'],
  shape: ['oneDone', 'mostlyDone', 'allDone'],
  multiplier: [2, 3],
  order: ['normal', 'reverse'],
  movement: ['move', 'stay'],
};
const oracleCases = generatePairwise(oracleFactors);
assertPairwiseComplete(oracleCases, oracleFactors);
const taskShapes = {
  oneDone: [true, false],
  mostlyDone: [true, false, false, false],
  allDone: [true, true],
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

// Tous les oracles de propriétés sont alimentés par le second jeu pairwise vérifié.
describe('service – propriétés réflexives', () => {
  it.each(oracleCases)('$oracle: forme $shape × multiplicateur $multiplier × ordre $order × déplacement $movement', async ({ oracle, shape, multiplier, order, movement }) => {
    const statuses = taskShapes[shape];
    const base = statuses.map((done, index) => ({ id: `t-${index}`, title: `Tâche ${index}`, done }));
    const ordered = order === 'reverse' ? [...base].reverse() : [...base];
    const originalSummary = summarize(base);

    if (oracle === 'homothety') {
      const scaled = Array.from({ length: multiplier }, () => base).flat();
      const summary = summarize(scaled);
      expect(summary.remaining).toBe(originalSummary.remaining * multiplier);
      expect(summary.total).toBe(originalSummary.total * multiplier);
      expect(summary.percent).toBe(originalSummary.percent);
      return;
    }
    if (oracle === 'permutation') {
      expect(summarize(ordered)).toEqual(originalSummary);
      return;
    }
    if (oracle === 'mutant-homothetic') {
      const mutantPercent = (tasks) => Math.round(tasks.filter((task) => !task.done).length / tasks.length * 100);
      const scaled = Array.from({ length: multiplier }, () => base).flat();
      expect(mutantPercent(scaled)).toBe(mutantPercent(base));
      expect(mutantPercent(base)).not.toBe(originalSummary.percent);
      return;
    }
    if (oracle === 'mutant-detectable') {
      const mutantPercent = (tasks) => Math.round(tasks.filter((task) => task.done).length / (tasks.length + 1) * 100);
      const scaled = Array.from({ length: multiplier }, () => base).flat();
      expect(mutantPercent(scaled)).not.toBe(mutantPercent(base));
      return;
    }

    const { repository, service } = setup();
    const left = await service.createProject('Gauche');
    const right = await service.createProject('Droite');
    const taskIds = [];
    for (const [index, done] of statuses.entries()) {
      const taskId = await service.addTask({ projectId: left, title: `Tâche ${index}` });
      taskIds.push(taskId);
      if (done) await service.setTaskDone(taskId, true);
    }
    const before = await service.getSummary(left);

    if (oracle === 'reflexive') {
      const task = await repository.getTask(taskIds[0]);
      await service.updateTask(task.id, { title: task.title, deadline: task.deadline, projectId: task.projectId });
      await service.setTaskDone(task.id, task.done);
      await service.setTaskDone(task.id, task.done);
      expect(await repository.getTask(task.id)).toEqual(task);
    } else if (oracle === 'move') {
      if (movement === 'move') await service.updateTask(taskIds[0], { projectId: right });
      const after = await service.getSummary(left);
      const moved = movement === 'move' ? 1 : 0;
      expect(after.total + moved).toBe(before.total);
      expect(await repository.listTasks()).toHaveLength((await service.getTasks(left)).length + (await service.getTasks(right)).length);
    } else if (oracle === 'partition') {
      await service.updateTask(taskIds[0], { projectId: right });
      expect((await service.getTasks(left)).length + (await service.getTasks(right)).length).toBe(statuses.length);
    }
  });
  it('refuse les noms de projet dupliqués sans écrire de projet partiel', async () => {
    const { repository, service } = setup();
    await service.createProject('École');
    await expect(service.createProject('éCOLE')).rejects.toThrow(/déjà/i);
    expect(await repository.listProjects()).toHaveLength(1);
  });
});
