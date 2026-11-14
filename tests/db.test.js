import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { createDB } from '../src/db.js';

let db, n = 0;
beforeEach(() => { db = createDB('test-db-' + n++); });

describe('IndexedDB – projets', () => {
  it('ajoute et liste les projets', async () => {
    await db.addProject('Perso');
    await db.addProject('Travail');
    expect((await db.getProjects()).map((p) => p.name)).toEqual(['Perso', 'Travail']);
  });
  it('supprime un projet et ses tâches (cascade)', async () => {
    const p1 = await db.addProject('A'); const p2 = await db.addProject('B');
    await db.addTask(p1, 't1'); await db.addTask(p2, 't2');
    await db.deleteProject(p1);
    expect(await db.getProjects()).toHaveLength(1);
    expect(await db.getTasks(p1)).toHaveLength(0);
    expect(await db.getTasks(p2)).toHaveLength(1);
  });
});

describe('IndexedDB – tâches', () => {
  it('ajoute une tâche rattachée à un projet', async () => {
    const p = await db.addProject('A');
    await db.addTask(p, 'Acheter du pain');
    const [t] = await db.getTasks(p);
    expect(t).toMatchObject({ title: 'Acheter du pain', done: false, projectId: p });
  });
  it('isole les tâches par projet', async () => {
    const a = await db.addProject('A'); const b = await db.addProject('B');
    await db.addTask(a, 'x'); await db.addTask(b, 'y'); await db.addTask(b, 'z');
    expect(await db.getTasks(a)).toHaveLength(1);
    expect(await db.getTasks(b)).toHaveLength(2);
  });
  it('modifie le titre et le statut', async () => {
    const p = await db.addProject('A'); const id = await db.addTask(p, 'old');
    await db.updateTask(id, { title: 'new', done: true });
    const [t] = await db.getTasks(p);
    expect(t).toMatchObject({ id, title: 'new', done: true, projectId: p });
  });
  it('refuse de modifier une tâche inexistante', async () => {
    await expect(db.updateTask(999, { title: 'x' })).rejects.toThrow();
  });
  it('supprime une tâche', async () => {
    const p = await db.addProject('A'); const id = await db.addTask(p, 'x');
    await db.deleteTask(id);
    expect(await db.getTasks(p)).toHaveLength(0);
  });
  it('persiste les données entre deux connexions', async () => {
    const name = 'persist-' + n++;
    const p = await createDB(name).addProject('P');
    await createDB(name).addTask(p, 'survit');
    expect((await createDB(name).getTasks(p))[0].title).toBe('survit');
  });
});
