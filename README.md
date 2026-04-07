# 🚂 RAC Reallocation System

**Proof of Concept (PoC)** to automate the reallocation of vacant train berths to RAC passengers. A **real-time Railway RAC (Reservation Against Cancellation) seat reallocation system** built with the MERN stack. This system enables dynamic seat upgrades for RAC passengers when confirmed berths become vacant due to no-shows or cancellations.

---

## 🌐 Live Demo

> **Try the live application!** Deployed on Render (backend) + Vercel (frontends).

| Portal | Live URL | Login |
|--------|----------|-------|
| **Admin Portal** | [rac-admin-portal.vercel.app](https://rac-admin-portal.vercel.app) | `ADMIN_0![alt text](image.png)` / `Prasanth@123` |
| **TTE Portal** | [rac-tte.vercel.app](https://rac-tte.vercel.app) | `TTE_01` / `Prasanth@123` |
| **Passenger Portal** | [rac-passenger-portal.vercel.app](https://rac-passenger-portal.vercel.app) | PNR: `1722500001` |
| **Backend API** | [poratls-of-rac-4u83.onrender.com](https://poratls-of-rac-4u83.onrender.com) | - |

> ⚠️ **Note**: Backend is on Render's free tier and may take ~30 seconds to wake up after inactivity.

---

## 🏗️ System Architecture

```
RAC-Reallocation-System/
├── backend/              # Express.js REST API + WebSocket Server (Port 5000)
├── admin-portal/          # Vite + React Admin Portal (Port 3000)
├── passenger-portal/     # Vite + React Passenger Portal (Port 5175)
├── tte-portal/           # Vite + React TTE Portal (Port 5174)
└── Frontend/             # Unified Frontend Monorepo (all 3 portals)
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

**Test Stats:** 50 test suites (all passing) · 1,153 unit & integration tests ✅

---

## ✨ Key Features

### 🎫 Passenger Portal
- PNR check and journey status
- **Multi-passenger booking support (up to 6 per PNR)**
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

### Multi-Passenger Booking
Supports multiple passengers under a single PNR:
- **Maximum 6 passengers per PNR** (IRCTC standard)
- **Group leader tracking** for notifications

### Dual-Approval Workflow
1. **System identifies** eligible RAC passengers (boarded + journey overlap)
2. **TTE approves** the reallocation from the TTE Portal
3. **Passenger confirms** the upgrade from their portal

### Robust State Persistence
The system uses a multi-layer persistence strategy:
- **Backend:** MongoDB persists critical journey state to survive server restarts
- **Frontend:** IndexedDB caches session state to handle browser refreshes seamlessly

---

## 🚀 Local Development Setup

### Prerequisites

| Requirement | Version | Download |
|-------------|---------|----------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org) |
| **npm** | v9+ | Included with Node.js |
| **MongoDB** | v6+ | [mongodb.com](https://www.mongodb.com/try/download/community) |
| **Git** | Any | [git-scm.com](https://git-scm.com) (optional) |

```bash
# Verify installations
node --version   # Should show v18+
npm --version    # Should show v9+
mongod --version # Should show v6+
```

### Step 1: Install Dependencies

```bash
# Clone the repository (or download ZIP)
git clone https://github.com/YOUR_USERNAME/rac-reallocation-system.git
cd rac-reallocation-system

# Install all modules
cd backend && npm install && cd ..
cd admin-portal && npm install && cd ..
cd passenger-portal && npm install && cd ..
cd tte-portal && npm install && cd ..
```

> **Tip**: On Windows, run installations in PowerShell with admin privileges to avoid permission issues.

### Step 2: Start MongoDB

```bash
# Start MongoDB service
mongod

# Or if installed as Windows service:
net start MongoDB

# Verify MongoDB is running
mongosh --eval "db.runCommand({ ping: 1 })"
```

### Step 3: Configure Environment

```bash
# Copy environment template
copy backend\.env.example backend\.env
```

Edit `backend/.env` with these values:

```env
# ═══════════════════════════════════════════════════════
# MONGODB CONFIGURATION (REQUIRED)
# ═══════════════════════════════════════════════════════
MONGODB_URI=mongodb://localhost:27017
STATIONS_DB=rac
PASSENGERS_DB=PassengersDB
TRAIN_DETAILS_DB=rac
STATIONS_COLLECTION=17225
PASSENGERS_COLLECTION=17225_passengers
TRAIN_DETAILS_COLLECTION=Trains_Details
DEFAULT_TRAIN_NO=17225

# ═══════════════════════════════════════════════════════
# SERVER CONFIGURATION (REQUIRED)
# ═══════════════════════════════════════════════════════
PORT=5000
NODE_ENV=development
LOG_LEVEL=INFO

# ═══════════════════════════════════════════════════════
# JWT AUTHENTICATION (REQUIRED - Change in Production!)
# ═══════════════════════════════════════════════════════
JWT_SECRET=rac-reallocation-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h

# ═══════════════════════════════════════════════════════
# WEB PUSH VAPID KEYS (REQUIRED for push notifications)
# Generate: npx web-push generate-vapid-keys
# ═══════════════════════════════════════════════════════
VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY_HERE
VAPID_PRIVATE_KEY=YOUR_VAPID_PRIVATE_KEY_HERE
VAPID_EMAIL=mailto:admin@example.com

# ═══════════════════════════════════════════════════════
# CORS CONFIGURATION
# ═══════════════════════════════════════════════════════
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175

# ═══════════════════════════════════════════════════════
# OPTIONAL: EMAIL NOTIFICATIONS (Gmail SMTP)
# Requires 2FA + App Password: https://myaccount.google.com/apppasswords
# ═══════════════════════════════════════════════════════
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

> **Note**: Frontend `.env` files are OPTIONAL. The portals have hardcoded defaults.

### Step 4: Create Test Accounts

```bash
cd backend
node scripts/createTestAccounts.js
cd ..
```

This creates:

| User Type | ID | Password | Role |
|-----------|----|----------|------|
| **Admin** | `ADMIN_01` | `Prasanth@123` | Full access |
| **TTE** | `TTE_01` | `Prasanth@123` | Train staff |
| **Passenger** | `IR_0001` | `Prasanth@123` | Passenger |

> If you get "already exists" warnings, accounts are already created. The script is idempotent.

### Step 5: Start All Servers (4 Terminals)

```bash
# Terminal 1: Backend API
cd backend && npm run dev

# Terminal 2: Admin Portal
cd admin-portal && npm run dev

# Terminal 3: Passenger Portal
cd passenger-portal && npm run dev

# Terminal 4: TTE Portal
cd tte-portal && npm run dev
```

### Access URLs

| Portal | URL | Default Login |
|--------|-----|---------------|
| **Backend API** | http://localhost:5000 | - |
| **Admin Portal** | http://localhost:3000 | `ADMIN_01` / `Prasanth@123` |
| **TTE Portal** | http://localhost:5174 | `TTE_01` / `Prasanth@123` |
| **Passenger Portal** | http://localhost:5175 | `IR_0001` / `Prasanth@123` |
| **Swagger API Docs** | http://localhost:5000/api-docs | - |
| **Health Check** | http://localhost:5000/api/health | - |

### ✅ Verification Checklist

- [ ] MongoDB running (`mongosh --eval "db.runCommand({ ping: 1 })"`)
- [ ] Backend starts without errors (Terminal 1)
- [ ] All 3 frontends accessible (Terminals 2-4)
- [ ] Can login to Admin Portal with `ADMIN_01`
- [ ] WebSocket connection shows in browser console: `✅ WebSocket connected`
- [ ] Health check returns JSON: http://localhost:5000/api/health

---

## 🔔 Notification Setup

### Web Push (Browser Notifications) — REQUIRED FOR UPGRADES

```bash
# Generate fresh VAPID keys
npx web-push generate-vapid-keys
```

Copy the public and private keys to `backend/.env` (`VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`) and restart the backend.

### Email Notifications — OPTIONAL

1. Enable **2-Factor Authentication** on Gmail
2. Generate **App Password**: https://myaccount.google.com/apppasswords
3. Copy 16-character password to `backend/.env`

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # Remove spaces
```

---

## 🔐 Authentication & Security

| Feature | Details |
|---------|---------|
| **Access Token** | 24h expiry (stored in localStorage) |
| **Refresh Token** | 7 days (httpOnly cookie) |
| **CSRF Protection** | Enabled on all state-changing requests |
| **Rate Limiting** | 100 requests per 15 minutes per IP |

### Login Endpoints
```http
POST /api/auth/passenger/login   # Passenger login (IRCTC_ID + password)
POST /api/auth/staff/login        # Admin/TTE login (employeeId + password)
POST /api/auth/refresh            # Refresh access token
GET  /api/csrf-token              # Get CSRF token
```

---

## 🔌 API Overview

| Category | Endpoint Examples |
|----------|-------------------|
| **Train** | `POST /api/train/initialize`, `GET /api/train/state` |
| **Passenger** | `GET /api/passenger/search/:pnr`, `POST /api/passenger/no-show` |
| **Multi-Booking** | `POST /api/passenger/booking`, `POST /api/passenger/:pnr/board-all` |
| **Reallocation** | `GET /api/reallocation/pending`, `POST /api/reallocation/approve-batch` |
| **Visualization** | `GET /api/visualization/segment-matrix`, `GET /api/visualization/graph` |

Full API documentation available at `/api-docs` when backend is running.

---

## 🔌 WebSocket Real-Time Events

Connect to: `ws://localhost:5000`

| Event | Description |
|-------|-------------|
| `CONNECTION_SUCCESS` | Client connected |
| `TRAIN_UPDATE` | Train state changed |
| `STATION_ARRIVAL` | Train arrived at station |
| `RAC_REALLOCATION` | RAC upgraded to CNF |
| `NO_SHOW` | Passenger marked no-show |
| `upgrade:offer` | Upgrade offer sent |
| `upgrade:confirmed` | Upgrade confirmed by TTE |
| `upgrade:expired` | Offer expired |

**Subscribe to PNR updates:**
```javascript
ws.send(JSON.stringify({
  type: 'subscribe:offers',
  payload: { pnr: 'YOUR_PNR' }
}));
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend

npm test              # All tests
npm run test:coverage # With coverage report
npm run test:chaos    # Chaos tests (WebSocket, failure injection)
npm run test:watch    # Watch mode
```

### Frontend E2E Tests (Playwright)
```bash
cd admin-portal

npx playwright install       # Install browsers (one-time)
npm run test:e2e             # Headless
npm run test:e2e:headed      # With browser
npm run test:e2e:ui          # Interactive UI
```

### Load Tests (k6)
```bash
winget install k6            # Install k6 first

cd backend
k6 run k6/scenarios/reallocation-load.js   # High passenger load
k6 run k6/scenarios/station-events.js      # Concurrent station events
k6 run k6/scenarios/tte-actions.js         # Multiple TTE actions
```

---

## 🐳 Docker Deployment

### Start with Docker

```bash
# Start all services (MongoDB + Backend + All 3 Portals)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Rebuild images
docker-compose build --no-cache
```

### Docker URLs

| Service | URL |
|---------|-----|
| **Backend API** | http://localhost:5000 |
| **Admin Portal** | http://localhost:3000 |
| **TTE Portal** | http://localhost:5174 |
| **Passenger Portal** | http://localhost:5175 |
| **MongoDB** | localhost:27017 |

### Useful Docker Commands

```bash
# Build & run with production config
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Enter container shell
docker exec -it rac-backend sh
docker exec -it rac-mongodb mongosh

# Full cleanup
docker system prune -a
```

---

## 📦 Available Scripts

### Backend (`backend/package.json`)
```bash
npm run dev          # Start with nodemon (auto-reload)
npm start            # Production start
npm test             # Run all Jest tests
npm run test:coverage # Generate coverage report
npm run test:chaos   # Run chaos tests only
```

### Admin Portal (`admin-portal/package.json`)
```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test:e2e     # Run Playwright tests
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection failed | Start MongoDB: `mongod` or `net start MongoDB` |
| Port already in use | Kill process: `npx kill-port 5000` |
| CORS errors | Check `ALLOWED_ORIGINS` in `.env` includes your frontend URLs |
| Login fails | Run `node scripts/createTestAccounts.js` |
| Push notifications not working | Regenerate VAPID keys: `npx web-push generate-vapid-keys` |
| Duplicate reallocations | Restart backend — auto-cleanup on startup |
| 403 Forbidden errors | Token expired — re-login or check role |
| WebSocket not connecting | Ensure backend running on port 5000, check `WS_URL` in frontend |
| "Cannot find module" errors | Re-run `npm install` in the affected directory |
| Vite port conflict | Free ports: `npx kill-port 5173 5174 5175` |

---

## 🎯 Next Steps After Setup

1. **Initialize Train Data** — Login to Admin Portal → Click "Initialize Train"
2. **Test Reallocation Flow** — Mark no-show (TTE) → Check RAC queue (Admin) → Accept upgrade (Passenger)
3. **Monitor Real-Time Events** — Open browser DevTools → Console → Watch WebSocket messages
4. **Explore API Documentation** — Visit http://localhost:5000/api-docs

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

**Proof of Concept built for Indian Railways — Train 17225 Amaravathi Express** 🚂

**Last Updated:** February 26, 2026
