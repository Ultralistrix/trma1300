/**
 * tasks.js — Aufgabenliste, Detailansicht, CRUD
 */

let taskFilter = { search: '', priority: '' };
let currentTaskForm = null; // Speichert den aktuellen Form-Status

function priorityBadge(priority) {
  const map = { hoch: 'badge-danger', mittel: 'badge-warn', niedrig: 'badge-ok' };
  return `<span class="badge ${map[priority] || 'badge-gray'}">${priority}</span>`;
}

function renderTaskList() {
  const container = document.getElementById('task-list');
  if (!container) return;

  let tasks = Tasks.getAll();
  
  if (taskFilter.search) {
    const search = taskFilter.search.toLowerCase();
    tasks = tasks.filter(t =>
      t.name.toLowerCase().includes(search) ||
      t.responsible.toLowerCase().includes(search)
    );
  }
  if (taskFilter.priority) {
    tasks = tasks.filter(t => t.priority === taskFilter.priority);
  }
  
  tasks.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  if (tasks.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>Keine Aufgaben gefunden.</p></div>`;
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
          <span class="text-muted text-sm">${task.responsible}</span>
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
    document.createElement('button'),
    document.createElement('button'),
    document.createElement('button'),
    document.createElement('button')
  ];
  
  footerButtons[0].className = 'btn-secondary';
  footerButtons[0].textContent = 'Schließen';
  footerButtons[0].onclick = closeModal;
  
  if (canComplete) {
    footerButtons[1].className = 'btn-success';
    footerButtons[1].textContent = 'Abschließen';
    footerButtons[1].onclick = () => {
      if (confirm(`"${task.name}" als abgeschlossen markieren? Verbrauchbare Items werden vom Bestand abgezogen.`)) {
        completeTask(task.id);
        closeModal();
      }
    };
  }
  
  footerButtons[2].className = 'btn-ghost btn-sm';
  footerButtons[2].textContent = ' Bearbeiten';
  footerButtons[2].onclick = () => { closeModal(); openTaskForm(task); };
  
  footerButtons[3].className = 'btn-danger btn-sm';
  footerButtons[3].textContent = 'Löschen';
  footerButtons[3].onclick = () => { closeModal(); deleteTask(task.id); };

  openModal(task.name, bodyHTML, footerButtons);
}

function completeTask(taskId) {
  const task = Tasks.getById(taskId);
  if (!task) return;

  const consumedItems = [];
  task.inventoryItems.forEach(({ itemId, quantity }) => {
    const item = Inventory.getById(itemId);
    if (!item) return;
    if (!item.reusable) {
      const newStock = Math.max(0, item.stock - quantity);
      Inventory.updateStock(itemId, newStock);
      consumedItems.push({ itemId, itemName: item.name, unit: item.unit, quantity });
    }
  });

  CompletionLog.add({
    taskId: task.id,
    taskName: task.name,
    responsible: task.responsible,
    consumedItems,
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

  // State für das Formular
  const formState = {
    task: task,
    selectedDeps: task ? [...task.dependencies] : [],
    selectedItems: task ? task.inventoryItems.map(i => ({ ...i })) : [],
    isEdit: isEdit
  };
  
  currentTaskForm = formState;

  // Body HTML mit eindeutigen IDs
  const uniqueId = Date.now();
  const bodyHTML = `
    <div class="task-form" data-id="${uniqueId}">
      <div class="form-group">
        <label>Name *</label>
        <input class="tf-name" type="text" value="${task?.name || ''}" placeholder="z. B. Erste-Hilfe-Station aufbauen">
      </div>
      <div class="form-group">
        <label>Verantwortlich *</label>
        <input class="tf-resp" type="text" value="${task?.responsible || ''}" placeholder="Name der verantwortlichen Person">
      </div>
      <div class="form-group">
        <label>Beschreibung</label>
        <textarea class="tf-desc" rows="2">${task?.description || ''}</textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div class="form-group">
          <label>Priorität</label>
          <select class="tf-prio">
            <option value="hoch" ${task?.priority === 'hoch' ? 'selected' : ''}>Hoch</option>
            <option value="mittel" ${task?.priority === 'mittel' || !task ? 'selected' : ''}>Mittel</option>
            <option value="niedrig" ${task?.priority === 'niedrig' ? 'selected' : ''}>Niedrig</option>
          </select>
        </div>
        <div class="form-group">
          <label>Startdatum</label>
          <input type="date" class="tf-start" value="${task?.startDate || ''}">
        </div>
        <div class="form-group">
          <label>Enddatum</label>
          <input type="date" class="tf-end" value="${task?.endDate || ''}">
        </div>
      </div>
      <div class="form-group">
        <label>Abhängigkeiten</label>
        <div class="dep-chips-container" style="min-height:28px;margin-bottom:6px;display:flex;flex-wrap:wrap;gap:4px"></div>
        <div style="display:flex;gap:8px">
          <select class="tf-dep-select" style="flex:1">
            <option value="">+ Abhängigkeit hinzufügen...</option>
            ${allTasks.filter(t => !formState.selectedDeps.includes(t.id)).map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
          <button class="btn-ghost btn-sm add-dep-btn">Hinzufügen</button>
        </div>
      </div>
      <div class="form-group">
        <label>Inventarliste</label>
        <div class="inv-items-container" style="margin-bottom:8px;min-height:28px"></div>
        <div style="display:flex;gap:8px">
          <select class="tf-inv-select" style="flex:1">
            <option value="">+ Item hinzufügen...</option>
            ${allItems.map(i => `<option value="${i.id}">${i.name} (${i.stock} ${i.unit})</option>`).join('')}
          </select>
          <button class="btn-ghost btn-sm add-inv-btn">Hinzufügen</button>
        </div>
      </div>
    </div>`;

  // Modal öffnen
  const { modal } = openModal(isEdit ? 'Aufgabe bearbeiten' : 'Neue Aufgabe', bodyHTML, [
    document.createElement('button'),
    document.createElement('button')
  ]);
  
  // Footer Buttons konfigurieren
  const footer = modal.querySelector('.modal-footer');
  if (footer) {
    const buttons = footer.querySelectorAll('button');
    if (buttons.length >= 2) {
      buttons[0].className = 'btn-secondary';
      buttons[0].textContent = 'Abbrechen';
      buttons[0].onclick = closeModal;
      
      buttons[1].className = 'btn-primary';
      buttons[1].textContent = isEdit ? 'Speichern' : 'Erstellen';
      buttons[1].onclick = () => saveTaskForm(formState);
    }
  }

  // Nachdem Modal gerendert wurde, die Container rendern
  setTimeout(() => {
    const formContainer = modal.querySelector('.task-form');
    if (formContainer) {
      renderDeps(formContainer, formState);
      renderItems(formContainer, formState);
      
      // Event-Listener für Buttons im Formular
      const addDepBtn = formContainer.querySelector('.add-dep-btn');
      if (addDepBtn) {
        addDepBtn.onclick = () => {
          const select = formContainer.querySelector('.tf-dep-select');
          if (select && select.value) {
            if (!formState.selectedDeps.includes(select.value)) {
              formState.selectedDeps.push(select.value);
              renderDeps(formContainer, formState);
              // Option aus Select entfernen
              const option = select.querySelector(`option[value="${select.value}"]`);
              if (option) option.remove();
              select.value = '';
            }
          }
        };
      }
      
      const addInvBtn = formContainer.querySelector('.add-inv-btn');
      if (addInvBtn) {
        addInvBtn.onclick = () => {
          const select = formContainer.querySelector('.tf-inv-select');
          if (select && select.value) {
            if (!formState.selectedItems.find(s => s.itemId === select.value)) {
              formState.selectedItems.push({ itemId: select.value, quantity: 1 });
              renderItems(formContainer, formState);
              const option = select.querySelector(`option[value="${select.value}"]`);
              if (option) option.remove();
              select.value = '';
            }
          }
        };
      }
    }
  }, 50);
}

function renderDeps(container, state) {
  const depsContainer = container.querySelector('.dep-chips-container');
  if (!depsContainer) return;
  
  if (state.selectedDeps.length === 0) {
    depsContainer.innerHTML = '<span class="text-muted text-sm">Keine Abhängigkeiten</span>';
    return;
  }
  
  depsContainer.innerHTML = state.selectedDeps.map(id => {
    const dep = Tasks.getById(id);
    return dep ? `<span class="dep-chip">${dep.name}<button class="remove-dep" data-id="${id}">×</button></span>` : '';
  }).join('');
  
  // Event-Listener für Remove-Buttons
  depsContainer.querySelectorAll('.remove-dep').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      state.selectedDeps = state.selectedDeps.filter(d => d !== id);
      renderDeps(container, state);
      // Option wieder zum Select hinzufügen
      const select = container.querySelector('.tf-dep-select');
      if (select) {
        const option = document.createElement('option');
        const dep = Tasks.getById(id);
        if (dep) {
          option.value = id;
          option.textContent = dep.name;
          select.appendChild(option);
        }
      }
    };
  });
}

function renderItems(container, state) {
  const itemsContainer = container.querySelector('.inv-items-container');
  if (!itemsContainer) return;
  
  if (state.selectedItems.length === 0) {
    itemsContainer.innerHTML = '<span class="text-muted text-sm">Keine Items zugewiesen</span>';
    return;
  }
  
  itemsContainer.innerHTML = state.selectedItems.map((si, idx) => {
    const item = Inventory.getById(si.itemId);
    if (!item) return '';
    const enough = item.stock >= si.quantity;
    return `<div class="inv-item-row" style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);">
      <span style="flex:1"><strong>${item.name}</strong> <span class="category-tag">${item.category}</span></span>
      <input class="inv-qty-input" type="number" min="1" value="${si.quantity}" style="width:60px" data-idx="${idx}">
      <span class="text-sm text-muted">${item.unit}</span>
      <span class="text-sm ${enough ? 'text-success' : 'text-danger'}">(${item.stock} verfügbar)</span>
      <button class="btn-ghost btn-sm remove-item" data-idx="${idx}">×</button>
    </div>`;
  }).join('');
  
  // Event-Listener für Quantity-Inputs
  itemsContainer.querySelectorAll('.inv-qty-input').forEach(input => {
    input.onchange = () => {
      const idx = parseInt(input.dataset.idx);
      if (state.selectedItems[idx]) {
        state.selectedItems[idx].quantity = parseInt(input.value) || 1;
      }
    };
  });
  
  // Event-Listener für Remove-Buttons
  itemsContainer.querySelectorAll('.remove-item').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx);
      const removed = state.selectedItems[idx];
      state.selectedItems.splice(idx, 1);
      renderItems(container, state);
      // Option wieder zum Select hinzufügen
      const select = container.querySelector('.tf-inv-select');
      if (select && removed) {
        const item = Inventory.getById(removed.itemId);
        if (item) {
          const option = document.createElement('option');
          option.value = removed.itemId;
          option.textContent = `${item.name} (${item.stock} ${item.unit})`;
          select.appendChild(option);
        }
      }
    };
  });
}

function saveTaskForm(state) {
  // Formular-Elemente finden
  const modal = document.querySelector('#modal-backdrop');
  if (!modal) {
    showToast('Fehler', 'Modal nicht gefunden.', 'danger');
    return;
  }
  
  const formContainer = modal.querySelector('.task-form');
  if (!formContainer) {
    showToast('Fehler', 'Formular nicht gefunden.', 'danger');
    return;
  }
  
  // Werte aus dem Formular lesen
  const name = formContainer.querySelector('.tf-name')?.value?.trim();
  const responsible = formContainer.querySelector('.tf-resp')?.value?.trim();
  const description = formContainer.querySelector('.tf-desc')?.value?.trim();
  const priority = formContainer.querySelector('.tf-prio')?.value;
  const startDate = formContainer.querySelector('.tf-start')?.value;
  const endDate = formContainer.querySelector('.tf-end')?.value;

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
  const taskData = {
    id: state.task?.id || null,
    name, 
    responsible, 
    description, 
    priority, 
    startDate, 
    endDate, 
    dependencies: state.selectedDeps || [], 
    inventoryItems: state.selectedItems || [] 
  };
  
  Tasks.save(taskData);
  
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
  const badge = document.getElementById('notif-count');
  if (!badge) return;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

// ── Event-Listener ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderTaskList();
  updateNavBadge();

  // Filter-Listener
  const searchInput = document.getElementById('filter-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      taskFilter.search = e.target.value;
      renderTaskList();
    });
  }
  
  const prioritySelect = document.getElementById('filter-priority');
  if (prioritySelect) {
    prioritySelect.addEventListener('change', e => {
      taskFilter.priority = e.target.value;
      renderTaskList();
    });
  }
  
  // Button für neue Aufgabe
  const addBtn = document.getElementById('btn-add-task');
  if (addBtn) {
    addBtn.addEventListener('click', openAddTask);
  }
  
  // Store-Change-Listener
  window.addEventListener('storeChange', () => {
    renderTaskList();
    updateNavBadge();
  });
});