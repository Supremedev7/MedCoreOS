/* ============================================================
   MedCore OS — Admin Command Center Module
   KPI Dashboard, Appointment CRUD, Doctor CRUD, Data Utils
   ============================================================ */
const AdminCenter = (() => {
  let state = {
    activeTab: 'dashboard',
    aptSearch: '',
    aptDeptFilter: 'all',
    aptDocFilter: 'all',
    aptDateFilter: '',
    aptTypeFilter: 'all',
    aptStatusFilter: 'all',
  };

  function render() {
    const container = document.getElementById('main-content');
    container.innerHTML = `
      <div class="tabs" id="admin-tabs" style="margin-bottom:20px;">
        <button class="tab-btn ${state.activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
          ${Icons.barChart(15)} Dashboard
        </button>
        <button class="tab-btn ${state.activeTab === 'appointments' ? 'active' : ''}" data-tab="appointments">
          ${Icons.clipboard(15)} Appointments
        </button>
        <button class="tab-btn ${state.activeTab === 'doctors' ? 'active' : ''}" data-tab="doctors">
          ${Icons.stethoscope(15)} Medical Staff
        </button>
        <button class="tab-btn ${state.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
          ${Icons.settings(15)} Departments & Data
        </button>
      </div>
      <div id="admin-content"></div>
    `;

    document.querySelectorAll('#admin-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        render();
      });
    });

    switch (state.activeTab) {
      case 'dashboard': renderDashboard(); break;
      case 'appointments': renderAppointments(); break;
      case 'doctors': renderDoctors(); break;
      case 'settings': renderSettings(); break;
    }
  }

  /* ---- Dashboard ---- */
  function renderDashboard() {
    const el = document.getElementById('admin-content');
    const appointments = StorageService.getAll('appointments');
    const doctors = StorageService.getAll('doctors');
    const departments = StorageService.getAll('departments');
    const todayStr = UI.todayISO();

    const totalApts = appointments.length;
    const todayActive = appointments.filter(a => a.date === todayStr && !['Cancelled', 'Completed'].includes(a.status)).length;
    const completed = appointments.filter(a => a.status === 'Completed').length;
    const activeDocs = doctors.filter(d => d.status === 'Active').length;
    const onLeave = doctors.filter(d => d.status === 'On Leave').length;
    const revenue = appointments.filter(a => a.status !== 'Cancelled').reduce((sum, a) => sum + a.fee, 0);

    // Department distribution
    const deptStats = departments.map(dept => {
      const deptApts = appointments.filter(a => a.departmentId === dept.id && a.status !== 'Cancelled');
      const deptRevenue = deptApts.reduce((s, a) => s + a.fee, 0);
      return { ...dept, count: deptApts.length, revenue: deptRevenue };
    });
    const maxCount = Math.max(...deptStats.map(d => d.count), 1);

    el.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:24px;">
        <div class="kpi-card">
          <div class="kpi-label">${Icons.clipboard(14)} Total Appointments</div>
          <div class="kpi-value">${totalApts}</div>
          <div class="kpi-sub">All-time bookings</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${Icons.activity(14)} Today's Active</div>
          <div class="kpi-value">${todayActive}</div>
          <div class="kpi-sub">In queue right now</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${Icons.checkCircle(14)} Completed</div>
          <div class="kpi-value">${completed}</div>
          <div class="kpi-sub">Total consultations</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${Icons.users(14)} Doctors</div>
          <div class="kpi-value">${activeDocs} <span style="font-size:0.875rem; color:var(--ink-muted); font-weight:400;">/ ${onLeave} leave</span></div>
          <div class="kpi-sub">Active / On Leave</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${Icons.dollarSign(14)} Total Revenue</div>
          <div class="kpi-value">${UI.formatCurrency(revenue)}</div>
          <div class="kpi-sub">Non-cancelled bookings</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>${Icons.barChart(16)} Department Load Distribution</h3>
        </div>
        <div class="card-body">
          ${deptStats.map(d => `
            <div class="dept-dist-row">
              <span class="dept-dist-name">${d.name}</span>
              <div class="dept-dist-bar">
                <div class="dept-dist-fill" style="width:${(d.count / maxCount) * 100}%; background:${d.color};"></div>
              </div>
              <span class="dept-dist-val">${d.count} apt${d.count !== 1 ? 's' : ''}</span>
              <span class="dept-dist-val">${UI.formatCurrency(d.revenue)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /* ---- Appointments Tab ---- */
  function renderAppointments() {
    const el = document.getElementById('admin-content');
    const appointments = StorageService.getAll('appointments');
    const doctors = StorageService.getAll('doctors');
    const departments = StorageService.getAll('departments');

    let filtered = [...appointments];

    if (state.aptSearch) {
      const q = state.aptSearch.toLowerCase();
      filtered = filtered.filter(a =>
        a.patientName.toLowerCase().includes(q) ||
        a.patientPhone.includes(q) ||
        a.id.toLowerCase().includes(q)
      );
    }
    if (state.aptDeptFilter !== 'all') filtered = filtered.filter(a => a.departmentId === state.aptDeptFilter);
    if (state.aptDocFilter !== 'all') filtered = filtered.filter(a => a.doctorId === state.aptDocFilter);
    if (state.aptDateFilter) filtered = filtered.filter(a => a.date === state.aptDateFilter);
    if (state.aptTypeFilter !== 'all') filtered = filtered.filter(a => a.bookingType === state.aptTypeFilter);
    if (state.aptStatusFilter !== 'all') filtered = filtered.filter(a => a.status === state.aptStatusFilter);

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    el.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:8px;">
        <h3>${Icons.clipboard(16)} Master Appointment Registry</h3>
        <button class="btn btn-primary" id="new-walkin-btn">${Icons.plus(14)} New Walk-In Registration</button>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <div class="card-body" style="padding:12px 16px;">
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <div class="search-wrapper" style="flex:1; min-width:200px; max-width:260px;">
              ${Icons.search(16)}
              <input type="text" class="search-input" id="apt-search" placeholder="Search name, phone, APT-ID..." value="${state.aptSearch}" style="padding-left:36px;" />
            </div>
            <select id="apt-dept-filter" style="width:auto; min-width:130px;">
              <option value="all">All Depts</option>
              ${departments.map(d => `<option value="${d.id}" ${state.aptDeptFilter === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
            </select>
            <select id="apt-doc-filter" style="width:auto; min-width:160px;">
              <option value="all">All Doctors</option>
              ${doctors.map(d => `<option value="${d.id}" ${state.aptDocFilter === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
            </select>
            <input type="date" id="apt-date-filter" value="${state.aptDateFilter}" style="width:auto;" />
            <select id="apt-type-filter" style="width:auto; min-width:100px;">
              <option value="all">All Types</option>
              <option value="Online" ${state.aptTypeFilter === 'Online' ? 'selected' : ''}>Online</option>
              <option value="Walk-In" ${state.aptTypeFilter === 'Walk-In' ? 'selected' : ''}>Walk-In</option>
            </select>
            <select id="apt-status-filter" style="width:auto; min-width:120px;">
              <option value="all">All Status</option>
              ${['Pending','Confirmed','In-Consultation','Completed','Cancelled'].map(s => `<option value="${s}" ${state.aptStatusFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="card">
        ${filtered.length === 0 ? `
          <div class="empty-state">
            ${Icons.clipboard(36)}
            <h4>No appointments match filters</h4>
          </div>
        ` : `
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>APT ID</th>
                  <th>Token</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Fee</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(apt => {
                  const doc = doctors.find(d => d.id === apt.doctorId);
                  return `
                    <tr>
                      <td class="mono font-medium" style="color:var(--primary);">${apt.id}</td>
                      <td class="mono">${apt.tokenNumber}</td>
                      <td>
                        <div class="font-medium">${apt.patientName}</div>
                        <div class="text-xs text-muted mono">${apt.patientPhone}</div>
                      </td>
                      <td class="text-sm">${doc ? doc.name : 'N/A'}</td>
                      <td class="text-sm">${UI.formatDate(apt.date)}</td>
                      <td class="mono text-sm">${apt.timeSlot}</td>
                      <td>${UI.bookingTag(apt.bookingType)}</td>
                      <td>
                        <select class="admin-status-select" data-apt-id="${apt.id}" style="font-size:0.75rem; padding:4px 8px; width:auto;">
                          ${['Pending','Confirmed','In-Consultation','Completed','Cancelled'].map(s => `<option value="${s}" ${apt.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                      </td>
                      <td class="mono">${UI.formatCurrency(apt.fee)}</td>
                      <td>
                        <div style="display:flex; gap:4px;">
                          <button class="btn btn-icon btn-ghost admin-view-apt" data-apt-id="${apt.id}" title="View Details">${Icons.eye(14)}</button>
                          <button class="btn btn-icon btn-ghost admin-delete-apt" data-apt-id="${apt.id}" title="Delete" style="color:var(--status-cancelled-dot);">${Icons.trash(14)}</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    // Event listeners
    document.getElementById('apt-search').addEventListener('input', e => { state.aptSearch = e.target.value; renderAppointments(); });
    document.getElementById('apt-dept-filter').addEventListener('change', e => { state.aptDeptFilter = e.target.value; renderAppointments(); });
    document.getElementById('apt-doc-filter').addEventListener('change', e => { state.aptDocFilter = e.target.value; renderAppointments(); });
    document.getElementById('apt-date-filter').addEventListener('change', e => { state.aptDateFilter = e.target.value; renderAppointments(); });
    document.getElementById('apt-type-filter').addEventListener('change', e => { state.aptTypeFilter = e.target.value; renderAppointments(); });
    document.getElementById('apt-status-filter').addEventListener('change', e => { state.aptStatusFilter = e.target.value; renderAppointments(); });

    document.getElementById('new-walkin-btn').addEventListener('click', openWalkInModal);

    document.querySelectorAll('.admin-status-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        StorageService.update('appointments', sel.dataset.aptId, { status: e.target.value });
        UI.toast('Status updated', 'success');
      });
    });

    document.querySelectorAll('.admin-view-apt').forEach(btn => {
      btn.addEventListener('click', () => {
        const apt = StorageService.getById('appointments', btn.dataset.aptId);
        if (apt) showAptDetailModal(apt);
      });
    });

    document.querySelectorAll('.admin-delete-apt').forEach(btn => {
      btn.addEventListener('click', () => {
        UI.confirm({
          title: 'Delete Appointment',
          message: `Permanently delete appointment ${btn.dataset.aptId}? This cannot be undone.`,
          danger: true,
          confirmText: 'Delete',
          onConfirm: () => {
            StorageService.remove('appointments', btn.dataset.aptId);
            UI.toast('Appointment deleted', 'info');
            renderAppointments();
          }
        });
      });
    });
  }

  function showAptDetailModal(apt) {
    const doc = StorageService.getById('doctors', apt.doctorId);
    const dept = StorageService.getById('departments', apt.departmentId);
    UI.openModal(`
      <div class="modal-header">
        <h3>${Icons.clipboard(18)} Appointment Details — <span class="mono">${apt.id}</span></h3>
        <button class="btn btn-icon btn-ghost" onclick="UI.closeModal()">${Icons.cross(18)}</button>
      </div>
      <div class="modal-body">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div><span class="text-xs text-muted">Patient</span><div class="font-medium">${apt.patientName}</div></div>
          <div><span class="text-xs text-muted">Phone</span><div class="mono">${apt.patientPhone}</div></div>
          <div><span class="text-xs text-muted">Age / Gender</span><div>${apt.patientAge} yrs, ${apt.patientGender}</div></div>
          <div><span class="text-xs text-muted">Blood Group</span><div>${apt.bloodGroup || 'N/A'}</div></div>
          <div><span class="text-xs text-muted">Doctor</span><div>${doc ? doc.name : 'N/A'}</div></div>
          <div><span class="text-xs text-muted">Department</span><div>${dept ? dept.name : 'N/A'}</div></div>
          <div><span class="text-xs text-muted">Date & Time</span><div>${UI.formatDate(apt.date)} at <span class="mono">${apt.timeSlot}</span></div></div>
          <div><span class="text-xs text-muted">Status</span><div>${UI.statusBadge(apt.status)}</div></div>
          <div><span class="text-xs text-muted">Fee</span><div class="mono font-semibold">${UI.formatCurrency(apt.fee)}</div></div>
          <div><span class="text-xs text-muted">Booking Type</span><div>${UI.bookingTag(apt.bookingType)}</div></div>
        </div>
        <div style="margin-top:16px;">
          <span class="text-xs text-muted">Symptoms</span>
          <div class="text-sm" style="margin-top:4px;">${apt.symptoms}</div>
        </div>
        ${apt.clinicalNotes ? `<div style="margin-top:12px;"><span class="text-xs text-muted">Clinical Notes</span><div class="text-sm" style="margin-top:4px;">${apt.clinicalNotes}</div></div>` : ''}
        ${apt.prescription.length > 0 ? `
          <div style="margin-top:12px;">
            <span class="text-xs text-muted">Prescription</span>
            <table class="data-table" style="margin-top:6px;">
              <thead><tr><th>Medicine</th><th>Dosage</th><th>Duration</th></tr></thead>
              <tbody>${apt.prescription.map(rx => `<tr><td>${rx.medicine}</td><td>${rx.dosage}</td><td class="mono">${rx.duration}</td></tr>`).join('')}</tbody>
            </table>
          </div>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="UI.closeModal()">Close</button>
      </div>
    `, { size: 'lg' });
  }

  /* ---- Walk-In Registration ---- */
  function openWalkInModal() {
    const doctors = StorageService.getAll('doctors').filter(d => d.status === 'Active');
    const departments = StorageService.getAll('departments');

    UI.openModal(`
      <div class="modal-header">
        <h3>${Icons.plus(18)} New Walk-In Registration</h3>
        <button class="btn btn-icon btn-ghost" onclick="UI.closeModal()">${Icons.cross(18)}</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label form-label-required">Patient Full Name</label>
          <input type="text" id="wi-name" placeholder="Patient full name" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label form-label-required">Phone Number</label>
            <input type="tel" id="wi-phone" placeholder="10-digit number" />
          </div>
          <div class="form-group">
            <label class="form-label form-label-required">Age</label>
            <input type="number" id="wi-age" placeholder="Age" min="0" max="120" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label form-label-required">Gender</label>
            <select id="wi-gender">
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Blood Group</label>
            <select id="wi-blood">
              <option value="">Optional</option>
              ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => `<option value="${bg}">${bg}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label form-label-required">Department</label>
            <select id="wi-dept">
              <option value="">Select department</option>
              ${departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label form-label-required">Doctor</label>
            <select id="wi-doctor">
              <option value="">Select doctor</option>
              ${doctors.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label form-label-required">Time Slot</label>
          <select id="wi-slot">
            <option value="">Select slot</option>
          </select>
          <div class="form-hint">Available slots will populate after selecting a doctor.</div>
        </div>
        <div class="form-group">
          <label class="form-label form-label-required">Chief Complaint</label>
          <textarea id="wi-symptoms" placeholder="Brief description of symptoms" rows="2"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="wi-submit">${Icons.check(14)} Register Walk-In</button>
      </div>
    `);

    // Filter doctors by department
    document.getElementById('wi-dept').addEventListener('change', (e) => {
      const deptId = e.target.value;
      const docSelect = document.getElementById('wi-doctor');
      const filtered = doctors.filter(d => !deptId || d.departmentId === deptId);
      docSelect.innerHTML = `<option value="">Select doctor</option>${filtered.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}`;
    });

    // Populate slots when doctor selected
    document.getElementById('wi-doctor').addEventListener('change', (e) => {
      const docId = e.target.value;
      const slotSelect = document.getElementById('wi-slot');
      if (!docId) {
        slotSelect.innerHTML = '<option value="">Select slot</option>';
        return;
      }
      const appointments = StorageService.getAll('appointments');
      const bookedSlots = appointments
        .filter(a => a.doctorId === docId && a.date === UI.todayISO() && a.status !== 'Cancelled')
        .map(a => a.timeSlot);
      const { morning, afternoon } = UI.generateSlots();
      const allSlots = [...morning, ...afternoon];
      const available = allSlots.filter(s => !bookedSlots.includes(s));
      slotSelect.innerHTML = `<option value="">Select slot</option>${available.map(s => `<option value="${s}">${s}</option>`).join('')}`;
    });

    document.getElementById('wi-submit').addEventListener('click', () => {
      const name = document.getElementById('wi-name').value.trim();
      const phone = document.getElementById('wi-phone').value.trim();
      const age = document.getElementById('wi-age').value.trim();
      const gender = document.getElementById('wi-gender').value;
      const blood = document.getElementById('wi-blood').value;
      const deptId = document.getElementById('wi-dept').value;
      const docId = document.getElementById('wi-doctor').value;
      const slot = document.getElementById('wi-slot').value;
      const symptoms = document.getElementById('wi-symptoms').value.trim();

      if (!name || !phone || !age || !gender || !deptId || !docId || !slot || !symptoms) {
        UI.toast('Please fill all required fields', 'error');
        return;
      }

      const doc = StorageService.getById('doctors', docId);
      const aptId = StorageService.generateId('APT');
      const token = StorageService.generateToken(docId, UI.todayISO());

      StorageService.add('appointments', {
        id: aptId,
        tokenNumber: token,
        patientName: name,
        patientPhone: phone,
        patientEmail: '',
        patientAge: parseInt(age),
        patientGender: gender,
        bloodGroup: blood,
        symptoms: symptoms,
        bookingType: 'Walk-In',
        doctorId: docId,
        departmentId: deptId,
        date: UI.todayISO(),
        timeSlot: slot,
        fee: doc ? doc.consultationFee : 0,
        status: 'Confirmed',
        clinicalNotes: '',
        prescription: [],
        createdAt: new Date().toISOString(),
      });

      UI.closeModal();
      UI.toast(`Walk-in ${aptId} registered successfully`, 'success');
      renderAppointments();
    });
  }

  /* ---- Doctors Tab ---- */
  function renderDoctors() {
    const el = document.getElementById('admin-content');
    const doctors = StorageService.getAll('doctors');
    const departments = StorageService.getAll('departments');
    const appointments = StorageService.getAll('appointments');

    el.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <h3>${Icons.stethoscope(16)} Medical Staff Management</h3>
        <button class="btn btn-primary" id="add-doc-btn">${Icons.plus(14)} Add New Doctor</button>
      </div>

      <div class="card">
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Credentials</th>
                <th>Department</th>
                <th>Specialty</th>
                <th>Experience</th>
                <th>Fee</th>
                <th>Room</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${doctors.map(doc => {
                const dept = departments.find(d => d.id === doc.departmentId);
                const docApts = appointments.filter(a => a.doctorId === doc.id && !['Cancelled', 'Completed'].includes(a.status));
                return `
                  <tr>
                    <td>
                      <div style="display:flex; align-items:center; gap:8px;">
                        ${UI.avatar(doc.avatarInitials, doc.avatarColor, 'sm')}
                        <span class="font-medium">${doc.name}</span>
                      </div>
                    </td>
                    <td class="text-sm text-secondary">${doc.credentials}</td>
                    <td><span class="tag">${dept ? dept.name : 'N/A'}</span></td>
                    <td class="text-sm">${doc.specialty}</td>
                    <td class="mono text-sm">${doc.experienceYears} yrs</td>
                    <td class="mono font-medium">${UI.formatCurrency(doc.consultationFee)}</td>
                    <td class="mono text-sm">${doc.roomNumber}</td>
                    <td class="mono text-sm">${Icons.star(12)} ${doc.rating}</td>
                    <td>
                      <label class="toggle doc-toggle" data-doc-id="${doc.id}">
                        <input type="checkbox" ${doc.status === 'Active' ? 'checked' : ''} />
                        <span class="toggle-track"></span>
                        <span class="toggle-thumb"></span>
                      </label>
                    </td>
                    <td>
                      <div style="display:flex; gap:4px;">
                        <button class="btn btn-icon btn-ghost edit-doc-btn" data-doc-id="${doc.id}" title="Edit">${Icons.edit(14)}</button>
                        <button class="btn btn-icon btn-ghost delete-doc-btn" data-doc-id="${doc.id}" data-active-apts="${docApts.length}" title="Delete" style="color:var(--status-cancelled-dot);">${Icons.trash(14)}</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('add-doc-btn').addEventListener('click', () => openDoctorModal());

    document.querySelectorAll('.doc-toggle input').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const docId = e.target.closest('.doc-toggle').dataset.docId;
        const newStatus = e.target.checked ? 'Active' : 'On Leave';
        StorageService.update('doctors', docId, { status: newStatus });
        UI.toast(`Doctor status changed to ${newStatus}`, 'success');
      });
    });

    document.querySelectorAll('.edit-doc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const doc = StorageService.getById('doctors', btn.dataset.docId);
        if (doc) openDoctorModal(doc);
      });
    });

    document.querySelectorAll('.delete-doc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const activeApts = parseInt(btn.dataset.activeApts);
        const msg = activeApts > 0
          ? `This doctor has ${activeApts} active appointment(s). Deleting will leave those appointments unassigned. Are you sure?`
          : 'Are you sure you want to delete this doctor?';
        UI.confirm({
          title: 'Delete Doctor',
          message: msg,
          danger: true,
          warning: activeApts > 0,
          confirmText: 'Delete',
          onConfirm: () => {
            StorageService.remove('doctors', btn.dataset.docId);
            UI.toast('Doctor removed', 'info');
            renderDoctors();
          }
        });
      });
    });
  }

  function openDoctorModal(doc = null) {
    const isEdit = !!doc;
    const departments = StorageService.getAll('departments');
    const colors = ['#BE123C', '#7C3AED', '#0369A1', '#B45309', '#047857', '#0F766E', '#991B1B', '#5B21B6', '#1D4ED8', '#7C2D12'];

    UI.openModal(`
      <div class="modal-header">
        <h3>${isEdit ? Icons.edit(18) : Icons.plus(18)} ${isEdit ? 'Edit Doctor' : 'Add New Doctor'}</h3>
        <button class="btn btn-icon btn-ghost" onclick="UI.closeModal()">${Icons.cross(18)}</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label form-label-required">Full Name</label>
            <input type="text" id="doc-name" value="${doc ? doc.name : ''}" placeholder="Dr. First Last" />
          </div>
          <div class="form-group">
            <label class="form-label form-label-required">Credentials</label>
            <input type="text" id="doc-creds" value="${doc ? doc.credentials : ''}" placeholder="e.g., MD, FACC" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label form-label-required">Department</label>
            <select id="doc-dept">
              <option value="">Select</option>
              ${departments.map(d => `<option value="${d.id}" ${doc && doc.departmentId === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label form-label-required">Specialty</label>
            <input type="text" id="doc-spec" value="${doc ? doc.specialty : ''}" placeholder="e.g., Interventional Cardiology" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label form-label-required">Experience (Years)</label>
            <input type="number" id="doc-exp" value="${doc ? doc.experienceYears : ''}" min="0" max="50" />
          </div>
          <div class="form-group">
            <label class="form-label form-label-required">Consultation Fee ($)</label>
            <input type="number" id="doc-fee" value="${doc ? doc.consultationFee : ''}" min="0" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label form-label-required">Room Number</label>
            <input type="text" id="doc-room" value="${doc ? doc.roomNumber : ''}" placeholder="e.g., A-204" />
          </div>
          <div class="form-group">
            <label class="form-label">Rating</label>
            <input type="number" id="doc-rating" value="${doc ? doc.rating : '4.5'}" step="0.1" min="0" max="5" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Working Hours Start</label>
            <input type="time" id="doc-start" value="${doc ? doc.workingHours.start : '09:00'}" />
          </div>
          <div class="form-group">
            <label class="form-label">Working Hours End</label>
            <input type="time" id="doc-end" value="${doc ? doc.workingHours.end : '17:00'}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select id="doc-status">
            <option value="Active" ${doc && doc.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="On Leave" ${doc && doc.status === 'On Leave' ? 'selected' : ''}>On Leave</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Bio / Summary</label>
          <textarea id="doc-bio" rows="2" placeholder="Brief professional summary">${doc ? doc.bio : ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="doc-save">${Icons.check(14)} ${isEdit ? 'Save Changes' : 'Add Doctor'}</button>
      </div>
    `);

    document.getElementById('doc-save').addEventListener('click', () => {
      const name = document.getElementById('doc-name').value.trim();
      const creds = document.getElementById('doc-creds').value.trim();
      const deptId = document.getElementById('doc-dept').value;
      const spec = document.getElementById('doc-spec').value.trim();
      const exp = document.getElementById('doc-exp').value;
      const fee = document.getElementById('doc-fee').value;
      const room = document.getElementById('doc-room').value.trim();
      const rating = document.getElementById('doc-rating').value;
      const start = document.getElementById('doc-start').value;
      const end = document.getElementById('doc-end').value;
      const status = document.getElementById('doc-status').value;
      const bio = document.getElementById('doc-bio').value.trim();

      if (!name || !creds || !deptId || !spec || !exp || !fee || !room) {
        UI.toast('Please fill all required fields', 'error');
        return;
      }

      const initials = name.replace(/^Dr\.\s*/i, '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const color = colors[Math.floor(Math.random() * colors.length)];

      const docData = {
        name, credentials: creds, departmentId: deptId, specialty: spec,
        experienceYears: parseInt(exp), consultationFee: parseFloat(fee),
        rating: parseFloat(rating || 4.5), avatarInitials: isEdit ? doc.avatarInitials : initials,
        avatarColor: isEdit ? doc.avatarColor : color, roomNumber: room,
        status, workingHours: { start, end }, slotDuration: 30, bio,
      };

      if (isEdit) {
        StorageService.update('doctors', doc.id, docData);
        UI.toast('Doctor updated', 'success');
      } else {
        docData.id = `doc-${Date.now()}`;
        StorageService.add('doctors', docData);
        UI.toast('Doctor added successfully', 'success');
      }

      UI.closeModal();
      renderDoctors();
    });
  }

  /* ---- Settings / Data Tab ---- */
  function renderSettings() {
    const el = document.getElementById('admin-content');
    const departments = StorageService.getAll('departments');

    el.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
        <!-- Departments -->
        <div class="card">
          <div class="card-header">
            <h3>${Icons.building(16)} Departments</h3>
            <button class="btn btn-sm btn-tint" id="add-dept-btn">${Icons.plus(12)} Add</button>
          </div>
          <div class="card-body" style="padding:0;">
            ${departments.map(d => `
              <div style="display:flex; align-items:center; gap:12px; padding:12px 20px; border-bottom:1px solid var(--divider);">
                <div style="width:8px; height:8px; border-radius:50%; background:${d.color}; flex-shrink:0;"></div>
                <div style="flex:1;">
                  <div class="font-medium text-sm">${d.name}</div>
                  <div class="text-xs text-muted">${d.floor}</div>
                </div>
                <button class="btn btn-icon btn-ghost edit-dept-btn" data-dept-id="${d.id}">${Icons.edit(14)}</button>
                <button class="btn btn-icon btn-ghost del-dept-btn" data-dept-id="${d.id}" style="color:var(--status-cancelled-dot);">${Icons.trash(14)}</button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Data Utilities -->
        <div class="card">
          <div class="card-header">
            <h3>${Icons.database(16)} Database Utilities</h3>
          </div>
          <div class="card-body">
            <div style="display:flex; flex-direction:column; gap:12px;">
              <button class="btn btn-outline btn-lg" id="export-btn" style="justify-content:flex-start;">
                ${Icons.download(16)} Export Database (JSON)
              </button>
              <div style="position:relative;">
                <button class="btn btn-outline btn-lg" id="import-btn-trigger" style="justify-content:flex-start; width:100%;">
                  ${Icons.upload(16)} Import Database (JSON)
                </button>
                <input type="file" id="import-file" accept=".json" style="position:absolute; inset:0; opacity:0; cursor:pointer;" />
              </div>
              <div style="border-top:1px solid var(--divider); padding-top:12px; margin-top:4px;">
                <button class="btn btn-danger btn-lg" id="factory-reset-btn" style="justify-content:flex-start; width:100%;">
                  ${Icons.refreshCw(16)} Factory Reset Demo Data
                </button>
                <div class="form-hint" style="margin-top:6px;">Wipes all data and re-seeds the default demo dataset.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('add-dept-btn').addEventListener('click', () => openDeptModal());

    document.querySelectorAll('.edit-dept-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dept = StorageService.getById('departments', btn.dataset.deptId);
        if (dept) openDeptModal(dept);
      });
    });

    document.querySelectorAll('.del-dept-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        UI.confirm({
          title: 'Delete Department',
          message: 'This will remove the department. Doctors in this department will remain but may need reassignment.',
          danger: true,
          confirmText: 'Delete',
          onConfirm: () => {
            StorageService.remove('departments', btn.dataset.deptId);
            UI.toast('Department removed', 'info');
            renderSettings();
          }
        });
      });
    });

    document.getElementById('export-btn').addEventListener('click', () => {
      const data = StorageService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medcore_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      UI.toast('Database exported', 'success');
    });

    document.getElementById('import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          StorageService.importData(data);
          UI.toast('Database imported successfully', 'success');
          render();
        } catch {
          UI.toast('Invalid JSON file', 'error');
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('factory-reset-btn').addEventListener('click', () => {
      UI.confirm({
        title: 'Factory Reset',
        message: 'This will erase ALL data and restore the demo dataset. Continue?',
        danger: true,
        confirmText: 'Reset Everything',
        onConfirm: () => {
          StorageService.clear();
          SeedData.seed();
          UI.toast('Demo data restored', 'success');
          render();
        }
      });
    });
  }

  function openDeptModal(dept = null) {
    const isEdit = !!dept;
    const colors = ['#BE123C', '#7C3AED', '#0369A1', '#B45309', '#047857', '#0F766E', '#1D4ED8', '#7C2D12', '#4338CA', '#059669'];
    const iconNames = ['heart', 'brain', 'bone', 'scan', 'baby', 'stethoscope', 'activity', 'thermometer', 'syringe', 'microscope', 'eye', 'droplet'];

    UI.openModal(`
      <div class="modal-header">
        <h3>${isEdit ? Icons.edit(18) : Icons.plus(18)} ${isEdit ? 'Edit Department' : 'Add Department'}</h3>
        <button class="btn btn-icon btn-ghost" onclick="UI.closeModal()">${Icons.cross(18)}</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label form-label-required">Department Name</label>
          <input type="text" id="dept-name" value="${dept ? dept.name : ''}" placeholder="e.g., Oncology" />
        </div>
        <div class="form-group">
          <label class="form-label form-label-required">Location</label>
          <input type="text" id="dept-floor" value="${dept ? dept.floor : ''}" placeholder="e.g., Wing A \u2022 Floor 3" />
        </div>
        <div class="form-group">
          <label class="form-label">Color</label>
          <div style="display:flex; gap:6px; flex-wrap:wrap;" id="color-picker">
            ${colors.map(c => `
              <div class="dept-color-opt" data-color="${c}" style="width:28px; height:28px; border-radius:50%; background:${c}; cursor:pointer; border:3px solid ${dept && dept.color === c ? 'var(--ink-primary)' : 'transparent'}; transition:border var(--transition-fast);"></div>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Icon</label>
          <select id="dept-icon">
            ${iconNames.map(name => `<option value="${name}" ${dept && dept.icon === name ? 'selected' : ''}>${name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="dept-desc" rows="2" placeholder="Department description">${dept ? dept.description : ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="dept-save">${Icons.check(14)} ${isEdit ? 'Save' : 'Add Department'}</button>
      </div>
    `, { size: 'sm' });

    let selectedColor = dept ? dept.color : colors[0];

    document.querySelectorAll('.dept-color-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        selectedColor = opt.dataset.color;
        document.querySelectorAll('.dept-color-opt').forEach(o => o.style.border = '3px solid transparent');
        opt.style.border = '3px solid var(--ink-primary)';
      });
    });

    document.getElementById('dept-save').addEventListener('click', () => {
      const name = document.getElementById('dept-name').value.trim();
      const floor = document.getElementById('dept-floor').value.trim();
      const icon = document.getElementById('dept-icon').value;
      const desc = document.getElementById('dept-desc').value.trim();

      if (!name || !floor) {
        UI.toast('Name and location are required', 'error');
        return;
      }

      const deptData = { name, floor, icon, color: selectedColor, description: desc };

      if (isEdit) {
        StorageService.update('departments', dept.id, deptData);
        UI.toast('Department updated', 'success');
      } else {
        deptData.id = `dept-${Date.now()}`;
        StorageService.add('departments', deptData);
        UI.toast('Department added', 'success');
      }

      UI.closeModal();
      renderSettings();
    });
  }

  return { render };
})();
