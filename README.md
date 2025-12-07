# 🚂 RAC Reallocation System

A **real-time Railway RAC (Reservation Against Cancellation) seat reallocation system** built with the MERN stack. This system enables dynamic seat upgrades for RAC passengers when confirmed berths become vacant due to no-shows or cancellations.

---

## 📋 Quick Links

| Document | Purpose |
|----------|---------|
| **[QUICKSTART.md](QUICKSTART.md)** | How to run all three apps + backend |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | High-level system design and concepts |
| **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** | Detailed file structure |

---

## 🏗️ System Architecture

```
RAC-Reallocation-System/
├── backend/              # Express.js REST API + WebSocket Server (Port 5000)
├── frontend/             # Vite + React Admin Portal (Port 3000)
├── passenger-portal/     # Vite + React Passenger Portal (Port 5173)
└── tte-portal/           # Vite + React TTE Portal (Port 5174)
```

### Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Backend** | Node.js, Express.js, MongoDB, WebSocket (ws), JWT Auth |
| **Frontend** | Vite, React 19, Material-UI, Axios, WebSocket Client |
| **Database** | MongoDB with dynamic collections |
| **Notifications** | Web Push (VAPID), Email (Nodemailer), SMS (Twilio) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js v14+ and npm
- MongoDB v4+ running locally
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
# Terminal 1: Backend
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
| **Passenger Portal** | http://localhost:5173 | `IR_0001` / `Prasanth@123` |
| **API Docs** | http://localhost:5000/api-docs | - |

---

## ✨ Key Features

### 🎫 Passenger Portal
- PNR check and journey status
- Real-time upgrade notifications with countdown timers
- Accept/deny upgrade offers
- QR code boarding pass generation
- Push notification support

### 👮 TTE Portal
- Dashboard with train statistics
- Passenger verification and management
- No-show marking with reasons
- RAC reallocation approval workflow
- Station-by-station journey progression

### 🔐 Admin Portal
- Complete train initialization
- Real-time coach and berth visualization
- Segment-based occupancy matrix
- RAC queue management
- Station-wise reallocation phase controls

### ⚙️ Backend
- 30+ REST API endpoints
- Real-time WebSocket broadcasting
- Automatic RAC-to-CNF upgrades
- Segment-based berth tracking
- Multi-train support

---

## 📊 Core Concepts

### Segment-Based Occupancy
The system tracks berth occupancy per journey segment (station-to-station), allowing the same berth to be used by different passengers on non-overlapping journey segments.

### RAC Reallocation Logic
1. Berth becomes vacant (no-show/cancellation)
2. System identifies eligible RAC passengers (boarded + journey overlap)
3. TTE approves reallocation
4. Passenger receives push notification with upgrade offer
5. Upon acceptance, passenger status upgrades from RAC to CNF

---

## 🔌 API Overview

| Category | Endpoint Examples |
|----------|-------------------|
| **Train** | `POST /api/train/initialize`, `GET /api/train/state` |
| **Passenger** | `GET /api/passenger/search/:pnr`, `POST /api/passenger/no-show` |
| **Reallocation** | `GET /api/reallocation/eligibility`, `POST /api/reallocation/apply` |
| **Auth** | `POST /api/auth/login`, `POST /api/auth/register` |

Full API documentation available at `/api-docs` when backend is running.

---

## 🔔 Notification System

| Type | Technology | Configuration |
|------|------------|---------------|
| **Push** | Web Push API (VAPID) | Generate keys: `npx web-push generate-vapid-keys` |
| **Email** | Nodemailer (Gmail SMTP) | Gmail App Password required |
| **SMS** | Twilio | Twilio API credentials |

> **Note**: Only Push notifications are required. Email/SMS are optional.

---

## 📁 Environment Variables

The only required `.env` file is `backend/.env`. See [QUICKSTART.md](QUICKSTART.md) for complete configuration.

Key variables:
```env
MONGODB_URI=mongodb://localhost:27017
JWT_SECRET=your-secret-key
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection failed | Ensure MongoDB is running: `mongod` |
| CORS errors | Backend already has CORS enabled |
| Login fails | Run `node scripts/createTestAccounts.js` |
| Push notifications not working | Regenerate VAPID keys and restart backend |

---

## 📄 License

ISC

---

**Built for Indian Railways - Train 17225 Amaravathi Express** 🚂
