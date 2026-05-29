# ⚙️ RAC Reallocation Backend API

The **Backend API Server** for the RAC Reallocation System. Built with **Node.js**, **Express.js**, and **MongoDB**.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
copy .env.example .env

# Create Phase 2 MongoDB indexes (run once)
node scripts/initPhase2Collections.js

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
| **State Persistence** | MongoDB-based runtime state (survives server restarts) |
| **Security** | CSRF protection, rate limiting, input sanitization |
| **Analytics (Phase 2)** | Journey history, upgrade audit trail, daily/weekly KPI aggregation |
| **System Config (Phase 2)** | Live admin panel to tune algorithm parameters without restarting |
| **Train Cache (Phase 2)** | 24h TTL cache for train metadata — faster re-initialization |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime |
| **Express.js** | Web framework |
| **MongoDB** | Database (passengers, stations, train details, analytics) |
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
│   ├── collections.js        # All collection/DB name constants (Phase 1 + 2)
│   └── websocket.js          # WebSocket manager
├── controllers/              # 10 controllers
│   ├── authController.js     # Login, register, refresh tokens
│   ├── trainController.js    # Train init, journey control
│   ├── passengerController.js # Passenger CRUD, no-show
│   ├── tteController.js      # TTE operations
│   ├── reallocationController.js # RAC upgrades
│   ├── StationWiseApprovalController.js # TTE approval workflow
│   ├── analyticsController.js # [Phase 2] Dashboard, audit trail
│   ├── otpController.js      # OTP send/verify
│   ├── configController.js   # Dynamic configuration + system config
│   └── visualizationController.js # Coach visualization
├── services/                 # 25+ services
│   ├── DataService.js        # Load train/passenger data
│   ├── StationEventService.js # Board/deboard logic
│   ├── StationWiseApprovalService.js # TTE approval flow
│   ├── NotificationService.js # All notification types
│   ├── CacheService.js       # In-memory caching
│   ├── SystemConfigService.js  # [Phase 2] Key-value config store (60s cache)
│   ├── UpgradeHistoryService.js # [Phase 2] Per-upgrade audit logger
│   ├── JourneyHistoryService.js # [Phase 2] Per-journey summary writer
│   ├── AnalyticsService.js   # [Phase 2] Daily/weekly KPI aggregation
│   ├── TrainScheduleCacheService.js # [Phase 2] 24h TTL train metadata cache
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
│   ├── api.js                # Route orchestrator
│   ├── trainRoutes.js        # Train lifecycle, config, system-config
│   ├── tteRoutes.js          # TTE operations + upgrade audit
│   ├── analyticsRoutes.js    # [Phase 2] Dashboard & audit endpoints
│   └── ...
├── scripts/
│   ├── initPhase2Collections.js # [Phase 2] Create Phase 2 MongoDB indexes
│   ├── createIndexes.js         # Phase 1 indexes
│   └── createTestAccounts.js    # Create test users
├── __tests__/                # Jest test files
│   ├── controllers/          # 10 controller tests
│   ├── services/             # 21+ service tests
│   ├── integration/          # Integration tests
│   ├── smoke/                # Smoke tests
│   └── chaos/                # Chaos/stress tests
└── k6/                       # Load testing scripts
```

---

## 📖 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with nodemon (hot reload) |
| `npm test` | Run all 1,545 tests |
| `npm run test:watch` | Watch mode for tests |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:chaos` | Run chaos/stress tests |
| `node scripts/initPhase2Collections.js` | **[Phase 2]** Create all Phase 2 MongoDB indexes (run once) |

---

## 🌐 API Endpoints

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
| GET | `/api/tte/boarded-rac-passengers` | Get boarded RAC queue |
| POST | `/api/tte/mark-no-show` | Mark passenger no-show |
| GET | `/api/tte/action-history` | Get action history |
| POST | `/api/tte/undo` | Undo last action |
| GET | `/api/tte/upgrade-audit` | **[Phase 2]** Upgrade audit trail for active journey |

### Analytics & Audit *(Phase 2 — Admin only)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Daily + weekly KPI summary (last 7 days) |
| GET | `/api/analytics/journey-history` | Paginated completed journeys list |
| GET | `/api/analytics/journey-history/:trainNo/:date` | Single journey full detail |
| GET | `/api/analytics/upgrade-history` | Upgrade audit trail for a journey (`?trainNo=&date=`) |
| GET | `/api/analytics/upgrade-history/pnr/:pnr` | All upgrades for a specific passenger |
| POST | `/api/analytics/aggregate` | Manually re-trigger KPI aggregation |

### System Configuration *(Phase 2 — Admin only)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/system-config` | Get all algorithm parameters |
| POST | `/api/admin/system-config/:key` | Update a config key live (no restart needed) |

Full documentation at `/api-docs` when server is running.

---

## 🗄️ Database Structure

### Phase 1 Collections

| Database | Collections |
|----------|-------------|
| **rac** | `tte_users`, `passenger_accounts`, `Trains_Details`, `refresh_tokens` |
| **rac** | `{trainNo}_stations` (per train, e.g. `17225_stations`) |
| **PassengersDB** | `{trainNo}_passengers`, `station_reallocations`, `upgrade_notifications` |

### Phase 2 Collections *(all in `rac` DB)*

| Collection | Purpose | TTL |
|------------|---------|-----|
| `upgrade_history` | One document per upgrade decision (approved/rejected/auto) | None |
| `journey_history` | One document per completed train journey (summary + station timeline) | None |
| `analytics` | Pre-aggregated daily and weekly KPI documents | None |
| `train_schedule_cache` | Cached Trains_Details metadata for fast re-init | **24 hours** |
| `system_config` | Admin-tunable algorithm parameters (key-value store) | None |

> **Indexes** — Run `node scripts/initPhase2Collections.js` once after deployment to create all 14 performance indexes.

---

## ⚙️ Phase 2 — System Config Keys

The `system_config` collection is seeded automatically on first startup. Keys can be updated live via `POST /api/admin/system-config/:key`.

| Key | Default Value | Description |
|-----|--------------|-------------|
| `rac_settings` | `{ MIN_JOURNEY_DISTANCE_KM: 50, LOOK_AHEAD_SEGMENTS: 3, NO_SHOW_TIMEOUT_MINUTES: 30, ... }` | Core RAC algorithm parameters |
| `app_version` | `{ version: '2.0.0', phase: 2 }` | Application version metadata |
| `maintenance_mode` | `{ enabled: false, message: '' }` | Toggle maintenance mode |
| `analytics_config` | `{ dailyCronEnabled: true, retentionDays: 90 }` | Analytics job settings |
| `allowed_origins` | `['http://localhost:3000', ...]` | Supplementary CORS origins |

---

## 💾 State Persistence

| Component | Mechanism |
|-----------|-----------|
| **Runtime State** | `RuntimeStateService.js` saves journey state to `runtime_state` collection |
| **Journey History** | `JourneyHistoryService.js` writes a summary doc when a journey completes |
| **Upgrade Audit** | `UpgradeHistoryService.js` writes a doc on every TTE approve/reject and AUTO commit |
| **Analytics** | `AnalyticsService.js` runs daily aggregation on startup + every 24h via `setInterval` |
| **Train Cache** | `TrainScheduleCacheService.js` stores Trains_Details metadata with 24h MongoDB TTL |

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
| **Analytics Routes** | All Phase 2 endpoints require ADMIN role |

---

## 🔑 Authentication Strategy

### Token Transport
All portals run on a **single origin** (`portals-of-rac.vercel.app`). Each portal stores its JWT in `localStorage` and sends it via the `Authorization: Bearer <token>` header.

### Role Hierarchy
| Role | Can access |
|------|------------|
| `ADMIN` | Train lifecycle, all TTE routes, analytics, system config |
| `TTE` | Passenger operations, reallocation approve/reject, upgrade audit |
| `PASSENGER` | Own PNR, own notifications, upgrade offers, OTP flows |
| _(public)_ | `/api/health`, `/api/trains`, `/api/train/state`, `/api/train/stats` |

### Token Lifecycle
```
Login → accessToken (1h, localStorage) + refreshToken (7d, httpOnly cookie)
         ↓
     On 401 → POST /api/auth/refresh → new accessToken
         ↓
     On refresh failure → redirect to login
```

---

## 🔀 Multi-Replica Architecture

| Scenario | Behaviour |
|---|---|
| `REDIS_URL` not set (Render free) | In-memory broadcast only — works for 1 replica |
| `REDIS_URL` set (paid/self-hosted) | Redis pub/sub activates — cross-replica WS propagation |

**To scale to multiple replicas:**
1. Upgrade to Render Starter plan
2. Add a Redis instance (Upstash free tier)
3. Set `REDIS_URL=rediss://default:token@endpoint:6379`
4. Deploy — pub/sub activates automatically, zero code changes

---

## 📊 Test Coverage

```
Test Suites: 60 passed, 60 total
Tests:       1,545 passed, 1,545 total
Coverage:    79.57% overall

Breakdown:
├── Services:     88.37%
├── Reallocation: 89.71%
├── Utils:        71.55%
└── Controllers:  68.58%
```

Coverage report: `coverage/index.html`

---

## 📈 Project Statistics

Here is a high-level statistical overview of the entire **Dynamic RAC Reallocation System**:

| Metric | Count | Details |
|---|---|---|
| **Total Lines of Code (LOC)** | **102,127 lines** | Combined Backend + Frontend codebases (excl. dependencies) |
| ├── *Backend LOC* | *49,158 lines* | JavaScript, Node.js controllers, services, models, routes |
| └── *Frontend LOC* | *52,969 lines* | TypeScript, TSX views, CSS, services |
| **Total Automated Tests** | **1,545 tests** | 100% passing rate in Jest |
| └── *Test Suites* | *60 suites* | Controllers, services, integration, chaos, and smoke tests |
| **Total Backend API Endpoints** | **113 endpoints** | Auth (10), Passenger (28), Push (11), Reallocation (18), TTE (19), Train (19), Analytics (6), Evaluation (2) |

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

**Phase 2 collection names (optional — override defaults):**
```env
UPGRADE_HISTORY_COLLECTION=upgrade_history
JOURNEY_HISTORY_COLLECTION=journey_history
ANALYTICS_COLLECTION=analytics
TRAIN_SCHEDULE_CACHE_COLLECTION=train_schedule_cache
SYSTEM_CONFIG_COLLECTION=system_config
```

See `.env.example` for full configuration options.

---

## 🔗 Related

- [Root Documentation](../README.md)
- [Frontend (Admin Portal)](../admin-portal/)
- [TTE Portal](../tte-portal/)
- [Passenger Portal](../passenger-portal/)

---

**Last Updated:** 2026-05-29 — Phase 2 Stats & Test Suites Fully Verified (100% Green)
