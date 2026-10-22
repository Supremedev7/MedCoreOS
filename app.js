/* ============================================================
   MedCore OS — Main Application Controller
   Header, Role Switcher, Clock, Initialization
   ============================================================ */
const App = (() => {
  let activeRole = 'patient';

  function init() {
    // Seed data on first visit
    if (!StorageService.isSeeded()) {
      SeedData.seed();
    }

    renderApp();
    startClock();

    // Keyboard shortcut: Ctrl/Cmd+K for search focus
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('#pt-search, #apt-search');
        if (searchInput) searchInput.focus();
      }
    });
  }

  function renderApp() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <header class="header">
        <div class="header-brand">
          <div class="header-brand-icon">${Icons.hospital(16)}</div>
          <span>MedCore OS</span>
        </div>

        <div class="role-switcher" id="role-switcher">
          <button class="role-switcher-btn ${activeRole === 'patient' ? 'active' : ''}" data-role="patient">
            ${Icons.user(14)} Patient Portal
          </button>
          <button class="role-switcher-btn ${activeRole === 'doctor' ? 'active' : ''}" data-role="doctor">
            ${Icons.stethoscope(14)} Doctor Workstation
          </button>
          <button class="role-switcher-btn ${activeRole === 'admin' ? 'active' : ''}" data-role="admin">
            ${Icons.shield(14)} Admin Center
          </button>
        </div>

        <div class="header-actions">
          <div class="header-clock" id="header-clock">
            ${Icons.clock(14)}
            <span id="clock-time"></span>
            <span class="text-muted">&middot;</span>
            <span id="clock-date"></span>
          </div>
          <button class="btn btn-sm btn-ghost" id="reset-demo-btn" title="Reset Demo Data">
            ${Icons.refreshCw(14)}
          </button>
        </div>
      </header>

      <main class="main-container" id="main-content"></main>
    `;

    // Role switcher
    document.querySelectorAll('#role-switcher .role-switcher-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeRole = btn.dataset.role;
        renderApp();
      });
    });

    // Reset demo
    document.getElementById('reset-demo-btn').addEventListener('click', () => {
      UI.confirm({
        title: 'Reset Demo Data',
        message: 'This will clear all data and restore the original demo dataset.',
        warning: true,
        confirmText: 'Reset',
        onConfirm: () => {
          StorageService.clear();
          SeedData.seed();
          UI.toast('Demo data restored', 'success');
          renderApp();
        }
      });
    });

    // Render active module
    switch (activeRole) {
      case 'patient': PatientPortal.render(); break;
      case 'doctor': DoctorWorkstation.render(); break;
      case 'admin': AdminCenter.render(); break;
    }
  }

  function startClock() {
    function updateClock() {
      const now = new Date();
      const timeEl = document.getElementById('clock-time');
      const dateEl = document.getElementById('clock-date');
      if (timeEl) {
        timeEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
      if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    updateClock();
    setInterval(updateClock, 1000);
  }

  // Auto-initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init, renderApp };
})();
