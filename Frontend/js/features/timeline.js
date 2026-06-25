/**
 * timeline.js — Kaufplan basierend auf Aufgaben-Timeline
 */

function renderTimeline() {
  const container = document.getElementById('timeline-container');
  if (!container) return;

  const plan = buildPurchasePlan(true); // true = Min-Stock-Alerts einbeziehen

  if (plan.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Kein Kaufbedarf erkannt. Alle Aufgaben sind mit ausreichend Inventar versorgt.</p>
        <button class="btn-primary" onclick="location.href='tasks.html'" style="margin-top:12px">Aufgaben anzeigen</button>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="timeline">${plan.map(entry => {
    const days = daysUntil(entry.date);
    const urg = urgencyClass(entry.date);
    const icons = { urgent: '🔴', soon: '🟡', ok: '🟢', danger: '🔴' };
    const icon = days !== null && days < 0 ? '🔴' : (icons[urg] || '⚪');

    const isMinStock = entry.type === 'min-stock';
    const itemClass = isMinStock ? 'min-stock-entry' : '';

    const itemsHTML = entry.itemsToBuy.map(({ item, needed, currentStock, minStock, reason }) => `
      <div class="timeline-buy-item ${isMinStock ? 'min-stock-item' : ''}">
        <span></span>
        <span><strong>${needed} ${item.unit}</strong> ${item.name} kaufen</span>
        <span class="text-muted" style="margin-left:auto">
          Bestand: ${currentStock} ${item.unit} 
          ${currentStock <= minStock ? '⚠️' : ''}
          ${reason ? `<span class="text-sm text-muted" style="margin-left:4px">(${reason})</span>` : ''}
        </span>
      </div>`).join('');

    const typeBadge = isMinStock 
      ? `<span class="badge badge-danger" style="margin-left:8px">Auffüllen</span>`
      : '';

    return `
      <div class="timeline-item ${itemClass}">
        <div class="timeline-dot ${urg}">${icon}</div>
        <div class="timeline-body">
          <div class="timeline-date">${formatDate(entry.date)} · ${urgencyLabel(entry.date)} ${typeBadge}</div>
          <div class="timeline-title">${entry.task.name}</div>
          <div class="text-sm text-muted"> ${entry.task.responsible}</div>
          ${entry.task.description ? `<div class="text-sm text-muted" style="margin-top:2px">${entry.task.description}</div>` : ''}
          <div class="timeline-items">${itemsHTML}</div>
          <button class="btn-ghost btn-sm" onclick="location.href='inventory.html'" style="margin-top:4px"> Bestand aktualisieren</button>
        </div>
      </div>`;
  }).join('')}</div>`;
}

function renderTimelineStats() {
  const plan = buildPurchasePlan(true);
  const urgent = plan.filter(e => { 
    const d = daysUntil(e.date); 
    return d !== null && d <= 7; 
  }).length;
  
  const totalItems = plan.reduce((s, e) => s + e.itemsToBuy.length, 0);
  const totalQuantity = plan.reduce((s, e) => s + e.itemsToBuy.reduce((acc, item) => acc + item.needed, 0), 0);
  
  // Zähle Items die aufgrund der eisernen Grenze aufgeführt werden
  const minStockItems = plan.filter(e => e.type === 'min-stock');

  const el = document.getElementById('timeline-stats');
  if (!el) return;
  
  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Kaufaufträge</div>
      <div class="stat-value">${plan.length}</div>
      <div class="stat-sub">Aufgaben mit Fehlbestand</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Items zu kaufen</div>
      <div class="stat-value">${totalItems}</div>
      <div class="stat-sub">Verschiedene Artikel</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Gesamtmenge</div>
      <div class="stat-value">${totalQuantity}</div>
      <div class="stat-sub">Einheiten insgesamt</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Dringend</div>
      <div class="stat-value ${urgent > 0 ? 'text-danger' : 'text-success'}">${urgent}</div>
      <div class="stat-sub">Fällig in 7 Tagen</div>
    </div>
    ${minStockItems.length > 0 ? `
      <div class="stat-card" style="border-color:var(--danger)">
        <div class="stat-label">Eiserne Grenze</div>
        <div class="stat-value text-danger">${minStockItems.length}</div>
        <div class="stat-sub">Items unter der Grenze</div>
      </div>
    ` : ''}
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  renderTimelineStats();
  renderTimeline();
  updateNavBadge();
  window.addEventListener('storeChange', () => { 
    renderTimeline(); 
    renderTimelineStats(); 
  });
});

function updateNavBadge() {
  const count = Inventory.getAlerts().length;
  const badge = document.getElementById('notif-count');
  if (!badge) return;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}