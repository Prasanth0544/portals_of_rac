# 🚀 RAC Reallocation System - Complete Quick Start Guide

A comprehensive guide to setting up and running the Dynamic RAC Reallocation System.

---

## 📋 Prerequisites

| Requirement | Version | Download |
|-------------|---------|----------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org) |
| **npm** | v9+ | Comes with Node.js |
| **MongoDB** | v6+ | [mongodb.com](https://www.mongodb.com/try/download/community) |
| **Git** | Any | [git-scm.com](https://git-scm.com) |

---

## 🔧 Technology Stack & Dependencies

### Backend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **express** | ^4.18.2 | REST API framework |
| **mongodb** | ^6.3.0 | MongoDB driver |
| **mongoose** | ^9.0.1 | MongoDB ODM |
| **ws** | ^8.14.2 | WebSocket server for real-time updates |
| **jsonwebtoken** | ^9.0.2 | JWT authentication |
| **bcrypt** | ^6.0.0 | Password hashing |
| **web-push** | ^3.6.7 | Browser push notifications (VAPID) |
| **nodemailer** | ^7.0.11 | Email notifications |
| **twilio** | ^5.10.6 | SMS notifications (optional) |
| **swagger-jsdoc** | ^6.2.8 | API documentation generator |
| **swagger-ui-express** | ^5.0.0 | Swagger UI for API docs |
| **cors** | ^2.8.5 | Cross-origin resource sharing |
| **dotenv** | ^16.3.1 | Environment variables |
| **joi** | ^17.11.0 | Request validation |
| **zod** | ^4.1.13 | TypeScript-first validation |

### Frontend Dependencies (All Portals)

| Package | Purpose |
|---------|---------|
| **React 19** | UI framework |
| **Vite** | Build tool & dev server |
| **Material-UI** | Component library |
| **Axios** | HTTP client for API calls |
| **WebSocket Client** | Real-time updates |
| **qrcode.react** | QR code generation |

---

## ⚡ Complete Installation

### Step 1: Install All Dependencies

```bash
# Navigate to project root
cd c:\Users\prasa\Desktop\RAC\zip_2

# Install Backend
cd backend && npm install && cd ..

# Install Admin Portal (Frontend)
cd frontend && npm install && cd ..

# Install Passenger Portal
cd passenger-portal && npm install && cd ..

# Install TTE Portal
cd tte-portal && npm install && cd ..
```

### Step 2: Configure Environment Variables

```bash
# Copy the environment template
copy backend\.env.example backend\.env
```

Edit `backend/.env` with your settings:

```env
# ══════════════════════════════════════════════════════════════
# MONGODB CONFIGURATION (REQUIRED)
# ══════════════════════════════════════════════════════════════
MONGODB_URI=mongodb://localhost:27017
STATIONS_DB=rac
PASSENGERS_DB=rac
TRAIN_DETAILS_DB=rac
STATIONS_COLLECTION=17225
PASSENGERS_COLLECTION=17225_passengers
TRAIN_DETAILS_COLLECTION=Trains_Details
DEFAULT_TRAIN_NO=17225

# ══════════════════════════════════════════════════════════════
# SERVER & AUTHENTICATION (REQUIRED)
# ══════════════════════════════════════════════════════════════
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# ══════════════════════════════════════════════════════════════
# WEB PUSH NOTIFICATIONS (REQUIRED)
# Generate: npx web-push generate-vapid-keys
# ══════════════════════════════════════════════════════════════
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:your-email@example.com

# ══════════════════════════════════════════════════════════════
# EMAIL NOTIFICATIONS (OPTIONAL)
# Requires Gmail 2FA + App Password
# ══════════════════════════════════════════════════════════════
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password

# ══════════════════════════════════════════════════════════════
# SMS NOTIFICATIONS (OPTIONAL)
# Requires Twilio account
# ══════════════════════════════════════════════════════════════
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# ══════════════════════════════════════════════════════════════
# CORS ORIGINS
# ══════════════════════════════════════════════════════════════
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
```

### Step 3: Create Test User Accounts

```bash
cd backend
node scripts/createTestAccounts.js
cd ..
```

This creates:
- **Admin:** `ADMIN_01 / Prasanth@123`
- **TTE:** `TTE_01 / Prasanth@123`
- **Passenger:** `IR_0001 / Prasanth@123`

---

## 🚀 Start All Servers

Open **4 separate terminals**:

```bash
# Terminal 1: Backend API (Port 5000)
cd backend && npm run dev

# Terminal 2: Admin Portal (Port 5173)
cd frontend && npm run dev

# Terminal 3: TTE Portal (Port 5174)
cd tte-portal && npm run dev

# Terminal 4: Passenger Portal (Port 5175)
cd passenger-portal && npm run dev
```

---

## 🌐 Access URLs

| Portal | URL | Credentials |
|--------|-----|-------------|
| **Admin Portal** | http://localhost:3000 or 5173 | ADMIN_01 / Prasanth@123 |
| **TTE Portal** | http://localhost:5174 | TTE_01 / Prasanth@123 |
| **Passenger Portal** | http://localhost:5175 | IR_0001 / Prasanth@123 |
| **API Documentation** | http://localhost:5000/api-docs | - |
| **Health Check** | http://localhost:5000/api/health | - |

---

## 🔔 Notification Setup

### 1. Web Push (Browser Notifications) - REQUIRED

```bash
# Generate new VAPID keys
npx web-push generate-vapid-keys
```

Copy the keys to `backend/.env`:
```env
VAPID_PUBLIC_KEY=your-new-public-key
VAPID_PRIVATE_KEY=your-new-private-key
VAPID_EMAIL=mailto:your-email@example.com
```

### 2. Email (Gmail SMTP) - OPTIONAL

1. Enable **2-Factor Authentication** on your Gmail account
2. Generate an **App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" → "Windows Computer"
   - Copy the 16-character password

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

### 3. SMS (Twilio) - OPTIONAL

1. Create account at [twilio.com](https://www.twilio.com)
2. Get Account SID, Auth Token, and Phone Number

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 🔌 WebSocket Real-Time Events

The system broadcasts these events via WebSocket:

| Event | Description |
|-------|-------------|
| `TRAIN_INITIALIZED` | Train data loaded |
| `JOURNEY_STARTED` | Journey begins |
| `STATION_ARRIVED` | Train reaches station |
| `PASSENGER_BOARDED` | Passenger boards |
| `PASSENGER_DEBOARDED` | Passenger exits |
| `NO_SHOW` | Passenger marked no-show |
| `RAC_UPGRADED` | RAC passenger upgraded |
| `UPGRADE_OFFER` | New upgrade offer available |

Connect: `ws://localhost:5000`

---

## 🔐 Authentication & Security

### JWT Authentication
All protected API routes require:
```http
Authorization: Bearer <token>
```

### Security Features Implemented
| Feature | Status |
|---------|--------|
| JWT Access Tokens (15 min) | ✅ |
| Refresh Tokens (7 days) | ✅ |
| httpOnly Cookies | ✅ |
| CSRF Protection | ✅ |
| Auto Token Refresh | ✅ |
| Rate Limiting | ✅ |

Token endpoints:
- `POST /api/auth/passenger/login`
- `POST /api/auth/staff/login`
- `POST /api/auth/refresh`
- `GET /api/csrf-token`

---

## 📚 API Endpoints

### Core APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/train/initialize` | Initialize train |
| POST | `/api/train/start-journey` | Start journey |
| POST | `/api/train/next-station` | Move to next station |
| GET | `/api/train/state` | Get train state |
| GET | `/api/passengers` | List passengers |
| POST | `/api/passenger/no-show` | Mark no-show |
| GET | `/api/reallocation/eligibility` | Get eligible RAC |
| POST | `/api/reallocation/apply` | Apply upgrade |

Full API docs: http://localhost:5000/api-docs

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection failed | Start MongoDB: `mongod` |
| Port already in use | Kill process: `npx kill-port 5000` |
| Login failed | Run `node scripts/createTestAccounts.js` |
| Push notifications fail | Regenerate VAPID keys |
| CORS errors | Check `ALLOWED_ORIGINS` in .env |
| WebSocket not connecting | Ensure backend is running on port 5000 |

---

## ✅ Verification Checklist

- [ ] MongoDB running (`mongod --version`)
- [ ] Backend starts without errors
- [ ] All 3 frontends accessible
- [ ] Login works on all portals
- [ ] Train initialization successful
- [ ] WebSocket connected (check console)
- [ ] Push subscription created (check console)

---

## 🐳 Docker Deployment (Alternative)

### Prerequisites
- Docker Desktop installed
- docker-compose available

### Quick Start with Docker

```bash
# Start all services (MongoDB + Backend + All Portals)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Docker URLs
| Service | URL |
|---------|-----|
| Backend API | http://localhost:5000 |
| Admin Portal | http://localhost:3000 |
| TTE Portal | http://localhost:3001 |
| Passenger Portal | http://localhost:3002 |
| MongoDB | localhost:27017 |

### Available Docker Files
- `docker-compose.yml` - Development setup
- `docker-compose.prod.yml` - Production setup
- `backend/Dockerfile` - Backend image
- `frontend/Dockerfile` - Admin portal image
- `tte-portal/Dockerfile` - TTE portal image
- `passenger-portal/Dockerfile` - Passenger portal image
- `k8s/` - Kubernetes manifests

---

**Built for Indian Railways - Train 17225 Amaravathi Express** 🚂
