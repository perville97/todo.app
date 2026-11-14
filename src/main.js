import { createDB } from './db.js';
import { initApp } from './app.js';
import { createTodoService } from './service.js';

const repository = createDB();
const service = createTodoService({ repository, clock: () => new Date() });
initApp(document.getElementById('app'), service);
