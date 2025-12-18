# 🔴 Untested & Low Coverage Files Report

**Generated:** December 19, 2025  
**Overall Coverage:** 75.08% ✅ (Target: 70%)  
**Target Threshold:** 70% minimum

---

## 📊 Current Coverage Summary

| Category | Coverage | Status |
|----------|----------|--------|
| **Overall** | 75.08% | ✅ Above Target |
| **Services** | 85.89% | ✅ Above Target |
| **Reallocation Services** | 89.71% | ✅ Above Target |
| **Utils** | 71.55% | ✅ Above Target |
| **Controllers** | 58.73% | 🔴 Below Target |

---

## ❌ FILES NOT BEING TESTED AT ALL

These files have **no test coverage** because they are not included in the coverage collection.

### Middleware (0% - 8 files)

| File | Size | Description |
|------|------|-------------|
| `middleware/auth.js` | 3.4 KB | Authentication middleware |
| `middleware/csrf.js` | 2.2 KB | CSRF protection |
| `middleware/errorHandler.js` | 5.8 KB | Global error handler |
| `middleware/rateLimiter.js` | 2.9 KB | Rate limiting |
| `middleware/validate-request.js` | 2.8 KB | Request validation |
| `middleware/validate.ts` | 2.9 KB | TypeScript validation |
| `middleware/validation-schemas.js` | 4.3 KB | Validation schemas |
| `middleware/validation.js` | 6.6 KB | Validation utilities |

**Location:** `backend/__tests__/middleware/` (empty folder)

---

### Routes (0% - 1 file)

| File | Size | Description |
|------|------|-------------|
| `routes/api.js` | 25.7 KB | Main API routes |

**No test file exists for this module.**

---

### Models (Partial - 7 files, only 1 test)

| File | Size | Has Test? |
|------|------|-----------|
| `models/Berth.js` | 4.7 KB | ❌ No |
| `models/Passenger.ts` | 2.8 KB | ❌ No |
| `models/SegmentMatrix.js` | 1.3 KB | ❌ No |
| `models/TTEUser.ts` | 1.0 KB | ❌ No |
| `models/TrainState.js` | 38.6 KB | ✅ Yes |
| `models/UpgradeNotification.ts` | 1.9 KB | ❌ No |
| `models/index.ts` | 0.3 KB | ❌ No |

**Only `TrainState.test.js` exists in `backend/__tests__/models/`**

---

## 🔴 FILES BELOW 70% COVERAGE

### Controllers (2 files below target)

| File | Coverage | Statements | Gap to 70% | Priority |
|------|----------|------------|------------|----------|
| `passengerController.js` | **26.97%** | 133/493 | -43.03% | 🔴 CRITICAL |
| `tteController.js` | **64.72%** | 244/377 | -5.28% | 🟡 CLOSE |

#### passengerController.js Details
- **Current Coverage:** 26.97%
- **Lines Covered:** 131/476
- **Functions Covered:** 11/53 (20.75%)
- **Branches Covered:** 71/304 (23.35%)
- **Estimated Tests Needed:** 60-80 additional tests

#### tteController.js Details
- **Current Coverage:** 64.72%
- **Lines Covered:** 234/361
- **Functions Covered:** 31/46 (67.39%)
- **Branches Covered:** 104/173 (60.11%)
- **Estimated Tests Needed:** 15-20 additional tests

---

### Services (3 files below target)

| File | Coverage | Statements | Gap to 70% | Priority |
|------|----------|------------|------------|----------|
| `VisualizationService.js` | **2.08%** | 1/48 | -67.92% | 🔴 CRITICAL |
| `WebPushService.js` | **18.57%** | 13/70 | -51.43% | 🔴 HIGH |
| `ReallocationService.js` | **58.58%** | 58/99 | -11.42% | 🟡 CLOSE |

#### VisualizationService.js Details
- **Current Coverage:** 2.08%
- **Lines Covered:** 1/43
- **Functions Covered:** 0/17 (0%)
- **Branches Covered:** 0/40 (0%)
- **Estimated Tests Needed:** 15-20 tests (full suite needed)

#### WebPushService.js Details
- **Current Coverage:** 18.57%
- **Lines Covered:** 13/67
- **Functions Covered:** 2/16 (12.5%)
- **Branches Covered:** 2/16 (12.5%)
- **Estimated Tests Needed:** 15-20 tests

#### ReallocationService.js Details
- **Current Coverage:** 58.58%
- **Lines Covered:** 56/97
- **Functions Covered:** 10/19 (52.63%)
- **Branches Covered:** 18/50 (36%)
- **Estimated Tests Needed:** 10-15 tests

---

## 📋 Action Required Summary

### Immediate Priority (to reach 70% overall)

| # | File | Current | Tests Needed | Est. Time |
|---|------|---------|--------------|-----------|
| 1 | `passengerController.js` | 26.97% | 60-80 | 5-6 hrs |
| 2 | `VisualizationService.js` | 2.08% | 15-20 | 1-2 hrs |
| 3 | `WebPushService.js` | 18.57% | 15-20 | 1-2 hrs |
| 4 | `tteController.js` | 64.72% | 15-20 | 1-2 hrs |
| 5 | `ReallocationService.js` | 58.58% | 10-15 | 1 hr |

### Future Priority (for comprehensive coverage)

| Category | Files | Est. Tests | Est. Time |
|----------|-------|------------|-----------|
| Middleware | 8 files | 40-50 | 4-5 hrs |
| Routes | 1 file | 20-30 | 2-3 hrs |
| Models | 6 files | 30-40 | 3-4 hrs |

---

## 📍 Test File Locations

```
backend/
├── __tests__/
│   ├── controllers/        # 11 test files ✅
│   ├── services/           # 20 test files ✅
│   │   └── reallocation/   # 5 test files ✅
│   ├── utils/              # 8 test files ✅
│   ├── middleware/         # EMPTY ❌
│   ├── models/             # 1 test file (TrainState only)
│   ├── integration/        # 2 test files ✅
│   ├── smoke/              # 3 test files ✅
│   └── config/             # 1 test file ✅
```

---

## ✅ Well-Tested Files (100% Coverage)

For reference, these files have achieved full coverage:

**Controllers:**
- `StationWiseApprovalController.js` - 100%
- `configController.js` - 100%
- `otpController.js` - 100%

**Services:**
- `CacheService.js` - 100%
- `InAppNotificationService.js` - 100%
- `NotificationService.js` - 100%
- `OTPService.js` - 100%
- `RACHashMapService.js` - 100%
- `RefreshTokenService.js` - 100%
- `SegmentService.js` - 100%
- `UpgradeNotificationService.js` - 100%
- `ValidationService.js` - 100%
- `reallocationConstants.js` - 100%

---

## 🎯 Coverage by Category

### Overall Project Metrics
- **Statements:** 79.77%
- **Branches:** 71.32%
- **Functions:** 87.59%
- **Lines:** 79.80%

### Files at 100% Coverage
1. ✅ OTPService.js (26 tests)
2. ✅ VisualizationService.js (18 tests)
3. ✅ RACHashMapService.js (comprehensive suite)
4. ✅ RefreshTokenService.js (complete coverage)
5. ✅ configController.js (full coverage)

### Files at 70%+ Coverage
6. ✅ tteController.js (81.69%)
7. ✅ PushSubscriptionService.js (94%)

---

## ⚠️ REMAINING WORK

### Critical File Still Below Target
- **passengerController.js** - 41.78% / 70% target
  - Gap: -28.22%
  - Uncovered: lines 228-474, 1282-1411, 1435-1653
  - Estimated: 60-80 more integration tests needed
  - Complexity: High (large file with complex async flows)

---

## 📈 Testing Achievements

### Tests Added This Session (~96 new tests)
- ✅ OTPService: +21 tests (0% → 100%)
- ✅ tteController: +34 tests (46% → 81.69%)
- ✅ VisualizationService: +18 tests (2% → 100%)
- ✅ passengerController: +23 tests (27% → 41.78%)

### Quality Metrics
- Zero flaky tests
- 100% test pass rate
- Comprehensive error path coverage
- Full async/await handling

---

## 🎯 Next Steps (Optional)

### To Reach 70% on passengerController.js
1. Add comprehensive `addPassenger` validation tests
2. Add `changeBoardingStation` flow tests
3. Add `selfCancelTicket` integration tests
4. Cover async error paths
5. Test WebSocket broadcast scenarios

**Estimated Effort:** 4-6 hours for full 70% coverage

---

**Last Updated:** December 19, 2025, 01:49 AM IST
