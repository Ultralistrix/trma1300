/**
 * store.js — zentraler Datenspeicher via localStorage
 * Alle Features lesen/schreiben nur über diesen Store.
 */

const KEYS = {
  inventory: 'lv_inventory',
  tasks: 'lv_tasks',
  categories: 'lv_categories',
};

// ── Standarddaten beim ersten Start ──────────────────────────────────────────

const DEFAULT_CATEGORIES = ['Sanitär', 'Werkzeug', 'Elektronik', 'Sicherheit', 'Verbrauchsmaterial'];

const DEFAULT_INVENTORY = [
  { id: 'i1', name: 'Bandagen', category: 'Sanitär', reusable: false, stock: 100, minStock: 20, unit: 'Stk' },
  { id: 'i2', name: 'Schraubenzieher Set', category: 'Werkzeug', reusable: true, stock: 5, minStock: 2, unit: 'Set' },
  { id: 'i3', name: 'Schutzhandschuhe', category: 'Sicherheit', reusable: false, stock: 30, minStock: 10, unit: 'Paar' },
  { id: 'i4', name: 'Kabel 10m', category: 'Elektronik', reusable: true, stock: 8, minStock: 3, unit: 'Stk' },
  { id: 'i5', name: 'Desinfektionsmittel', category: 'Sanitär', reusable: false, stock: 15, minStock: 20, unit: 'L' },
];

const DEFAULT_TASKS = [
  {
    id: 't1',
    name: 'Erste-Hilfe-Station aufbauen',
    responsible: 'Anna Müller',
    description: 'Aufbau der Erste-Hilfe-Station im Lagerbereich Ost.',
    priority: 'hoch',
    startDate: '2025-01-10',
    endDate: '2025-01-15',
    dependencies: [],
    inventoryItems: [{ itemId: 'i1', quantity: 50 }, { itemId: 'i3', quantity: 10 }],
  },
  {
    id: 't2',
    name: 'Werkzeugkammer einrichten',
    responsible: 'Ben Schmidt',
    description: 'Werkzeuge katalogisieren und Kammer einrichten.',
    priority: 'mittel',
    startDate: '2025-01-12',
    endDate: '2025-01-20',
    dependencies: ['t1'],
    inventoryItems: [{ itemId: 'i2', quantity: 2 }],
  },
  {
    id: 't3',
    name: 'Elektrische Verkabelung',
    responsible: 'Clara Weber',
    description: 'Kabel verlegen für neues Lagerfeld.',
    priority: 'hoch',
    startDate: '2025-01-18',
    endDate: '2025-01-25',
    dependencies: ['t2'],
    inventoryItems: [{ itemId: 'i4', quantity: 5 }],
  },
  {
    id: 't4',
    name: 'Hygienekontrolle',
    responsible: 'David Klein',
    description: 'Regelmäßige Desinfektion aller Arbeitsbereiche.',
    priority: 'niedrig',
    startDate: '2025-01-22',
    endDate: '2025-02-01',
    dependencies: [],
    inventoryItems: [{ itemId: 'i5', quantity: 10 }, { itemId: 'i1', quantity: 20 }],
  },
];

// ── Initialisierung ───────────────────────────────────────────────────────────

function init() {
  if (!localStorage.getItem(KEYS.categories)) {
    localStorage.setItem(KEYS.categories, JSON.stringify(DEFAULT_CATEGORIES));
  }
  if (!localStorage.getItem(KEYS.inventory)) {
    localStorage.setItem(KEYS.inventory, JSON.stringify(DEFAULT_INVENTORY));
  }
  if (!localStorage.getItem(KEYS.tasks)) {
    localStorage.setItem(KEYS.tasks, JSON.stringify(DEFAULT_TASKS));
  }
}

// ── Generische Helfer ─────────────────────────────────────────────────────────

function getAll(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function saveAll(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('storeChange', { detail: { key } }));
}
function genId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// ── Inventar API ──────────────────────────────────────────────────────────────

const Inventory = {
  getAll() { return getAll(KEYS.inventory); },
  getById(id) { return this.getAll().find(i => i.id === id); },
  save(item) {
    const all = this.getAll();
    const idx = all.findIndex(i => i.id === item.id);
    if (idx >= 0) all[idx] = item;
    else all.push({ ...item, id: genId('i') });
    saveAll(KEYS.inventory, all);
  },
  delete(id) {
    saveAll(KEYS.inventory, this.getAll().filter(i => i.id !== id));
  },
  // Bestand nach Aufgabe anpassen (verbrauchbar → abziehen, wiederverwendbar → zurück)
  applyTaskConsumption(taskId, restore = false) {
    const task = Tasks.getById(taskId);
    if (!task) return;
    task.inventoryItems.forEach(({ itemId, quantity }) => {
      const item = this.getById(itemId);
      if (!item) return;
      if (!item.reusable) {
        item.stock = restore ? item.stock + quantity : Math.max(0, item.stock - quantity);
        this.save(item);
      }
    });
  },
  // Gibt alle Items zurück die unter eiserne Grenze gefallen sind
  getAlerts() {
    return this.getAll().filter(i => i.stock <= i.minStock);
  },
};

// ── Aufgaben API ──────────────────────────────────────────────────────────────

const Tasks = {
  getAll() { return getAll(KEYS.tasks); },
  getById(id) { return this.getAll().find(t => t.id === id); },
  save(task) {
    const all = this.getAll();
    const idx = all.findIndex(t => t.id === task.id);
    if (idx >= 0) all[idx] = task;
    else all.push({ ...task, id: genId('t') });
    saveAll(KEYS.tasks, all);
  },
  delete(id) {
    // Abhängigkeiten aus anderen Tasks entfernen
    const all = this.getAll()
      .filter(t => t.id !== id)
      .map(t => ({ ...t, dependencies: t.dependencies.filter(d => d !== id) }));
    saveAll(KEYS.tasks, all);
  },
  // Gibt Tasks sortiert nach Startdatum zurück
  getSorted() {
    return this.getAll().slice().sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  },
};

// ── Kategorien API ────────────────────────────────────────────────────────────

const Categories = {
  getAll() { return getAll(KEYS.categories); },
  add(name) {
    const all = this.getAll();
    if (!all.includes(name)) { all.push(name); saveAll(KEYS.categories, all); }
  },
  delete(name) {
    saveAll(KEYS.categories, this.getAll().filter(c => c !== name));
  },
};

// ── Kaufplan-Logik ────────────────────────────────────────────────────────────

function buildPurchasePlan() {
  const tasks = Tasks.getSorted();
  const plan = []; // { task, date, itemsToBuy: [{item, needed, currentStock}] }

  tasks.forEach(task => {
    const itemsToBuy = [];
    task.inventoryItems.forEach(({ itemId, quantity }) => {
      const item = Inventory.getById(itemId);
      if (!item) return;
      const available = item.reusable ? item.stock : item.stock;
      if (available < quantity) {
        itemsToBuy.push({ item, needed: quantity - available, currentStock: item.stock });
      }
    });
    if (itemsToBuy.length > 0) {
      plan.push({ task, date: task.startDate, itemsToBuy });
    }
  });

  return plan;
}

// Initialisierung beim Laden
init();
