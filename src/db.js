const requestResult = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const transactionDone = (transaction) => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error('Transaction IndexedDB annulée.'));
});

export function createDB(name = 'todo-db') {
  const open = new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('projects')) database.createObjectStore('projects', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('tasks')) {
        const tasks = database.createObjectStore('tasks', { keyPath: 'id' });
        tasks.createIndex('projectId', 'projectId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const transaction = async (stores, mode = 'readonly') => (await open).transaction(stores, mode);
  const repository = {
    async listProjects() { return requestResult((await transaction('projects')).objectStore('projects').getAll()); },
    async getProject(id) { return requestResult((await transaction('projects')).objectStore('projects').get(id)); },
    async insertProject(project) {
      const tx = await transaction('projects', 'readwrite'); const finished = transactionDone(tx);
      const result = await requestResult(tx.objectStore('projects').add(project)); await finished; return result;
    },
    async updateProject(id, changes) {
      const tx = await transaction('projects', 'readwrite'); const finished = transactionDone(tx); const store = tx.objectStore('projects');
      const current = await requestResult(store.get(id));
      if (!current) { tx.abort(); throw new Error('Projet introuvable.'); }
      store.put({ ...current, ...changes, id }); await finished;
    },
    async deleteProject(id) {
      const tx = await transaction(['projects', 'tasks'], 'readwrite'); const finished = transactionDone(tx);
      tx.objectStore('projects').delete(id);
      const keys = await requestResult(tx.objectStore('tasks').index('projectId').getAllKeys(id));
      keys.forEach((key) => tx.objectStore('tasks').delete(key)); await finished;
    },
    async listTasks(projectId) {
      const store = (await transaction('tasks')).objectStore('tasks');
      return requestResult(projectId === undefined ? store.getAll() : store.index('projectId').getAll(projectId));
    },
    async getTask(id) { return requestResult((await transaction('tasks')).objectStore('tasks').get(id)); },
    async insertTask(task) {
      const tx = await transaction(['projects', 'tasks'], 'readwrite'); const finished = transactionDone(tx);
      const project = await requestResult(tx.objectStore('projects').get(task.projectId));
      if (!project) { tx.abort(); throw new Error('Projet introuvable.'); }
      const result = await requestResult(tx.objectStore('tasks').add(task)); await finished; return result;
    },
    async updateTask(id, changes) {
      const tx = await transaction(['projects', 'tasks'], 'readwrite'); const finished = transactionDone(tx); const tasks = tx.objectStore('tasks');
      const current = await requestResult(tasks.get(id));
      if (!current) { tx.abort(); throw new Error('Tâche introuvable.'); }
      const projectId = changes.projectId ?? current.projectId;
      const project = await requestResult(tx.objectStore('projects').get(projectId));
      if (!project) { tx.abort(); throw new Error('Projet introuvable.'); }
      tasks.put({ ...current, ...changes, id }); await finished;
    },
    async deleteTask(id) {
      const tx = await transaction('tasks', 'readwrite'); const finished = transactionDone(tx);
      tx.objectStore('tasks').delete(id); await finished;
    },
  };
  return Object.assign(repository, {
    async addProject(name) {
      const id = `legacy-project-${Date.now()}-${Math.random()}`;
      await repository.insertProject({ id, name, createdAt: new Date().toISOString() }); return id;
    },
    getProjects: repository.listProjects,
    async addTask(projectId, title) {
      const id = `legacy-task-${Date.now()}-${Math.random()}`;
      await repository.insertTask({ id, projectId, title, done: false, deadline: null, createdAt: new Date().toISOString() }); return id;
    },
    getTasks: repository.listTasks,
  });
}
