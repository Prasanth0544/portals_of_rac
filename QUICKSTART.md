# 🚀 RAC Reallocation System - Quick Start Guide

Get up and running with the **Dynamic RAC Reallocation System** in minutes.

> [!IMPORTANT]
> This guide reflects the **actual** project structure. All commands have been verified against the codebase.

---

## 📋 Prerequisites

| Requirement | Version | Download | Notes |
|-------------|---------|----------|-------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org) | Includes npm |
| **npm** | v9+ | Included with Node.js | - |
| **MongoDB** | v6+ | [mongodb.com](https://www.mongodb.com/try/download/community) | Must be running |
| **Git** | Any | [git-scm.com](https://git-scm.com) | Optional |

**Verify installations:**
```bash
node --version   # Should show v18+
npm --version    # Should show v9+
mongod --version # Should show v6+
```

---

## 🏗️ Project Architecture

```
RAC-Reallocation-System/
├── backend/              # Express.js API + WebSocket (Port 5000)
├── frontend/             # Admin Portal - Vite + React (Port 5173)
├── passenger-portal/     # Passenger Portal - Vite + React (Port 5175)
├── tte-portal/           # TTE Portal - Vite + React (Port 5174)
├── docker-compose.yml    # Docker deployment
└── k8s/                  # Kubernetes manifests
```

### Technology Stack

| Component | Technologies |
|-----------|-------------|
| **Backend** | Node.js, Express, MongoDB, WebSocket (ws), JWT, node-cache |
| **Frontend** | React 19, Vite 6, Material-UI 7, Axios, WebSocket Client |
| **Database** | MongoDB 7 (dual-database architecture) |
| **Real-time** | WebSocket with PNR-based subscriptions |
| **Notifications** | Web Push (VAPID), Email (Nodemailer) |
| **Testing** | Jest 30, Playwright 1.40, k6 |

---

## ⚡ Installation

### Step 1: Install All Dependencies

```bash
# Navigate to project root
cd c:\Users\prasa\Desktop\RAC\zip_2

# Install Backend
cd backend && npm install && cd ..

# Install Admin Portal
cd frontend && npm install && cd ..

# Install Passenger Portal
cd passenger-portal && npm install && cd ..

# Install TTE Portal
cd tte-portal && npm install && cd ..
```

> [!TIP]
> On Windows, run installations in PowerShell with admin privileges to avoid permission issues.

---

### Step 2: Start MongoDB

```bash
# Start MongoDB service
mongod

# Or if installed as Windows service:
net start MongoDB

# Verify MongoDB is running
mongosh --eval "db.runCommand({ ping: 1 })"
```

---

### Step 3: Configure Backend Environment

```bash
# Copy environment template
copy backend\.env.example backend\.env
```

**Edit `backend/.env`** with these **REQUIRED** values:

```env
# ═══════════════════════════════════════════════════════
# MONGODB CONFIGURATION (REQUIRED)
# ═══════════════════════════════════════════════════════
MONGODB_URI=mongodb://localhost:27017

# Database Names
STATIONS_DB=rac
PASSENGERS_DB=rac
TRAIN_DETAILS_DB=rac

# Collection Names
STATIONS_COLLECTION=17225
PASSENGERS_COLLECTION=17225_passengers
TRAIN_DETAILS_COLLECTION=Trains_Details

# Train Configuration
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
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
VAPID_PRIVATE_KEY=UUxI4O8-FbRouAf7-7PVTv1qCIqAThH7t6lFQCRVnDY
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

> [!NOTE]
> **Frontend `.env` files are OPTIONAL.** The portals have hardcoded defaults. Only create them if you need custom API URLs.

---

### Step 4: Create Test User Accounts

```bash
cd backend
node scripts/createTestAccounts.js
cd ..
```

**This creates:**

| User Type | Employee/IRCTC ID | Password | Role |
|-----------|-------------------|----------|------|
| **Admin** | `ADMIN_01` | `Prasanth@123` | Full access |
| **TTE** | `TTE_01` | `Prasanth@123` | Train staff |
| **Passenger** | `IR_0001` | `Prasanth@123` | Passenger |

> [!CAUTION]
> If you get ` already exists` warnings, accounts are already created. This script is idempotent.

---

## 🚀 Start All Servers

Open **4 separate terminals** and run:

```bash
# Terminal 1: Backend API + WebSocket (Port 5000)
cd backend && npm run dev

# Terminal 2: Admin Portal (Port 5173)
cd frontend && npm run dev

# Terminal 3: TTE Portal (Port 5174)
cd tte-portal && npm run dev

# Terminal 4: Passenger Portal (Port 5175)
cd passenger-portal && npm run dev
```

**Wait for all servers** to show "ready" messages before accessing URLs.

---

## 🌐 Access URLs

| Portal | URL | Default Login |
|--------|-----|---------------|
| **Backend API** | http://localhost:5000 | - |
| **Admin Portal** | http://localhost:5173 | `ADMIN_01` / `Prasanth@123` |
| **TTE Portal** | http://localhost:5174 | `TTE_01` / `Prasanth@123` |
| **Passenger Portal** | http://localhost:5175 | `IR_0001` / `Prasanth@123` |
| **Swagger API Docs** | http://localhost:5000/api-docs | - |
| **Health Check** | http://localhost:5000/api/health | - |

---

## ✅ Verification Checklist

- [ ] MongoDB running (`mongosh --eval "db.runCommand({ ping: 1 })"`)
- [ ] Backend starts without errors (Terminal 1)
- [ ] All 3 frontends accessible (Terminals 2-4)
- [ ] Can login to Admin Portal with `ADMIN_01`
- [ ] WebSocket connection shows in browser console: `✅ WebSocket connected`
- [ ] Health check returns JSON: http://localhost:5000/api/health

---

## 🔔 Notification Setup

### 1. Web Push (Browser Notifications) - REQUIRED FOR UPGRADES

**Generate fresh VAPID keys:**
```bash
npx web-push generate-vapid-keys
```

**Output:**
```
=======================================
Public Key:
BEl62iUYgUivx... (your-public-key)

Private Key:
UUxI4O8-FbRouAf7... (your-private-key)
=======================================
```

**Copy both keys to `backend/.env`** and restart backend.

### 2. Email Notifications - OPTIONAL

For Gmail:
1. Enable **2-Factor Authentication** on Gmail
2. Generate **App Password**: https://myaccount.google.com/apppasswords
3. Copy 16-character password to `backend/.env`

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # Remove spaces
```

---

## 🔌 WebSocket Real-Time Events

Connect to: `ws://localhost:5000`

**Available Events:**

| Event | Description | Payload |
|-------|-------------|---------|
| `CONNECTION_SUCCESS` | Client connected | `{ clientId, message, timestamp }` |
| `TRAIN_UPDATE` | Train state changed | `{ eventType, data }` |
| `STATION_ARRIVAL` | Train arrived at station | `{ stationCode, stationName }` |
| `RAC_REALLOCATION` | RAC upgraded to CNF | `{ pnr, coach, berth }` |
| `NO_SHOW` | Passenger marked no-show | `{ pnr, berth }` |
| `upgrade:offer` | Upgrade offer sent | `{ pnr, fromBerth, toBerth, coach }` |
| `upgrade:confirmed` | Upgrade confirmed by TTE | `{ pnr, upgradeData }` |
| `upgrade:expired` | Offer expired | `{ notificationId, pnr }` |

**Subscribe to PNR updates:**
```javascript
ws.send(JSON.stringify({
  type: 'subscribe:offers',
  payload: { pnr: 'YOUR_PNR' }
}));
```

---

## 🔐 Authentication & Security

### JWT Tokens
- **Access Token**: 24h expiry (stored in localStorage)
- **Refresh Token**: 7 days (httpOnly cookie)
- **CSRF Protection**: Enabled on all state-changing requests
- **Rate Limiting**: 100 requests per 15 minutes per IP

### Login Endpoints
```http
POST /api/auth/passenger/login   # Passenger login (IRCTC_ID + password)
POST /api/auth/staff/login        # Admin/TTE login (employeeId + password)
POST /api/auth/refresh            # Refresh access token
GET  /api/csrf-token              # Get CSRF token
```

### Example Login Request
```bash
curl -X POST http://localhost:5000/api/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"ADMIN_01","password":"Prasanth@123"}'
```

---

## 📚 Core API Endpoints

### Train Management
```http
POST /api/train/initialize         # Initialize train data
POST /api/train/start-journey      # Start journey
POST /api/train/next-station       # Move to next station
GET  /api/train/state              # Get current train state
GET  /api/train/stats              # Get statistics
POST /api/train/reset              # Reset train state
```

### Passenger Management
```http
GET  /api/passengers/all           # List all passengers
GET  /api/passengers/status/:status # Filter by status (CNF/RAC/WL)
GET  /api/passenger/search/:pnr    # Search by PNR
POST /api/passenger/no-show        # Mark passenger as no-show
```

### Reallocation
```http
GET  /api/reallocation/eligibility  # Get eligible RAC passengers
POST /api/reallocation/apply        # Apply for upgrade
GET  /api/train/rac-queue           # View RAC queue
GET  /api/train/vacant-berths       # View vacant berths
```

### Visualization
```http
GET /api/visualization/segment-matrix   # Segment occupancy matrix
GET /api/visualization/vacancy-matrix   # Vacancy heatmap
GET /api/visualization/graph            # Network graph
```

**Full documentation:** http://localhost:5000/api-docs

---

## 🧪 Testing

### Run Backend Tests
```bash
cd backend

# All tests
npm test

# With coverage
npm run test:coverage

# Chaos tests (WebSocket, failure injection)
npm run test:chaos

# Watch mode
npm run test:watch
```

### Run Frontend E2E Tests (Playwright)
```bash
cd frontend

# Install Playwright browsers (one-time)
npx playwright install

# Run tests
npm run test:e2e           # Headless
npm run test:e2e:headed    # With browser
npm run test:e2e:ui        # Interactive UI
```

### Run Load Tests (k6)
```bash
# Install k6 first
winget install k6

cd backend

# High passenger load test
k6 run k6/scenarios/reallocation-load.js

# Concurrent station events
k6 run k6/scenarios/station-events.js

# Multiple TTE actions
k6 run k6/scenarios/tte-actions.js
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **MongoDB connection failed** | Start MongoDB: `mongod` or `net start MongoDB` |
| **Port already in use** | Kill process: `npx kill-port 5000` |
| **Login fails for test accounts** | Re-run: `node scripts/createTestAccounts.js` |
| **Push notifications don't work** | Regenerate VAPID keys: `npx web-push generate-vapid-keys` |
| **CORS errors** | Check `ALLOWED_ORIGINS` in `.env` includes your frontend URLs |
| **WebSocket not connecting** | Ensure backend running on port 5000, check `WS_URL` in frontend |
| **"Cannot find module" errors** | Re-run `npm install` in the affected directory |
| **Vite port conflict** | Check if ports 5173-5175 are free: `npx kill-port 5173 5174 5175` |

---

## 🐳 Docker Deployment (Alternative)

### Prerequisites
- Docker Desktop installed
- `docker-compose` available

### Start with Docker

```bash
# Start all services (MongoDB + Backend + All 3 Portals)
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f admin-portal

# Stop all services
docker-compose down

# Rebuild images
docker-compose build --no-cache
```

### Docker Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Backend API** | http://localhost:5000 | - |
| **Admin Portal** | http://localhost:5173 | `ADMIN_01` / `Prasanth@123` |
| **TTE Portal** | http://localhost:5174 | `TTE_01` / `Prasanth@123` |
| **Passenger Portal** | http://localhost:5175 | `IR_0001` / `Prasanth@123` |
| **MongoDB** | localhost:27017 | - |

> [!NOTE]
> Docker images are built with production optimizations (Nginx for frontends).

---

## 📦 Available Scripts

### Backend (`backend/package.json`)
```bash
npm run dev          # Start with nodemon (auto-reload)
npm start            # Production start
npm test             # Run all Jest tests
npm run test:coverage # Generate coverage report
npm run test:chaos   # Run chaos tests only
npm run typecheck    # TypeScript type checking
```

### Frontend (`frontend/package.json`)
```bash
npm run dev          # Start Vite dev server (Port 5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run test:e2e     # Run Playwright tests
npm run test:e2e:ui  # Interactive test UI
```

---

## 🎯 Next Steps

After successful setup:

1. **Initialize Train Data**
   - Login to Admin Portal
   - Click "Initialize Train"
   - Verify train state loads

2. **Test Reallocation Flow**
   - Mark a passenger as no-show (TTE Portal)
   - Check RAC queue eligibility (Admin Portal)
   - Accept upgrade offer (Passenger Portal)

3. **Monitor Real-Time Events**
   - Open browser DevTools → Console
   - Watch for WebSocket messages
   - Verify push notification subscription

4. **Explore API Documentation**
   - Visit http://localhost:5000/api-docs
   - Try "Try it out" for live API testing

---

## 📄 Additional Documentation

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Project overview and features |
| [ARCHITECTURE.md](dot_md_files/ARCHITECTURE.md) | Detailed system architecture |
| [DEPLOYMENT.md](dot_md_files/DEPLOYMENT.md) | Production deployment guide |
| [SECURITY_TODO.md](SECURITY_TODO.md) | Security checklist |

---

**Built for Indian Railways - Train 17225 Amaravathi Express** 🚂

*Last Updated: December 23, 2025*

**Test Coverage:** 79.57% | 1,153 tests | 50 suites ✅
