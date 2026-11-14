import { createDB } from './db.js';
import { initApp } from './app.js';
initApp(document.getElementById('app'), createDB());
