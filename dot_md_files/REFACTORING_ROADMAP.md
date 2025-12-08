# Safe Refactoring & Improvement Roadmap

**Goal:** Elevate the project from "Prototype" to "Production-Ready" quality by fixing architectural flaws, security gaps, and code structure **without touching the core RAC reallocation logic.**

---

## 🏗️ Phase 1: Frontend Structural Cleanup (Low Risk)
*These changes purely reorganize code. The logic remains identical, but the files become readable and maintainable.*

### 1. Split `ReallocationPage.jsx`
**Current State:** A single ~800 line file containing multiple views.
**Action:** Extract components into separate files.
- [ ] Create `src/components/reallocation/StationWiseView.jsx`
- [ ] Create `src/components/reallocation/HashMapView.jsx`
- [ ] Create `src/components/reallocation/CurrentStationMatchingView.jsx`
- [ ] **Result:** Main page drops to ~150 lines; easier to debug specific tabs.

### 2. Replace Native Alerts with UI Modals
**Current State:** Uses `window.alert()` and `window.confirm()`, which block the browser and look unprofessional.
**Action:** Replace with a simple Modal component or a library (e.g., `react-hot-toast` for notifications, custom Modal for confirmations).
- [ ] Replace "Confirm Reallocation" popup with a proper React Modal.
- [ ] **Result:** Instantly looks 10x more professional for demos.

### 3. Centralize API Calls
**Current State:** Some components still make direct `axios` calls or mix logic.
**Action:** Ensure all backend interaction goes through `services/api.js`.
- [ ] Audit `ReallocationPage.jsx` for any direct `fetch` or `axios` calls and move them to the service layer.

---

## ⚙️ Phase 2: Backend Stability & Architecture (Medium Risk)
*These changes fix "fragile" code patterns that could cause crashes, but do not change the algorithms.*

### 4. Fix Circular Dependency (`setTimeout` Hack)
**Current State:** `reallocationController.js` waits 1 second to load `wsManager` to avoid a circular dependency.
**Action:** Use Dependency Injection.
- [ ] Modify `reallocationController` to accept `wsManager` as an argument in its methods, OR
- [ ] Initialize `wsManager` in `server.js` and attach it to the `req` object or pass it explicitly.
- [ ] **Result:** Server starts reliably every time; no race conditions.

### 5. "Slim Down" Controllers
**Current State:** `reallocationController.js` contains logic for formatting emails and constructing objects.
**Action:** Move non-HTTP logic to Services.
- [ ] Move "Notification Construction" logic to `NotificationService`.
- [ ] Move "Vacancy Object Formatting" to `ReallocationService`.
- [ ] **Result:** Controller only handles "Receive Request -> Call Service -> Send Response".

### 6. Standardize Error Handling
**Current State:** Every function has a repetitive `try-catch` block.
**Action:** Use an `asyncHandler` wrapper.
- [ ] Create `middleware/asyncHandler.js`.
- [ ] Wrap controller methods: `exports.myMethod = asyncHandler(async (req, res) => { ... })`.
- [ ] **Result:** Removes hundreds of lines of boilerplate code.

---

## 🔒 Phase 3: Security & Configuration (Zero Logic Risk)
*These changes harden the application against attacks and configuration errors.*

### 7. Environment Variable Validation
**Current State:** If `.env` is missing a key, the app might crash later or behave insecurely.
**Action:** Validate config on startup.
- [ ] Create `config/env.js` to check for `MONGO_URI`, `JWT_SECRET`, `ALLOWED_ORIGINS`.
- [ ] Throw an error immediately if a key is missing.

### 8. Input Validation Middleware - ✅ COMPLETED
**Status:** ✅ Implemented with Zod + TypeScript
**Files Created:** 
- `backend/validation/schemas.ts` - All API validation schemas
- `backend/middleware/validate.ts` - Express middleware
- [ ] Wire up validation to all routes (next step)

### 9. Externalize Magic Numbers
**Current State:** Timeouts (300s), status strings ('RAC', 'CNF'), and tab names are hardcoded.
**Action:** Move to `constants.js`.
- [ ] Create `backend/constants/index.js`.
- [ ] Define `CONSTANTS.PASSENGER_STATUS`, `CONSTANTS.TIMEOUTS`.

---

## 🚀 Execution Order (Recommended)

1.  **Frontend Split** (Safest, highest visual impact for code review).
2.  **Fix Circular Dependency** (Critical for server stability).
3.  **Replace Alerts** (High visual impact for demos).
4.  **Slim Down Controllers** (Improves code quality for interviews).
5.  **Security/Config** (Good talking point for "Production Readiness").
