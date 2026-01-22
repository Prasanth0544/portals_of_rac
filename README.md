# 🚂 RAC Reallocation System

A **real-time Railway RAC (Reservation Against Cancellation) seat reallocation system** built with the MERN stack. This system enables dynamic seat upgrades for RAC passengers when confirmed berths become vacant due to no-shows or cancellations.

---

## 📋 Quick Links

| Document | Purpose |
|----------|---------|
| **[QUICKSTART.md](QUICKSTART.md)** | Local development setup and installation |
| **[SECURITY_TODO.md](SECURITY_TODO.md)** | Security features and implementation status |
| **[dot_md_files/](dot_md_files/)** | Technical documentation and architecture details |
| **[backend/README.md](backend/README.md)** | Backend API documentation |

---

## 🌐 Live Demo

> **Try the live application!** Deployed on Render (backend) + Vercel (frontends).

| Portal | Live URL | Login |
|--------|----------|-------|
| **Admin Portal** | [rac-admin-portal.vercel.app](https://rac-admin-portal.vercel.app) | `ADMIN_01` / `Prasanth@123` |
| **TTE Portal** | [rac-tte.vercel.app](https://rac-tte.vercel.app) | `TTE_01` / `Prasanth@123` |
| **Passenger Portal** | [rac-passenger-portal.vercel.app](https://rac-passenger-portal.vercel.app) | PNR: `1722500001` |
| **Backend API** | [poratls-of-rac-4u83.onrender.com](https://poratls-of-rac-4u83.onrender.com) | - |

> ⚠️ **Note**: Backend is on Render's free tier and may take ~30 seconds to wake up after inactivity.

---

## 🏗️ System Architecture

```
RAC-Reallocation-System/
├── backend/              # Express.js REST API + WebSocket Server (Port 5000)
├── frontend/             # Vite + React Admin Portal (Port 3000)
├── passenger-portal/     # Vite + React Passenger Portal (Port 5175)
└── tte-portal/           # Vite + React TTE Portal (Port 5174)
```

### Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Backend** | Node.js, Express.js 4.18, MongoDB 6.3, WebSocket (ws), JWT Auth |
| **Frontend** | Vite 6.4, React 19, Material-UI 7, Axios, WebSocket Client |
| **Database** | MongoDB with dynamic collections per train/date |
| **Notifications** | Web Push (VAPID), Email (Nodemailer), In-App (WebSocket) |
| **Security** | CSRF protection, rate limiting, JWT refresh tokens, bcrypt |
| **Testing** | Jest 30, Supertest, 1,153 unit & integration tests |

### Test Coverage

| Category | Coverage | Status |
|----------|----------|--------|
| **Overall** | **79.57%** | ✅ Exceeds target (70%) |
| Services | 88.37% | ✅ |
| Reallocation | 89.71% | ✅ |
| Utils | 71.55% | ✅ |
| Controllers | 68.58% | 🟡 |

**Test Stats:**
- 50 test suites (all passing)
- 1,153 unit & integration tests ✅
- Coverage report: `backend/coverage/index.html`

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ and npm
- MongoDB v6+ running locally
- Git (optional)

### Installation

```bash
# 1. Install all dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd passenger-portal && npm install && cd ..
cd tte-portal && npm install && cd ..

# 2. Copy environment template
copy backend\.env.example backend\.env

# 3. Create test accounts (requires MongoDB running)
cd backend && node scripts/createTestAccounts.js && cd ..
```

### Start All Servers (4 terminals)

```bash
# Terminal 1: Backend API
cd backend && npm run dev

# Terminal 2: Admin Portal
cd frontend && npm run dev

# Terminal 3: Passenger Portal
cd passenger-portal && npm run dev

# Terminal 4: TTE Portal
cd tte-portal && npm run dev
```

### Access URLs

| Portal | URL | Default Login |
|--------|-----|---------------|
| **Admin Portal** | http://localhost:3000 | `ADMIN_01` / `Prasanth@123` |
| **TTE Portal** | http://localhost:5174 | `TTE_01` / `Prasanth@123` |
| **Passenger Portal** | http://localhost:5175 | `IR_0001` / `Prasanth@123` |
| **API Docs** | http://localhost:5000/api-docs | - |

---

## ✨ Key Features

### 🎫 Passenger Portal
- PNR check and journey status
- Real-time upgrade notifications with countdown timers
- Accept/deny upgrade offers
- QR code boarding pass generation
- Push notification support (works even when browser is closed)

### 👮 TTE Portal
- Dashboard with train statistics
- Passenger verification and management
- No-show marking with reasons
- RAC reallocation approval workflow
- Station-by-station journey progression
- Action history with undo capability

### 🔐 Admin Portal
- Complete train initialization
- Real-time coach and berth visualization
- Segment-based occupancy matrix
- RAC queue management
- Station-wise reallocation phase controls

### ⚙️ Backend API
- 84 REST API endpoints (39 GET, 45 POST)
- Real-time WebSocket broadcasting
- Automatic RAC-to-CNF upgrades
- Segment-based berth tracking
- Multi-train support
- Comprehensive test coverage

---

## 📊 Core Concepts

### Segment-Based Occupancy
The system tracks berth occupancy per journey segment (station-to-station), allowing the same berth to be used by different passengers on non-overlapping journey segments. This maximizes berth utilization.

### RAC Priority System
RAC passengers are processed in strict order:
- **RAC 1** has highest priority → upgraded first
- **RAC 2** is next → upgraded second
- And so on...

### Dual-Approval Workflow
1. **System identifies** eligible RAC passengers (boarded + journey overlap)
2. **TTE approves** the reallocation from the TTE Portal
3. **Passenger confirms** the upgrade from their portal

### Robust State Persistence
The system uses a multi-layer persistence strategy:
- **Backend:** **MongoDB** persists critical journey state (Current Station, Journey Started) to survive server restarts.
- **Frontend:** **IndexedDB** caches session state to handle browser refreshes seamlessly.

---

## 🔌 API Overview

| Category | Endpoint Examples |
|----------|-------------------|
| **Train** | `POST /api/train/initialize`, `GET /api/train/state` |
| **Passenger** | `GET /api/passenger/search/:pnr`, `POST /api/passenger/no-show` |
| **Reallocation** | `GET /api/reallocation/pending`, `POST /api/reallocation/approve-batch` |
| **Auth** | `POST /api/auth/staff/login`, `POST /api/auth/passenger/login` |
| **TTE** | `GET /api/tte/passengers`, `POST /api/tte/mark-no-show` |

Full API documentation available at `/api-docs` when backend is running.

---

## 🔔 Notification System

| Type | Technology | Configuration |
|------|------------|---------------|
| **Push** | Web Push API (VAPID) | Generate keys: `npx web-push generate-vapid-keys` |
| **Email** | Nodemailer (Gmail SMTP) | Gmail App Password required |
| **In-App** | WebSocket | Automatic - no config needed |

> **Note**: Only Push notifications are required for full functionality. Email is optional.

---

## 📁 Environment Variables

The **only required** `.env` file is `backend/.env`. See [QUICKSTART.md](QUICKSTART.md) for complete configuration.

**Essential variables:**
```env
MONGODB_URI=mongodb://localhost:27017
JWT_SECRET=<generate-random-secret-here>
VAPID_PUBLIC_KEY=<your-vapid-public-key>
VAPID_PRIVATE_KEY=<your-vapid-private-key>
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection failed | Ensure MongoDB is running: `mongod` |
| CORS errors | Backend has CORS enabled for development |
| Login fails | Run `node scripts/createTestAccounts.js` |
| Push notifications not working | Regenerate VAPID keys and restart backend |
| Duplicate reallocations | Restart backend - auto-cleanup on startup |
| 403 Forbidden errors | Token expired - re-login or check role |

---

## 📊 Project Statistics

| Metric | Value |
|--------|-------|
| **Total Lines of Code** | 40,000+ (excluding deps) |
| **Backend Services** | 20+ services |
| **API Endpoints** | 50+ routes |
| **Frontend Pages** | 23 (Admin), 17 (TTE), 10 (Passenger) |
| **Test Suites** | 50 |
| **Unit Tests** | 1,153 |
| **Test Coverage** | 79.57% |

---

## 📄 License

ISC

---

**Built for Indian Railways - Train 17225 Amaravathi Express** 🚂

**Last Updated:** 2025-12-25
