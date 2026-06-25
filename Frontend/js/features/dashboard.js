/**
 * dashboard.js — Übersichtsseite
 */

function renderDashboard() {
  const tasks = Tasks.getSorted();
  const inv = Inventory.getAll();
  const alerts = Inventory.getAlerts();
  const plan = buildPurchasePlan();

  // Stats
  qs('#stat-tasks').textContent = tasks.length;
  qs('#stat-inv').textContent = inv.length;
  qs('#stat-alerts').textContent = alerts.length;
  qs('#stat-buys').textContent = plan.length;

  // Alert banner
  const alertBanner = qs('#dash-alert-banner');
  if (alertBanner) {
    if (alerts.length === 0) { alertBanner.style.display = 'none'; }
    else {
      alertBanner.style.display = '';
      alertBanner.innerHTML = `
        <div class="alert-panel">
          <h3> ${alerts.length} Item${alerts.length > 1 ? 's unter eiserner Grenze' : ' unter eiserner Grenze'}</h3>
          <div class="alert-list">
            ${alerts.map(i => `
              <div class="alert-list-item">
                <span>⬤</span>
                <span><strong>${i.name}</strong> — Bestand <strong class="text-danger">${i.stock}</strong> / Grenze ${i.minStock} ${i.unit}</span>
                <button class="btn-ghost btn-sm" onclick="location.href='inventory.html'" style="margin-left:auto;font-size:11px">→ Bestand aktualisieren</button>
              </div>`).join('')}
          </div>
        </div>`;
    }
  }

  // Nächste Aufgaben
  const upcomingContainer = qs('#dash-upcoming');
  if (upcomingContainer) {
    const upcoming = tasks.filter(t => t.endDate).slice(0, 4);
    if (upcoming.length === 0) {
      upcomingContainer.innerHTML = `<div class="empty-state"><p>Keine Aufgaben vorhanden.</p></div>`;
    } else {
      upcomingContainer.innerHTML = upcoming.map(task => {
        const days = daysUntil(task.endDate);
        const overdue = days !== null && days < 0;
        const hasShortage = task.inventoryItems.some(({ itemId, quantity }) => {
          const item = Inventory.getById(itemId);
          return item && item.stock < quantity;
        });
        return `
          <div class="task-card priority-${task.priority}" onclick="location.href='tasks.html'" style="cursor:pointer">
            <div class="task-card-header">
              <span class="task-card-title">${task.name}</span>
              <div class="flex gap-2">
                ${hasShortage ? `<span class="badge badge-danger">⚠</span>` : ''}
                <span class="badge badge-${task.priority === 'hoch' ? 'danger' : task.priority === 'mittel' ? 'warn' : 'ok'}">${task.priority}</span>
              </div>
            </div>
            <div class="task-card-meta">
              <span class="text-muted text-sm"> ${task.responsible}</span><br>
              <span class="text-muted text-sm"> ${formatDate(task.endDate)}</span>
              ${overdue ? `<span class="badge badge-danger">Überfällig</span>` : ''}
            </div>
          </div>`;
      }).join('');
    }
  }

  // Kaufplan-Vorschau
  const buyContainer = qs('#dash-buys');
  if (buyContainer) {
    const urgent = plan.filter(e => { const d = daysUntil(e.date); return d !== null && d <= 14; }).slice(0, 4);
    if (urgent.length === 0) {
      buyContainer.innerHTML = `<div class="empty-state">✅<p>Kein dringender Kaufbedarf.</p></div>`;
    } else {
      buyContainer.innerHTML = urgent.map(entry => `
        <div class="card" style="margin-bottom:10px;padding:12px">
          <div class="flex justify-between items-center">
            <strong>${entry.task.name}</strong>
            <span class="text-sm text-muted">${urgencyLabel(entry.date)}</span>
          </div>
          <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px">
            ${entry.itemsToBuy.map(({ item, needed }) => `
              <div class="timeline-buy-item">
                <span></span>
                <span><strong>${needed} ${item.unit}</strong> ${item.name}</span>
              </div>`).join('')}
          </div>
          <button class="btn-ghost btn-sm" onclick="location.href='inventory.html'" style="margin-top:6px">Bestand prüfen</button>
        </div>`).join('');
    }
  }

  updateNavBadge();
}

function updateNavBadge() {
  const count = Inventory.getAlerts().length;
  const badge = qs('#notif-count');
  if (!badge) return;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  window.addEventListener('storeChange', renderDashboard);
});