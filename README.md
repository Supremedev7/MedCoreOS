# MedCore OS

A clinical-grade **Hospital Appointment & Clinical Management System** running 100% in the browser with `localStorage` as a reactive database.

![MedCore OS](https://img.shields.io/badge/MedCore_OS-v1.0-0F766E?style=for-the-badge) ![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) ![No Dependencies](https://img.shields.io/badge/Zero_Dependencies-✓-22C55E?style=for-the-badge)

## Features

### 🏥 Patient Portal
- Doctor directory with department filters, search & availability indicators
- 2-step booking flow with real-time slot locking (prevents double-booking)
- Appointment lookup with reschedule, cancel & prescription view

### 🩺 Doctor Workstation
- Active doctor context switcher with KPI dashboard
- Queue management with full status workflow (Pending → Confirmed → In-Consultation → Completed)
- EHR consultation panel with clinical notes & e-Prescription builder

### 🛡️ Admin Command Center
- Executive KPI dashboard with department load breakdown
- Master appointment registry with inline CRUD
- Walk-in registration, medical staff management
- Full database import/export/reset utilities

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JavaScript (zero dependencies)
- **Styling:** Custom design system (Linear × One Medical aesthetic)
- **Icons:** Inline Lucide SVGs (1.5px stroke)
- **Data:** Reactive `localStorage` engine with namespaced collections
- **Fonts:** Inter + JetBrains Mono (Google Fonts)

## Quick Start

```bash
# Clone the repo
git clone https://github.com/$(gh api user -q .login)/MedCoreOS.git
cd MedCoreOS

# Serve locally (any static server works)
python3 -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080` in your browser.

## Project Structure

```
MedCoreOS/
├── index.html        # Entry point
├── styles.css        # Design system & all styles
├── icons.js          # 30+ inline Lucide SVG icons
├── storage.js        # Reactive localStorage CRUD engine
├── seed.js           # Demo data (6 depts, 8 doctors, 12 appointments)
├── components.js     # Shared UI: toasts, modals, badges, slot generator
├── patient.js        # Patient Portal module
├── doctor.js         # Doctor Workstation module
├── admin.js          # Admin Command Center module
└── app.js            # Main controller, role switcher, clock
```

## License

MIT
