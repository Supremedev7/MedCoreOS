/* ============================================================
   MedCore OS — Patient Portal Module
   Doctor Directory, Booking System, My Appointments
   ============================================================ */
const PatientPortal = (() => {
  let state = {
    activeTab: 'directory',
    deptFilter: 'all',
    searchQuery: '',
    availTodayOnly: false,
    sortBy: 'name',
    lookupQuery: '',
  };

  function render() {
    const container = document.getElementById('main-content');
    container.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div class="tabs" id="patient-tabs">
          <button class="tab-btn ${state.activeTab === 'directory' ? 'active' : ''}" data-tab="directory">
            ${Icons.users(15)} Doctor Directory
          </button>
          <button class="tab-btn ${state.activeTab === 'myapts' ? 'active' : ''}" data-tab="myapts">
            ${Icons.clipboard(15)} My Appointments
          </button>
        </div>
      </div>
      <div id="patient-content"></div>
    `;

    document.querySelectorAll('#patient-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        render();
      });
    });

    if (state.activeTab === 'directory') renderDirectory();
    else renderMyAppointments();
  }

  /* ---- Doctor Directory ---- */
  function renderDirectory() {
    const departments = StorageService.getAll('departments');
    const doctors = StorageService.getAll('doctors');
    const appointments = StorageService.getAll('appointments');

    let filtered = [...doctors];

    if (state.deptFilter !== 'all') {
      filtered = filtered.filter(d => d.departmentId === state.deptFilter);
    }
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        departments.find(dp => dp.id === d.departmentId)?.name.toLowerCase().includes(q)
      );
    }
    if (state.availTodayOnly) {
      filtered = filtered.filter(d => d.status === 'Active');
    }
    if (state.sortBy === 'fee') {
      filtered.sort((a, b) => a.consultationFee - b.consultationFee);
    } else if (state.sortBy === 'experience') {
      filtered.sort((a, b) => b.experienceYears - a.experienceYears);
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    const contentEl = document.getElementById('patient-content');
    contentEl.innerHTML = `
      <div class="filter-bar">
        <div class="search-wrapper">
          ${Icons.search(16)}
          <input type="text" class="search-input" id="pt-search" placeholder="Search doctors, specialties, conditions..." value="${state.searchQuery}" style="padding-left:36px; max-width:280px;" />
        </div>
        <div class="dept-pills">
          <button class="dept-pill ${state.deptFilter === 'all' ? 'active' : ''}" data-dept="all">All</button>
          ${departments.map(d => `
            <button class="dept-pill ${state.deptFilter === d.id ? 'active' : ''}" data-dept="${d.id}">
              ${d.name}
            </button>
          `).join('')}
        </div>
        <div style="margin-left:auto; display:flex; align-items:center; gap:12px;">
          <div class="toggle-wrapper">
            <label class="toggle">
              <input type="checkbox" id="avail-toggle" ${state.availTodayOnly ? 'checked' : ''} />
              <span class="toggle-track"></span>
              <span class="toggle-thumb"></span>
            </label>
            <span>Available Today</span>
          </div>
          <select id="sort-select" style="width:auto; min-width:140px;">
            <option value="name" ${state.sortBy === 'name' ? 'selected' : ''}>Sort by Name</option>
            <option value="fee" ${state.sortBy === 'fee' ? 'selected' : ''}>Sort by Fee</option>
            <option value="experience" ${state.sortBy === 'experience' ? 'selected' : ''}>Sort by Experience</option>
          </select>
        </div>
      </div>

      ${filtered.length === 0 ? `
        <div class="empty-state">
          ${Icons.search(40)}
          <h3>No doctors found</h3>
          <p>Try adjusting your filters or search criteria</p>
        </div>
      ` : `
        <div class="doctor-grid" id="doctor-grid">
          ${filtered.map(doc => renderDoctorCard(doc, departments, appointments)).join('')}
        </div>
      `}
    `;

    // Event listeners
    document.getElementById('pt-search').addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderDirectory();
    });
    document.getElementById('avail-toggle').addEventListener('change', (e) => {
      state.availTodayOnly = e.target.checked;
      renderDirectory();
    });
    document.getElementById('sort-select').addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderDirectory();
    });
    document.querySelectorAll('.dept-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        state.deptFilter = pill.dataset.dept;
        renderDirectory();
      });
    });
    document.querySelectorAll('.book-btn').forEach(btn => {
      btn.addEventListener('click', () => openBookingModal(btn.dataset.docId));
    });
  }

  function renderDoctorCard(doc, departments, appointments) {
    const dept = departments.find(d => d.id === doc.departmentId);
    const isOnLeave = doc.status === 'On Leave';
    const todayApts = appointments.filter(a => a.doctorId === doc.id && a.date === UI.todayISO() && a.status !== 'Cancelled');

    // Find next available slot
    const { morning, afternoon } = UI.generateSlots();
    const allSlots = [...morning, ...afternoon];
    const bookedSlots = todayApts.map(a => a.timeSlot);
    const nextSlot = allSlots.find(s => !bookedSlots.includes(s));

    return `
      <div class="doctor-card ${isOnLeave ? 'doctor-on-leave' : ''}">
        <div class="doctor-card-header">
          ${UI.avatar(doc.avatarInitials, doc.avatarColor, 'lg')}
          <div class="doctor-card-info">
            <div class="doctor-card-name">${doc.name}</div>
            <div class="doctor-card-creds">${doc.credentials}</div>
            <div style="margin-top:4px;">
              <span class="tag" style="background:${dept ? dept.color + '10' : '#f1f5f9'};color:${dept ? dept.color : '#475569'};border-color:${dept ? dept.color + '30' : '#e2e8f0'};">
                ${dept ? dept.name : ''}
              </span>
              ${isOnLeave ? '<span class="badge badge-cancelled" style="margin-left:4px;"><span class="badge-dot"></span>On Leave</span>' : ''}
            </div>
          </div>
        </div>
        <div class="doctor-card-meta">
          <span class="doctor-card-detail">${Icons.stethoscope(14)} ${doc.specialty}</span>
          <span class="doctor-card-detail">${Icons.clock(14)} ${doc.experienceYears} yrs exp.</span>
          <span class="doctor-card-detail">${Icons.mapPin(14)} Room ${doc.roomNumber}</span>
          <span class="doctor-card-detail">${Icons.star(14)} ${doc.rating}</span>
        </div>
        ${!isOnLeave && nextSlot ? `
          <div style="margin-bottom:14px;">
            <span class="text-xs text-muted">Next available:</span>
            <span class="mono text-sm font-medium" style="color:var(--primary); margin-left:4px;">${nextSlot}</span>
          </div>
        ` : ''}
        <div class="doctor-card-footer">
          <span class="doctor-card-fee">${UI.formatCurrency(doc.consultationFee)}</span>
          <button class="btn btn-primary book-btn" data-doc-id="${doc.id}" ${isOnLeave ? 'disabled' : ''}>
            ${isOnLeave ? 'Unavailable' : `${Icons.calendar(14)} Book Consultation`}
          </button>
        </div>
      </div>
    `;
  }

  /* ---- Booking Modal ---- */
  function openBookingModal(doctorId) {
    const doc = StorageService.getById('doctors', doctorId);
    if (!doc || doc.status === 'On Leave') return;
    const dept = StorageService.getById('departments', doc.departmentId);

    let bookingState = {
      step: 1,
      date: UI.todayISO(),
      selectedSlot: null,
      patientName: '',
      patientPhone: '',
      patientAge: '',
      patientGender: '',
      bloodGroup: '',
      symptoms: '',
    };

    function renderBooking() {
      if (bookingState.step === 1) renderStep1();
      else if (bookingState.step === 2) renderStep2();
      else renderReceipt();
    }

    function renderStep1() {
      const appointments = StorageService.getAll('appointments');
      const bookedSlots = appointments
        .filter(a => a.doctorId === doctorId && a.date === bookingState.date && a.status !== 'Cancelled')
        .map(a => a.timeSlot);
      const { morning, afternoon } = UI.generateSlots();

      UI.openModal(`
        <div class="modal-header">
          <h3>${Icons.calendar(18)} Select Date & Time</h3>
          <button class="btn btn-icon btn-ghost" onclick="UI.closeModal()">${Icons.cross(18)}</button>
        </div>
        <div class="modal-body">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; padding:12px; background:#F8FAFC; border-radius:var(--radius-md); border:1px solid var(--border);">
            ${UI.avatar(doc.avatarInitials, doc.avatarColor)}
            <div>
              <div class="font-semibold">${doc.name}</div>
              <div class="text-sm text-secondary">${doc.specialty} &middot; ${dept ? dept.name : ''}</div>
            </div>
            <div style="margin-left:auto; text-align:right;">
              <div class="mono font-semibold">${UI.formatCurrency(doc.consultationFee)}</div>
              <div class="text-xs text-muted">Consultation fee</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Select Date</label>
            <input type="date" id="booking-date" value="${bookingState.date}" min="${UI.todayISO()}" />
          </div>

          <div class="slot-section-title">${Icons.clock(14)} Morning Slots</div>
          <div class="slot-grid" id="morning-slots">
            ${morning.map(slot => {
              const isBooked = bookedSlots.includes(slot);
              const isSelected = bookingState.selectedSlot === slot;
              return `<button class="slot-btn ${isBooked ? 'slot-booked' : ''} ${isSelected ? 'slot-selected' : ''}" data-slot="${slot}" ${isBooked ? 'disabled' : ''}>${slot}</button>`;
            }).join('')}
          </div>

          <div class="slot-section-title">${Icons.clock(14)} Afternoon Slots</div>
          <div class="slot-grid" id="afternoon-slots">
            ${afternoon.map(slot => {
              const isBooked = bookedSlots.includes(slot);
              const isSelected = bookingState.selectedSlot === slot;
              return `<button class="slot-btn ${isBooked ? 'slot-booked' : ''} ${isSelected ? 'slot-selected' : ''}" data-slot="${slot}" ${isBooked ? 'disabled' : ''}>${slot}</button>`;
            }).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button class="btn btn-primary" id="booking-next" ${!bookingState.selectedSlot ? 'disabled' : ''}>
            Continue ${Icons.arrowRight(14)}
          </button>
        </div>
      `, { size: 'lg' });

      document.getElementById('booking-date').addEventListener('change', (e) => {
        bookingState.date = e.target.value;
        bookingState.selectedSlot = null;
        renderStep1();
      });

      document.querySelectorAll('.slot-btn:not(.slot-booked)').forEach(btn => {
        btn.addEventListener('click', () => {
          bookingState.selectedSlot = btn.dataset.slot;
          renderStep1();
        });
      });

      const nextBtn = document.getElementById('booking-next');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (bookingState.selectedSlot) {
            bookingState.step = 2;
            renderBooking();
          }
        });
      }
    }

    function renderStep2() {
      UI.openModal(`
        <div class="modal-header">
          <h3>${Icons.user(18)} Patient Information</h3>
          <button class="btn btn-icon btn-ghost" onclick="UI.closeModal()">${Icons.cross(18)}</button>
        </div>
        <div class="modal-body">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:20px; padding:10px 14px; background:var(--primary-tint-bg); border:1px solid var(--primary-tint-border); border-radius:var(--radius);">
            ${Icons.calendar(16)}
            <span class="text-sm font-medium" style="color:var(--primary);">
              ${UI.formatDate(bookingState.date)} at <span class="mono">${bookingState.selectedSlot}</span> with ${doc.name}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label form-label-required">Full Name</label>
            <input type="text" id="bk-name" placeholder="Patient full name" value="${bookingState.patientName}" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label form-label-required">Phone Number</label>
              <input type="tel" id="bk-phone" placeholder="10-digit mobile number" value="${bookingState.patientPhone}" />
            </div>
            <div class="form-group">
              <label class="form-label form-label-required">Age</label>
              <input type="number" id="bk-age" placeholder="Age" min="0" max="120" value="${bookingState.patientAge}" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label form-label-required">Gender</label>
              <select id="bk-gender">
                <option value="">Select gender</option>
                <option value="Male" ${bookingState.patientGender === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${bookingState.patientGender === 'Female' ? 'selected' : ''}>Female</option>
                <option value="Other" ${bookingState.patientGender === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Blood Group</label>
              <select id="bk-blood">
                <option value="">Optional</option>
                ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => `<option value="${bg}" ${bookingState.bloodGroup === bg ? 'selected' : ''}>${bg}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label form-label-required">Chief Complaint / Symptoms</label>
            <textarea id="bk-symptoms" placeholder="Describe symptoms, duration, and relevant medical history" rows="3">${bookingState.symptoms}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="bk-back">${Icons.arrowRight(14)} Back</button>
          <button class="btn btn-primary" id="bk-submit">${Icons.check(14)} Confirm Booking</button>
        </div>
      `);

      document.getElementById('bk-back').addEventListener('click', () => {
        bookingState.patientName = document.getElementById('bk-name').value;
        bookingState.patientPhone = document.getElementById('bk-phone').value;
        bookingState.patientAge = document.getElementById('bk-age').value;
        bookingState.patientGender = document.getElementById('bk-gender').value;
        bookingState.bloodGroup = document.getElementById('bk-blood').value;
        bookingState.symptoms = document.getElementById('bk-symptoms').value;
        bookingState.step = 1;
        renderBooking();
      });

      document.getElementById('bk-submit').addEventListener('click', () => {
        const name = document.getElementById('bk-name').value.trim();
        const phone = document.getElementById('bk-phone').value.trim();
        const age = document.getElementById('bk-age').value.trim();
        const gender = document.getElementById('bk-gender').value;
        const blood = document.getElementById('bk-blood').value;
        const symptoms = document.getElementById('bk-symptoms').value.trim();

        // Validation
        let errors = [];
        if (!name) errors.push('Full Name is required');
        if (!phone || phone.length < 10) errors.push('Valid phone number is required');
        if (!age || isNaN(age)) errors.push('Valid age is required');
        if (!gender) errors.push('Gender is required');
        if (!symptoms) errors.push('Please describe your symptoms');

        if (errors.length > 0) {
          UI.toast(errors[0], 'error');
          return;
        }

        // Double-booking check
        const existing = StorageService.getAll('appointments');
        const conflict = existing.find(a =>
          a.doctorId === doctorId &&
          a.date === bookingState.date &&
          a.timeSlot === bookingState.selectedSlot &&
          a.status !== 'Cancelled'
        );
        if (conflict) {
          UI.toast('This slot has been booked. Please select another.', 'error');
          bookingState.step = 1;
          bookingState.selectedSlot = null;
          renderBooking();
          return;
        }

        const aptId = StorageService.generateId('APT');
        const token = StorageService.generateToken(doctorId, bookingState.date);

        const appointment = {
          id: aptId,
          tokenNumber: token,
          patientName: name,
          patientPhone: phone,
          patientEmail: '',
          patientAge: parseInt(age),
          patientGender: gender,
          bloodGroup: blood,
          symptoms: symptoms,
          bookingType: 'Online',
          doctorId: doctorId,
          departmentId: doc.departmentId,
          date: bookingState.date,
          timeSlot: bookingState.selectedSlot,
          fee: doc.consultationFee,
          status: 'Pending',
          clinicalNotes: '',
          prescription: [],
          createdAt: new Date().toISOString(),
        };

        StorageService.add('appointments', appointment);
        bookingState.step = 3;
        bookingState._newApt = appointment;
        renderBooking();
        UI.toast(`Appointment ${aptId} booked successfully`, 'success');
      });
    }

    function renderReceipt() {
      const apt = bookingState._newApt;
      UI.openModal(`
        <div class="modal-header">
          <h3>${Icons.checkCircle(18)} Appointment Confirmed</h3>
          <button class="btn btn-icon btn-ghost" onclick="UI.closeModal()">${Icons.cross(18)}</button>
        </div>
        <div class="modal-body">
          <div class="apt-pass">
            <div style="margin-bottom: 6px; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--ink-muted); font-weight:600;">Appointment Pass</div>
            <div class="apt-pass-id">${apt.id}</div>
            <div class="apt-pass-token">${apt.tokenNumber}</div>
            <div style="font-size:0.75rem; color:var(--ink-muted);">Queue Token</div>
            <div class="apt-pass-detail">
              <div>
                <div class="apt-pass-label">Patient</div>
                <div class="apt-pass-value">${apt.patientName}</div>
              </div>
              <div>
                <div class="apt-pass-label">Phone</div>
                <div class="apt-pass-value mono">${apt.patientPhone}</div>
              </div>
              <div>
                <div class="apt-pass-label">Doctor</div>
                <div class="apt-pass-value">${doc.name}</div>
              </div>
              <div>
                <div class="apt-pass-label">Department</div>
                <div class="apt-pass-value">${dept ? dept.name : ''}</div>
              </div>
              <div>
                <div class="apt-pass-label">Date</div>
                <div class="apt-pass-value">${UI.formatDate(apt.date)}</div>
              </div>
              <div>
                <div class="apt-pass-label">Time</div>
                <div class="apt-pass-value mono">${apt.timeSlot}</div>
              </div>
              <div>
                <div class="apt-pass-label">Room</div>
                <div class="apt-pass-value mono">${doc.roomNumber}</div>
              </div>
              <div>
                <div class="apt-pass-label">Consultation Fee</div>
                <div class="apt-pass-value mono">${UI.formatCurrency(apt.fee)}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="window.print()">${Icons.printer(14)} Print Pass</button>
          <button class="btn btn-primary" id="view-my-apts">${Icons.clipboard(14)} View My Appointments</button>
        </div>
      `, { size: 'lg' });

      document.getElementById('view-my-apts').addEventListener('click', () => {
        UI.closeModal();
        state.activeTab = 'myapts';
        state.lookupQuery = apt.patientPhone;
        render();
      });
    }

    renderBooking();
  }

  /* ---- My Appointments ---- */
  function renderMyAppointments() {
    const contentEl = document.getElementById('patient-content');
    const appointments = StorageService.getAll('appointments');
    const doctors = StorageService.getAll('doctors');
    const departments = StorageService.getAll('departments');

    // Demo patient chips
    const demoPatients = [...new Set(appointments.map(a => a.patientPhone))].slice(0, 5);
    const demoNames = {};
    appointments.forEach(a => { demoNames[a.patientPhone] = a.patientName; });

    let found = [];
    if (state.lookupQuery) {
      const q = state.lookupQuery.trim().toUpperCase();
      found = appointments.filter(a =>
        a.patientPhone === state.lookupQuery.trim() ||
        a.id.toUpperCase() === q
      );
    }

    contentEl.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>${Icons.search(16)} Look Up Your Appointments</h3>
        </div>
        <div class="card-body">
          <div class="form-group" style="max-width:400px;">
            <label class="form-label">Phone Number or Appointment ID</label>
            <input type="text" id="lookup-input" placeholder="Enter phone number or APT-XXXX" value="${state.lookupQuery}" />
          </div>

          <div style="margin-top:12px; display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
            <span class="text-xs text-muted" style="margin-right:4px;">Quick select:</span>
            ${demoPatients.map(phone => `
              <button class="tag demo-chip" data-phone="${phone}" style="cursor:pointer;">
                ${Icons.user(12)} ${demoNames[phone] || phone}
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      ${state.lookupQuery ? `
        <div style="margin-top:20px;">
          ${found.length === 0 ? `
            <div class="empty-state card">
              ${Icons.clipboard(40)}
              <h3>No appointments found</h3>
              <p>Check the phone number or appointment ID and try again.</p>
            </div>
          ` : `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
              <h3 class="text-secondary">${found.length} appointment${found.length > 1 ? 's' : ''} found</h3>
            </div>
            ${found.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(apt => {
              const doc = doctors.find(d => d.id === apt.doctorId);
              const dept = departments.find(d => d.id === apt.departmentId);
              return renderMyAptCard(apt, doc, dept);
            }).join('')}
          `}
        </div>
      ` : ''}
    `;

    document.getElementById('lookup-input').addEventListener('input', (e) => {
      state.lookupQuery = e.target.value;
      renderMyAppointments();
    });

    document.querySelectorAll('.demo-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.lookupQuery = chip.dataset.phone;
        document.getElementById('lookup-input').value = chip.dataset.phone;
        renderMyAppointments();
      });
    });

    // Reschedule & cancel buttons
    document.querySelectorAll('.my-apt-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        UI.confirm({
          title: 'Cancel Appointment',
          message: `Are you sure you want to cancel appointment ${btn.dataset.aptId}? This action cannot be undone.`,
          danger: true,
          confirmText: 'Yes, Cancel',
          onConfirm: () => {
            StorageService.update('appointments', btn.dataset.aptId, { status: 'Cancelled' });
            UI.toast('Appointment cancelled', 'info');
            renderMyAppointments();
          }
        });
      });
    });

    document.querySelectorAll('.my-apt-reschedule').forEach(btn => {
      btn.addEventListener('click', () => {
        const apt = StorageService.getById('appointments', btn.dataset.aptId);
        if (apt) openRescheduleModal(apt);
      });
    });

    document.querySelectorAll('.my-apt-view-rx').forEach(btn => {
      btn.addEventListener('click', () => {
        const apt = StorageService.getById('appointments', btn.dataset.aptId);
        if (apt) showPrescriptionModal(apt);
      });
    });
  }

  function renderMyAptCard(apt, doc, dept) {
    const canCancel = ['Pending', 'Confirmed'].includes(apt.status);
    const canReschedule = ['Pending', 'Confirmed'].includes(apt.status);
    const hasRx = apt.status === 'Completed' && (apt.prescription.length > 0 || apt.clinicalNotes);

    return `
      <div class="my-apt-card">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; gap:12px; align-items:center;">
            ${doc ? UI.avatar(doc.avatarInitials, doc.avatarColor) : ''}
            <div>
              <div class="font-semibold">${doc ? doc.name : 'Unknown Doctor'}</div>
              <div class="text-sm text-secondary">${dept ? dept.name : ''} ${doc ? '&middot; Room ' + doc.roomNumber : ''}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="mono text-sm font-medium" style="color:var(--primary);">${apt.id}</div>
            ${UI.statusBadge(apt.status)}
          </div>
        </div>
        <div style="display:flex; gap:20px; margin-top:12px; flex-wrap:wrap;">
          <span class="text-sm text-secondary">${Icons.calendar(14)} ${UI.formatDate(apt.date)}</span>
          <span class="text-sm mono">${Icons.clock(14)} ${apt.timeSlot}</span>
          <span class="text-sm">${Icons.hash(14)} Token: <strong class="mono">${apt.tokenNumber}</strong></span>
          <span class="text-sm mono">${Icons.dollarSign(14)} ${UI.formatCurrency(apt.fee)}</span>
        </div>
        <div style="margin-top:8px;">
          <span class="text-xs text-muted">Symptoms:</span>
          <span class="text-sm text-secondary"> ${apt.symptoms}</span>
        </div>
        <div style="margin-top:12px; display:flex; gap:6px; flex-wrap:wrap;">
          ${canReschedule ? `<button class="btn btn-sm btn-outline my-apt-reschedule" data-apt-id="${apt.id}">${Icons.calendar(12)} Reschedule</button>` : ''}
          ${canCancel ? `<button class="btn btn-sm btn-danger my-apt-cancel" data-apt-id="${apt.id}">${Icons.cross(12)} Cancel</button>` : ''}
          ${hasRx ? `<button class="btn btn-sm btn-tint my-apt-view-rx" data-apt-id="${apt.id}">${Icons.fileText(12)} View Prescription</button>` : ''}
        </div>
      </div>
    `;
  }

  /* ---- Reschedule Modal ---- */
  function openRescheduleModal(apt) {
    const doc = StorageService.getById('doctors', apt.doctorId);
    if (!doc) return;

    let newDate = apt.date < UI.todayISO() ? UI.todayISO() : apt.date;
    let newSlot = null;

    function renderReschedule() {
      const appointments = StorageService.getAll('appointments');
      const bookedSlots = appointments
        .filter(a => a.doctorId === apt.doctorId && a.date === newDate && a.status !== 'Cancelled' && a.id !== apt.id)
        .map(a => a.timeSlot);
      const { morning, afternoon } = UI.generateSlots();

      UI.openModal(`
        <div class="modal-header">
          <h3>${Icons.calendar(18)} Reschedule Appointment</h3>
          <button class="btn btn-icon btn-ghost" onclick="UI.closeModal()">${Icons.cross(18)}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">New Date</label>
            <input type="date" id="resched-date" value="${newDate}" min="${UI.todayISO()}" />
          </div>
          <div class="slot-section-title">Morning Slots</div>
          <div class="slot-grid">
            ${morning.map(s => {
              const booked = bookedSlots.includes(s);
              const sel = newSlot === s;
              return `<button class="slot-btn resched-slot ${booked ? 'slot-booked' : ''} ${sel ? 'slot-selected' : ''}" data-slot="${s}" ${booked ? 'disabled' : ''}>${s}</button>`;
            }).join('')}
          </div>
          <div class="slot-section-title">Afternoon Slots</div>
          <div class="slot-grid">
            ${afternoon.map(s => {
              const booked = bookedSlots.includes(s);
              const sel = newSlot === s;
              return `<button class="slot-btn resched-slot ${booked ? 'slot-booked' : ''} ${sel ? 'slot-selected' : ''}" data-slot="${s}" ${booked ? 'disabled' : ''}>${s}</button>`;
            }).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button class="btn btn-primary" id="resched-confirm" ${!newSlot ? 'disabled' : ''}>Confirm Reschedule</button>
        </div>
      `, { size: 'lg' });

      document.getElementById('resched-date').addEventListener('change', (e) => {
        newDate = e.target.value;
        newSlot = null;
        renderReschedule();
      });

      document.querySelectorAll('.resched-slot:not(.slot-booked)').forEach(btn => {
        btn.addEventListener('click', () => {
          newSlot = btn.dataset.slot;
          renderReschedule();
        });
      });

      const confirmBtn = document.getElementById('resched-confirm');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          if (!newSlot) return;
          const newToken = StorageService.generateToken(apt.doctorId, newDate);
          StorageService.update('appointments', apt.id, {
            date: newDate,
            timeSlot: newSlot,
            tokenNumber: newToken,
          });
          UI.closeModal();
          UI.toast('Appointment rescheduled successfully', 'success');
          renderMyAppointments();
        });
      }
    }

    renderReschedule();
  }

  /* ---- View Prescription Modal ---- */
  function showPrescriptionModal(apt) {
    const doc = StorageService.getById('doctors', apt.doctorId);
    UI.openModal(`
      <div class="modal-header">
        <h3>${Icons.fileText(18)} Clinical Notes & Prescription</h3>
        <button class="btn btn-icon btn-ghost" onclick="UI.closeModal()">${Icons.cross(18)}</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom:16px; padding:12px; background:#F8FAFC; border-radius:var(--radius); border:1px solid var(--border);">
          <div class="text-xs text-muted font-semibold" style="text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px;">Consultation Summary</div>
          <div class="text-sm"><strong>Patient:</strong> ${apt.patientName} &middot; <strong>Date:</strong> ${UI.formatDate(apt.date)} at <span class="mono">${apt.timeSlot}</span></div>
          <div class="text-sm"><strong>Doctor:</strong> ${doc ? doc.name : 'N/A'} &middot; <strong>ID:</strong> <span class="mono">${apt.id}</span></div>
        </div>

        ${apt.clinicalNotes ? `
          <div class="form-group">
            <label class="form-label">Clinical Diagnosis & Notes</label>
            <div style="padding:10px 12px; background:#F8FAFC; border-radius:var(--radius); border:1px solid var(--border); font-size:0.875rem; color:var(--ink-secondary);">${apt.clinicalNotes}</div>
          </div>
        ` : ''}

        ${apt.prescription.length > 0 ? `
          <div class="form-group">
            <label class="form-label">${Icons.pill(14)} Prescribed Medications</label>
            <table class="data-table" style="margin-top:8px;">
              <thead>
                <tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Duration</th></tr>
              </thead>
              <tbody>
                ${apt.prescription.map((rx, i) => `
                  <tr>
                    <td class="mono">${i + 1}</td>
                    <td class="font-medium">${rx.medicine}</td>
                    <td class="text-secondary">${rx.dosage}</td>
                    <td class="mono">${rx.duration}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p class="text-sm text-muted">No medications prescribed.</p>'}
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="window.print()">${Icons.printer(14)} Print</button>
        <button class="btn btn-primary" onclick="UI.closeModal()">Close</button>
      </div>
    `, { size: 'lg' });
  }

  return { render };
})();
