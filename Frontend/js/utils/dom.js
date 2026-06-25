/**
 * dom.js — kleine Helferfunktionen für DOM-Operationen
 */

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const child of children) {
    if (child == null) continue;
    e.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return e;
}

function qs(selector, parent = document) { return parent.querySelector(selector); }
function qsa(selector, parent = document) { return [...parent.querySelectorAll(selector)]; }

function setHTML(selector, html, parent = document) {
  const node = qs(selector, parent);
  if (node) node.innerHTML = html;
}

function show(el) { if (el) el.style.display = ''; }
function hide(el) { if (el) el.style.display = 'none'; }

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(title, msg = '', type = 'info', duration = 4000) {
  let container = qs('#toast-container');
  if (!container) {
    container = el('div', { id: 'toast-container' });
    document.body.appendChild(container);
  }
  const icons = { info: 'ℹ️', success: '✅', danger: '🚨', warning: '⚠️' };
  const toast = el('div', { class: `toast ${type}` },
    el('span', { class: 'toast-icon' }, icons[type] || 'ℹ️'),
    el('div', { class: 'toast-body' },
      el('div', { class: 'toast-title' }, title),
      msg ? el('div', { class: 'toast-msg' }, msg) : null
    )
  );
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function openModal(title, bodyHTML, footerButtons = []) {
  closeModal();
  const footer = el('div', { class: 'modal-footer' }, ...footerButtons);
  const modal = el('div', { class: 'modal' },
    el('div', { class: 'modal-header' },
      el('h2', {}, title),
      el('button', { class: 'modal-close', onclick: closeModal }, '×')
    ),
    el('div', { class: 'modal-body', innerHTML: bodyHTML || '' }),
    footer
  );
  const backdrop = el('div', { class: 'modal-backdrop', id: 'modal-backdrop' }, modal);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
  document.body.appendChild(backdrop);
  return { modal, footer };
}

function closeModal() {
  const b = qs('#modal-backdrop');
  if (b) b.remove();
}

function getModalBody() { return qs('#modal-backdrop .modal-body'); }

// ── Datum ─────────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr + 'T00:00:00') - new Date();
  return Math.ceil(diff / 86400000);
}

function urgencyClass(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return '';
  if (d < 0) return 'danger';
  if (d <= 7) return 'urgent';
  if (d <= 14) return 'soon';
  return 'ok';
}

function urgencyLabel(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return '';
  if (d < 0) return `${Math.abs(d)} Tage überfällig`;
  if (d === 0) return 'Heute';
  if (d === 1) return 'Morgen';
  return `in ${d} Tagen`;
}
