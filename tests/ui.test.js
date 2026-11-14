import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDB } from '../src/db.js';
import { initApp } from '../src/app.js';

let root, db, n = 0;
const $ = (s) => root.querySelector(s);
const $$ = (s) => [...root.querySelectorAll(s)];
const submit = (formSel, inputSel, value) => {
  $(inputSel).value = value;
  $(formSel).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
};
const addProject = (v) => submit('#project-form', '#project-input', v);
const addTask = (v) => submit('#task-form', '#task-input', v);
const titles = () => $$('#tasks .title').map((e) => e.textContent);
const ready = () => vi.waitFor(() => expect($('#task-form').hidden).toBe(false));

beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app');
  db = createDB('ui-db-' + n++);
  await initApp(root, db);
});

describe('Interface', () => {
  it('cache le formulaire de tâche sans projet', () => {
    expect($('#task-form').hidden).toBe(true);
  });
  it('ajoute un projet et le sélectionne', async () => {
    addProject('Maison');
    await vi.waitFor(() => expect($$('#projects li')).toHaveLength(1));
    expect($('#projects li').classList.contains('active')).toBe(true);
    await ready();
  });
  it('ignore les projets vides ou composés d’espaces', async () => {
    addProject('   ');
    await Promise.resolve();
    expect($$('#projects li')).toHaveLength(0);
  });
  it('ajoute une tâche au projet courant', async () => {
    addProject('Maison'); await ready();
    addTask('Ménage');
    await vi.waitFor(() => expect(titles()).toEqual(['Ménage']));
    expect(await db.getTasks((await db.getProjects())[0].id)).toHaveLength(1);
  });
  it('ignore les tâches vides ou composées d’espaces', async () => {
    addProject('Maison'); await ready();
    addTask('   ');
    await Promise.resolve();
    expect(titles()).toEqual([]);
  });
  it('modifie une tâche', async () => {
    addProject('P'); await ready();
    addTask('ancien'); await vi.waitFor(() => expect(titles()).toEqual(['ancien']));
    $('.edit').click();
    $('.edit-input').value = 'nouveau';
    $('.save').click();
    await vi.waitFor(() => expect(titles()).toEqual(['nouveau']));
  });
  it('ne remplace pas une tâche par un titre vide', async () => {
    addProject('P'); await ready();
    addTask('titre conservé'); await vi.waitFor(() => expect(titles()).toEqual(['titre conservé']));
    $('.edit').click();
    $('.edit-input').value = '   ';
    $('.save').click();
    await vi.waitFor(() => expect(titles()).toEqual(['titre conservé']));
  });
  it('coche une tâche comme terminée', async () => {
    addProject('P'); await ready();
    addTask('x'); await vi.waitFor(() => expect(titles()).toHaveLength(1));
    const cb = $('.toggle'); cb.checked = true; cb.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect($('#tasks li').classList.contains('done')).toBe(true));
  });
  it('supprime une tâche', async () => {
    addProject('P'); await ready();
    addTask('x'); await vi.waitFor(() => expect(titles()).toHaveLength(1));
    $('.delete-task').click();
    await vi.waitFor(() => expect(titles()).toHaveLength(0));
  });
  it('affiche uniquement les tâches du projet sélectionné', async () => {
    addProject('A'); await ready();
    addTask('tâche A'); await vi.waitFor(() => expect(titles()).toEqual(['tâche A']));
    addProject('B'); await vi.waitFor(() => expect($$('#projects li')).toHaveLength(2));
    await vi.waitFor(() => expect(titles()).toEqual([]));
    $$('.select-project')[0].click();
    await vi.waitFor(() => expect(titles()).toEqual(['tâche A']));
  });
  it('supprime un projet', async () => {
    addProject('A'); await vi.waitFor(() => expect($$('#projects li')).toHaveLength(1));
    $('.delete-project').click();
    await vi.waitFor(() => expect($$('#projects li')).toHaveLength(0));
  });
  it("recharge les données au redémarrage de l'app", async () => {
    addProject('Durable'); await ready();
    addTask('persistée'); await vi.waitFor(() => expect(titles()).toHaveLength(1));
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app');
    await initApp(root, db);
    expect(titles()).toEqual(['persistée']);
  });
});
