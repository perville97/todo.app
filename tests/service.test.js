import { describe, expect, it } from 'vitest';
import { createTodoService, generateId } from '../src/service.js';
import { createMemoryRepository } from '../src/memory-repository.js';
import { summarize } from '../src/rules.js';
import { generatePairwise, assertPairwiseComplete } from './support/pairwise.js';

const factors = {
  titleClass: ['empty', 'spaces', 'one', 'max', 'over', 'notString'],
  deadlineClass: ['absent', 'valid', 'firstOfMonth', 'lastMonth', 'yearOne', 'leap', 'nonLeapLeapDay', 'impossibleDay', 'badFormat', 'badSuffix', 'dayZero', 'monthThirteen', 'yearZero', 'centuryLeap', 'centuryNonLeap', 'notString'],
  operation: ['add', 'edit'],
};
const cases = generatePairwise(factors);
assertPairwiseComplete(cases, factors);
const title = {
  empty: '', spaces: '  ', one: 'x', max: 't'.repeat(120), over: 't'.repeat(121),
  notString: { trim: () => 'objet accepté à tort' },
};
const deadline = {
  absent: undefined, valid: '2032-01-15', firstOfMonth: '2032-01-01', lastMonth: '2032-12-15',
  yearOne: '0001-01-01', leap: '2024-02-29',
  nonLeapLeapDay: '2023-02-29', impossibleDay: '2024-04-31', badFormat: '15/01/2032',
  badSuffix: '2032-01-15suffix',
  dayZero: '2032-01-00', monthThirteen: '2032-13-01', yearZero: '0000-01-01',
  centuryLeap: '2000-02-29', centuryNonLeap: '1900-02-29',
  notString: { toString: () => '2032-01-15', split: (separator) => '2032-01-15'.split(separator) },
};
const validDeadlineClasses = new Set(['absent', 'valid', 'firstOfMonth', 'lastMonth', 'yearOne', 'leap', 'centuryLeap']);
const oracleFactors = {
  oracle: ['reference-summary', 'reflexive', 'homothety', 'permutation', 'move', 'partition', 'mutant-homothetic', 'mutant-detectable', 'invalid-project', 'invalid-status', 'missing-task'],
  shape: ['oneDone', 'mostlyDone', 'allDone', 'oneOfThree', 'twoOfThree', 'empty'],
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
  oneOfThree: [true, false, false],
  twoOfThree: [true, true, false],
  empty: [],
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

describe('génération d’identifiants compatible réseau local', () => {
  it('utilise randomUUID lorsqu’il est disponible', () => {
    expect(generateId({ randomUUID: () => 'uuid-natif' })).toBe('uuid-natif');
  });
  it('génère un UUID valide avec getRandomValues sans randomUUID', () => {
    const cryptoApi = { getRandomValues: (bytes) => { bytes.fill(0); return bytes; } };
    expect(generateId(cryptoApi)).toMatch(/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i);
  });
  it('reste fonctionnel si le navigateur ne fournit aucune API crypto', () => {
    expect(generateId(null)).toMatch(/^todo-\d+-[a-z\d]+$/);
  });
});

// Tous les cas d’oracle de validation proviennent du jeu pairwise vérifié ci-dessus.
describe('service – oracle de référence pairwise', () => {
  it.each(cases)('$operation: titre $titleClass × échéance $deadlineClass', async ({ titleClass, deadlineClass, operation }) => {
    const { repository, service } = setup();
    const projectId = await service.createProject('Projet');
    let taskId;
    if (operation === 'edit') taskId = await service.addTask({ projectId, title: 'initial' });
    const before = structuredClone({ projects: await repository.listProjects(), tasks: await repository.listTasks() });
    const input = { title: title[titleClass], deadline: deadline[deadlineClass] };
    const titleOkay = typeof input.title === 'string' && input.title.trim().length > 0 && input.title.trim().length <= 120;
    const dateOkay = validDeadlineClasses.has(deadlineClass);
    if (!titleOkay || !dateOkay) {
      const request = operation === 'add'
        ? service.addTask({ projectId, ...input })
        : service.updateTask(taskId, input);
      if (titleClass === 'empty' || titleClass === 'spaces') await expect(request).rejects.toThrow(/obligatoire/i);
      else if (titleClass === 'over') await expect(request).rejects.toThrow(/120/);
      else if (titleClass === 'notString') await expect(request).rejects.toThrow(/chaîne/i);
      else await expect(request).rejects.toThrow();
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

    if (oracle === 'invalid-project') {
      const { repository, service } = setup();
      expect(() => createTodoService({ repository: null })).toThrow(/dépôt/i);
      expect(() => createTodoService({ repository: {} })).toThrow(/dépôt/i);
      await service.createProject(' École ');
      const before = await repository.listProjects();
      expect(before[0].name).toBe('École');
      await expect(service.createProject('   ')).rejects.toThrow(RangeError);
      await expect(service.createProject(7)).rejects.toThrow(RangeError);
      await expect(service.createProject('éCOLE')).rejects.toThrow(/déjà/i);
      const taskId = await service.addTask({ projectId: before[0].id, title: 'Tâche à garder', deadline: '2032-01-15' });
      const originalTask = await repository.getTask(taskId);
      await expect(service.addTask({ projectId: 'absent', title: 'Orpheline' })).rejects.toThrow(RangeError);
      await expect(service.updateTask(taskId, { projectId: 'absent' })).rejects.toThrow(RangeError);
      expect(await repository.getTask(taskId)).toEqual(originalTask);
      expect(await repository.listProjects()).toEqual(before);
      return;
    }
    if (oracle === 'invalid-status') {
      const { repository, service } = setup();
      const projectId = await service.createProject('Statut');
      const taskId = await service.addTask({ projectId, title: 'Tâche' });
      const before = await repository.getTask(taskId);
      await expect(service.setTaskDone(taskId, 'oui')).rejects.toThrow(TypeError);
      expect(await repository.getTask(taskId)).toEqual(before);
      return;
    }
    if (oracle === 'missing-task') {
      const { service } = setup();
      await expect(service.updateTask('absente', { title: 'Nouveau' })).rejects.toThrow(RangeError);
      await expect(service.setTaskDone('absente', true)).rejects.toThrow(RangeError);
      return;
    }

    if (oracle === 'reference-summary') {
      const { repository, service } = setup();
      const projectId = await service.createProject('Résumé');
      for (const [index, done] of statuses.entries()) {
        const taskId = await service.addTask({ projectId, title: `Tâche ${index}` });
        if (done) await service.setTaskDone(taskId, true);
      }
      const completed = statuses.filter(Boolean).length;
      expect(await service.getSummary(projectId)).toEqual({
        remaining: statuses.length - completed,
        total: statuses.length,
        completed,
        percent: statuses.length ? Math.round(completed / statuses.length * 100) : 0,
      });
      expect(await repository.listTasks(projectId)).toHaveLength(statuses.length);
      return;
    }

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
      if (mutantPercent(base) === originalSummary.percent) {
        // Sur une répartition équilibrée, ce mutant est équivalent pour cette entrée.
        expect(shape).toBe('oneDone');
      } else {
        expect(mutantPercent(base)).not.toBe(originalSummary.percent);
      }
      return;
    }
    if (oracle === 'mutant-detectable') {
      const mutantPercent = (tasks) => Math.round(tasks.filter((task) => task.done).length / (tasks.length + 1) * 100);
      const scaled = Array.from({ length: multiplier }, () => base).flat();
      if (base.length === 0) {
        // Sur le projet vide, ce mutant est équivalent : les deux calculs valent 0.
        expect(mutantPercent(scaled)).toBe(mutantPercent(base));
      } else {
        expect(mutantPercent(scaled)).not.toBe(mutantPercent(base));
      }
      return;
    }

    const { repository, service } = setup();
    const left = await service.createProject('Gauche');
    const right = await service.createProject('Droite');
    const taskIds = [];
    for (const [index, done] of statuses.entries()) {
      const taskId = await service.addTask({ projectId: left, title: `Tâche ${index}`, deadline: '2032-01-15' });
      taskIds.push(taskId);
      if (done) await service.setTaskDone(taskId, true);
    }
    const before = await service.getSummary(left);

    if (oracle === 'reflexive') {
      const taskId = taskIds[0] ?? await service.addTask({ projectId: left, title: 'Tâche réflexive' });
      const task = await repository.getTask(taskId);
      await service.updateTask(task.id, { title: 'Titre modifié sans échéance' });
      expect((await repository.getTask(task.id)).deadline).toBe(task.deadline);
      await service.updateTask(task.id, { title: task.title, deadline: task.deadline, projectId: task.projectId });
      await service.setTaskDone(task.id, task.done);
      await service.setTaskDone(task.id, task.done);
      expect(await repository.getTask(task.id)).toEqual(task);
    } else if (oracle === 'move') {
      if (movement === 'move' && taskIds.length) await service.updateTask(taskIds[0], { projectId: right });
      const after = await service.getSummary(left);
      const moved = movement === 'move' && taskIds.length ? 1 : 0;
      expect(after.total + moved).toBe(before.total);
      expect(await repository.listTasks()).toHaveLength((await service.getTasks(left)).length + (await service.getTasks(right)).length);
    } else if (oracle === 'partition') {
      if (taskIds.length) await service.updateTask(taskIds[0], { projectId: right });
      expect((await service.getTasks(left)).length + (await service.getTasks(right)).length).toBe(statuses.length);
    }
  });
});
