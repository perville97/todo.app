const copy = (value) => value === undefined ? undefined : structuredClone(value);

export function createMemoryRepository() {
  const projects = new Map();
  const tasks = new Map();
  return {
    async listProjects() { return [...projects.values()].map(copy); },
    async getProject(id) { return copy(projects.get(id)); },
    async insertProject(project) {
      if (projects.has(project.id)) throw new Error('Identifiant de projet déjà utilisé.');
      projects.set(project.id, copy(project));
      return project.id;
    },
    async updateProject(id, changes) {
      const existing = projects.get(id);
      if (!existing) throw new Error('Projet introuvable.');
      projects.set(id, { ...existing, ...copy(changes), id });
    },
    async deleteProject(id) {
      projects.delete(id);
      for (const [taskId, task] of tasks) if (task.projectId === id) tasks.delete(taskId);
    },
    async listTasks(projectId) {
      return [...tasks.values()].filter((task) => projectId === undefined || task.projectId === projectId).map(copy);
    },
    async getTask(id) { return copy(tasks.get(id)); },
    async insertTask(task) {
      if (tasks.has(task.id)) throw new Error('Identifiant de tâche déjà utilisé.');
      if (!projects.has(task.projectId)) throw new Error('Projet introuvable.');
      tasks.set(task.id, copy(task));
      return task.id;
    },
    async updateTask(id, changes) {
      const existing = tasks.get(id);
      if (!existing) throw new Error('Tâche introuvable.');
      if (!projects.has(changes.projectId ?? existing.projectId)) throw new Error('Projet introuvable.');
      tasks.set(id, { ...existing, ...copy(changes), id });
    },
    async deleteTask(id) { tasks.delete(id); },
  };
}
