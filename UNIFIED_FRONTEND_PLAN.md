# 🚂 UNIFIED FRONTEND PLAN — Approach A (Single Vite App)

> **Goal**: Merge 3 separate portals into **one `frontend/` folder** — one `npm install`, one `npm run dev`, one port (3000), one shared login page.

---

## 1. 📊 COMPLETE DEPENDENCY ANALYSIS

### Runtime Dependencies (Merged `package.json`)

| Package | Admin | TTE | Passenger | **Unified** |
|---------|:-----:|:---:|:---------:|:-----------:|
| `react` | ^19.0.0 | ^19.2.0 | ^19.2.0 | **^19.2.0** |
| `react-dom` | ^19.0.0 | ^19.2.0 | ^19.2.0 | **^19.2.0** |
| `react-router-dom` | ^7.13.0 | ^7.9.6 | ^7.9.6 | **^7.13.0** |
| `@mui/material` | ^7.3.5 | ^7.3.5 | ^7.3.5 | ^7.3.5 |
| `@mui/icons-material` | ^7.3.5 | ^7.3.5 | ^7.3.5 | ^7.3.5 |
| `@emotion/react` | ^11.14.0 | ^11.14.0 | ^11.14.0 | ^11.14.0 |
| `@emotion/styled` | ^11.14.1 | ^11.14.1 | ^11.14.1 | ^11.14.1 |
| `axios` | ^1.13.2 | ^1.13.2 | ^1.13.2 | ^1.13.2 |
| `react-hot-toast` | ^2.6.0 | ^2.4.1 | ^2.6.0 | **^2.6.0** |
| `recharts` | ❌ | ^3.4.1 | ❌ | **^3.4.1** (TTE charts) |
| `qrcode.react` | ❌ | ❌ | ^4.2.0 | **^4.2.0** (Passenger QR) |

### Dev Dependencies

| Package | Admin | TTE | Passenger | **Unified** |
|---------|:-----:|:---:|:---------:|:-----------:|
| `vite` | ^6.0.3 | ^7.2.4 | ^7.2.4 | **^7.2.4** |
| `@vitejs/plugin-react` | ^4.3.4 | ^5.1.1 | ^5.1.1 | **^5.1.1** |
| `typescript` | ^5.9.3 | ^5.9.3 | ^5.9.3 | ^5.9.3 |
| `@types/react` | ^19.2.7 | ^19.2.7 | ^19.2.7 | ^19.2.7 |
| `@types/react-dom` | ^19.2.3 | ^19.2.3 | ^19.2.3 | ^19.2.3 |
| `@playwright/test` | ^1.40.0 | ❌ | ❌ | ^1.40.0 |
| `@types/node` | ^25.2.2 | ❌ | ❌ | ^25.2.2 |
| `eslint` | ^9.17.0 | ^9.39.1 | ^9.39.1 | **^9.39.1** |

> **⚠️ Vite 6 → 7 Bump**: Admin portal currently uses Vite 6, TTE/Passenger use Vite 7. The unified build will use **Vite 7**. This is a minor bump — no breaking changes for our config.

---

## 2. 🔐 AUTHENTICATION FLOW ANALYSIS

### Backend Auth Endpoints (No changes needed)

| Endpoint | Used By | Fields |
|----------|---------|--------|
| `POST /auth/staff/login` | Admin, TTE | `employeeId`, `password` |
| `POST /auth/staff/register` | Admin signup | `employeeId`, `password`, `confirmPassword`, `role`, `name` |
| `POST /auth/passenger/login` | Passenger | `irctcId`/`email`, `password` |
| `POST /auth/passenger/register` | Passenger signup | `email`, `irctcId`, `name`, `phone?`, `password`, `confirmPassword` |
| `GET /auth/verify` | TTE (on mount) | Bearer token |
| `POST /auth/refresh` | TTE, Passenger, Admin (interceptors) | `refreshToken` |
| `POST /auth/logout` | All (currently unused client-side) | Bearer token |

### Login Page Differences

| Feature | Admin | TTE | Passenger |
|---------|-------|-----|-----------|
| **Fields** | Employee ID + Password | Employee ID + Password | IRCTC ID **or** Email (tabs) + Password |
| **API Call** | Direct `api.post('/auth/staff/login')` | `tteAPI.login()` wrapper | `passengerAPI.login()` wrapper |
| **Show Password** | ✅ checkbox | ✅ checkbox | ✅ checkbox |
| **Signup Link** | ✅ "Sign Up" link | ❌ "TTEs registered by Admin" | ✅ "Sign Up" link |
| **After Login** | `window.location.reload()` | `window.location.reload()` | `window.location.reload()` |

### localStorage Keys Per Portal

| Key | Admin | TTE | Passenger | Notes |
|-----|:-----:|:---:|:---------:|-------|
| `token` | ✅ | ✅ | ✅ | JWT access token |
| `refreshToken` | ✅ | ✅ | ✅ | JWT refresh token |
| `user` | ✅ `{username, role}` | ✅ `{username, role, userId, trainAssigned}` | ✅ `{name, IRCTC_ID, pnr}` | Different shapes! |
| `trainAssigned` | ❌ | ✅ | ❌ | TTE's assigned train number |
| `trainNo` | ❌ | ❌ | ✅ | From first ticket |
| `tickets` | ❌ | ❌ | ✅ | Array of passenger tickets |

> **Critical**: TTE stores `trainAssigned` separately (used by API interceptor to auto-inject trainNo into every request). Passenger stores `trainNo` (similar auto-inject). Admin passes trainNo explicitly per-call.

### Token Refresh on Mount

| Portal | Behavior |
|--------|----------|
| **Admin** | Simple `!!localStorage.getItem('token')` check — no verify/refresh |
| **TTE** | Full cycle: check token → `GET /auth/verify` → if fails → `POST /auth/refresh` → if fails → clear & show login |
| **Passenger** | Simple check like Admin — no verify on mount |

---

## 3. 📡 API COMMUNICATION MAP

### Admin Portal — `services/api.ts` (25 exported functions)

Pattern: Individual `export const fn = () => handleRequest(() => api.get/post(...))` — does NOT auto-inject trainNo.

```
CONFIG:      setupConfig, getTrains
TRAIN:       initializeTrain, startJourney, getTrainState, moveToNextStation, resetTrain, getTrainStats, getEngineStatus
REALLOC:     markPassengerNoShow, getRACQueue, getVacantBerths, searchPassenger, getEligibilityMatrix, applyReallocation
PASSENGERS:  getAllPassengers, getPassengersByStatus, getPassengerCounts
VISUAL:      getStationSchedule, getSegmentMatrix, getGraphData, getHeatmap, getBerthTimeline, getVacancyMatrix, getRACtoCNF
OTHER:       addPassenger, setPassengerStatus
```

### TTE Portal — `api.ts` → `export const tteAPI = {...}` (28 methods)

Pattern: `tteAPI.method()` object — auto-injects `trainAssigned` from localStorage into every request.

```
AUTH:     login, register
PASS:     getPassengers, getBoardedPassengers, getBoardedRACPassengers
OPS:      markBoarded, markDeboarded, markNoShow, revertNoShow
UPGRADE:  confirmUpgrade, getOfflineUpgrades, confirmOfflineUpgrade, rejectOfflineUpgrade
STATS:    getStatistics, getUpgradedPassengers
TRAIN:    moveNextStation, getTrainState
BOARD:    getBoardingQueue, confirmAllBoarded
VISUAL:   getStationSchedule
REALLOC:  getPendingReallocations, approveBatchReallocations, rejectReallocation
BERTHS:   getVacantBerths
```

### Passenger Portal — `api.ts` → `export const passengerAPI = {...}` (10 methods)

Pattern: `passengerAPI.method()` object — auto-injects `trainNo` from localStorage into every request.

```
AUTH:     login, register
LOOKUP:   getPNRDetails
CANCEL:   cancelBooking
UPGRADE:  getUpgradeNotifications, acceptUpgrade, denyUpgrade, approveUpgrade, getPendingUpgrades
TRAIN:    getTrainState
```

### Axios Interceptor Pattern (All 3 share this)

```
REQUEST:  Bearer token → CSRF token → (TTE/Passenger: auto-inject trainNo)
RESPONSE: 401 → refresh token → retry / 403 CSRF → refetch → retry
```

---

## 4. 🔌 WEBSOCKET ANALYSIS

### Connection Patterns

| Portal | Type | File | WS URL |
|--------|------|------|--------|
| **Admin** | Singleton class `WebSocketService` | `services/websocket.ts` | `VITE_WS_URL \|\| ws://localhost:5000` |
| **TTE** | React hook `useTteSocket()` | `hooks/useTteSocket.ts` | `VITE_WS_URL \|\| ws://localhost:5000` |
| **Passenger** | React hook `useSocket(pnr)` | `hooks/useSocket.ts` | From `config/socketConfig.ts` → `ws://localhost:5000` |

### Event Types Handled

| Event | Admin | TTE | Passenger |
|-------|:-----:|:---:|:---------:|
| `CONNECTION_SUCCESS` | ✅ | ✅ | ✅ |
| `TRAIN_UPDATE` | ✅ | ✅ | ✅ |
| `STATION_ARRIVAL` | ✅ | ✅ | ✅ |
| `RAC_REALLOCATION` | ✅ | ✅ | ✅ |
| `NO_SHOW` | ✅ | ✅ | ✅ |
| `STATS_UPDATE` | ✅ | ✅ | ❌ |
| `UPGRADE_OFFER` | ❌ | ❌ | ✅ |
| `BOARDING_UPDATE` | ❌ | ✅ | ✅ |
| `REALLOCATION_APPROVED` | ❌ | ✅ | ✅ |
| `PASSENGER_UPDATE` | ❌ | ❌ | ✅ |

### Reconnection Strategy

| Portal | Max Retries | Delay | Auto-reconnect |
|--------|:-----------:|:-----:|:--------------:|
| Admin | 5 | 3000ms | ✅ linear |
| TTE | 5 | 2000ms base (exponential capped 30s) | ✅ exponential backoff |
| Passenger | 5 | 2000ms base (exponential capped 30s) | ✅ exponential backoff |

### IDENTIFY Message

| Portal | On Connect Sends |
|--------|-----------------|
| Admin | `{ type: 'SUBSCRIBE' }` + `{ type: 'IDENTIFY', role: 'ADMIN' }` |
| TTE | `{ type: 'SUBSCRIBE' }` + `{ type: 'IDENTIFY', role: 'TTE' }` |
| Passenger | `{ type: 'SUBSCRIBE' }` + `{ type: 'IDENTIFY', role: 'PASSENGER', pnr }` |

---

## 5. 🗺️ ROUTING STRUCTURE

### Admin Portal (react-router-dom × BrowserRouter)
```
/                    → LandingPage (multi-train grid)
/train/:trainNo      → TrainDashboard (tabs: Passengers, Coaches, RAC Queue, Add Passenger, Visualization, Phase One)
/config              → TrainDashboard with initialPage="config"
```

### TTE Portal (NO react-router — MUI Tabs only)
```
Tab 0: DashboardPage
Tab 1: PassengersPage
Tab 2: BoardedPassengersPage
Tab 3: PendingReallocationsPage
Tab 4: VisualizationPage
```
> NOTE: TTE has no URL-based routing — it uses `currentTab` state with MUI Tabs. The entire app is a single SPA page.

### Passenger Portal (react-router-dom × BrowserRouter)
```
/                    → DashboardPage
/pnr-search          → PNRSearchPage
/journey             → JourneyVisualizationPage
/upgrades            → UpgradeOffersPage
/family-upgrade      → FamilyUpgradeSelectionPage
/report-deboarding   → ReportDeboardingPage
/cancel-ticket       → CancelTicketPage
/change-boarding     → ChangeBoardingStationPage
/ticket-view         → QRTicketViewPage (also accessible WITHOUT auth!)
```

---

## 6. 🔔 PUSH NOTIFICATIONS

All 3 portals have `pushNotificationService.ts` with `initializePushNotifications()`:
- Uses service workers for web push
- Admin: initialized on page load
- TTE: initialized after auth verify succeeds
- Passenger: initialized after token check succeeds
- **Can share a single implementation** since they all call the same backend push subscription endpoint

---

## 7. 📁 PROPOSED FOLDER STRUCTURE

```
frontend/
├── package.json                  # Merged dependencies (one install)
├── vite.config.js                # Port 3000, LAN IP detect, process.env compat
├── tsconfig.json
├── index.html
├── public/
├── src/
│   ├── main.tsx                  # ReactDOM.createRoot
│   ├── App.tsx                   # Root: RoleSelector → Login → Portal routing
│   ├── App.css                   # Root styles
│   │
│   ├── shared/                   # ========= SHARED CODE =========
│   │   ├── api/
│   │   │   └── axiosClient.ts    # Single axios instance (CSRF, JWT, refresh interceptors)
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx     # Unified login (role-aware fields)
│   │   │   ├── LoginPage.css
│   │   │   ├── SignUpPage.tsx    # Unified signup (role: Admin/Passenger)
│   │   │   └── SignUpPage.css
│   │   ├── components/
│   │   │   └── RoleSelector.tsx  # Landing page — 3 role cards
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts   # (Optional) Unified WS hook
│   │   ├── services/
│   │   │   └── pushNotificationService.ts
│   │   └── theme.ts              # Shared MUI theme
│   │
│   ├── portals/                  # ========= PORTAL CODE =========
│   │   ├── admin/                # ← admin-portal/src/* moved here
│   │   │   ├── AdminApp.tsx      # (was App.tsx) Internal routing
│   │   │   ├── TrainApp.tsx
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   │   ├── api.ts        # Keep as-is, import shared axiosClient
│   │   │   │   └── websocket.ts
│   │   │   ├── styles/
│   │   │   └── types/
│   │   │
│   │   ├── tte/                  # ← tte-portal/src/* moved here
│   │   │   ├── TteApp.tsx        # (was App.tsx) Tab-based navigation
│   │   │   ├── api.ts
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   │   └── useTteSocket.ts
│   │   │   ├── services/
│   │   │   └── styles/
│   │   │
│   │   └── passenger/            # ← passenger-portal/src/* moved here
│   │       ├── PassengerApp.tsx   # (was App.tsx) Router-based navigation
│   │       ├── api.ts
│   │       ├── pages/
│   │       ├── components/
│   │       ├── hooks/
│   │       │   └── useSocket.ts
│   │       ├── services/
│   │       ├── config/
│   │       ├── constants.ts
│   │       └── styles/
│   │
│   └── types/                    # Shared TypeScript types
```

---

## 8. 🔀 ROOT APP.TSX ROUTING DESIGN

```tsx
// frontend/src/App.tsx
<BrowserRouter>
  <Routes>
    {/* Public routes */}
    <Route path="/" element={<RoleSelector />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignUpPage />} />
    
    {/* Portal routes — lazy loaded */}
    <Route path="/admin/*" element={<Suspense><AdminApp /></Suspense>} />
    <Route path="/tte/*" element={<Suspense><TteApp /></Suspense>} />
    <Route path="/passenger/*" element={<Suspense><PassengerApp /></Suspense>} />
    
    {/* Special: QR ticket view accessible without auth */}
    <Route path="/ticket-view" element={<QRTicketViewPage />} />
  </Routes>
</BrowserRouter>
```

### Internal Route Adjustments

| Portal | Current Route | New Route (under prefix) |
|--------|--------------|--------------------------|
| **Admin** `/` | Landing | `/admin/` |
| **Admin** `/train/:trainNo` | Dashboard | `/admin/train/:trainNo` |
| **Admin** `/config` | Config | `/admin/config` |
| **Passenger** `/` | Dashboard | `/passenger/` |
| **Passenger** `/pnr-search` | PNR | `/passenger/pnr-search` |
| **Passenger** `/journey` | Journey | `/passenger/journey` |
| **Passenger** `/upgrades` | Upgrades | `/passenger/upgrades` |
| **Passenger** `/ticket-view` | QR View | `/ticket-view` (root, no auth) |
| **TTE** (tabs) | N/A | `/tte/` (single page, tabs stay internal) |

---

## 9. 🔑 UNIFIED LOGIN FLOW

```
User visits localhost:3000
    → RoleSelector page with 3 cards:
        🛡️ Admin — "System Management & Configuration"
        📋 TTE — "Ticket Examination & Boarding"  
        🎫 Passenger — "Check Status & Bookings"
    
User clicks a card
    → /login?role=admin|tte|passenger
    → LoginPage renders:
        - If admin/tte: Employee ID + Password fields
        - If passenger: IRCTC ID/Email tabs + Password field
    
User submits
    → If admin/tte: POST /auth/staff/login {employeeId, password}
    → If passenger: POST /auth/passenger/login {irctcId/email, password}
    
On success
    → Store token/refreshToken/user + role-specific keys in localStorage
    → Store 'activePortal' = 'admin'|'tte'|'passenger'
    → Navigate to /admin/ or /tte/ or /passenger/
    
On subsequent visits
    → Check localStorage token + activePortal
    → If valid: auto-navigate to last portal
    → If expired: show login with pre-selected role
```

---

## 10. ⚙️ VITE CONFIG (Merged)

```js
// frontend/vite.config.js — Merged from all 3
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'os'

// Passenger QR LAN IP detection (kept from passenger-portal)
function getLanIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces))
    for (const iface of interfaces[name])
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
  return 'localhost'
}

const LAN_IP = getLanIP()
const PORT = 3000

export default defineConfig({
  plugins: [react()],
  server: {
    port: PORT,
    open: true,
    cors: true,
    host: true,  // From passenger (allows LAN access)
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'import.meta.env.VITE_QR_BASE_URL': JSON.stringify(`http://${LAN_IP}:${PORT}`),
  },
})
```

---

## 11. 🚫 WHAT DOES NOT CHANGE

- **All backend APIs** — zero backend modifications needed
- **WebSocket server** — same `ws://localhost:5000`
- **MongoDB collections** — untouched
- **JWT/CSRF flow** — same cookies, same tokens
- **Email/OTP services** — backend-driven, no frontend change
- **Push notification endpoints** — same backend subscriptions

---

## 12. ⚠️ GOTCHAS & EDGE CASES

### 12.1 localStorage Key Conflicts
Since all 3 portals will now run on the **same origin** (same port), they share localStorage. Key collision:
- `token`, `refreshToken`, `user` — stored by all 3 portals with **different shapes**
- **Solution**: Prefix keys: `admin_token`, `tte_token`, `passenger_token` **OR** keep single set + store `activeRole` to know which portal is active

> **Recommended**: Keep single `token`/`refreshToken` set (only one user logged in at a time). Add `activePortal` key to track which portal to show. Switching portals requires re-login.

### 12.2 TTE's `trainAssigned` Auto-Injection
TTE interceptor reads `localStorage.getItem('trainAssigned')` and injects into every API call. This must continue to work in the unified setup. Since the interceptor is in the TTE api.ts module (only imported by TTE components), it works as-is.

### 12.3 Passenger's `/ticket-view` Route (No Auth)
This route is accessible without authentication (for TTE phone scanning). Must remain at the root level, not behind `/passenger/*` auth guard.

### 12.4 CSS Class Name Conflicts
All 3 portals have `.login-container`, `.login-box`, `.login-form` etc. Since they'll share the same DOM, these will conflict.
- **Solution**: CSS Modules or scoped class names per portal (`.admin-login-container` vs `.tte-login-container`). But since LOGIN will be unified, this is only an issue for page-specific styles.

### 12.5. Admin Portal Has No Token Refresh on Mount
Admin currently does a synchronous `!!localStorage.getItem('token')` — meaning if the token is expired, it shows the dashboard briefly, then API calls fail. The unified login should adopt TTE's verify+refresh pattern for all roles.

---

## 13. 📋 STEP-BY-STEP MIGRATION PLAN

### Phase 1: Create `frontend/` Skeleton
1. Create `frontend/` folder in project root
2. Create merged `package.json` with all dependencies (from Section 1)
3. Create merged `vite.config.js` (from Section 10)
4. Copy `tsconfig.json` from any portal
5. Create `index.html` (adapted from admin-portal)
6. `npm install` inside `frontend/`

### Phase 2: Move Portal Code
7. Copy `admin-portal/src/*` → `frontend/src/portals/admin/`
8. Copy `tte-portal/src/*` → `frontend/src/portals/tte/`
9. Copy `passenger-portal/src/*` → `frontend/src/portals/passenger/`
10. Rename each portal's `App.tsx` to `AdminApp.tsx`, `TteApp.tsx`, `PassengerApp.tsx`

### Phase 3: Create Shared Code
11. Create `shared/api/axiosClient.ts` — unified axios instance
12. Create `shared/auth/LoginPage.tsx` — role-aware login
13. Create `shared/auth/SignUpPage.tsx` — role-aware signup (Admin/Passenger)
14. Create `shared/components/RoleSelector.tsx` — landing page
15. Create `shared/theme.ts` — single MUI theme
16. Create root `App.tsx` with portal routing (from Section 8)
17. Create `main.tsx` entry point

### Phase 4: Fix Imports
18. Update portal-internal imports (relative paths shifted by one level)
19. Update each portal's api.ts to optionally use shared axiosClient
20. Update CSS import paths
21. Each portal's login/signup code can be removed (replaced by shared versions)

### Phase 5: Update Infrastructure
22. Update `docker-compose.yml` for new `frontend/` path
23. Update `.github/workflows/ci.yml` and `cd.yml`
24. Update `k8s/admin-portal/deployment.yaml`
25. Update root `README.md` and `QUICKSTART.md`

### Phase 6: Test
26. `npm run dev` — verify RoleSelector loads on :3000
27. Login as Admin → verify all admin pages work
28. Login as TTE → verify all TTE tabs work
29. Login as Passenger → verify all passenger routes work
30. Verify WebSocket connections (all 3 patterns)
31. Verify QR code `/ticket-view` route works without auth
32. `npm run build` — verify production build succeeds

---

## 14. 🏗️ FILES TO CREATE / MODIFY / DELETE

### NEW Files
| File | Description |
|------|-------------|
| `frontend/package.json` | Merged dependencies |
| `frontend/vite.config.js` | Merged Vite config |
| `frontend/index.html` | Entry point |
| `frontend/tsconfig.json` | TypeScript config |
| `frontend/src/main.tsx` | React root |
| `frontend/src/App.tsx` | Root router + role guard |
| `frontend/src/App.css` | Root styles |
| `frontend/src/shared/components/RoleSelector.tsx` | Role selection landing |
| `frontend/src/shared/auth/LoginPage.tsx` | Unified login |
| `frontend/src/shared/auth/SignUpPage.tsx` | Unified signup |
| `frontend/src/shared/theme.ts` | Shared MUI theme |

### MOVED Files (copy + adapt imports)
| Source | Destination |
|--------|-------------|
| `admin-portal/src/*` | `frontend/src/portals/admin/` |
| `tte-portal/src/*` | `frontend/src/portals/tte/` |
| `passenger-portal/src/*` | `frontend/src/portals/passenger/` |

### MODIFIED Files (infrastructure)
| File | Change |
|------|--------|
| `docker-compose.yml` | Update frontend build path |
| `.github/workflows/ci.yml` | Update frontend path |
| `.github/workflows/cd.yml` | Update frontend path |
| `k8s/admin-portal/deployment.yaml` | Update build context |
| `README.md` | Update project structure |
| `QUICKSTART.md` | Update dev instructions |

### KEPT (No Changes)
| Folder | Reason |
|--------|--------|
| `backend/` | Zero backend changes |
| All old portals | Kept for reference until migration verified |
