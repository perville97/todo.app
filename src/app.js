export async function initApp(root, service) {
  let currentProjectId = null;
  root.innerHTML = `
    <header class="topbar"><div><p class="eyebrow">ESPACE PERSONNEL</p><h1>Mes tâches</h1></div><div class="topbar-actions"><a class="mechanism-shortcut" href="#mechanism-panel">Comment ça marche ? <span aria-hidden="true">↓</span></a><span class="storage-badge">Enregistré sur cet appareil</span></div></header>
    <section class="panel project-panel" aria-labelledby="projects-heading">
      <div class="section-heading"><div><p class="eyebrow">ORGANISATION</p><h2 id="projects-heading">Projets</h2></div></div>
      <form id="project-form" class="inline-form"><label class="sr-only" for="project-input">Nom du projet</label><input id="project-input" type="text" placeholder="Ex. Personnel" required maxlength="60"><button class="primary">Créer le projet</button></form>
      <p id="project-error" class="error" role="alert" hidden></p><ul id="projects" class="project-list"></ul>
    </section>
    <section id="workspace" class="panel workspace-panel" aria-live="polite">
      <div class="section-heading"><div><p class="eyebrow">VOTRE ESPACE</p><h2 id="current-project">Choisissez ou créez un projet</h2></div></div>
      <form id="task-form" class="task-form" hidden>
        <label for="task-input">Nouvelle tâche</label><div class="task-entry"><input id="task-input" type="text" placeholder="Que faut-il faire ?" required maxlength="120"><label class="date-field" for="task-deadline">Échéance <input id="task-deadline" type="date"></label><button class="primary">Ajouter</button></div>
      </form>
      <p id="task-error" class="error" role="alert" hidden></p>
      <div id="progress-panel" class="progress-panel" hidden><div class="progress-copy"><span id="task-count">0 à faire sur 0</span><strong id="progress-percent">0 %</strong></div><div class="progress-track" role="progressbar" aria-label="Progression des tâches" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="progress-fill"></span></div></div>
      <ul id="tasks" class="task-list"></ul><p id="empty-state" class="empty-state" hidden>Aucune tâche pour le moment. Ajoutez la première ci-dessus.</p>
    </section>
    <section id="test-results-panel" class="panel test-results-panel" aria-labelledby="test-results-title">
      <div class="section-heading"><div><p class="eyebrow">QUALITÉ DU PROJET</p><h2 id="test-results-title">Résultats des tests</h2></div><button id="refresh-test-results" type="button" class="secondary">Actualiser</button></div>
      <p id="test-results-updated" class="test-results-updated" aria-live="polite">Lecture du dernier rapport…</p>
      <div id="test-results-error" class="error" role="status" hidden></div>
      <div class="test-result-grid">
        <article class="test-result-card" aria-labelledby="tdd-result-title">
          <div class="test-result-heading"><h3 id="tdd-result-title">Tests unitaires (TDD)</h3><span id="tdd-result-status" class="result-badge">—</span></div>
          <strong id="tdd-result-count" class="test-result-value">—</strong><span class="test-result-caption">tests réussis / total</span>
          <div class="metric-bars">
            <label>Lignes <span id="coverage-lines-label">—</span><span class="metric-track"><i id="coverage-lines-bar"></i></span></label>
            <label>Branches <span id="coverage-branches-label">—</span><span class="metric-track"><i id="coverage-branches-bar"></i></span></label>
            <label>Fonctions <span id="coverage-functions-label">—</span><span class="metric-track"><i id="coverage-functions-bar"></i></span></label>
          </div>
        </article>
        <article class="test-result-card" aria-labelledby="bdd-result-title">
          <div class="test-result-heading"><h3 id="bdd-result-title">Tests navigateur (BDD)</h3><span id="bdd-result-status" class="result-badge">—</span></div>
          <strong id="bdd-result-count" class="test-result-value">—</strong><span class="test-result-caption">scénarios réussis / total</span>
          <p id="bdd-result-steps" class="test-result-detail">Étapes réussies : —</p>
          <p class="test-result-detail">Cucumber + Playwright dans Chrome</p>
        </article>
        <article class="test-result-card" aria-labelledby="mutation-result-title">
          <div class="test-result-heading"><h3 id="mutation-result-title">Tests de mutation (Stryker)</h3><span id="mutation-result-status" class="result-badge">—</span></div>
          <strong id="mutation-result-score" class="test-result-value">—</strong><span class="test-result-caption">score de mutation</span>
          <p id="mutation-result-count" class="test-result-detail">Mutants tués / total : —</p>
          <p id="mutation-result-survivors" class="test-result-detail">Survivants : —</p>
        </article>
      </div>
      <p class="test-results-note">Couverture : part du code exécutée par les tests. Score de mutation : proportion des modifications artificielles détectées. Les mutations s’exécutent la nuit en CI ; la date du rapport indique quand le dernier résultat a été calculé.</p>
    </section>
    <section id="mechanism-panel" class="panel mechanism-panel" aria-labelledby="mechanism-title">
      <div class="section-heading"><div><p class="eyebrow">COULISSES</p><h2 id="mechanism-title">Voir le mécanisme</h2></div></div>
      <p class="mechanism-intro">Choisissez une action pour suivre son trajet dans l’application. Ce schéma explique le code ; il ne modifie pas vos données.</p>
      <div class="mechanism-actions" role="group" aria-label="Choisir une action à expliquer">
        <button type="button" class="mechanism-choice active" data-flow="project">Créer un projet</button>
        <button type="button" class="mechanism-choice" data-flow="task">Ajouter une tâche</button>
        <button type="button" class="mechanism-choice" data-flow="edit">Modifier / déplacer</button>
        <button type="button" class="mechanism-choice" data-flow="done">Terminer</button>
      </div>
      <ol id="mechanism-steps" class="mechanism-steps" aria-live="polite"></ol>
      <div class="test-mechanism">
        <strong>Et les tests au push ?</strong>
        <ol>
          <li><span>Vous lancez</span> <code>git push</code>.</li>
          <li>Le hook <code>.githooks/pre-push</code> lance d’abord Vitest, puis Cucumber + Chrome.</li>
          <li>Si un test échoue, le hook renvoie une erreur et Git annule le push. Sinon, le push continue.</li>
          <li>GitHub Actions rejoue aussi les tests après réception du push et sur chaque pull request.</li>
        </ol>
        <p>Pour essayer les deux suites sans pousser : <code>npm test</code>. Un simple commit ne déclenche pas le hook : il faut faire un push.</p>
      </div>
    </section>`;
  const $ = (selector) => root.querySelector(selector);
  const element = (tag, properties = {}, ...children) => Object.assign(document.createElement(tag), properties).append(...children);

  const flows = {
    project: [
      ['1. Interface', 'Le formulaire intercepte la validation et lit le nom saisi.'],
      ['2. Service métier', 'createProject() enlève les espaces et refuse un nom vide ou déjà utilisé (sans tenir compte de la casse).'],
      ['3. Identifiant', 'Le service demande un nouvel identifiant au générateur compatible avec le navigateur.'],
      ['4. IndexedDB', 'Le dépôt enregistre le projet dans le store projects.'],
      ['5. Affichage', 'render() relit les projets et rafraîchit la page.'],
    ],
    task: [
      ['1. Interface', 'Le formulaire lit le titre, la date et le projet actuellement sélectionné.'],
      ['2. Règles pures', 'validateTitle() et validateDeadline() contrôlent les valeurs sans accès au navigateur.'],
      ['3. Service métier', 'addTask() vérifie que le projet existe et prépare la tâche non terminée.'],
      ['4. IndexedDB', 'Le dépôt écrit la tâche dans tasks avec son projectId.'],
      ['5. Affichage', 'render() relit les tâches et recalcule le compteur et la progression.'],
    ],
    edit: [
      ['1. Interface', 'Modifier ouvre un formulaire prérempli ; Annuler le ferme sans appeler le service.'],
      ['2. Règles et service', 'Enregistrer valide le titre et la date ; le service vérifie le nouveau projet si la tâche est déplacée.'],
      ['3. IndexedDB', 'updateTask() conserve les champs inchangés et enregistre la tâche sous le projet choisi.'],
      ['4. Affichage', 'La liste de l’ancien projet et celle du nouveau sont relues depuis IndexedDB.'],
    ],
    done: [
      ['1. Interface', 'La case cochée transmet true (ou false si on décoche).'],
      ['2. Service métier', 'setTaskDone() vérifie le type et ne réécrit pas une valeur déjà identique.'],
      ['3. IndexedDB', 'Le dépôt met à jour le champ done de cette tâche.'],
      ['4. Affichage', 'summarize() recalcule « à faire sur » et le pourcentage des tâches terminées.'],
    ],
  };

  function showFlow(flowName) {
    const steps = flows[flowName] ?? flows.project;
    $('#mechanism-steps').replaceChildren(...steps.map(([title, description]) => {
      const item = document.createElement('li');
      const heading = Object.assign(document.createElement('strong'), { textContent: title });
      const copy = Object.assign(document.createElement('span'), { textContent: description });
      item.append(heading, copy);
      return item;
    }));
    root.querySelectorAll('.mechanism-choice').forEach((button) => {
      const active = button.dataset.flow === flowName;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  root.querySelectorAll('.mechanism-choice').forEach((button) => {
    button.addEventListener('click', () => showFlow(button.dataset.flow));
  });
  showFlow('project');

  const setStatus = (selector, status) => {
    const badge = $(selector);
    badge.textContent = status ?? 'indisponible';
    badge.classList.toggle('result-badge-success', status === 'réussi' || status === 'terminé');
    badge.classList.toggle('result-badge-failure', status === 'échoué' || status === 'à examiner');
  };
  const setPercent = (labelSelector, barSelector, value) => {
    const label = $(labelSelector);
    const bar = $(barSelector);
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      label.textContent = '—';
      bar.style.width = '0%';
      return;
    }
    const bounded = Math.max(0, Math.min(100, value));
    label.textContent = `${bounded.toFixed(1)} %`;
    bar.style.width = `${bounded}%`;
    bar.setAttribute('aria-valuenow', String(bounded));
  };
  async function loadTestResults() {
    const refresh = $('#refresh-test-results');
    refresh.disabled = true;
    $('#test-results-error').hidden = true;
    try {
      const reportUrl = new URL('../test-results.json', import.meta.url);
      reportUrl.searchParams.set('updated', String(Date.now()));
      const response = await fetch(reportUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('Rapport absent. Lance npm test pour le générer.');
      const results = await response.json();
      const { tdd, bdd, mutation } = results;
      setStatus('#tdd-result-status', tdd?.status);
      $('#tdd-result-count').textContent = tdd?.total == null ? '—' : `${tdd.passed ?? 0} / ${tdd.total}`;
      setPercent('#coverage-lines-label', '#coverage-lines-bar', tdd?.coverage?.lines);
      setPercent('#coverage-branches-label', '#coverage-branches-bar', tdd?.coverage?.branches);
      setPercent('#coverage-functions-label', '#coverage-functions-bar', tdd?.coverage?.functions);

      setStatus('#bdd-result-status', bdd?.status);
      $('#bdd-result-count').textContent = bdd?.scenarios?.total == null ? '—' : `${bdd.scenarios.passed ?? 0} / ${bdd.scenarios.total}`;
      $('#bdd-result-steps').textContent = `Étapes réussies : ${bdd?.steps?.passed ?? '—'} / ${bdd?.steps?.total ?? '—'}`;

      setStatus('#mutation-result-status', mutation?.status);
      $('#mutation-result-score').textContent = typeof mutation?.score === 'number' ? `${mutation.score.toFixed(2)} %` : '—';
      $('#mutation-result-count').textContent = `Mutants tués / total : ${mutation?.killed ?? 0} / ${mutation?.total ?? 0}`;
      $('#mutation-result-survivors').textContent = `Survivants : ${mutation?.survived ?? 0} · non couverts : ${mutation?.noCoverage ?? 0}`;

      const dates = [tdd?.reportUpdatedAt, bdd?.reportUpdatedAt, mutation?.reportUpdatedAt].filter(Boolean).map((value) => new Date(value));
      const latest = dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : new Date(results.updatedAt);
      $('#test-results-updated').textContent = `Rapports locaux · dernière mise à jour : ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(latest)}`;
    } catch (error) {
      $('#test-results-updated').textContent = 'Résultats non chargés';
      $('#test-results-error').textContent = `${error.message} Les rapports se mettent à jour après npm test et npm run test:mutation.`;
      $('#test-results-error').hidden = false;
    } finally {
      refresh.disabled = false;
    }
  }
  $('#refresh-test-results').addEventListener('click', loadTestResults);
  await loadTestResults();

  function projectOption(project, selectedId) {
    return Object.assign(document.createElement('option'), { value: project.id, textContent: project.name, selected: project.id === selectedId });
  }

  async function render() {
    const projects = await service.getProjects();
    if (!projects.some((project) => project.id === currentProjectId)) currentProjectId = projects[0]?.id ?? null;
    $('#projects').replaceChildren(...projects.map((project) => {
      const item = document.createElement('li');
      item.className = `project-item${project.id === currentProjectId ? ' active' : ''}`;
      const select = Object.assign(document.createElement('button'), { type: 'button', className: 'select-project', textContent: project.name });
      select.setAttribute('aria-pressed', String(project.id === currentProjectId));
      select.onclick = () => { currentProjectId = project.id; render(); };
      const remove = Object.assign(document.createElement('button'), { type: 'button', className: 'delete-project icon-button', textContent: '×', 'aria-label': `Supprimer le projet ${project.name}` });
      remove.onclick = async () => { await service.removeProject(project.id); render(); };
      item.append(select, remove);
      return item;
    }));
    $('#task-form').hidden = currentProjectId === null;
    $('#progress-panel').hidden = currentProjectId === null;
    $('#current-project').textContent = projects.find((project) => project.id === currentProjectId)?.name ?? 'Choisissez ou créez un projet';
    const tasks = currentProjectId === null ? [] : await service.getTasks(currentProjectId);
    const summary = await service.getSummary(currentProjectId);
    $('#task-count').textContent = `${summary.remaining} à faire sur ${summary.total}`;
    $('#progress-percent').textContent = `${summary.percent} %`;
    $('.progress-track').setAttribute('aria-valuenow', String(summary.percent));
    $('#progress-fill').style.width = `${summary.percent}%`;
    $('#empty-state').hidden = tasks.length > 0 || currentProjectId === null;
    $('#tasks').replaceChildren(...tasks.map((task) => taskElement(task, projects)));
  }

  function taskElement(task, projects) {
    const item = document.createElement('li');
    item.className = `task-item${task.done ? ' done' : ''}`;
    item.dataset.id = task.id;
    const checkbox = Object.assign(document.createElement('input'), { type: 'checkbox', className: 'toggle', checked: task.done });
    checkbox.setAttribute('aria-label', `Terminer ${task.title}`);
    checkbox.onchange = async () => { await service.setTaskDone(task.id, checkbox.checked); await render(); };
    const content = document.createElement('div'); content.className = 'task-content';
    const title = Object.assign(document.createElement('span'), { className: 'title', textContent: task.title });
    content.append(title);
    if (task.deadline) {
      const due = Object.assign(document.createElement('time'), { className: 'deadline', dateTime: task.deadline, textContent: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${task.deadline}T00:00:00Z`)) });
      content.append(due);
    }
    const edit = Object.assign(document.createElement('button'), { type: 'button', className: 'edit secondary', textContent: 'Modifier' });
    edit.onclick = () => beginEditing(item, task, projects);
    const remove = Object.assign(document.createElement('button'), { type: 'button', className: 'delete-task icon-button', textContent: '×', 'aria-label': `Supprimer ${task.title}` });
    remove.onclick = async () => { await service.removeTask(task.id); await render(); };
    item.append(checkbox, content, edit, remove);
    return item;
  }

  function beginEditing(item, task, projects) {
    item.classList.add('editing');
    const form = document.createElement('form'); form.className = 'edit-form';
    const title = Object.assign(document.createElement('input'), { type: 'text', className: 'edit-input', value: task.title, required: true, maxLength: 120, 'aria-label': 'Titre de la tâche' });
    const deadline = Object.assign(document.createElement('input'), { type: 'date', className: 'edit-deadline', value: task.deadline ?? '', 'aria-label': 'Échéance' });
    const project = Object.assign(document.createElement('select'), { className: 'edit-project', 'aria-label': 'Projet de la tâche' });
    project.append(...projects.map((item) => projectOption(item, task.projectId)));
    const save = Object.assign(document.createElement('button'), { type: 'submit', className: 'save primary', textContent: 'Enregistrer' });
    const cancel = Object.assign(document.createElement('button'), { type: 'button', className: 'cancel-edit secondary', textContent: 'Annuler' });
    cancel.onclick = () => render();
    form.onsubmit = async (event) => {
      event.preventDefault();
      try {
        $('#task-error').hidden = true;
        await service.updateTask(task.id, { title: title.value, deadline: deadline.value || null, projectId: project.value });
        await render();
      } catch (error) { $('#task-error').textContent = error.message; $('#task-error').hidden = false; }
    };
    form.append(title, deadline, project, save, cancel);
    item.replaceChildren(form);
    title.focus();
  }

  $('#project-form').onsubmit = async (event) => {
    event.preventDefault();
    try {
      $('#project-error').hidden = true;
      currentProjectId = await service.createProject($('#project-input').value);
      $('#project-input').value = '';
      await render();
    } catch (error) { $('#project-error').textContent = error.message; $('#project-error').hidden = false; }
  };
  $('#task-form').onsubmit = async (event) => {
    event.preventDefault();
    try {
      $('#task-error').hidden = true;
      await service.addTask({ projectId: currentProjectId, title: $('#task-input').value, deadline: $('#task-deadline').value || null });
      $('#task-input').value = ''; $('#task-deadline').value = '';
      await render();
    } catch (error) { $('#task-error').textContent = error.message; $('#task-error').hidden = false; }
  };
  await render();
  return { render };
}
