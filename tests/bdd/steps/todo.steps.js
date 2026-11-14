import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'playwright/test';

Given('j’ouvre l’application', async function () { await this.openApp(); });
When('je crée le projet {string}', async function (name) { await this.createProject(name); });
When('j’ajoute la tâche {string} avec l’échéance {string}', async function (title, deadline) { await this.createTask(title, deadline); });
When('j’ajoute la tâche {string} sans échéance', async function (title) { await this.createTask(title); });
When('je marque la tâche {string} comme terminée', async function (title) {
  await this.page.getByRole('checkbox', { name: `Terminer ${title}` }).check();
});
When('je modifie la tâche {string} en {string} avec l’échéance {string}', async function (oldTitle, newTitle, deadline) {
  const row = this.page.locator('.task-item').filter({ hasText: oldTitle });
  await row.getByRole('button', { name: 'Modifier' }).click();
  await this.page.locator('.edit-input').fill(newTitle);
  await this.page.locator('.edit-deadline').fill(deadline);
  await this.page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(this.page.locator('.task-item .title', { hasText: newTitle })).toBeVisible();
});
When('je commence à modifier la tâche {string}', async function (title) {
  await this.page.locator('.task-item').filter({ hasText: title }).getByRole('button', { name: 'Modifier' }).click();
  await this.page.locator('.edit-input').waitFor({ state: 'visible' });
});
When('je saisis le titre {string}', async function (title) { await this.page.locator('.edit-input').fill(title); });
When('j’annule la modification', async function () { await this.page.getByRole('button', { name: 'Annuler' }).click(); });
When('je sélectionne le projet {string}', async function (name) { await this.page.getByRole('button', { name, exact: true }).click(); });
When('je modifie le projet de la tâche {string} vers {string}', async function (title, projectName) {
  const row = this.page.locator('.task-item').filter({ hasText: title });
  await row.getByRole('button', { name: 'Modifier' }).click();
  await this.page.locator('.edit-input').waitFor({ state: 'visible' });
  await this.page.locator('.edit-project').selectOption({ label: projectName });
  await this.page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(this.page.locator('#task-error')).toBeHidden();
});
When('je recharge la page', async function () { await this.page.reload(); });
When('je ferme puis rouvre l’onglet', async function () {
  await this.page.close();
  this.page = await this.context.newPage();
  await this.openApp();
});
Then('un seul projet {string} est affiché', async function (name) {
  await expect(this.page.locator('.project-item')).toHaveCount(1);
  await expect(this.page.getByRole('button', { name, exact: true })).toBeVisible();
});
Then('une erreur de projet est affichée', async function () { await expect(this.page.locator('#project-error')).toBeVisible(); });
Then('la tâche {string} est affichée', async function (title) { await expect(this.page.locator('.task-item .title', { hasText: title })).toBeVisible(); });
Then('la tâche {string} n’est pas affichée', async function (title) { await expect(this.page.locator('.task-item .title', { hasText: title })).toHaveCount(0); });
Then('le projet {string} est affiché', async function (name) { await expect(this.page.getByRole('button', { name, exact: true })).toBeVisible(); });
Then('le compteur affiche {string}', async function (text) { await expect(this.page.locator('#task-count')).toHaveText(text); });
Then('la progression affiche {string}', async function (text) { await expect(this.page.locator('#progress-percent')).toHaveText(text); });
Then('l’échéance de la tâche est {string}', async function (deadline) { await expect(this.page.locator('.task-item time')).toHaveAttribute('datetime', deadline); });
