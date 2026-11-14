import { validateDeadline, validateTitle, summarize } from './rules.js';

export function generateId(cryptoApi = globalThis.crypto) {
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `todo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createTodoService({ repository, clock = () => new Date(), idGenerator = generateId }) {
  if (!repository || typeof repository.listProjects !== 'function') throw new TypeError('Un dépôt est requis.');
  const normalizedName = (name) => {
    if (typeof name !== 'string' || !name.trim()) throw new RangeError('Le nom du projet est obligatoire.');
    return name.trim();
  };

  return {
    async createProject(name) {
      const cleanName = normalizedName(name);
      const projects = await repository.listProjects();
      if (projects.some((project) => project.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase())) {
        throw new RangeError('Un projet porte déjà ce nom.');
      }
      const id = idGenerator();
      await repository.insertProject({ id, name: cleanName, createdAt: clock().toISOString() });
      return id;
    },
    async addTask({ projectId, title, deadline }) {
      const cleanTitle = validateTitle(title);
      const cleanDeadline = validateDeadline(deadline);
      if (!await repository.getProject(projectId)) throw new RangeError('Le projet sélectionné est introuvable.');
      const id = idGenerator();
      await repository.insertTask({
        id, projectId, title: cleanTitle, deadline: cleanDeadline, done: false, createdAt: clock().toISOString(),
      });
      return id;
    },
    async updateTask(id, changes) {
      const existing = await repository.getTask(id);
      if (!existing) throw new RangeError('Tâche introuvable.');
      const updated = { ...existing };
      if (Object.hasOwn(changes, 'title')) updated.title = validateTitle(changes.title);
      if (Object.hasOwn(changes, 'deadline')) updated.deadline = validateDeadline(changes.deadline);
      if (Object.hasOwn(changes, 'projectId')) {
        if (!await repository.getProject(changes.projectId)) throw new RangeError('Le projet sélectionné est introuvable.');
        updated.projectId = changes.projectId;
      }
      await repository.updateTask(id, updated);
      return id;
    },
    async setTaskDone(id, done) {
      if (typeof done !== 'boolean') throw new TypeError('Le statut terminé doit être booléen.');
      const existing = await repository.getTask(id);
      if (!existing) throw new RangeError('Tâche introuvable.');
      if (existing.done !== done) await repository.updateTask(id, { ...existing, done });
    },
    async removeTask(id) { return repository.deleteTask(id); },
    async removeProject(id) { return repository.deleteProject(id); },
    async getProjects() { return repository.listProjects(); },
    async getTasks(projectId) { return repository.listTasks(projectId); },
    async getSummary(projectId) { return summarize(await repository.listTasks(projectId)); },
  };
}
