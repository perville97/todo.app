// Couche IndexedDB : stores "projects" et "tasks" (index projectId)
const wrap = (req) =>
  new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
const done = (tx) =>
  new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = tx.onabort = () => rej(tx.error); });

export function createDB(name = 'todo-db') {
  const open = new Promise((res, rej) => {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true })
        .createIndex('projectId', 'projectId');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const store = async (s, mode = 'readonly') => (await open).transaction(s, mode);

  return {
    async addProject(projectName) {
      const tx = await store('projects', 'readwrite');
      const id = await wrap(tx.objectStore('projects').add({ name: projectName }));
      await done(tx);
      return id;
    },
    async getProjects() {
      return wrap((await store('projects')).objectStore('projects').getAll());
    },
    async deleteProject(id) { // supprime aussi ses tâches
      const tx = await store(['projects', 'tasks'], 'readwrite');
      tx.objectStore('projects').delete(id);
      const keys = await wrap(tx.objectStore('tasks').index('projectId').getAllKeys(id));
      keys.forEach((k) => tx.objectStore('tasks').delete(k));
      await done(tx);
    },
    async addTask(projectId, title) {
      const tx = await store('tasks', 'readwrite');
      const id = await wrap(tx.objectStore('tasks').add({ projectId, title, done: false, createdAt: Date.now() }));
      await done(tx);
      return id;
    },
    async getTasks(projectId) {
      return wrap((await store('tasks')).objectStore('tasks').index('projectId').getAll(projectId));
    },
    async updateTask(id, changes) {
      const tx = await store('tasks', 'readwrite');
      const os = tx.objectStore('tasks');
      const task = await wrap(os.get(id));
      if (!task) { tx.abort(); throw new Error('Tâche introuvable'); }
      os.put({ ...task, ...changes, id });
      await done(tx);
    },
    async deleteTask(id) {
      const tx = await store('tasks', 'readwrite');
      tx.objectStore('tasks').delete(id);
      await done(tx);
    },
  };
}
