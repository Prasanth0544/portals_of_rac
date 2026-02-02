# RAC Reallocation System – Complete Project Structure & Communication Analysis

**Project Name:** RAC Reallocation System  
**Version:** 3.0.0  
**Tech Stack:** MERN (MongoDB, Express.js, React, Node.js)  
**Approx LOC:** ~50,000+ (excluding dependencies)  
**Development Time:** ~4 months (solo)  

---

## 1. High-Level Project Metrics

| Metric | Value |
|--------|-------|
| **Total Files** | ~280+ |
| **Backend Files** | ~110 |
| **Frontend Files (3 portals)** | ~170+ |
| **REST API Endpoints** | 89 |
| **WebSocket Event Types** | 12+ |
| **Service Classes** | 21 |
| **Controllers** | 9 |
| **Models** | 7 |
| **Test Files** | 50+ |
| **Total Tests** | 1,153 |
| **Coverage** | 79.57% |

---

## 2. Repository Structure Overview

```text
RAC-Reallocation-System/
├── backend/              # Express.js REST API + WebSocket Server (Port 5000)
├── frontend/             # Vite + React Admin Portal (Port 5173/3000)
├── passenger-portal/     # Vite + React Passenger Portal (Port 5175)
├── tte-portal/           # Vite + React TTE Portal (Port 5174)
├── k8s/                  # Kubernetes deployment configs
├── docker-compose*.yml   # Docker orchestration
└── *.md, PPTs, analysis  # Documentation & presentations
```

---

## 3. Backend – Files, Roles & Communication

### 3.1 Entry Point & Core Server

**`backend/server.js`**  
**Role:** Main Express server + WebSocket host  

- Loads environment variables and validates them (`envValidator`).
- Sets up:
  - CORS (for all 3 portals).
  - JSON & URL-encoded body parsers.
  - `cookie-parser` for JWT cookies.
  - CSRF protection middleware.
  - API rate limiting (`/api` scope).
  - Request logging in development.
- Creates HTTP server:  
  - Binds Express app.  
  - Hands server to WebSocket manager.
- Mounts:
  - `GET /api/csrf-token` (CSRF bootstrap).
  - `app.use('/api', apiRoutes)` for all REST endpoints.
  - Swagger docs at `/api-docs`.
- Root `GET /` returns server status and feature info.

**Communication:**
- HTTP REST: Port 5000 under `/api/*`.
- WebSocket: Same port, upgraded connections via `wsManager.initialize(httpServer)`.
- Database: Uses `config/db.js` to connect to MongoDB.

---

### 3.2 Configuration Layer

**`backend/config/db.js`**  
**Role:** MongoDB connection and dynamic DB selection.

- Connects to MongoDB using connection string from env.
- Supports dynamic DB/collection selection per train/journey date.

**`backend/config/websocket.js`** (≈556 lines)  
**Role:** Central WebSocket manager (singleton).

- Maintains:
  - `this.wss` – WebSocket.Server instance.
  - `this.clients` – Set of all connected sockets.
  - `this.pnrSubscriptions` – Map of `PNR → Set<WebSocket>`.
- On connection:
  - Assigns `clientId`.
  - Sets `ws.subscribedPNRs = new Set()`.
  - Adds to `clients`.
  - Sends `CONNECTION_SUCCESS` with `clientId`.
  - Sets up `message`, `close`, `error`, `pong` handlers.
  - Starts heartbeat (ping every 30s) and cleans up dead connections.

**Client → Server message types (`handleClientMessage`)**:
- `ping` / `PING` → responds with `pong`.
- `subscribe:offers` `{ pnr }` → subscribes client to that PNR.
- `unsubscribe:offers` `{ pnr }` → unsubscribes from that PNR.
- `SUBSCRIBE` → enable general broadcasts for client.
- `UNSUBSCRIBE` → disable general broadcasts.

**Server → Client event types**:
- `CONNECTION_SUCCESS`
- `upgrade:offer`
- `upgrade:expired`
- `upgrade:confirmed`
- `upgrade:rejected`
- `passenger:boarding_status`
- `TRAIN_UPDATE`
- `STATION_ARRIVAL`
- `RAC_REALLOCATION`
- `NO_SHOW`
- `STATS_UPDATE`
- `ERROR`

**Broadcast helpers**:
- `broadcast(dataObj)` – sends to all subscribed clients.
- `broadcastTrainUpdate(eventType, data)`
- `broadcastStationArrival(stationData)`
- `broadcastRACReallocation(reallocationData)`
- `broadcastNoShow(passengerData)`
- `broadcastStatsUpdate(stats)`

**PNR-targeted helpers**:
- `sendOfferToPassenger(pnr, offer)`
- `notifyOfferExpired(pnr, notificationId)`
- `notifyUpgradeConfirmed(pnr, upgradeData)`
- `notifyUpgradeRejected(pnr, reason)`
- `notifyBoardingStatus(pnr, status)`

**`backend/config/swagger.js`**  
**Role:** OpenAPI/Swagger configuration for `/api-docs`.

---

### 3.3 Routes – REST API Surface

**`backend/routes/api.js`** (≈1,058 lines)  
**Role:** Defines **89 REST endpoints**.

**Key endpoint groups:**

- **Auth**
  - `POST /api/auth/staff/login`
  - `POST /api/auth/passenger/login`
  - `POST /api/auth/refresh`
  - `GET  /api/auth/verify`
  - `POST /api/auth/logout`
  - `POST /api/auth/staff/register`

- **Train**
  - `GET  /api/trains`
  - `POST /api/train/initialize`
  - `POST /api/train/start-journey`
  - `GET  /api/train/state`
  - `POST /api/train/next-station`
  - `POST /api/train/reset`
  - `GET  /api/train/stats`
  - `GET  /api/train/allocation-errors`

- **Passenger**
  - `GET  /api/passenger/search/:pnr`
  - `GET  /api/passenger/pnr/:pnr` (public lookup)
  - `GET  /api/passengers/all`
  - `GET  /api/passengers/status/:status`
  - `GET  /api/passengers/counts`
  - `POST /api/passengers/add`
  - `POST /api/passenger/no-show`
  - `POST /api/passenger/cancel`
  - `POST /api/passenger/revert-no-show`
  - `POST /api/passenger/self-cancel`
  - `POST /api/passenger/change-boarding-station`
  - `POST /api/passenger/approve-upgrade`
  - `GET  /api/passenger/upgrade-notifications/:pnr`
  - `POST /api/passenger/accept-upgrade`
  - `POST /api/passenger/deny-upgrade`
  - `POST /api/passenger/set-status`

- **TTE**
  - `POST /api/tte/mark-no-show`
  - `POST /api/tte/revert-no-show`
  - `GET  /api/tte/passengers`
  - `GET  /api/tte/boarded-passengers`
  - `GET  /api/tte/boarded-rac-passengers`
  - `POST /api/tte/mark-boarded`
  - `POST /api/tte/mark-deboarded`
  - `POST /api/tte/confirm-upgrade`
  - `GET  /api/tte/statistics`
  - `GET  /api/tte/upgraded-passengers`
  - `GET  /api/tte/boarding-queue`
  - `POST /api/tte/confirm-all-boarded`
  - `GET  /api/tte/action-history`
  - `POST /api/tte/undo`

- **Reallocation / Station-wise approval**
  - `POST /api/reallocation/apply`
  - `GET  /api/train/rac-queue`
  - `GET  /api/train/vacant-berths`
  - `GET  /api/reallocation/eligibility`
  - `GET  /api/reallocation/pending`
  - `POST /api/reallocation/approve-batch`
  - `POST /api/reallocation/reject/:id`
  - `GET  /api/reallocation/station-wise`
  - `GET  /api/reallocation/approved`
  - `GET  /api/reallocation/current-station-matching`
  - `POST /api/reallocation/create-from-matches`
  - `GET  /api/reallocation/upgrade-status`
  - `POST /api/reallocation/upgrade/:upgradeId/approve`
  - `POST /api/reallocation/upgrade/:upgradeId/reject`
  - `POST /api/reallocation/reset-upgrade-lock`

- **Visualization**
  - `GET /api/visualization/station-schedule`
  - `GET /api/visualization/segment-matrix`
  - `GET /api/visualization/graph`
  - `GET /api/visualization/heatmap`
  - `GET /api/visualization/berth-timeline/:coach/:berth`
  - `GET /api/visualization/vacancy-matrix`

- **Push Notifications**
  - `GET  /api/push/vapid-public-key`
  - `GET  /api/push/vapid-key`
  - `GET  /api/push/subscriptions-count`
  - `POST /api/push/test`
  - `POST /api/passenger/push-subscribe`
  - `POST /api/passenger/push-unsubscribe`
  - `GET  /api/passenger/notifications`
  - `POST /api/passenger/notifications/:id/read`
  - `POST /api/passenger/notifications/mark-all-read`
  - `POST /api/tte/push-subscribe`
  - `POST /api/admin/push-subscribe`

- **OTP**
  - `POST /api/otp/send`
  - `POST /api/otp/verify`

- **Admin utilities**
  - `POST /api/admin/fix-rac-boarding`
  - `POST /api/test-email`

**Communication Pattern:**
- Routes → Controllers → Services → Models/DB → Services → Controllers → Response.

---

### 3.4 Controllers – HTTP Orchestration

All controllers live in `backend/controllers/`:

- `authController.js` – login/refresh/verify/logout/staff register.
- `trainController.js` – train initialization, journey control, stats.
- `passengerController.js` – PNR search, add passenger, no-show, self-cancel, upgrade notifications, status updates.
- `tteController.js` – TTE-specific workflows (boarding verification, offline upgrades, statistics).
- `reallocationController.js` – no-show handling, RAC queue, vacant berths, eligibility matrix.
- `StationWiseApprovalController.js` – station-wise approvals, pending/approved reallocations.
- `visualizationController.js` – segment matrix, graphs, heatmaps, berth timelines.
- `configController.js` – dynamic DB/config setup.
- `otpController.js` – OTP send/verify.

Each controller:
- Receives validated HTTP request.
- Delegates core business logic to a **Service**.
- Handles response formatting and error responses.

---

### 3.5 Services – Core Business Logic

All services in `backend/services/` (27 files). Key ones:

- `DataService.js` – loads train & passenger data from MongoDB, allocates passengers to berths (`allocatePassengers`).
- `StationEventService.js` – orchestrates what happens when train arrives at a station (board/deboard, find newly vacant berths, trigger upgrades).
- `ReallocationService.js` – main reallocation orchestrator; delegates to:
  - `EligibilityService.js` – 2-stage eligibility (Rules 0–11).
  - `VacancyService.js` – finds vacant berths and ranges.
  - `AllocationService.js` – applies upgrades & writes them back.
- `CurrentStationReallocationService.js` – HashMap-based matching per station; **interval scheduling** / segment matching.
- `StationWiseApprovalService.js` – manages TTE approval flow for pending reallocations.
- `PassengerService.js` – passenger lookups, updates, persistence.
- `NotificationService.js` – orchestrates push/email/in-app notifications.
- `WebPushService.js` – raw Web Push API integration.
- `PushSubscriptionService.js` – manages push subscription documents.
- `InAppNotificationService.js` – in-app notification persistence.
- `OTPService.js` – OTP generation + verification with TTL.
- `RefreshTokenService.js` – manages refresh tokens in MongoDB.
- `CacheService.js` – in-memory caching via node-cache.
- `SegmentService.js` – helper utilities for segments.
- `RACHashMapService.js` – builds RAC & berth hash maps for efficient matching.
- `VisualizationService.js` – builds segment matrix & graph data for visualization.

**Key Algorithmic Areas:**
- Interval scheduling / segment-based allocation.
- HashMap-based matching between RAC passengers and vacant berths.
- Multi-stage eligibility rules.

---

### 3.6 Models – Domain Representation

In `backend/models/`:

- `TrainState.js` – in-memory representation of train state:
  - Stations array (with codes, names, distance, etc.).
  - Coaches and berths.
  - RAC queue.
  - Current station index.
  - Journey flags and upgrade locks.
- `Berth.js` – berth with `segmentOccupancy[]` (per-segment PNR list), `passengers[]`, helper methods like `isAvailableForSegment`.
- `Passenger.ts` – typed passenger model.
- `SegmentMatrix.js` – representation for segment-level visualization.
- `TTEUser.ts` – typed TTE user model.
- `UpgradeNotification.ts` – typed upgrade notification model.
- `index.ts` – central export for TypeScript models.

---

### 3.7 Middleware – Cross-Cutting Concerns

In `backend/middleware/`:

- `auth.js` – JWT verification reading from cookies/Authorization header, `requireRole`, `requirePermission`.
- `csrf.js` – CSRF token generation and validation (double-submit cookie pattern).
- `errorHandler.js` – global error and 404 handlers.
- `rateLimiter.js` – express-rate-limit for API, auth, OTP.
- `validation.js` / `validation-schemas.js` / `validate-request.js` / `validate.ts`:
  - Input sanitization.
  - PNR validation.
  - Train init validation.
  - Zod/Joi schemas for requests.

---

### 3.8 Utils, Scripts & Types

**Utils (`backend/utils/`):**
- `berthAllocator.js` – helper for initial seat allocation.
- `constants.js` – shared constants.
- `envValidator.js` – ensures required env vars exist on startup.
- `error-handler.js`, `helpers.js`, `logger.js`, `queryUtils.js`, `stationOrder.js` – misc helpers.

**Scripts (`backend/scripts/`):**
- `createTestAccounts.js` – seeds admin/TTE/passenger test accounts.
- `createIndexes.js` – MongoDB index creation.
- `resetAdmin.js` – reset admin credentials.
- `check-passengers.js` – data consistency checks.
- `cleanupDuplicateReallocations.js` – cleanup scripts.

**Types (`backend/types/`):**
- `index.ts`, `global.d.ts` – TS type declarations shared across backend.

**Validation (`backend/validation/schemas.ts`):**
- Zod-based schemas for request validation.

---

## 4. Frontend – Files, Roles & Communication

Three portals, all built with **Vite + React + TypeScript**.

### 4.1 Admin Portal – `frontend/`

**Entry & App**

- `src/main.tsx` – Bootstraps React, renders `<App />`.
- `src/App.tsx` – Defines routes and shared layout; uses React Router.

**Key Pages (`frontend/src/pages/`):**

- `LoginPage.tsx` – Staff login (Admin/TTE).
- `SignUpPage.tsx` – Staff registration (optional).
- `HomePage.tsx` – Admin dashboard; visual stats & shortcuts.
- `ConfigPage.tsx` – Train & DB configuration UI.
- `PassengersPage.tsx` – Table of passengers, filters, status.
- `AddPassengerPage.tsx` – Admin add passenger form.
- `CoachesPage.tsx` – Coach/berth visualization.
- `RACQueuePage.tsx` – RAC queue UI.
- `ReallocationPage.tsx` – Main reallocation/eligibility UI.
- `PhaseOnePage.tsx` – Stage-1 focusing UI.
- `AllocationDiagnosticsPage.tsx` – Debug/diagnostics panel.
- `VisualizationPage.tsx` – Station schedule & segment matrix view.

**Core Services (`frontend/src/services/`):**

- `api.ts`
  - Axios instance with `baseURL = VITE_API_URL`.
  - Attaches JWT from `localStorage` or cookies.
  - Handles 401 → logout behavior.
- `apiWithErrorHandling.ts`
  - Wraps `api.ts` with standardized error handling.
- `formValidation.ts`
  - Client-side validation helpers.
- `pushNotificationService.ts`
  - Frontend integration with Web Push.
- `StateStore.ts`
  - Simple state store (if present).
- `toastNotification.ts`
  - Wrapper around `react-hot-toast`.
- `websocket.ts`
  - WebSocket service for admin portal (train updates, stats).

**Components (`frontend/src/components/`):**

- `TrainVisualization.tsx` – big coach/berth grid visualization.
- `RACQueue.tsx` – RAC queue component.
- `PassengerList.tsx` – generic table for passengers.
- `StationProgress.tsx` – station timeline component.
- `FormInput.tsx`, `ToastContainer.tsx`, `APIDocumentationLink.tsx`.
- `common/LoadingSpinner.tsx` – basic loader.

**Styles:**
- `src/styles/pages/*.css` – per-page styling.
- `src/styles/components/*.css` – per-component styling.
- `src/styles/responsive-global.css` – global responsive overrides.

**Communication (Admin Portal):**
- REST:
  - Uses `api.ts` to call `/api/train/*`, `/api/passengers/*`, `/api/reallocation/*`, etc.
- WebSocket:
  - Uses `websocket.ts` to listen to `TRAIN_UPDATE`, `STATION_ARRIVAL`, `STATS_UPDATE`, etc.

---

### 4.2 TTE Portal – `tte-portal/`

**Entry & App**

- `src/main.tsx` – Renders `<App />`.
- `src/App.tsx` – TTE routes:
  - `/login`, `/signup`, `/dashboard`, `/passengers`, `/boarding-verification`,
    `/pending-reallocations`, `/offline-upgrades`, `/upgrade-notifications`, `/visualization`.

**API Service – `tte-portal/src/api.ts`**

- TTE-specific Axios instance.
- Methods for:
  - Marking no-show.
  - Getting filtered passengers.
  - Getting boarding queue.
  - Confirming upgrades.
  - Station-wise approvals.

**Hooks – `tte-portal/src/hooks/useTteSocket.ts`**

- Connects to WebSocket.
- Listens for:
  - `TRAIN_UPDATE`
  - `STATION_ARRIVAL`
  - `RAC_REALLOCATION`
  - `STATS_UPDATE`
- Exposes connection state, last update timestamps, etc., for dashboard.

**Pages:**

- `DashboardPage.tsx` – real-time overview of journey & stats.
- `PassengersPage.tsx` – TTE view of passengers.
- `BoardingVerificationPage.tsx` – handles board/deboard verification.
- `PendingReallocationsPage.tsx` – approval UI for station-wise reallocations.
- `OfflineUpgradesPage.tsx` – offline RAC upgrades.
- `UpgradeNotificationsPage.tsx` – view of upgrades handled by TTE.
- `VisualizationPage.tsx` – station/segment visualization.

**Components:**

- `JourneyTimeline.tsx` – visual journey timeline.
- `PassengerManagement.tsx` – TTE controls for passenger state.
- `TrainControls.tsx` – TTE control panel.

**Communication (TTE Portal):**
- REST: uses `tte-portal/src/api.ts` to hit `/api/tte/*`, `/api/reallocation/*`, `/api/passenger/*`.
- WebSocket: uses `useTteSocket` to remain in sync with train state.

---

### 4.3 Passenger Portal – `passenger-portal/`

**Entry & App**

- `src/main.tsx` – Renders `<App />`.
- `src/App.tsx` – Passenger routes:
  - `/login`, `/pnr-search`, `/dashboard`, `/upgrade-offers`, `/view-ticket`, `/journey-visualization`.

**API Service – `passenger-portal/src/api.ts`**

- Methods:
  - `getPNRDetails(pnr)` – GET `/api/passenger/pnr/:pnr`.
  - `getUpgradeOffers(pnr)` – via upgrade notifications.
  - `acceptUpgrade`, `denyUpgrade`, `selfCancel`, etc.

**Socket Config – `passenger-portal/src/config/socketConfig.ts`**

- Defines:
  - WS URL (`VITE_WS_URL` or `ws://localhost:5000`).
  - Reconnection, heartbeat, queue config.
  - Event names:
    - Client → Server: `subscribe:offers`, `unsubscribe:offers`, `ping`.
    - Server → Client: `upgrade:offer`, `upgrade:expired`, `upgrade:confirmed`,
      `passenger:boarding_status`, `train:update`, `pong`.

**Hook – `passenger-portal/src/hooks/useSocket.ts`**

- Manages WebSocket lifecycle:
  - Connect.
  - Subscribe to offers for a given PNR.
  - Handle `upgrade:offer`, `upgrade:expired`, `upgrade:confirmed`, etc.
  - Manage reconnection and offline queueing.

**Hook – `useOffers.ts`**

- Manages local state for upgrade offers (with TTL and offline considerations).

**Components:**

- `OfferCard.tsx` – shows upgrade offer with countdown + accept/deny.
- `NotificationBell.tsx` – simple bell indicator for offers/notifications.
- `NotificationSettings.tsx` – controls for push settings.
- `BoardingPass.tsx` – renders a QR-style boarding pass.
- `JourneyTimeline.tsx` – passenger's journey timeline.

**Pages:**

- `PNRSearchPage.tsx` – initial PNR lookup.
- `DashboardPage.tsx` – overall passenger dashboard.
- `UpgradeOffersPage.tsx` – list/detail of offers.
- `ViewTicketPage.tsx` – full ticket & berth info.
- `JourneyVisualizationPage.tsx` – segment/journey visualization.

**Communication (Passenger Portal):**
- REST:
  - `getPNRDetails`, `acceptUpgrade`, `denyUpgrade`, `selfCancel`, etc.
- WebSocket:
  - Per-PNR subscription to `upgrade:offer` etc., via `subscribe:offers`.

---

## 5. Communication Flows

### 5.1 REST (Request–Response)

**Example: Mark No-Show (TTE Portal)**

1. TTE UI → `tte-portal/src/api.ts` → `POST /api/tte/mark-no-show`
2. `backend/routes/api.js` → `tteController.markNoShow`
3. `tteController` calls `PassengerService` and `StationEventService`
4. `StationEventService` updates `TrainState`, finds vacant berths, triggers upgrades
5. `ReallocationService` & sub-services compute allocations
6. `AllocationService` updates state + DB
7. `wsManager.broadcastNoShow()` + `broadcastRACReallocation()` push updates
8. TTE/Admin/Passenger portals receive WebSocket events and update UI.

### 5.2 WebSocket (Real-Time Push)

**Passenger Upgrade Flow**

1. Passenger portal connects to WebSocket.
2. Passenger portal sends:
   ```json
   { "type": "subscribe:offers", "payload": { "pnr": "1722500001" } }
   ```
3. Backend `subscribeToPNR` adds this socket to `pnrSubscriptions` for that PNR.
4. When an upgrade is generated:
   - `wsManager.sendOfferToPassenger(pnr, offer)` is called.
   - All sockets in `pnrSubscriptions.get(pnr)` get `type: "upgrade:offer"`.
5. Passenger UI shows OfferCard with timer; actions go via REST:
   - `POST /api/passenger/accept-upgrade`
   - `POST /api/passenger/deny-upgrade`
6. Once TTE confirms in TTE portal:
   - `notifyUpgradeConfirmed(pnr, upgradeData)` is called.
   - Passenger sees final confirmation in real-time.

---

## 6. Database & State Persistence

**MongoDB Collections (conceptual):**

- `<trainNo>` – station schedule, station order, distances.
- `<trainNo>_passengers` – passenger details, journey, PNR status.
- `Trains_Details` – train metadata.
- `staff` – staff accounts (Admin/TTE).
- `passengers` – passenger accounts (for auth).
- `otps` – OTP documents with TTL.
- `refreshtokens` – refresh token documents with TTL.
- `pushsubscriptions` – push subscription records (admin/tte/passenger).
- `inappnotifications` – in-app notifications.
- `actionhistory` – TTE/Admin action history (no-show, reallocations, approvals).

**State Layers:**
- Backend:
  - `TrainState` (in-memory) mirrors current runtime state.
  - Critical flags (current station, journey started, etc.) persisted to MongoDB.
- Frontend:
  - IndexedDB used by portals to restore UI state (admin portal state store).

---

## 7. Security Features

- **JWT Auth** with access + refresh tokens.
- Tokens stored in **httpOnly cookies**.
- **CSRF protection** using double-submit cookie pattern.
- **Rate limiting**:
  - API: 100 requests / 15 minutes.
  - Auth: 5 login attempts / 15 minutes.
  - OTP: 3 per hour.
- **Input validation** using Zod/Joi + custom validation middleware.
- **Password hashing** with bcrypt.

---

## 8. Testing & Quality

- **Framework:** Jest
- **Suites:** 50+
- **Tests:** 1,153
- **Coverage:** 79.57%

Areas tested:
- Services (reallocation, OTP, validation, visualization).
- Controllers (passenger, TTE, train).
- Utilities.
- Integration flows.
- Smoke tests for portals.

---

## 9. DevOps & Deployment

- `docker-compose.yml` & `docker-compose.prod.yml` – local & production multi-container setups.
- `backend/Dockerfile`, `frontend/Dockerfile`, `tte-portal/Dockerfile`, `passenger-portal/Dockerfile`.
- `k8s/backend/*` and `k8s/frontend/*` – Kubernetes deployments, services, configmaps, secrets.
- GitHub Actions for CI/CD (lint, tests, build, deploy).

---

## 10. Summary

This project is a **full production-style system** that:

- Implements **interval scheduling** / segment-based berth allocation.
- Coordinates 3 separate React portals against a single backend.
- Uses **WebSocket** for real-time updates and **Web Push** for background notifications.
- Has a deep **service layer**, meaningful **domain models**, and robust **tests**.
- Demonstrates **systems engineering**: architecture, distributed state, real-time flows.

This `Structure_analysis.md` file documents:
- Each major backend/frontend file and its role.
- How components talk to each other (REST, WebSocket, DB).
- Important metrics (endpoints, lines, tests, coverage).

