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
    startDate: '2026-07-01',
    endDate: '2026-07-15',
    dependencies: [],
    inventoryItems: [{ itemId: 'i1', quantity: 50 }, { itemId: 'i3', quantity: 10 }],
  },
  {
    id: 't2',
    name: 'Werkzeugkammer einrichten',
    responsible: 'Ben Schmidt',
    description: 'Werkzeuge katalogisieren und Kammer einrichten.',
    priority: 'mittel',
    startDate: '2026-07-12',
    endDate: '2026-07-20',
    dependencies: ['t1'],
    inventoryItems: [{ itemId: 'i2', quantity: 2 }],
  },
  {
    id: 't3',
    name: 'Elektrische Verkabelung',
    responsible: 'Clara Weber',
    description: 'Kabel verlegen für neues Lagerfeld.',
    priority: 'hoch',
    startDate: '2026-07-18',
    endDate: '2026-07-25',
    dependencies: ['t2'],
    inventoryItems: [{ itemId: 'i4', quantity: 5 }],
  },
  {
    id: 't4',
    name: 'Hygienekontrolle',
    responsible: 'David Klein',
    description: 'Regelmäßige Desinfektion aller Arbeitsbereiche.',
    priority: 'niedrig',
    startDate: '2026-07-22',
    endDate: '2026-08-01',
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
  updateStock(id, newStock) {
    const item = this.getById(id);
    if (item) {
      item.stock = Math.max(0, newStock);
      this.save(item);
      return true;
    }
    return false;
  },
  isBelowMin(id) {
    const item = this.getById(id);
    return item ? item.stock <= item.minStock : false;
  },
  getAlerts() {
    return this.getAll().filter(i => i.stock <= i.minStock);
  },
  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();
    return this.getAll().filter(i => 
      i.name.toLowerCase().includes(q) || 
      i.category.toLowerCase().includes(q)
    );
  },
  getByCategory(category) {
    if (!category) return this.getAll();
    return this.getAll().filter(i => i.category === category);
  }
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
    const all = this.getAll()
      .filter(t => t.id !== id)
      .map(t => ({ ...t, dependencies: t.dependencies.filter(d => d !== id) }));
    saveAll(KEYS.tasks, all);
  },
  getSorted() {
    return this.getAll().slice().sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  },
  getByPriority(priority) {
    if (!priority) return this.getAll();
    return this.getAll().filter(t => t.priority === priority);
  },
  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();
    return this.getAll().filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.responsible.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  },
  getOverdue() {
    const today = new Date();
    return this.getAll().filter(t => {
      const end = new Date(t.endDate);
      return end < today;
    });
  },
  getUpcoming(days = 7) {
    const today = new Date();
    const future = new Date(today);
    future.setDate(future.getDate() + days);
    return this.getAll().filter(t => {
      const start = new Date(t.startDate);
      return start >= today && start <= future;
    });
  }
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
  rename(oldName, newName) {
    const all = this.getAll();
    const idx = all.indexOf(oldName);
    if (idx !== -1 && !all.includes(newName)) {
      all[idx] = newName;
      saveAll(KEYS.categories, all);
      const items = Inventory.getAll();
      items.forEach(item => {
        if (item.category === oldName) {
          item.category = newName;
          Inventory.save(item);
        }
      });
      return true;
    }
    return false;
  }
};

// ── Kaufplan-Logik ────────────────────────────────────────────────────────────

function buildPurchasePlan(includeMinStockAlerts = true) {
  const tasks = Tasks.getSorted();
  const allItems = Inventory.getAll();
  const plan = [];
  
  // Erstelle eine Map für Items die bereits im Plan sind (für Min-Stock-Alerts)
  const itemsInPlan = new Map();

  // 1. Zuerst: Aufgaben-basierte Kaufbedarfe
  tasks.forEach(task => {
    const itemsToBuy = [];
    task.inventoryItems.forEach(({ itemId, quantity }) => {
      const item = Inventory.getById(itemId);
      if (!item) return;
      const available = item.stock;
      if (available < quantity) {
        itemsToBuy.push({ 
          item, 
          needed: quantity - available, 
          currentStock: item.stock,
          minStock: item.minStock,
          reason: 'Aufgabenbedarf'
        });
        itemsInPlan.set(itemId, true);
      }
    });
    if (itemsToBuy.length > 0) {
      plan.push({ 
        task, 
        date: task.startDate, 
        itemsToBuy,
        type: 'task'
      });
    }
  });

  // 2. Dann: Items die unter der eisernen Grenze sind (wenn aktiviert)
  if (includeMinStockAlerts) {
    const minStockItems = allItems.filter(item => {
      // Nur Items die nicht bereits im Plan sind und unter der Grenze liegen
      return !itemsInPlan.has(item.id) && item.stock <= item.minStock && item.minStock > 0;
    });

    if (minStockItems.length > 0) {
      // Erstelle einen "Auffüllen" Eintrag für diese Items
      const replenishItems = minStockItems.map(item => ({
        item,
        needed: item.minStock - item.stock + 1, // +1 um über die Grenze zu kommen
        currentStock: item.stock,
        minStock: item.minStock,
        reason: 'Eiserne Grenze unterschritten'
      }));

      // Füge einen speziellen Eintrag hinzu
      plan.push({
        task: {
          id: 'min-stock-replenish',
          name: 'Bestand auffüllen (Eiserne Grenze)',
          responsible: 'Lagerverwaltung',
          description: 'Items die unter der eisernen Grenze liegen müssen aufgefüllt werden.'
        },
        date: new Date().toISOString().split('T')[0], // Heute
        itemsToBuy: replenishItems,
        type: 'min-stock'
      });
    }
  }

  // Sortiere nach Datum
  plan.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return plan;
}

// ── Daten-Export/Import ──────────────────────────────────────────────────────

function exportData() {
  return {
    inventory: Inventory.getAll(),
    tasks: Tasks.getAll(),
    categories: Categories.getAll(),
    exportedAt: new Date().toISOString()
  };
}

function importData(data) {
  if (data.inventory) saveAll(KEYS.inventory, data.inventory);
  if (data.tasks) saveAll(KEYS.tasks, data.tasks);
  if (data.categories) saveAll(KEYS.categories, data.categories);
  window.dispatchEvent(new CustomEvent('storeChange', { detail: { key: 'all' } }));
}

// Initialisierung beim Laden
init();