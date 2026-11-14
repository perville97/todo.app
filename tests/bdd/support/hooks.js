import { After, AfterAll, Before, BeforeAll, setDefaultTimeout, setWorldConstructor } from '@cucumber/cucumber';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
let server;
let browser;
let origin;

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

class TodoWorld {
  async openApp() { await this.page.goto(origin); }
  async createProject(name = 'Projet') {
    await this.page.getByLabel('Nom du projet').fill(name);
    await this.page.getByRole('button', { name: 'Créer le projet' }).click();
    await this.page.locator('.project-item').filter({ hasText: name }).waitFor();
  }
  async createTask(title = 'Tâche', deadline = '') {
    await this.page.getByLabel('Nouvelle tâche').fill(title);
    if (deadline) await this.page.getByLabel('Échéance').fill(deadline);
    await this.page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await this.page.locator('.task-item .title', { hasText: title }).waitFor();
  }
}
setWorldConstructor(TodoWorld);
setDefaultTimeout(process.env.TODO_BROKEN_APP === '1' ? 4000 : 15000);

BeforeAll(async () => {
  server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (file !== root && !file.startsWith(`${root}${sep}`)) { response.writeHead(403).end(); return; }
    try {
      let content = await readFile(file);
      if (process.env.TODO_BROKEN_APP === '1' && pathname === '/src/app.js') {
        content = Buffer.from(content.toString().replace("$('#task-count').textContent", "$('#broken-counter').textContent"));
      }
      response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' });
      response.end(content);
    } catch { response.writeHead(404).end('Not found'); }
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
});

Before(async function () {
  this.context = await browser.newContext({ locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  this.page = await this.context.newPage();
});

After(async function () {
  await this.context?.close();
});

AfterAll(async () => {
  await browser?.close();
  if (server?.listening) await new Promise((resolveClose) => server.close(resolveClose));
});
