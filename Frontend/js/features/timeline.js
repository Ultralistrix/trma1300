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

// ── Tab-Switching ─────────────────────────────────────────────────────────────

function switchTab(tab) {
  ['kaufplan', 'monat', 'history'].forEach(t => {
    const view = document.getElementById(`view-${t}`);
    const btn = document.getElementById(`tab-${t}`);
    if (view) view.style.display = t === tab ? '' : 'none';
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (tab === 'monat') renderMonthlyForecast();
  if (tab === 'history') renderCompletionHistory();
}

// ── Monatliche Verbrauchsvorhersage ───────────────────────────────────────────

function renderMonthlyForecast() {
  const container = document.getElementById('monthly-container');
  if (!container) return;

  const forecast = buildMonthlyForecast();

  if (forecast.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>Keine Aufgaben mit Inventarbedarf vorhanden.</p></div>`;
    return;
  }

  const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

  container.innerHTML = forecast.map(({ month, consumed, reusable, totalConsumed, totalReusable }) => {
    const [year, monthNum] = month.split('-');
    const monthLabel = `${monthNames[parseInt(monthNum) - 1]} ${year}`;

    const consumedHTML = consumed.length === 0
      ? '<span class="text-muted text-sm">Kein Verbrauch</span>'
      : consumed.map(({ item, quantity }) => `
          <div class="monthly-item">
            <span class="monthly-item-name">${item.name}</span>
            <span class="category-tag">${item.category}</span>
            <span class="monthly-item-qty text-danger">−${quantity} ${item.unit}</span>
          </div>`).join('');

    const reusableHTML = reusable.length === 0
      ? '<span class="text-muted text-sm">Keine</span>'
      : reusable.map(({ item, quantity }) => `
          <div class="monthly-item">
            <span class="monthly-item-name">${item.name}</span>
            <span class="category-tag">${item.category}</span>
            <span class="monthly-item-qty" style="color:var(--accent)">↺ ${quantity} ${item.unit}</span>
          </div>`).join('');

    return `
      <div class="monthly-card">
        <div class="monthly-card-header">
          <h3>${monthLabel}</h3>
          <div class="flex gap-2">
            ${totalConsumed > 0 ? `<span class="badge badge-danger">−${totalConsumed} verbraucht</span>` : ''}
            ${totalReusable > 0 ? `<span class="badge badge-info">↺ ${totalReusable} verwendet</span>` : ''}
          </div>
        </div>
        <div class="monthly-card-body">
          <div class="monthly-section">
            <div class="monthly-section-label">Verbrauch (nicht wiederverwendbar)</div>
            ${consumedHTML}
          </div>
          <div class="monthly-section">
            <div class="monthly-section-label">Verwendet (wird zurückgegeben)</div>
            ${reusableHTML}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Verbrauchshistorie ────────────────────────────────────────────────────────

function renderCompletionHistory() {
  const container = document.getElementById('history-container');
  if (!container) return;

  const log = CompletionLog.getLastN(50);

  if (log.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>Noch keine abgeschlossenen Aufgaben. Schließe Aufgaben ab, um hier den Verbrauch zu sehen.</p></div>`;
    return;
  }

  container.innerHTML = log.map(entry => {
    const date = new Date(entry.loggedAt).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const consumedHTML = entry.consumedItems?.length > 0
      ? entry.consumedItems.map(ci => `
          <div class="timeline-buy-item">
            <span>−</span>
            <span><strong>${ci.quantity} ${ci.unit}</strong> ${ci.itemName}</span>
          </div>`).join('')
      : '<span class="text-muted text-sm">Keine verbrauchbaren Items</span>';

    return `
      <div class="history-entry">
        <div class="history-entry-header">
          <strong>${entry.taskName}</strong>
          <span class="text-muted text-sm">${date}</span>
        </div>
        <div class="text-sm text-muted" style="margin:4px 0">${entry.responsible || ''}</div>
        <div class="timeline-items">${consumedHTML}</div>
      </div>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderTimelineStats();
  renderTimeline();
  updateNavBadge();
  window.addEventListener('storeChange', () => {
    renderTimeline();
    renderTimelineStats();
    const monatView = document.getElementById('view-monat');
    if (monatView && monatView.style.display !== 'none') renderMonthlyForecast();
    const historyView = document.getElementById('view-history');
    if (historyView && historyView.style.display !== 'none') renderCompletionHistory();
  });
});

function updateNavBadge() {
  const count = Inventory.getAlerts().length;
  const badge = document.getElementById('notif-count');
  if (!badge) return;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}