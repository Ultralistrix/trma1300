/**
 * inventory.js — Inventarliste, Formulare, Grenzprüfung
 */

let currentFilter = { search: '', category: '' };

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
  const filtered = all.filter(item => {
    const matchSearch = !currentFilter.search ||
      item.name.toLowerCase().includes(currentFilter.search.toLowerCase());
    const matchCat = !currentFilter.category || item.category === currentFilter.category;
    return matchSearch && matchCat;
  });

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
          <button class="btn-ghost btn-sm" onclick="openEditItem('${item.id}')">Bearbeiten</button>
          <button class="btn-ghost btn-sm text-danger" onclick="deleteItem('${item.id}')">Löschen</button>
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
      <h3>🚨 ${alerts.length} Item${alerts.length > 1 ? 's' : ''} unter eiserner Grenze</h3>
      <div class="alert-list">
        ${alerts.map(i => `
          <div class="alert-list-item">
            <span>⬤</span>
            <span><strong>${i.name}</strong> — Bestand: <strong class="text-danger">${i.stock} ${i.unit}</strong>, Grenze: ${i.minStock} ${i.unit}</span>
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

// ── Formular für neues/editiertes Item ───────────────────────────────────────

function openAddItem() {
  openItemForm(null);
}

function openEditItem(id) {
  openItemForm(Inventory.getById(id));
}

function openItemForm(item) {
  const cats = Categories.getAll();
  const isEdit = !!item;
  const title = isEdit ? 'Item bearbeiten' : 'Neues Item';
  const bodyHTML = `
    <div class="form-group">
      <label>Name</label>
      <input id="f-name" type="text" value="${item?.name || ''}" placeholder="z. B. Bandagen">
    </div>
    <div class="form-group">
      <label>Kategorie</label>
      <select id="f-category">
        ${cats.map(c => `<option value="${c}" ${item?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label>Bestand</label>
        <input id="f-stock" type="number" min="0" value="${item?.stock ?? 0}">
      </div>
      <div class="form-group">
        <label>Eiserne Grenze</label>
        <input id="f-minstock" type="number" min="0" value="${item?.minStock ?? 0}">
      </div>
    </div>
    <div class="form-group">
      <label>Einheit (z. B. Stk, L, kg)</label>
      <input id="f-unit" type="text" value="${item?.unit || 'Stk'}">
    </div>
    <div class="form-group" style="flex-direction:row;align-items:center;gap:10px">
      <input id="f-reusable" type="checkbox" style="width:auto" ${item?.reusable ? 'checked' : ''}>
      <label for="f-reusable" style="margin:0;cursor:pointer">Wiederverwendbar</label>
    </div>`;

  const { footer } = openModal(title, bodyHTML, [
    el('button', { class: 'btn-secondary', onclick: closeModal }, 'Abbrechen'),
    el('button', { class: 'btn-primary', onclick: () => saveItemForm(item?.id) }, isEdit ? 'Speichern' : 'Hinzufügen'),
  ]);
}

function saveItemForm(existingId) {
  const name = qs('#f-name')?.value.trim();
  const category = qs('#f-category')?.value;
  const stock = parseInt(qs('#f-stock')?.value) || 0;
  const minStock = parseInt(qs('#f-minstock')?.value) || 0;
  const unit = qs('#f-unit')?.value.trim() || 'Stk';
  const reusable = qs('#f-reusable')?.checked || false;

  if (!name) { showToast('Fehler', 'Name darf nicht leer sein.', 'danger'); return; }

  Inventory.save({ id: existingId, name, category, stock, minStock, unit, reusable });
  closeModal();
  renderAll();
  showToast('Gespeichert', `"${name}" wurde gespeichert.`, 'success');

  if (stock <= minStock) {
    showToast('⚠️ Eiserne Grenze', `"${name}" liegt unter der eisernen Grenze (${minStock} ${unit}).`, 'danger', 6000);
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
