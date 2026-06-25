/**
 * timeline.js — Kaufplan basierend auf Aufgaben-Timeline
 */

function renderTimeline() {
  const container = qs('#timeline-container');
  if (!container) return;

  const plan = buildPurchasePlan();

  if (plan.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ✅
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

    const itemsHTML = entry.itemsToBuy.map(({ item, needed, currentStock, minStock }) => `
      <div class="timeline-buy-item">
        <span>📦</span>
        <span><strong>${needed} ${item.unit}</strong> ${item.name} kaufen</span>
        <span class="text-muted" style="margin-left:auto">Bestand: ${currentStock} ${item.unit} ${currentStock <= minStock ? '⚠️' : ''}</span>
      </div>`).join('');

    return `
      <div class="timeline-item">
        <div class="timeline-dot ${urg}">${icon}</div>
        <div class="timeline-body">
          <div class="timeline-date">${formatDate(entry.date)} · ${urgencyLabel(entry.date)}</div>
          <div class="timeline-title">${entry.task.name}</div>
          <div class="text-sm text-muted">👤 ${entry.task.responsible}</div>
          ${entry.task.description ? `<div class="text-sm text-muted" style="margin-top:2px">${entry.task.description}</div>` : ''}
          <div class="timeline-items">${itemsHTML}</div>
          <button class="btn-ghost btn-sm" onclick="location.href='inventory.html'" style="margin-top:4px">📦 Bestand aktualisieren</button>
        </div>
      </div>`;
  }).join('')}</div>`;
}

function renderTimelineStats() {
  const plan = buildPurchasePlan();
  const urgent = plan.filter(e => { const d = daysUntil(e.date); return d !== null && d <= 7; }).length;
  const total = plan.reduce((s, e) => s + e.itemsToBuy.length, 0);
  const totalItems = plan.reduce((s, e) => s + e.itemsToBuy.reduce((acc, item) => acc + item.needed, 0), 0);

  const el = qs('#timeline-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Kaufaufträge</div>
      <div class="stat-value">${plan.length}</div>
      <div class="stat-sub">Aufgaben mit Fehlbestand</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Items zu kaufen</div>
      <div class="stat-value">${total}</div>
      <div class="stat-sub">Verschiedene Artikel</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Gesamtmenge</div>
      <div class="stat-value">${totalItems}</div>
      <div class="stat-sub">Einheiten insgesamt</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Dringend</div>
      <div class="stat-value ${urgent > 0 ? 'text-danger' : 'text-success'}">${urgent}</div>
      <div class="stat-sub">Fällig in 7 Tagen</div>
    </div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  renderTimelineStats();
  renderTimeline();
  updateNavBadge();
  window.addEventListener('storeChange', () => { renderTimeline(); renderTimelineStats(); });
});

function updateNavBadge() {
  const count = Inventory.getAlerts().length;
  const badge = qs('#notif-count');
  if (!badge) return;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}