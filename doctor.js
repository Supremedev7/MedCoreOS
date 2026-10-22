/* ============================================================
   MedCore OS — Doctor Workstation Module
   Queue Management, Consultation Panel, EHR
   ============================================================ */
const DoctorWorkstation = (() => {
  let state = {
    activeDoctorId: null,
    filter: 'today',
  };

  function render() {
    const doctors = StorageService.getAll('doctors').filter(d => d.status === 'Active');
    if (!state.activeDoctorId && doctors.length > 0) {
      state.activeDoctorId = doctors[0].id;
    }

    const activeDoc = StorageService.getById('doctors', state.activeDoctorId);
    const container = document.getElementById('main-content');

    container.innerHTML = `
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:8px;">
          <label class="form-label" style="margin:0; white-space:nowrap;">Active Doctor:</label>
          <select id="doc-switcher" style="width:auto; min-width:240px;">
            ${doctors.map(d => `<option value="${d.id}" ${d.id === state.activeDoctorId ? 'selected' : ''}>${d.name} — ${d.specialty}</option>`).join('')}
          </select>
        </div>
        ${activeDoc ? `
          <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
            ${UI.avatar(activeDoc.avatarInitials, activeDoc.avatarColor)}
            <div>
              <div class="font-semibold text-sm">${activeDoc.name}</div>
              <div class="text-xs text-muted">${activeDoc.credentials} &middot; Room ${activeDoc.roomNumber}</div>
            </div>
          </div>
        ` : ''}
      </div>

      ${activeDoc ? renderDoctorDashboard(activeDoc) : '<div class="empty-state"><p>No active doctors available.</p></div>'}
    `;

    document.getElementById('doc-switcher').addEventListener('change', (e) => {
      state.activeDoctorId = e.target.value;
      render();
    });

    bindQueueActions();
  }

  function renderDoctorDashboard(doc) {
    const appointments = StorageService.getAll('appointments');
    const todayStr = UI.todayISO();
    const myApts = appointments.filter(a => a.doctorId === doc.id);
    const todayApts = myApts.filter(a => a.date === todayStr);

    const stats = {
      queue: todayApts.filter(a => ['Pending', 'Confirmed'].includes(a.status)).length,
      inConsult: todayApts.filter(a => a.status === 'In-Consultation').length,
      completed: todayApts.filter(a => a.status === 'Completed').length,
      pending: todayApts.filter(a => a.status === 'Pending').length,
    };

    // Filter appointments
    let filtered;
    if (state.filter === 'today') {
      filtered = myApts.filter(a => a.date === todayStr);
    } else if (state.filter === 'upcoming') {
      filtered = myApts.filter(a => a.date > todayStr);
    } else if (state.filter === 'completed') {
      filtered = myApts.filter(a => a.status === 'Completed');
    } else {
      filtered = myApts;
    }

    // Sort by time
    filtered.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.timeSlot.localeCompare(b.timeSlot);
    });

    const departments = StorageService.getAll('departments');
    const dept = departments.find(d => d.id === doc.departmentId);

    return `
      <div class="kpi-grid" style="margin-bottom:20px;">
        <div class="kpi-card">
          <div class="kpi-label">${Icons.users(14)} Today's Queue</div>
          <div class="kpi-value">${stats.queue}</div>
          <div class="kpi-sub">Pending + Confirmed</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${Icons.activity(14)} In-Consultation</div>
          <div class="kpi-value">${stats.inConsult}</div>
          <div class="kpi-sub">Currently active</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${Icons.checkCircle(14)} Completed Today</div>
          <div class="kpi-value">${stats.completed}</div>
          <div class="kpi-sub">Sessions finished</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">${Icons.clock(14)} Pending Review</div>
          <div class="kpi-value">${stats.pending}</div>
          <div class="kpi-sub">Awaiting confirmation</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="flex-wrap:wrap; gap:8px;">
          <h3>${Icons.clipboard(16)} Appointment Queue</h3>
          <span class="text-sm text-muted">${dept ? dept.name : ''}</span>
        </div>
        <div class="tabs" id="doc-filter-tabs">
          <button class="tab-btn ${state.filter === 'today' ? 'active' : ''}" data-filter="today">
            Today <span class="tab-count">${myApts.filter(a => a.date === todayStr).length}</span>
          </button>
          <button class="tab-btn ${state.filter === 'upcoming' ? 'active' : ''}" data-filter="upcoming">
            Upcoming <span class="tab-count">${myApts.filter(a => a.date > todayStr).length}</span>
          </button>
          <button class="tab-btn ${state.filter === 'completed' ? 'active' : ''}" data-filter="completed">
            Completed <span class="tab-count">${myApts.filter(a => a.status === 'Completed').length}</span>
          </button>
          <button class="tab-btn ${state.filter === 'all' ? 'active' : ''}" data-filter="all">
            All <span class="tab-count">${myApts.length}</span>
          </button>
        </div>

        ${filtered.length === 0 ? `
          <div class="empty-state">
            ${Icons.clipboard(36)}
            <h4>No appointments found</h4>
            <p>No appointments match the current filter.</p>
          </div>
        ` : `
          <div id="queue-list">
            ${filtered.map(apt => renderQueueItem(apt)).join('')}
          </div>
        `}
      </div>
    `;
  }

  function renderQueueItem(apt) {
    const statusActions = getStatusActions(apt.status);

    return `
      <div class="queue-item" data-apt-id="${apt.id}">
        <span class="queue-token">${apt.tokenNumber}</span>
        <div class="queue-info">
          <div class="queue-patient">${apt.patientName}</div>
          <div class="queue-meta">
            <span class="mono">${apt.timeSlot}</span>
            <span>${UI.formatDate(apt.date)}</span>
            <span>${apt.patientAge} yrs, ${apt.patientGender}</span>
            ${apt.bookingType === 'Walk-In' ? '<span style="color:var(--primary);">Walk-In</span>' : ''}
          </div>
        </div>
        ${UI.statusBadge(apt.status)}
        <div class="queue-actions">
          ${statusActions.map(action => `
            <button class="btn btn-sm ${action.class} queue-action-btn" data-apt-id="${apt.id}" data-action="${action.action}" title="${action.label}">
              ${action.icon} ${action.label}
            </button>
          `).join('')}
          <button class="btn btn-sm btn-outline queue-consult-btn" data-apt-id="${apt.id}" title="Open Record">
            ${Icons.eye(12)} Record
          </button>
        </div>
      </div>
    `;
  }

  function getStatusActions(status) {
    switch (status) {
      case 'Pending':
        return [{ action: 'Confirmed', label: 'Confirm', icon: Icons.check(12), class: 'btn-tint' }];
      case 'Confirmed':
        return [{ action: 'In-Consultation', label: 'Start', icon: Icons.activity(12), class: 'btn-primary' }];
      case 'In-Consultation':
        return [{ action: 'Completed', label: 'Complete', icon: Icons.checkCircle(12), class: 'btn-primary' }];
      case 'Completed':
        return [];
      case 'Cancelled':
        return [];
      default:
        return [];
    }
  }

  function bindQueueActions() {
    document.querySelectorAll('#doc-filter-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.filter = btn.dataset.filter;
        render();
      });
    });

    document.querySelectorAll('.queue-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const aptId = btn.dataset.aptId;
        const newStatus = btn.dataset.action;
        StorageService.update('appointments', aptId, { status: newStatus });
        UI.toast(`Status updated to ${newStatus}`, 'success');
        render();
      });
    });

    document.querySelectorAll('.queue-consult-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openConsultationPanel(btn.dataset.aptId);
      });
    });
  }

  /* ---- EHR Consultation Panel ---- */
  function openConsultationPanel(aptId) {
    const apt = StorageService.getById('appointments', aptId);
    if (!apt) return;
    const doc = StorageService.getById('doctors', apt.doctorId);
    const dept = StorageService.getById('departments', apt.departmentId);

    const prescriptions = apt.prescription || [];
    let rxRows = prescriptions.length > 0
      ? prescriptions.map((rx, i) => ({ ...rx, _idx: i }))
      : [{ medicine: '', dosage: '', duration: '', _idx: 0 }];

    function renderPanel() {
      const isEditable = ['In-Consultation', 'Confirmed', 'Pending'].includes(apt.status);

      UI.openModal(`
        <div class="modal-header">
          <h3>${Icons.fileText(18)} Clinical Consultation — ${apt.id}</h3>
          <button class="btn btn-icon btn-ghost" onclick="UI.closeModal()">${Icons.cross(18)}</button>
        </div>
        <div class="modal-body">
          <!-- Patient Summary -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px; padding:14px; background:#F8FAFC; border-radius:var(--radius-md); border:1px solid var(--border);">
            <div>
              <div class="text-xs text-muted font-semibold" style="text-transform:uppercase; letter-spacing:0.04em;">Patient</div>
              <div class="font-semibold" style="margin-top:2px;">${apt.patientName}</div>
              <div class="text-sm text-secondary">${apt.patientAge} yrs &middot; ${apt.patientGender} ${apt.bloodGroup ? '&middot; ' + apt.bloodGroup : ''}</div>
              <div class="text-sm mono text-secondary" style="margin-top:2px;">${Icons.phone(12)} ${apt.patientPhone}</div>
            </div>
            <div>
              <div class="text-xs text-muted font-semibold" style="text-transform:uppercase; letter-spacing:0.04em;">Appointment</div>
              <div class="text-sm" style="margin-top:4px;">${Icons.calendar(13)} ${UI.formatDate(apt.date)} at <span class="mono">${apt.timeSlot}</span></div>
              <div class="text-sm">${Icons.stethoscope(13)} ${doc ? doc.name : 'N/A'}</div>
              <div style="margin-top:4px;">${UI.statusBadge(apt.status)}</div>
            </div>
          </div>

          <!-- Symptoms -->
          <div class="form-group">
            <label class="form-label">${Icons.thermometer(14)} Reported Symptoms</label>
            <div style="padding:10px 12px; background:#FFFBEB; border:1px solid #FDE68A; border-radius:var(--radius); font-size:0.8125rem; color:#92400E;">
              ${apt.symptoms}
            </div>
          </div>

          <!-- Clinical Notes -->
          <div class="form-group">
            <label class="form-label">${Icons.edit(14)} Clinical Diagnosis & Notes</label>
            <textarea id="ehr-notes" ${!isEditable ? 'disabled' : ''} placeholder="Enter clinical findings, diagnosis, and treatment plan..." rows="4">${apt.clinicalNotes || ''}</textarea>
          </div>

          <!-- Prescription Builder -->
          <div class="form-group">
            <label class="form-label" style="display:flex; align-items:center; justify-content:space-between;">
              <span>${Icons.pill(14)} e-Prescription</span>
              ${isEditable ? `<button class="btn btn-sm btn-tint" id="add-rx-row">${Icons.plus(12)} Add Medicine</button>` : ''}
            </label>
            <div id="rx-container">
              <div class="rx-row" style="margin-bottom:4px;">
                <div class="text-xs text-muted font-semibold">Medicine Name</div>
                <div class="text-xs text-muted font-semibold">Dosage</div>
                <div class="text-xs text-muted font-semibold">Duration</div>
                <div></div>
              </div>
              ${rxRows.map((rx, i) => `
                <div class="rx-row" data-rx-idx="${i}">
                  <input type="text" class="rx-medicine" value="${rx.medicine}" placeholder="e.g., Amoxicillin 500mg" ${!isEditable ? 'disabled' : ''} />
                  <input type="text" class="rx-dosage" value="${rx.dosage}" placeholder="e.g., 1-0-1 after meals" ${!isEditable ? 'disabled' : ''} />
                  <input type="text" class="rx-duration" value="${rx.duration}" placeholder="e.g., 7 Days" ${!isEditable ? 'disabled' : ''} />
                  ${isEditable && rxRows.length > 1 ? `<button class="rx-remove-btn remove-rx-row" data-rx-idx="${i}">${Icons.cross(16)}</button>` : '<div></div>'}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="UI.closeModal()">Close</button>
          ${isEditable ? `<button class="btn btn-primary" id="save-consult">${Icons.check(14)} Save & Complete Consultation</button>` : ''}
        </div>
      `, { size: 'lg' });

      // Bind events
      const addBtn = document.getElementById('add-rx-row');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          _collectRxFromDOM();
          rxRows.push({ medicine: '', dosage: '', duration: '', _idx: rxRows.length });
          renderPanel();
        });
      }

      document.querySelectorAll('.remove-rx-row').forEach(btn => {
        btn.addEventListener('click', () => {
          _collectRxFromDOM();
          const idx = parseInt(btn.dataset.rxIdx);
          rxRows.splice(idx, 1);
          renderPanel();
        });
      });

      const saveBtn = document.getElementById('save-consult');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          _collectRxFromDOM();
          const notes = document.getElementById('ehr-notes').value.trim();
          const prescription = rxRows
            .filter(rx => rx.medicine.trim())
            .map(rx => ({ medicine: rx.medicine, dosage: rx.dosage, duration: rx.duration }));

          StorageService.update('appointments', aptId, {
            clinicalNotes: notes,
            prescription: prescription,
            status: 'Completed',
          });

          UI.closeModal();
          UI.toast('Consultation saved and marked complete', 'success');
          render();
        });
      }
    }

    function _collectRxFromDOM() {
      const rows = document.querySelectorAll('#rx-container .rx-row[data-rx-idx]');
      rxRows = [];
      rows.forEach((row, i) => {
        rxRows.push({
          medicine: row.querySelector('.rx-medicine')?.value || '',
          dosage: row.querySelector('.rx-dosage')?.value || '',
          duration: row.querySelector('.rx-duration')?.value || '',
          _idx: i,
        });
      });
    }

    renderPanel();
  }

  return { render };
})();
