/* ============================================================
   MedCore OS — Shared UI Components
   Toasts, Modals, Badges, Helpers
   ============================================================ */
const UI = (() => {
  /* ---- Toast Notification ---- */
  function toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      ${type === 'success' ? Icons.checkCircle(16) : type === 'error' ? Icons.alertTriangle(16) : Icons.info(16)}
      <span>${message}</span>
      <span class="toast-dismiss" onclick="this.parentElement.remove()">${Icons.cross(14)}</span>
    `;
    container.appendChild(el);
    setTimeout(() => { if (el.parentElement) el.remove(); }, duration);
  }

  /* ---- Modal ---- */
  function openModal(content, opts = {}) {
    const root = document.getElementById('modal-root');
    const sizeClass = opts.size === 'lg' ? 'modal-panel-lg' : opts.size === 'sm' ? 'modal-panel-sm' : '';
    root.innerHTML = `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-panel ${sizeClass}" onclick="event.stopPropagation()">
          ${content}
        </div>
      </div>
    `;
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', _escHandler);
  }

  function closeModal() {
    document.getElementById('modal-root').innerHTML = '';
    document.removeEventListener('keydown', _escHandler);
  }

  function _escHandler(e) { if (e.key === 'Escape') closeModal(); }

  /* ---- Confirmation Modal ---- */
  function confirm(opts) {
    const iconType = opts.danger ? 'danger' : opts.warning ? 'warning' : 'info';
    const icon = opts.danger ? Icons.alertTriangle(24) : opts.warning ? Icons.alertTriangle(24) : Icons.info(24);
    const btnClass = opts.danger ? 'btn-danger' : 'btn-primary';

    openModal(`
      <div class="modal-body" style="text-align:center; padding: 32px 24px;">
        <div class="confirm-icon confirm-icon-${iconType}">${icon}</div>
        <h3 style="margin-bottom:8px;">${opts.title}</h3>
        <p class="text-secondary text-sm" style="margin-bottom:24px;">${opts.message}</p>
        <div style="display:flex; gap:8px; justify-content:center;">
          <button class="btn btn-outline" onclick="UI.closeModal()">${opts.cancelText || 'Cancel'}</button>
          <button class="btn ${btnClass}" id="confirm-action-btn">${opts.confirmText || 'Confirm'}</button>
        </div>
      </div>
    `, { size: 'sm' });
    document.getElementById('confirm-action-btn').addEventListener('click', () => {
      closeModal();
      if (opts.onConfirm) opts.onConfirm();
    });
  }

  /* ---- Status Badge ---- */
  function statusBadge(status) {
    const map = {
      'Confirmed': 'confirmed',
      'Pending': 'pending',
      'In-Consultation': 'consultation',
      'Completed': 'completed',
      'Cancelled': 'cancelled',
    };
    const cls = map[status] || 'pending';
    return `<span class="badge badge-${cls}"><span class="badge-dot"></span>${status}</span>`;
  }

  /* ---- Booking Type Tag ---- */
  function bookingTag(type) {
    if (type === 'Walk-In') {
      return `<span class="tag">${Icons.user(12)} Walk-In</span>`;
    }
    return `<span class="tag tag-active">${Icons.zap(12)} Online</span>`;
  }

  /* ---- Avatar ---- */
  function avatar(initials, color, size = 'md') {
    return `<div class="avatar avatar-${size}" style="background:${color}">${initials}</div>`;
  }

  /* ---- Format Date ---- */
  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    const tom = new Date(today); tom.setDate(tom.getDate() + 1);
    if (iso === todayStr) return 'Today';
    if (iso === yest.toISOString().split('T')[0]) return 'Yesterday';
    if (iso === tom.toISOString().split('T')[0]) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatCurrency(amount) {
    return `$${Number(amount).toFixed(2)}`;
  }

  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  /* ---- Generate Slot Times ---- */
  function generateSlots(startH = 9, endH = 17, duration = 30) {
    const morning = [];
    const afternoon = [];
    for (let h = startH; h < endH; h++) {
      for (let m = 0; m < 60; m += duration) {
        if (h === 12) continue; // 12-1 PM lunch break
        const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const timeStr = `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
        if (h < 12) morning.push(timeStr);
        else afternoon.push(timeStr);
      }
    }
    return { morning, afternoon };
  }

  /* ---- Dept Icon ---- */
  function deptIcon(iconName, size = 16) {
    const fn = Icons[iconName];
    return fn ? fn(size) : Icons.building(size);
  }

  return {
    toast, openModal, closeModal, confirm,
    statusBadge, bookingTag, avatar, formatDate, formatCurrency, todayISO,
    generateSlots, deptIcon
  };
})();
