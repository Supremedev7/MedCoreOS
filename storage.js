/* ============================================================
   MedCore OS — StorageService (Reactive localStorage Engine)
   Namespace: medcore_hms_v1
   ============================================================ */
const StorageService = (() => {
  const NS = 'medcore_hms_v1';
  const listeners = {};

  function key(collection) { return `${NS}_${collection}`; }

  function getAll(collection) {
    try {
      const raw = localStorage.getItem(key(collection));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function setAll(collection, data) {
    localStorage.setItem(key(collection), JSON.stringify(data));
    _notify(collection);
  }

  function getById(collection, id) {
    return getAll(collection).find(item => item.id === id) || null;
  }

  function add(collection, item) {
    const all = getAll(collection);
    all.push(item);
    setAll(collection, all);
    return item;
  }

  function update(collection, id, updates) {
    const all = getAll(collection);
    const idx = all.findIndex(item => item.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    setAll(collection, all);
    return all[idx];
  }

  function remove(collection, id) {
    const all = getAll(collection);
    const filtered = all.filter(item => item.id !== id);
    if (filtered.length === all.length) return false;
    setAll(collection, filtered);
    return true;
  }

  function clear() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(NS));
    keys.forEach(k => localStorage.removeItem(k));
    Object.keys(listeners).forEach(c => _notify(c));
  }

  function subscribe(collection, callback) {
    if (!listeners[collection]) listeners[collection] = [];
    listeners[collection].push(callback);
    return () => {
      listeners[collection] = listeners[collection].filter(cb => cb !== callback);
    };
  }

  function _notify(collection) {
    if (listeners[collection]) {
      const data = getAll(collection);
      listeners[collection].forEach(cb => cb(data));
    }
  }

  function isSeeded() {
    return getAll('departments').length > 0;
  }

  function generateId(prefix = 'ID') {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${new Date().getFullYear()}-${num}`;
  }

  function generateToken(doctorId, date) {
    const apts = getAll('appointments').filter(a =>
      a.doctorId === doctorId &&
      a.date === date &&
      a.status !== 'Cancelled'
    );
    const num = apts.length + 1;
    return `T-${String(num).padStart(2, '0')}`;
  }

  function exportData() {
    const data = {};
    ['departments', 'doctors', 'appointments'].forEach(col => {
      data[col] = getAll(col);
    });
    return data;
  }

  function importData(data) {
    ['departments', 'doctors', 'appointments'].forEach(col => {
      if (data[col]) setAll(col, data[col]);
    });
  }

  return {
    getAll, setAll, getById, add, update, remove, clear,
    subscribe, isSeeded, generateId, generateToken,
    exportData, importData
  };
})();
