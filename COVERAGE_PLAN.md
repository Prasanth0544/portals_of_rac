# Code Coverage Improvement Plan (Updated)
**Goal: Branches >= 85% (Achieved) | Functions >= 99%**

---

## Current Status

Latest full run (`npx jest --coverage`):

| Metric     | Current | Target | Status |
|------------|---------|--------|--------|
| Statements | 95.00%  | 75%    | Achieved |
| Lines      | 95.52%  | 75%    | Achieved |
| Branches   | 85.17%  | 85%    | Achieved |
| Functions  | 97.32%  | 99%    | In Progress |

Branch objective for this phase is complete. Function target is still pending.

---

## What Was Completed

Primary branch-heavy additions in this pass:

- `__tests__/controllers/authController.test.js`
  - Added extensive branch paths for login/register/refresh/logout error mapping and welcome-email failure handling.
- `__tests__/services/StationWiseApprovalService.test.js`
  - Added valid ObjectId approval flow tests, push-failure continuation branches, and persistence error branches.
- `__tests__/services/ReallocationService.test.js`
  - Added stage/group/legacy matrix branch tests including fallback formatting paths.
- `__tests__/services/CurrentStationReallocationService.test.js`
  - Added vacancy-boundary and multi-range branch scenarios.
- `__tests__/controllers/passengerController.test.js`
  - Added success/error branches for `acceptUpgrade`, `denyUpgrade`, `getVacantBerths`, `getPassengersByStatus`, plus helper coverage.
- `__tests__/services/StationEventService.test.js`
  - Added auto-allocation success/failure branches and RAC upgrade path variants.
- `__tests__/controllers/otpController.test.js`
  - Added fallback lookup failure branches and account-email fallback failure branch.
- `__tests__/services/reallocation/NoShowService.test.js`
  - Added `_updateStats` branch tests (final push crossing 85% branches).

---

## Remaining Observations

- Jest still reports a force-exit/open-handle warning in full-suite runs.
- This warning does not block coverage goals but should be cleaned up for CI stability.
- Current overall branch coverage is **85.17%** (phase target achieved).
- Function coverage remains below stretch target (**97.32% vs 99%**).

---

## Focus Analysis: Remaining High-Impact Gaps

Current reported low-branch files from latest run:

| File | Branch % |
|------|----------|
| `services/ReallocationService.js` | 82.22% |
| `services/CurrentStationReallocationService.js` | 80.35% |
| `controllers/passengerController.js` | 86.03% |
| `services/StationWiseApprovalService.js` | 86.44% |
| `services/StationEventService.js` | 88.67% |
| `controllers/otpController.js` | 81.81% |

### Highest-yield next actions

1. Lift **function coverage** by targeting uncalled handlers in:
   - `controllers/otpController.js`
   - `controllers/passengerController.js`
2. Add focused branch/function tests for:
   - `services/CurrentStationReallocationService.js`
   - `services/ReallocationService.js`
   - `services/StationWiseApprovalService.js`
3. Keep open-handle cleanup parallel to coverage work to stabilize CI runs.

---

## Next Work (Function 99% + Branch Hardening)

If we continue, prioritize:

1. **Function coverage push to 99%**
   - Focus on function-heavy controllers/services still below 99%.
2. **Service branch hardening**
   - `CurrentStationReallocationService.js`
   - `ReallocationService.js`
   - `StationWiseApprovalService.js`
3. Open-handle cleanup:
   - Run `npx jest --detectOpenHandles`
   - Identify remaining timers/sockets/workers and ensure proper teardown or `.unref()` usage.

---

## Definition of Done (Updated)

- [x] `npx jest --coverage` shows **Statements >= 75%**
- [x] `npx jest --coverage` shows **Lines >= 75%**
- [x] `npx jest --coverage` shows **Branches >= 75%**
- [x] Full suite passes with current changes
- [x] `npx jest --coverage` shows **Branches >= 85%**
- [ ] `npx jest --coverage` shows **Functions >= 99%**
- [ ] Open-handle warning fully resolved

---

## How to Run

```bash
cd backend
npx jest --coverage
```

```bash
# Optional diagnostics for teardown leaks
npx jest --detectOpenHandles
```
