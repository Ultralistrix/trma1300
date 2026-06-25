/**
 * inventory.js — Inventarliste, Formulare, Grenzprüfung
 */

let currentFilter = { search: '', category: '' };
let selectedItemId = null;

function getStockStatus(item) {
  if (item.stock <= item.minStock) return 'danger';
  if (item.stock <= item.minStock * 1.5) return 'warn';
  return 'ok';
}

function stockBarHTML(item) {
  const max = Math.max(item.stock, item.minStock) * 1.5 || 1;
  const pct = Math.min(100, (item.stock / max) * 100);
  const status = getStockStatus(item);
  return `
    <div class="stock-bar">
      <div class="stock-bar-track">
        <div class="stock-bar-fill ${status}" style="width:${pct}%"></div>
      </div>
      <span class="stock-bar-value">${item.stock}</span>
    </div>`;
}

function stockBadgeHTML(item) {
  const status = getStockStatus(item);
  const labels = { ok: 'OK', warn: 'Niedrig', danger: 'Kritisch' };
  const cls = { ok: 'badge-ok', warn: 'badge-warn', danger: 'badge-danger' };
  return `<span class="badge ${cls[status]}">${labels[status]}</span>`;
}

function renderInventoryTable() {
  const all = Inventory.getAll();
  let filtered = all;
  
  if (currentFilter.search) {
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(currentFilter.search.toLowerCase())
    );
  }
  if (currentFilter.category) {
    filtered = filtered.filter(item => item.category === currentFilter.category);
  }

  const tbody = qs('#inv-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:40px">Keine Einträge gefunden</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr>
      <td><strong>${item.name}</strong></td>
      <td><span class="category-tag">${item.category}</span></td>
      <td>
        <span class="reusable-dot ${item.reusable ? 'yes' : 'no'}"></span>
        ${item.reusable ? 'Ja' : 'Nein'}
      </td>
      <td>${stockBarHTML(item)}</td>
      <td class="font-mono" style="color:var(--text3)">${item.minStock} ${item.unit}</td>
      <td>${stockBadgeHTML(item)}</td>
      <td>
        <div class="flex gap-2">
          <button class="btn-ghost btn-sm" onclick="openEditItem('${item.id}')"> Bearbeiten</button>
          <button class="btn-ghost btn-sm" onclick="quickUpdateStock('${item.id}')"> Bestand</button>
          <button class="btn-ghost btn-sm text-danger" onclick="deleteItem('${item.id}')"></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderCategoryFilter() {
  const sel = qs('#filter-category');
  if (!sel) return;
  const cats = Categories.getAll();
  sel.innerHTML = `<option value="">Alle Kategorien</option>` +
    cats.map(c => `<option value="${c}" ${currentFilter.category === c ? 'selected' : ''}>${c}</option>`).join('');
}

function renderAlertBanner() {
  const alerts = Inventory.getAlerts();
  const banner = qs('#alert-banner');
  if (!banner) return;
  if (alerts.length === 0) { banner.style.display = 'none'; return; }
  banner.style.display = '';
  banner.innerHTML = `
    <div class="alert-panel">
      <h3> ${alerts.length} Item${alerts.length > 1 ? 's' : ''} unter eiserner Grenze</h3>
      <div class="alert-list">
        ${alerts.map(i => `
          <div class="alert-list-item">
            <span>⬤</span>
            <span><strong>${i.name}</strong> — Bestand: <strong class="text-danger">${i.stock} ${i.unit}</strong>, Grenze: ${i.minStock} ${i.unit}</span>
            <button class="btn-ghost btn-sm" onclick="quickUpdateStock('${i.id}')" style="margin-left:auto">Bestand aktualisieren</button>
          </div>`).join('')}
      </div>
    </div>`;
}

function updateNavBadge() {
  const count = Inventory.getAlerts().length;
  const badge = qs('#notif-count');
  if (!badge) return;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

// ── Quick Stock Update ───────────────────────────────────────────────────────

function quickUpdateStock(id) {
  const item = Inventory.getById(id);
  if (!item) return;
  
  const bodyHTML = `
    <div class="form-group">
      <label>${item.name}</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:11px">Aktueller Bestand</label>
          <div style="font-size:20px;font-weight:600">${item.stock} ${item.unit}</div>
        </div>
        <div class="form-group">
          <label>Neuer Bestand</label>
          <input type="number" id="q-stock" min="0" value="${item.stock}">
        </div>
      </div>
      ${item.minStock > 0 ? `<div style="margin-top:8px;font-size:12px;color:var(--text3)">Eiserne Grenze: ${item.minStock} ${item.unit}</div>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
      <button class="btn-secondary" onclick="window._adjustStock('${id}', -1)">−1</button>
      <button class="btn-secondary" onclick="window._adjustStock('${id}', 1)">+1</button>
      <button class="btn-secondary" onclick="window._adjustStock('${id}', -10)">−10</button>
      <button class="btn-secondary" onclick="window._adjustStock('${id}', 10)">+10</button>
    </div>`;

  window._adjustStock = (itemId, amount) => {
    const input = qs('#q-stock');
    if (input) {
      const val = parseInt(input.value) || 0;
      input.value = Math.max(0, val + amount);
    }
  };

  openModal('Bestand aktualisieren', bodyHTML, [
    el('button', { class: 'btn-secondary', onclick: closeModal }, 'Abbrechen'),
    el('button', { class: 'btn-primary', onclick: () => {
      const val = parseInt(qs('#q-stock')?.value) || 0;
      Inventory.updateStock(id, val);
      closeModal();
      renderAll();
      showToast('Bestand aktualisiert', `${item.name}: ${val} ${item.unit}`, 'success');
    }}, 'Speichern')
  ]);
}

// ── Formular für neues/editiertes Item ──────────────────────────────────────

function openAddItem() {
  openItemForm(null);
}

function openEditItem(id) {
  selectedItemId = id;
  openItemForm(Inventory.getById(id));
}

function openItemForm(item) {
  const cats = Categories.getAll();
  const isEdit = !!item;
  const title = isEdit ? 'Item bearbeiten' : 'Neues Item';
  const bodyHTML = `
    <div class="form-group">
      <label>Name *</label>
      <input id="f-name" type="text" value="${item?.name || ''}" placeholder="z. B. Bandagen">
    </div>
    <div class="form-group">
      <label>Kategorie *</label>
      <div style="display:flex;gap:8px">
        <select id="f-category" style="flex:1">
          ${cats.map(c => `<option value="${c}" ${item?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <button class="btn-ghost btn-sm" onclick="addNewCategory()" title="Neue Kategorie">+</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div class="form-group">
        <label>Bestand</label>
        <input id="f-stock" type="number" min="0" value="${item?.stock ?? 0}">
      </div>
      <div class="form-group">
        <label>Eiserne Grenze</label>
        <input id="f-minstock" type="number" min="0" value="${item?.minStock ?? 0}">
      </div>
      <div class="form-group">
        <label>Einheit</label>
        <input id="f-unit" type="text" value="${item?.unit || 'Stk'}" placeholder="Stk, L, kg...">
      </div>
    </div>
    <div class="form-group" style="flex-direction:row;align-items:center;gap:10px">
      <input id="f-reusable" type="checkbox" style="width:auto" ${item?.reusable ? 'checked' : ''}>
      <label for="f-reusable" style="margin:0;cursor:pointer">Wiederverwendbar</label>
    </div>`;

  openModal(title, bodyHTML, [
    el('button', { class: 'btn-secondary', onclick: closeModal }, 'Abbrechen'),
    el('button', { class: 'btn-primary', onclick: () => saveItemForm(item?.id) }, isEdit ? 'Speichern' : 'Hinzufügen'),
  ]);
}

function addNewCategory() {
  const name = prompt('Neue Kategorie eingeben:');
  if (name && name.trim()) {
    Categories.add(name.trim());
    renderCategoryFilter();
    const select = qs('#f-category');
    if (select) {
      select.value = name.trim();
    }
    showToast('Kategorie hinzugefügt', `"${name.trim()}"`, 'success');
  }
}

function saveItemForm(existingId) {
  const name = qs('#f-name')?.value.trim();
  const category = qs('#f-category')?.value;
  const stock = parseInt(qs('#f-stock')?.value) || 0;
  const minStock = parseInt(qs('#f-minstock')?.value) || 0;
  const unit = qs('#f-unit')?.value.trim() || 'Stk';
  const reusable = qs('#f-reusable')?.checked || false;

  if (!name) { showToast('Fehler', 'Name darf nicht leer sein.', 'danger'); return; }
  if (!category) { showToast('Fehler', 'Bitte wähle eine Kategorie.', 'danger'); return; }

  Inventory.save({ id: existingId, name, category, stock, minStock, unit, reusable });
  closeModal();
  renderAll();
  showToast('Gespeichert', `"${name}" wurde gespeichert.`, 'success');

  if (stock <= minStock) {
    showToast('Eiserne Grenze', `"${name}" liegt unter der eisernen Grenze (${minStock} ${unit}).`, 'danger', 6000);
  }
}

function deleteItem(id) {
  const item = Inventory.getById(id);
  if (!item) return;
  if (!confirm(`"${item.name}" wirklich löschen?`)) return;
  Inventory.delete(id);
  renderAll();
  showToast('Gelöscht', `"${item.name}" wurde entfernt.`, 'info');
}

function renderAll() {
  renderCategoryFilter();
  renderInventoryTable();
  renderAlertBanner();
  updateNavBadge();
}

// ── Event-Listener ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderAll();

  qs('#filter-search')?.addEventListener('input', e => {
    currentFilter.search = e.target.value;
    renderInventoryTable();
  });

  qs('#filter-category')?.addEventListener('change', e => {
    currentFilter.category = e.target.value;
    renderInventoryTable();
  });

  qs('#btn-add-item')?.addEventListener('click', openAddItem);

  window.addEventListener('storeChange', () => renderAll());
});