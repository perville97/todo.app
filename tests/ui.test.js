import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDB } from '../src/db.js';
import { createTodoService } from '../src/service.js';
import { initApp } from '../src/app.js';

let root; let service; let count = 0;
const $ = (selector) => root.querySelector(selector);
const $$ = (selector) => [...root.querySelectorAll(selector)];
const wait = () => vi.waitFor(() => expect($('#projects').children.length).toBeGreaterThan(0));
const createProject = async (name) => { $('#project-input').value = name; $('#project-form').requestSubmit(); await wait(); };
const createTask = async (title, deadline = '') => {
  $('#task-input').value = title; $('#task-deadline').value = deadline; $('#task-form').requestSubmit();
  await vi.waitFor(() => expect($$('#tasks .title').length).toBeGreaterThan(0));
};

const testResultsFixture = {
  updatedAt: '2026-11-15T12:00:00.000Z',
  tdd: { status: 'réussi', total: 286, passed: 286, failed: 0, coverage: { lines: 99.3, branches: 90.38, functions: 93.75 } },
  bdd: { status: 'réussi', scenarios: { total: 7, passed: 7, failed: 0 }, steps: { total: 70, passed: 70, failed: 0 } },
  mutation: { status: 'terminé', score: 80.34, killed: 143, total: 178, survived: 28, noCoverage: 7 },
};

beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app');
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => testResultsFixture })));
  const repository = createDB(`ui-${count++}`);
  let id = 0;
  service = createTodoService({ repository, clock: () => new Date('2032-01-01T00:00:00Z'), idGenerator: () => `id-${++id}` });
  await initApp(root, service);
});

afterEach(() => vi.unstubAllGlobals());

describe('interface accessible et métier', () => {
  it('explique visuellement le trajet des actions sans modifier les données', async () => {
    expect($('#mechanism-title').textContent).toBe('Voir le mécanisme');
    expect(root.querySelector('.mechanism-shortcut').getAttribute('href')).toBe('#mechanism-panel');
    expect($('#mechanism-panel')).toBeTruthy();
    expect($('#mechanism-steps').textContent).toContain('IndexedDB');
    root.querySelector('[data-flow="task"]').click();
    expect($('#mechanism-steps').textContent).toContain('validateTitle()');
    expect(root.querySelector('[data-flow="task"]').getAttribute('aria-pressed')).toBe('true');
    expect(await service.getProjects()).toEqual([]);
  });
  it('affiche les résultats et les pourcentages TDD, BDD et mutation', async () => {
    expect($('#tdd-result-status').textContent).toBe('réussi');
    expect($('#tdd-result-count').textContent).toBe('286 / 286');
    expect($('#coverage-lines-label').textContent).toBe('99.3 %');
    expect($('#coverage-lines-bar').style.width).toBe('99.3%');
    expect($('#bdd-result-count').textContent).toBe('7 / 7');
    expect($('#bdd-result-steps').textContent).toContain('70 / 70');
    expect($('#mutation-result-score').textContent).toBe('80.34 %');
    expect($('#mutation-result-count').textContent).toContain('143 / 178');
  });
  it('ne permet pas de créer une tâche sans projet', () => expect($('#task-form').hidden).toBe(true));
  it('crée un projet et refuse les doublons sans tenir compte de la casse', async () => {
    await createProject('Maison');
    $('#project-input').value = 'maison'; $('#project-form').requestSubmit();
    await vi.waitFor(() => expect($('#project-error').hidden).toBe(false));
    expect($$('#projects .select-project')).toHaveLength(1);
  });
  it('ajoute une tâche, son échéance et affiche compteurs et progression', async () => {
    await createProject('Maison');
    await createTask('Ménage', '2032-01-15');
    expect($('.deadline').dateTime).toBe('2032-01-15');
    expect($('#task-count').textContent).toBe('1 à faire sur 1');
    $('.toggle').click();
    await vi.waitFor(() => expect($('#progress-percent').textContent).toBe('100 %'));
    expect($('#task-count').textContent).toBe('0 à faire sur 1');
  });
  it('annule une modification sans changer les données', async () => {
    await createProject('Maison'); await createTask('Lire');
    const before = await service.getTasks();
    $('.edit').click(); $('.edit-input').value = 'Changé'; $('.cancel-edit').click();
    await vi.waitFor(() => expect($$('#tasks .title').map((item) => item.textContent)).toEqual(['Lire']));
    expect(await service.getTasks()).toEqual(before);
  });
  it('modifie le titre, la date et déplace une tâche entre projets', async () => {
    await createProject('Maison'); await createTask('Lire');
    const [home] = await service.getProjects();
    await createProject('Travail');
    await vi.waitFor(() => expect($$('.select-project')).toHaveLength(2));
    const projects = await service.getProjects();
    const work = projects.find((project) => project.name === 'Travail');
    $$('.select-project')[0].click();
    await vi.waitFor(() => expect($('.edit')).toBeTruthy());
    $('.edit').click(); $('.edit-input').value = 'Lire demain'; $('.edit-deadline').value = '2032-02-29';
    $('.edit-project').value = work.id; $('.save').click();
    await vi.waitFor(async () => expect(await service.getTasks(home.id)).toEqual([]));
    expect(await service.getTasks(home.id)).toEqual([]);
    expect(await service.getTasks(work.id)).toMatchObject([{ title: 'Lire demain', deadline: '2032-02-29', projectId: work.id }]);
  });
  it('persiste les données après initialisation à nouveau', async () => {
    await createProject('Durable'); await createTask('Persistée');
    root.innerHTML = '';
    await initApp(root, service);
    expect($$('#tasks .title').map((item) => item.textContent)).toEqual(['Persistée']);
  });
  it('supprime une tâche et un projet avec ses tâches', async () => {
    await createProject('À supprimer'); await createTask('Tâche temporaire');
    $('.delete-task').click();
    await vi.waitFor(() => expect($$('#tasks .title')).toHaveLength(0));
    await createTask('Tâche en cascade');
    $('.delete-project').click();
    await vi.waitFor(() => expect($$('.project-item')).toHaveLength(0));
    expect(await service.getTasks()).toEqual([]);
  });
});
