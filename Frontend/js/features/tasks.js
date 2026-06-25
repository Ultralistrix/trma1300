/**
 * tasks.js — Aufgabenliste, Detailansicht, CRUD
 */

let taskFilter = { search: '', priority: '' };

function priorityBadge(priority) {
  const map = { hoch: 'badge-danger', mittel: 'badge-warn', niedrig: 'badge-ok' };
  return `<span class="badge ${map[priority] || 'badge-gray'}">${priority}</span>`;
}

function renderTaskList() {
  const container = qs('#task-list');
  if (!container) return;

  let tasks = Tasks.getSorted();
  if (taskFilter.search) {
    tasks = tasks.filter(t =>
      t.name.toLowerCase().includes(taskFilter.search.toLowerCase()) ||
      t.responsible.toLowerCase().includes(taskFilter.search.toLowerCase())
    );
  }
  if (taskFilter.priority) {
    tasks = tasks.filter(t => t.priority === taskFilter.priority);
  }

  if (tasks.length === 0) {
    container.innerHTML = `<div class="empty-state">📋<p>Keine Aufgaben gefunden.</p></div>`;
    return;
  }

  container.innerHTML = tasks.map(task => {
    const days = daysUntil(task.endDate);
    const overdue = days !== null && days < 0;
    const depNames = task.dependencies.map(id => {
      const dep = Tasks.getById(id);
      return dep ? `<span class="dep-chip">${dep.name}</span>` : '';
    }).join('');
    const alerts = task.inventoryItems.filter(({ itemId, quantity }) => {
      const item = Inventory.getById(itemId);
      return item && item.stock < quantity;
    }).length;

    return `
      <div class="task-card priority-${task.priority}" onclick="openTaskDetail('${task.id}')">
        <div class="task-card-header">
          <span class="task-card-title">${task.name}</span>
          <div class="flex gap-2 items-center">
            ${alerts > 0 ? `<span class="badge badge-danger">⚠ ${alerts} Fehlend</span>` : ''}
            ${priorityBadge(task.priority)}
          </div>
        </div>
        <div class="task-card-meta">
          <span class="text-muted text-sm">👤 ${task.responsible}</span>
          <span class="text-muted text-sm">📅 ${formatDate(task.startDate)} – ${formatDate(task.endDate)}</span>
          ${overdue ? `<span class="badge badge-danger">Überfällig</span>` : days !== null && days <= 3 ? `<span class="badge badge-warn">Bald fällig</span>` : ''}
        </div>
        ${depNames ? `<div class="dep-chips mt-2">${depNames}</div>` : ''}
        ${task.description ? `<div class="task-card-desc">${task.description}</div>` : ''}
      </div>`;
  }).join('');
}

// ── Detailansicht ─────────────────────────────────────────────────────────────

function openTaskDetail(id) {
  const task = Tasks.getById(id);
  if (!task) return;

  const depItems = task.dependencies.map(depId => {
    const dep = Tasks.getById(depId);
    return dep ? `<div class="alert-list-item">↳ ${dep.name} (${formatDate(dep.endDate)})</div>` : '';
  }).join('');

  const invRows = task.inventoryItems.map(({ itemId, quantity }) => {
    const item = Inventory.getById(itemId);
    if (!item) return '';
    const enough = item.stock >= quantity;
    return `
      <div class="inv-item-row">
        <span class="inv-item-name">${item.name} <span class="category-tag">${item.category}</span></span>
        <span class="text-sm text-muted">Benötigt: <strong>${quantity} ${item.unit}</strong></span>
        <span class="text-sm text-muted">Vorhanden: <strong class="${enough ? 'text-success' : 'text-danger'}">${item.stock} ${item.unit}</strong></span>
        ${!enough ? `<span class="badge badge-danger">Fehlt: ${quantity - item.stock}</span>` : `<span class="badge badge-ok">OK</span>`}
      </div>`;
  }).join('');

  const bodyHTML = `
    <div class="flex gap-3 items-center" style="margin-bottom:16px">
      ${priorityBadge(task.priority)}
      <span class="text-muted text-sm">ID: <code>${task.id}</code></span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div><label>Verantwortlich</label><div>${task.responsible}</div></div>
      <div><label>Zeitraum</label><div>${formatDate(task.startDate)} – ${formatDate(task.endDate)}</div></div>
    </div>
    ${task.description ? `<div class="form-group"><label>Beschreibung</label><div style="color:var(--text2);font-size:13px">${task.description}</div></div>` : ''}
    ${depItems ? `<div class="form-group"><label>Abhängigkeiten</label><div class="alert-list">${depItems}</div></div>` : ''}
    <div class="form-group"><label>Inventarliste</label>${invRows || '<div class="text-muted text-sm">Keine Items zugewiesen</div>'}</div>`;

  openModal(task.name, bodyHTML, [
    el('button', { class: 'btn-ghost btn-sm', onclick: () => { closeModal(); openTaskForm(task); } }, 'Bearbeiten'),
    el('button', { class: 'btn-danger btn-sm', onclick: () => { closeModal(); deleteTask(task.id); } }, 'Löschen'),
    el('button', { class: 'btn-secondary', onclick: closeModal }, 'Schließen'),
  ]);
}

// ── Task Formular ─────────────────────────────────────────────────────────────

function openAddTask() { openTaskForm(null); }

function openTaskForm(task) {
  const allTasks = Tasks.getAll().filter(t => t.id !== task?.id);
  const allItems = Inventory.getAll();
  const isEdit = !!task;

  let selectedDeps = task ? [...task.dependencies] : [];
  let selectedItems = task ? task.inventoryItems.map(i => ({ ...i })) : [];

  function renderDeps(container) {
    container.innerHTML = selectedDeps.map(id => {
      const dep = Tasks.getById(id);
      return dep ? `<span class="dep-chip">${dep.name}<button class="remove-dep" onclick="this.closest('.dep-chip').remove();window._removeDep('${id}')">×</button></span>` : '';
    }).join('');
    window._removeDep = (id) => { selectedDeps = selectedDeps.filter(d => d !== id); };
  }

  function renderItems(container) {
    container.innerHTML = selectedItems.map((si, idx) => {
      const item = Inventory.getById(si.itemId);
      if (!item) return '';
      return `<div class="inv-item-row">
        <span class="inv-item-name">${item.name}</span>
        <input class="inv-qty-input" type="number" min="1" value="${si.quantity}" onchange="window._updateQty(${idx}, this.value)">
        <span class="text-sm text-muted">${item.unit}</span>
        <button class="btn-ghost btn-sm text-danger" onclick="window._removeItem(${idx})">×</button>
      </div>`;
    }).join('');
    window._updateQty = (idx, val) => { selectedItems[idx].quantity = parseInt(val) || 1; };
    window._removeItem = (idx) => { selectedItems.splice(idx, 1); renderItems(container); };
  }

  const bodyHTML = `
    <div class="form-group"><label>Name *</label><input id="tf-name" value="${task?.name || ''}"></div>
    <div class="form-group"><label>Verantwortlich *</label><input id="tf-resp" value="${task?.responsible || ''}"></div>
    <div class="form-group"><label>Beschreibung</label><textarea id="tf-desc">${task?.description || ''}</textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      <div class="form-group"><label>Priorität</label>
        <select id="tf-prio">
          <option value="hoch" ${task?.priority==='hoch'?'selected':''}>Hoch</option>
          <option value="mittel" ${task?.priority==='mittel'||!task?'selected':''}>Mittel</option>
          <option value="niedrig" ${task?.priority==='niedrig'?'selected':''}>Niedrig</option>
        </select>
      </div>
      <div class="form-group"><label>Startdatum</label><input type="date" id="tf-start" value="${task?.startDate || ''}"></div>
      <div class="form-group"><label>Enddatum</label><input type="date" id="tf-end" value="${task?.endDate || ''}"></div>
    </div>
    <div class="form-group">
      <label>Abhängigkeiten</label>
      <div id="dep-chips-container" class="dep-chips" style="min-height:28px;margin-bottom:6px"></div>
      <select id="tf-dep-select" onchange="window._addDep(this.value);this.value=''">
        <option value="">+ Abhängigkeit hinzufügen...</option>
        ${allTasks.filter(t => !selectedDeps.includes(t.id)).map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Inventarliste</label>
      <div id="inv-items-container" style="margin-bottom:8px"></div>
      <select id="tf-inv-select" onchange="window._addInvItem(this.value);this.value=''">
        <option value="">+ Item hinzufügen...</option>
        ${allItems.map(i => `<option value="${i.id}">${i.name} (${i.stock} ${i.unit})</option>`).join('')}
      </select>
    </div>`;

  const { modal } = openModal(isEdit ? 'Aufgabe bearbeiten' : 'Neue Aufgabe', bodyHTML, [
    el('button', { class: 'btn-secondary', onclick: closeModal }, 'Abbrechen'),
    el('button', { class: 'btn-primary', onclick: () => saveTaskForm(task?.id, selectedDeps, selectedItems) }, isEdit ? 'Speichern' : 'Erstellen'),
  ]);

  const depsContainer = qs('#dep-chips-container', modal);
  const itemsContainer = qs('#inv-items-container', modal);
  renderDeps(depsContainer);
  renderItems(itemsContainer);

  window._addDep = (id) => {
    if (id && !selectedDeps.includes(id)) {
      selectedDeps.push(id);
      renderDeps(depsContainer);
    }
  };
  window._addInvItem = (id) => {
    if (id && !selectedItems.find(s => s.itemId === id)) {
      selectedItems.push({ itemId: id, quantity: 1 });
      renderItems(itemsContainer);
    }
  };
}

function saveTaskForm(existingId, deps, items) {
  const name = qs('#tf-name')?.value.trim();
  const responsible = qs('#tf-resp')?.value.trim();
  const description = qs('#tf-desc')?.value.trim();
  const priority = qs('#tf-prio')?.value;
  const startDate = qs('#tf-start')?.value;
  const endDate = qs('#tf-end')?.value;

  if (!name || !responsible) { showToast('Fehler', 'Name und Verantwortlich sind Pflichtfelder.', 'danger'); return; }

  Tasks.save({ id: existingId, name, responsible, description, priority, startDate, endDate, dependencies: deps, inventoryItems: items });
  closeModal();
  renderTaskList();
  updateNavBadge();
  showToast('Gespeichert', `Aufgabe "${name}" gespeichert.`, 'success');
}

function deleteTask(id) {
  const task = Tasks.getById(id);
  if (!task || !confirm(`"${task.name}" wirklich löschen?`)) return;
  Tasks.delete(id);
  renderTaskList();
  showToast('Gelöscht', `"${task.name}" wurde entfernt.`, 'info');
}

function updateNavBadge() {
  const count = Inventory.getAlerts().length;
  const badge = qs('#notif-count');
  if (!badge) return;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

document.addEventListener('DOMContentLoaded', () => {
  renderTaskList();
  updateNavBadge();

  qs('#filter-search')?.addEventListener('input', e => {
    taskFilter.search = e.target.value;
    renderTaskList();
  });
  qs('#filter-priority')?.addEventListener('change', e => {
    taskFilter.priority = e.target.value;
    renderTaskList();
  });
  qs('#btn-add-task')?.addEventListener('click', openAddTask);
  window.addEventListener('storeChange', () => renderTaskList());
});
