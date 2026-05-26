# ⚙️ RAC Reallocation Backend API

The **Backend API Server** for the RAC Reallocation System. Built with **Node.js**, **Express.js**, and **MongoDB**.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
copy .env.example .env

# Start development server (with hot reload)
npm run dev

# Or production mode
npm start
```

Server runs at: **http://localhost:5000**  
API Docs: **http://localhost:5000/api-docs**

---

## 📋 Features

| Category | Features |
|----------|----------|
| **Authentication** | JWT-based auth, refresh tokens, role-based access (Admin/TTE/Passenger) |
| **Train Management** | Initialize, start journey, advance stations, reset |
| **Passenger Operations** | Search, booking status, no-show marking, boarding verification |
| **RAC Reallocation** | Eligibility checking, TTE approval workflow, passenger notifications |
| **Notifications** | Web Push (VAPID), Email (Nodemailer), In-app real-time via WebSocket |
| **State Persistence** | **MongoDB-based runtime state** (survives server restarts) |
| **Security** | CSRF protection, rate limiting, input sanitization |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime |
| **Express.js** | Web framework |
| **MongoDB** | Database (passengers, stations, train details) |
| **WebSocket (ws)** | Real-time updates |
| **JWT** | Authentication tokens |
| **Web Push** | Browser push notifications |
| **Swagger** | API documentation |
| **Jest** | Unit and integration testing |

---

## 📁 Project Structure

```
backend/
├── server.js                 # Entry point, Express setup
├── config/
│   ├── db.js                 # MongoDB connection (dynamic)
│   └── websocket.js          # WebSocket manager
├── controllers/              # 9 controllers
│   ├── authController.js     # Login, register, refresh tokens
│   ├── trainController.js    # Train init, journey control
│   ├── passengerController.js # Passenger CRUD, no-show
│   ├── tteController.js      # TTE operations
│   ├── reallocationController.js # RAC upgrades
│   ├── StationWiseApprovalController.js # TTE approval workflow
│   ├── otpController.js      # OTP send/verify
│   ├── configController.js   # Dynamic configuration
│   └── visualizationController.js # Coach visualization
├── services/                 # 20+ services
│   ├── DataService.js        # Load train/passenger data
│   ├── StationEventService.js # Board/deboard logic
│   ├── StationWiseApprovalService.js # TTE approval flow
│   ├── NotificationService.js # All notification types
│   ├── CacheService.js       # In-memory caching
│   ├── reallocation/         # Eligibility, vacancy, allocation
│   │   ├── EligibilityService.js
│   │   ├── VacancyService.js
│   │   └── AllocationService.js
│   └── ...
├── models/                   # 7 models
│   ├── TrainState.js         # Main train state class
│   ├── Berth.js              # Berth with segment occupancy
│   └── ...
├── middleware/               # 8 middleware files
│   ├── auth.js               # JWT verification, role check
│   ├── csrf.js               # CSRF protection
│   ├── rateLimiter.js        # Rate limiting
│   └── validationMiddleware.js # Input validation
├── routes/
│   └── api.js                # 800+ lines, 50+ endpoints
├── __tests__/                # Jest test files
│   ├── controllers/          # 10 controller tests
│   ├── services/             # 21+ service tests
│   ├── integration/          # Integration tests
│   ├── smoke/                # Smoke tests
│   └── chaos/                # Chaos/stress tests
├── scripts/                  # Utility scripts
│   └── createTestAccounts.js # Create test users
└── k6/                       # Load testing scripts
```

---

## 📖 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with nodemon (hot reload) |
| `npm test` | Run all 1,153 tests |
| `npm run test:watch` | Watch mode for tests |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:chaos` | Run chaos/stress tests |

---

## 🌐 API Endpoints (84 Total: 39 GET, 45 POST)

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/staff/login` | Admin/TTE login |
| POST | `/api/auth/passenger/login` | Passenger login |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/verify` | Verify token validity |

### Train Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trains` | List all available trains |
| POST | `/api/train/initialize` | Initialize train with data |
| POST | `/api/train/start-journey` | Start the journey |
| POST | `/api/train/next-station` | Move to next station |
| GET | `/api/train/state` | Get complete train state |
| GET | `/api/train/stats` | Get journey statistics |

### Passenger Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/passenger/search/:pnr` | Search by PNR |
| GET | `/api/passengers` | Get all passengers |
| POST | `/api/passenger/no-show` | Mark as no-show |
| POST | `/api/passenger/revert-no-show` | Revert no-show |
| GET | `/api/passenger/upgrade-offers/:pnr` | Get upgrade offers |
| POST | `/api/passenger/respond-offer` | Accept/deny offer |

### Reallocation
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reallocation/pending` | Get pending approvals |
| POST | `/api/reallocation/approve-batch` | Approve batch |
| POST | `/api/reallocation/reject` | Reject reallocation |
| GET | `/api/reallocation/current-station-matching` | HashMap matching |
| POST | `/api/reallocation/send-for-approval` | Generate pending |

### TTE Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tte/passengers` | Get all passengers |
| GET | `/api/tte/rac-queue` | Get RAC queue |
| GET | `/api/tte/vacant-berths` | Get vacant berths |
| POST | `/api/tte/mark-no-show` | Mark passenger no-show |
| GET | `/api/tte/action-history` | Get action history |
| POST | `/api/tte/undo` | Undo last action |

Full documentation at `/api-docs` when server is running.

---

## 💾 State Persistence

The system implements **Robust State Persistence** to ensure data integrity during server restarts or crashes.

| Component | Persistence Mechanism |
|-----------|-----------------------|
| **Runtime State** | `RuntimeStateService.js` saves journey state (`journeyStarted`, `currentStationIdx`) to MongoDB collection `runtime_state`. |
| **Logic** | - **Save:** On journey start & every station advance.<br>- **Restore:** On train initialization.<br>- **Rebuild:** Re-processes all stations and re-boards passengers to restore exact state. |
| **Reset** | State is automatically cleared when the train is reset. |

---

## 🔒 Security Features

| Feature | Implementation |
|---------|----------------|
| **JWT Authentication** | Access tokens (1h) + Refresh tokens (7d) |
| **Role-Based Access** | ADMIN, TTE, PASSENGER roles enforced per route |
| **CSRF Protection** | Double-submit cookie pattern (`csurf`) |
| **Rate Limiting** | 5 login attempts/15min, 100 general/15min |
| **Input Sanitization** | XSS prevention, HTML escaping |
| **Password Hashing** | bcrypt with salt rounds |
| **Route Auth Coverage** | All state-mutating and PII-reading routes protected |

---

## 🔑 Authentication Strategy (Item 14)

### Token Transport
All portals run on a **single origin** (`portals-of-rac.vercel.app`). Rather than relying on cookies (which are scoped to the domain and cause cross-portal token collisions), each portal stores its JWT in `localStorage` and sends it via the `Authorization: Bearer <token>` header.

```
priority:
  1. Authorization header  ← portal-specific, no cross-portal collision
  2. httpOnly accessToken cookie ← browser fallback (same origin only)
```

### Role Hierarchy
| Role | Can access |
|------|------------|
| `ADMIN` | Train lifecycle (init/start/reset/next-station), all TTE routes, all passenger data, config |
| `TTE` | Passenger operations, reallocation approve/reject, offline upgrades, boarding verification |
| `PASSENGER` | Own PNR, own notifications, upgrade offers, OTP flows |
| _(public)_ | `/api/health`, `/api/trains`, `/api/train/state`, `/api/train/stats`, `/api/passenger/pnr/:pnr` |

### Route Protection Summary
| Route group | Auth required | Role |
|---|---|---|
| `POST /train/initialize` | ✅ | ADMIN |
| `POST /train/start-journey` | ✅ | ADMIN |
| `POST /train/next-station` | ✅ | ADMIN |
| `POST /train/reset` | ✅ | ADMIN |
| `POST /admin/*` | ✅ | ADMIN |
| `GET/POST /tte/*` | ✅ | TTE, ADMIN |
| `GET/POST /reallocation/pending` | ✅ | TTE, ADMIN |
| `POST /reallocation/upgrade/*/approve` | ✅ | TTE, ADMIN |
| `POST /reallocation/upgrade/*/reject` | ✅ | TTE, ADMIN |
| `POST /reallocation/create-from-matches` | ✅ | TTE, ADMIN |
| `GET /passengers/all` | ✅ | TTE, ADMIN |
| `GET /passengers/counts` | ✅ | TTE, ADMIN |
| `POST /passengers/add` | ✅ | ADMIN |
| `GET /passenger/notifications` | ✅ | PASSENGER |
| `POST /passenger/notifications/*` | ✅ | PASSENGER |
| `GET /passenger/pnr/:pnr` | 🔓 public | _(none)_ |
| `GET /api/health` | 🔓 public | _(none)_ |

### Token Lifecycle
```
Login → accessToken (1h, localStorage) + refreshToken (7d, httpOnly cookie)
         ↓
     On 401 → POST /api/auth/refresh → new accessToken
         ↓
     On refresh failure → redirect to login
```

---

## 🔀 Multi-Replica Architecture (Item 17)

### Decision: Stay on 1 replica + keep Redis pub/sub code

**Render free tier = 1 replica always.** There is no horizontal scaling on the free plan. The WebSocket manager already has full Redis pub/sub support that activates automatically when `REDIS_URL` is set.

| Scenario | Behaviour |
|---|---|
| `REDIS_URL` not set (Render free) | In-memory broadcast only — works perfectly for 1 replica |
| `REDIS_URL` set (paid/self-hosted) | Redis pub/sub activates — cross-replica WS messages propagate automatically |

**Why we kept the Redis code:**
- Zero cost when disabled (safe no-op `_attachRedisPubSub()` guard)
- Production-ready upgrade path: just add `REDIS_URL` env var to scale out
- No code change needed when upgrading Render plan

**To scale to multiple replicas (future):**
1. Upgrade to Render Starter plan (multiple instances)
2. Add a Redis instance (Upstash free tier: `rediss://...`)
3. Set `REDIS_URL=rediss://default:token@endpoint:6379` in Render env vars
4. Deploy — pub/sub activates automatically, zero code changes

---

## 📊 Test Coverage

```
Test Suites: 50 passed, 50 total
Tests:       1,153 passed, 1,153 total
Coverage:    79.57% overall

Breakdown:
├── Services:     88.37%
├── Reallocation: 89.71%
├── Utils:        71.55%
└── Controllers:  68.58%
```

Coverage report: `coverage/index.html`

---

## 🔧 Environment Variables

**Required** in `.env`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017

# JWT
JWT_SECRET=your-secret-key-here

# Web Push (generate: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:your-email@example.com

# CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://portals-of-rac.vercel.app

# Frontend URL (used in email links and push notifications)
FRONTEND_URL=https://portals-of-rac.vercel.app
```

**Email — Production (Render):** Render blocks SMTP. Use Resend instead:
```env
RESEND_API_KEY=re_xxxxxxxxxxxx   # get free key at resend.com
```

**Email — Local dev:** Gmail SMTP (when RESEND_API_KEY is not set):
```env
EMAIL_USER=your@gmail.com
EMAIL_PASSWORD=your_app_password  # https://myaccount.google.com/apppasswords
```

**Redis (optional — enables multi-replica WebSocket):**
```env
REDIS_URL=rediss://default:token@endpoint:6379  # Upstash free tier
```

See `.env.example` for full configuration options.

---

## 🗄️ Database Structure

| Database | Collections |
|----------|-------------|
| **rac** | `tte_users`, `passenger_accounts`, `Trains_Details` |
| **StationsDB** | `stations_17225` (per train) |
| **PassengersDB** | `passengers_17225_2025-12-23`, `station_reallocations`, `upgrade_notifications` |

---

## 🔗 Related

- [Root Documentation](../README.md)
- [README.md](../README.md)
- [Frontend (Admin Portal)](../admin-portal/)
- [TTE Portal](../tte-portal/)
- [Passenger Portal](../passenger-portal/)

---

**Last Updated:** 2025-12-23
