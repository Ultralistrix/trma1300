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

  let tasks = Tasks.getAll();
  
  if (taskFilter.search) {
    tasks = tasks.filter(t =>
      t.name.toLowerCase().includes(taskFilter.search.toLowerCase()) ||
      t.responsible.toLowerCase().includes(taskFilter.search.toLowerCase())
    );
  }
  if (taskFilter.priority) {
    tasks = tasks.filter(t => t.priority === taskFilter.priority);
  }
  
  tasks.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  if (tasks.length === 0) {
    container.innerHTML = `<div class="empty-state">📋<p>Keine Aufgaben gefunden.</p></div>`;
    return;
  }

  container.innerHTML = tasks.map(task => {
    const days = daysUntil(task.endDate);
    const overdue = days !== null && days < 0;
    
    const hasShortage = task.inventoryItems.some(({ itemId, quantity }) => {
      const item = Inventory.getById(itemId);
      return item && item.stock < quantity;
    });

    return `
      <div class="task-card priority-${task.priority}" onclick="openTaskDetail('${task.id}')" style="cursor:pointer">
        <div class="task-card-header">
          <span class="task-card-title">${task.name}</span>
          <div class="flex gap-2 items-center">
            ${hasShortage ? `<span class="badge badge-danger">⚠ Fehlbestand</span>` : ''}
            ${priorityBadge(task.priority)}
          </div>
        </div>
        <div class="task-card-meta">
          <span class="text-muted text-sm">👤 ${task.responsible}</span>
          <span class="text-muted text-sm">📅 ${formatDate(task.startDate)} – ${formatDate(task.endDate)}</span>
          ${overdue ? `<span class="badge badge-danger">Überfällig</span>` : days !== null && days <= 3 ? `<span class="badge badge-warn">Bald fällig</span>` : ''}
        </div>
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
      <div class="inv-item-row" style="display:flex;align-items:center;gap:12px;padding:4px 0;border-bottom:1px solid var(--border);">
        <span style="flex:1"><strong>${item.name}</strong> <span class="category-tag">${item.category}</span></span>
        <span class="text-sm text-muted">Benötigt: <strong>${quantity} ${item.unit}</strong></span>
        <span class="text-sm text-muted">Vorhanden: <strong class="${enough ? 'text-success' : 'text-danger'}">${item.stock} ${item.unit}</strong></span>
        ${!enough ? `<span class="badge badge-danger">Fehlt: ${quantity - item.stock}</span>` : `<span class="badge badge-ok">OK</span>`}
      </div>`;
  }).join('');

  const canComplete = task.inventoryItems.every(({ itemId, quantity }) => {
    const item = Inventory.getById(itemId);
    return item && item.stock >= quantity;
  });

  const bodyHTML = `
    <div class="flex gap-3 items-center" style="margin-bottom:16px">
      ${priorityBadge(task.priority)}
      <span class="text-muted text-sm">ID: <code>${task.id}</code></span>
      ${canComplete ? `<span class="badge badge-ok">✅ Bereit</span>` : `<span class="badge badge-danger">⚠ Fehlbestand</span>`}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div><label style="font-size:11px;color:var(--text3)">Verantwortlich</label><div>${task.responsible}</div></div>
      <div><label style="font-size:11px;color:var(--text3)">Zeitraum</label><div>${formatDate(task.startDate)} – ${formatDate(task.endDate)}</div></div>
    </div>
    ${task.description ? `<div style="margin-bottom:12px"><label style="font-size:11px;color:var(--text3)">Beschreibung</label><div style="color:var(--text2);font-size:13px">${task.description}</div></div>` : ''}
    ${depItems ? `<div style="margin-bottom:12px"><label style="font-size:11px;color:var(--text3)">Abhängigkeiten</label><div class="alert-list">${depItems}</div></div>` : ''}
    <div><label style="font-size:11px;color:var(--text3)">Inventarliste</label>${invRows || '<div class="text-muted text-sm">Keine Items zugewiesen</div>'}</div>`;

  const footerButtons = [
    el('button', { class: 'btn-secondary', onclick: closeModal }, 'Schließen'),
  ];
  
  if (canComplete) {
    footerButtons.push(el('button', { class: 'btn-success', onclick: () => {
      if (confirm(`"${task.name}" als abgeschlossen markieren? Verbrauchbare Items werden vom Bestand abgezogen.`)) {
        completeTask(task.id);
        closeModal();
      }
    }}, '✅ Abschließen'));
  }
  
  footerButtons.push(
    el('button', { class: 'btn-ghost btn-sm', onclick: () => { closeModal(); openTaskForm(task); } }, '✏️ Bearbeiten'),
    el('button', { class: 'btn-danger btn-sm', onclick: () => { closeModal(); deleteTask(task.id); } }, '🗑️ Löschen')
  );

  openModal(task.name, bodyHTML, footerButtons);
}

function completeTask(taskId) {
  const task = Tasks.getById(taskId);
  if (!task) return;
  
  task.inventoryItems.forEach(({ itemId, quantity }) => {
    const item = Inventory.getById(itemId);
    if (item && !item.reusable) {
      const newStock = Math.max(0, item.stock - quantity);
      Inventory.updateStock(itemId, newStock);
    }
  });
  
  Tasks.delete(taskId);
  renderTaskList();
  updateNavBadge();
  showToast('Aufgabe abgeschlossen', `"${task.name}" wurde erfolgreich abgeschlossen.`, 'success');
}

// ── Task Formular ─────────────────────────────────────────────────────────────

function openAddTask() { 
  openTaskForm(null); 
}

function openTaskForm(task) {
  const allTasks = Tasks.getAll().filter(t => t.id !== task?.id);
  const allItems = Inventory.getAll();
  const isEdit = !!task;

  let selectedDeps = task ? [...task.dependencies] : [];
  let selectedItems = task ? task.inventoryItems.map(i => ({ ...i })) : [];

  // Funktionen für Dependency und Item Management
  function renderDeps(container) {
    if (!container) return;
    if (selectedDeps.length === 0) {
      container.innerHTML = '<span class="text-muted text-sm">Keine Abhängigkeiten</span>';
      return;
    }
    container.innerHTML = selectedDeps.map(id => {
      const dep = Tasks.getById(id);
      return dep ? `<span class="dep-chip">${dep.name}<button class="remove-dep" onclick="window._removeDep('${id}')">×</button></span>` : '';
    }).join('');
  }

  function renderItems(container) {
    if (!container) return;
    if (selectedItems.length === 0) {
      container.innerHTML = '<span class="text-muted text-sm">Keine Items zugewiesen</span>';
      return;
    }
    container.innerHTML = selectedItems.map((si, idx) => {
      const item = Inventory.getById(si.itemId);
      if (!item) return '';
      const enough = item.stock >= si.quantity;
      return `<div class="inv-item-row" style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);">
        <span style="flex:1"><strong>${item.name}</strong> <span class="category-tag">${item.category}</span></span>
        <input class="inv-qty-input" type="number" min="1" value="${si.quantity}" style="width:60px" onchange="window._updateQty(${idx}, this.value)">
        <span class="text-sm text-muted">${item.unit}</span>
        <span class="text-sm ${enough ? 'text-success' : 'text-danger'}">(${item.stock} verfügbar)</span>
        <button class="btn-ghost btn-sm text-danger" onclick="window._removeItem(${idx})">×</button>
      </div>`;
    }).join('');
  }

  // Globale Funktionen für das Formular
  window._removeDep = (id) => {
    selectedDeps = selectedDeps.filter(d => d !== id);
    const container = qs('#dep-chips-container');
    if (container) renderDeps(container);
  };
  
  window._updateQty = (idx, val) => {
    if (selectedItems[idx]) {
      selectedItems[idx].quantity = parseInt(val) || 1;
    }
  };
  
  window._removeItem = (idx) => {
    selectedItems.splice(idx, 1);
    const container = qs('#inv-items-container');
    if (container) renderItems(container);
  };

  window._addDep = (id) => {
    if (id && !selectedDeps.includes(id)) {
      selectedDeps.push(id);
      const container = qs('#dep-chips-container');
      if (container) renderDeps(container);
      const select = qs('#tf-dep-select');
      if (select) select.value = '';
    }
  };
  
  window._addInvItem = (id) => {
    if (id && !selectedItems.find(s => s.itemId === id)) {
      selectedItems.push({ itemId: id, quantity: 1 });
      const container = qs('#inv-items-container');
      if (container) renderItems(container);
      const select = qs('#tf-inv-select');
      if (select) select.value = '';
    }
  };

  // Body HTML mit korrekten IDs
  const bodyHTML = `
    <div class="form-group">
      <label>Name *</label>
      <input id="tf-name" type="text" value="${task?.name || ''}" placeholder="z. B. Erste-Hilfe-Station aufbauen">
    </div>
    <div class="form-group">
      <label>Verantwortlich *</label>
      <input id="tf-resp" type="text" value="${task?.responsible || ''}" placeholder="Name der verantwortlichen Person">
    </div>
    <div class="form-group">
      <label>Beschreibung</label>
      <textarea id="tf-desc" rows="2">${task?.description || ''}</textarea>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      <div class="form-group">
        <label>Priorität</label>
        <select id="tf-prio">
          <option value="hoch" ${task?.priority === 'hoch' ? 'selected' : ''}>Hoch</option>
          <option value="mittel" ${task?.priority === 'mittel' || !task ? 'selected' : ''}>Mittel</option>
          <option value="niedrig" ${task?.priority === 'niedrig' ? 'selected' : ''}>Niedrig</option>
        </select>
      </div>
      <div class="form-group">
        <label>Startdatum</label>
        <input type="date" id="tf-start" value="${task?.startDate || ''}">
      </div>
      <div class="form-group">
        <label>Enddatum</label>
        <input type="date" id="tf-end" value="${task?.endDate || ''}">
      </div>
    </div>
    <div class="form-group">
      <label>Abhängigkeiten</label>
      <div id="dep-chips-container" class="dep-chips" style="min-height:28px;margin-bottom:6px;display:flex;flex-wrap:wrap;gap:4px"></div>
      <select id="tf-dep-select" style="width:100%">
        <option value="">+ Abhängigkeit hinzufügen...</option>
        ${allTasks.filter(t => !selectedDeps.includes(t.id)).map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
      </select>
      <button class="btn-ghost btn-sm" onclick="window._addDep(qs('#tf-dep-select').value)" style="margin-top:4px">Hinzufügen</button>
    </div>
    <div class="form-group">
      <label>Inventarliste</label>
      <div id="inv-items-container" style="margin-bottom:8px;min-height:28px"></div>
      <div style="display:flex;gap:8px">
        <select id="tf-inv-select" style="flex:1">
          <option value="">+ Item hinzufügen...</option>
          ${allItems.map(i => `<option value="${i.id}">${i.name} (${i.stock} ${i.unit})</option>`).join('')}
        </select>
        <button class="btn-ghost btn-sm" onclick="window._addInvItem(qs('#tf-inv-select').value)">Hinzufügen</button>
      </div>
    </div>`;

  // Modal öffnen
  const { modal } = openModal(isEdit ? 'Aufgabe bearbeiten' : 'Neue Aufgabe', bodyHTML, [
    el('button', { class: 'btn-secondary', onclick: closeModal }, 'Abbrechen'),
    el('button', { class: 'btn-primary', onclick: () => saveTaskForm(task?.id, selectedDeps, selectedItems) }, isEdit ? 'Speichern' : 'Erstellen'),
  ]);

  // Nachdem Modal gerendert wurde, die Container rendern
  setTimeout(() => {
    const depsContainer = qs('#dep-chips-container', modal);
    if (depsContainer) renderDeps(depsContainer);
    
    const itemsContainer = qs('#inv-items-container', modal);
    if (itemsContainer) renderItems(itemsContainer);
  }, 50);
}

function saveTaskForm(existingId, deps, items) {
  const name = qs('#tf-name')?.value?.trim();
  const responsible = qs('#tf-resp')?.value?.trim();
  const description = qs('#tf-desc')?.value?.trim();
  const priority = qs('#tf-prio')?.value;
  const startDate = qs('#tf-start')?.value;
  const endDate = qs('#tf-end')?.value;

  // Validierung
  if (!name) { 
    showToast('Fehler', 'Bitte einen Namen eingeben.', 'danger'); 
    return; 
  }
  if (!responsible) { 
    showToast('Fehler', 'Bitte einen Verantwortlichen eingeben.', 'danger'); 
    return; 
  }

  // Task speichern
  Tasks.save({ 
    id: existingId, 
    name, 
    responsible, 
    description, 
    priority, 
    startDate, 
    endDate, 
    dependencies: deps || [], 
    inventoryItems: items || [] 
  });
  
  closeModal();
  renderTaskList();
  updateNavBadge();
  showToast('Gespeichert', `Aufgabe "${name}" wurde gespeichert.`, 'success');
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

// ── Event-Listener ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderTaskList();
  updateNavBadge();

  // Filter-Listener
  qs('#filter-search')?.addEventListener('input', e => {
    taskFilter.search = e.target.value;
    renderTaskList();
  });
  
  qs('#filter-priority')?.addEventListener('change', e => {
    taskFilter.priority = e.target.value;
    renderTaskList();
  });
  
  // Button für neue Aufgabe
  const addBtn = qs('#btn-add-task');
  if (addBtn) {
    addBtn.addEventListener('click', openAddTask);
  }
  
  // Store-Change-Listener
  window.addEventListener('storeChange', () => {
    renderTaskList();
    updateNavBadge();
  });
});