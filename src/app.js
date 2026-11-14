// Interface : projets + tâches (ajout, modification, statut, suppression)
export async function initApp(root, db) {
  let current = null;
  root.innerHTML = `
    <h1>Mes tâches</h1>
    <form id="project-form"><input type="text" id="project-input" placeholder="Nouveau projet" required><button>Ajouter projet</button></form>
    <ul id="projects"></ul>
    <form id="task-form"><input type="text" id="task-input" placeholder="Nouvelle tâche" required><button>Ajouter</button></form>
    <ul id="tasks"></ul>`;
  const $ = (s) => root.querySelector(s);
  const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

  function taskItem(t) {
    const li = el('li', { className: t.done ? 'done' : '' });
    li.dataset.id = t.id;
    const check = el('input', { type: 'checkbox', checked: t.done, className: 'toggle' });
    check.onchange = async () => { await db.updateTask(t.id, { done: check.checked }); render(); };
    const title = el('span', { className: 'title', textContent: t.title });
    const edit = el('button', { className: 'edit', textContent: 'Modifier' });
    edit.onclick = () => {
      const input = el('input', { type: 'text', className: 'edit-input', value: t.title });
      const save = el('button', { className: 'save', textContent: 'Enregistrer' });
      save.onclick = async () => {
        const v = input.value.trim();
        if (v) await db.updateTask(t.id, { title: v });
        render();
      };
      li.replaceChildren(input, save);
    };
    const del = el('button', { className: 'delete-task', textContent: '✕' });
    del.onclick = async () => { await db.deleteTask(t.id); render(); };
    li.append(check, title, edit, del);
    return li;
  }

  async function render() {
    const projects = await db.getProjects();
    if (!projects.some((p) => p.id === current)) current = projects[0]?.id ?? null;
    $('#projects').replaceChildren(...projects.map((p) => {
      const li = el('li', { className: p.id === current ? 'active' : '' });
      li.dataset.id = p.id;
      const sel = el('button', { className: 'select-project', textContent: p.name });
      sel.onclick = () => { current = p.id; render(); };
      const del = el('button', { className: 'delete-project', textContent: '✕' });
      del.onclick = async () => { await db.deleteProject(p.id); render(); };
      li.append(sel, del);
      return li;
    }));
    $('#task-form').hidden = current === null;
    const tasks = current === null ? [] : await db.getTasks(current);
    $('#tasks').replaceChildren(...tasks.map(taskItem));
  }

  $('#project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#project-input');
    const name = input.value.trim();
    if (!name) return;
    current = await db.addProject(name);
    input.value = '';
    render();
  });
  $('#task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#task-input');
    const title = input.value.trim();
    if (!title || current === null) return;
    await db.addTask(current, title);
    input.value = '';
    render();
  });

  await render();
  return { render };
}
