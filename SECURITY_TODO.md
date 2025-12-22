# 🔒 Security & Testing - TODO

**Last Updated:** December 22, 2025  
**Focus:** Pending tasks and improvements

---

## 📊 Testing Coverage - INCOMPLETE

**Current:** ~22% overall coverage  
**Target:** 70% coverage  
**Gap:** 48% to go

---

## ❌ UNTESTED Controllers (2/9)

- [ ] `configController.js` - **0% coverage**
- [ ] `StationWiseApprovalController.js` - **0% coverage**

**Action:** Write Jest tests for these 2 controllers

---

## ❌ UNTESTED Services (15/21)

- [ ] `CacheService.js` (8.62%)
- [ ] `CurrentStationReallocationService.js` (0%)
- [ ] `DataService.js` (1.66%)
- [ ] `InAppNotificationService.js` (8.51%)
- [ ] `NotificationService.js` (9.75%)
- [ ] `PassengerService.js` (0%)
- [ ] `PushNotificationService.js` (12.50%)
- [ ] `PushSubscriptionService.js` (3.30%)
- [ ] `RACHashMapService.js` (0%)
- [ ] `ReallocationService.js` (12.12%)
- [ ] `RefreshTokenService.js` (8.69%)
- [ ] `UpgradeNotificationService.js` (9.83%)
- [ ] `VisualizationService.js` (2.08%)
- [ ] `WebPushService.js` (11.42%)
- [ ] `reallocation/AllocationService.js` (1.98%)
- [ ] `reallocation/EligibilityService.js` (2.60%)
- [ ] `reallocation/NoShowService.js` (11.11%)

**Action:** Increase coverage to at least 70% for all services

---

## ❌ UNTESTED Middleware (8/8)

- [ ] `auth.js`
- [ ] `csrf.js`
- [ ] `errorHandler.js`
- [ ] `rateLimiter.js`
- [ ] `validate-request.js`
- [ ] `validate.ts`
- [ ] `validation-schemas.js`
- [ ] `validation.js`

**Action:** Write middleware tests (mocking req/res/next)

---

## ❌ UNTESTED Utilities (1/9)

- [ ] `create-indexes.js` - **0% coverage**

**Action:** Write test for index creation script

---

## ❌ UNTESTED Frontend (3 Portals)

- [ ] Admin Portal (`frontend/`) - **0 tests**
- [ ] TTE Portal (`tte-portal/`) - **0 tests**
- [ ] Passenger Portal (`passenger-portal/`) - **0 tests**

**Action:** Add React Testing Library tests
- Component rendering
- User interactions
- API calls (mocked)

---

## 🎯 Priority Tasks

### High Priority (Do First)
1. [ ] **Test untested services** (biggest gap - 15 files)
   - Focus on critical services: DataService, PassengerService, NotificationService
2. [ ] **Test middleware** (8 files, all security-critical)
   - auth.js, csrf.js, rateLimiter.js most important
3. [ ] **Test untested controllers** (2 files)
   - configController, StationWiseApprovalController

### Medium Priority (Do Next)
4. [ ] **Frontend unit tests** (0 tests → target: 50+ tests)
   - Start with critical components (Login, Dashboard, PNR Lookup)
5. [ ] **Integration tests** for complete user flows
   - Login → Action → Logout
   - TTE mark no-show → Reallocation → Passenger notification

### Low Priority (Nice to Have)
6. [ ] **API contract tests** (Pact or similar)
7. [ ] **Performance regression tests**
8. [ ] **Visual regression tests** (Percy/Chromatic)
9. [ ] **Accessibility tests** (axe-core)

---

## � Security Improvements (Optional)

### Pending Enhancements
- [ ] Add Helmet.js for security headers
- [ ] Implement request logging (Winston/Morgan)
- [ ] Add Sentry for error tracking
- [ ] Set up database backups (automated)
- [ ] Add API rate limiting per user (not just per IP)
- [ ] Implement 2FA/OTP for critical actions

### Already Implemented ✅
- JWT Authentication
- CSRF Protection
- httpOnly Cookies
- Rate Limiting
- Input Validation
- Password Hashing (bcrypt)

---

## 📈 Test Coverage Goal Breakdown

| Category | Current | Target | To Do |
|----------|---------|--------|-------|
| Controllers | 29.47% | 70% | +40.53% |
| Services | 9.70% | 70% | +60.30% |
| Utils | 71.33% | 70% | ✅ DONE |
| Middleware | 0% | 70% | +70% |
| Frontend | 0% | 50% | +50% |

**Total Files Needing Tests:** 28 files

---

## 🚀 Quick Start Testing

```bash
# Run existing tests
cd backend
npm test

# Run with coverage
npm run test:coverage

# Generate coverage report
# Open: backend/coverage/index.html
```

---

## 📝 Notes

- See `UNTESTED_FILES_REPORT.md` for detailed coverage analysis
- Security features are complete, focus is on **test coverage**
- Frontend E2E tests (Playwright) are done, need **unit tests**
- Load tests (k6) and chaos tests are done

---

**Status:** Security ✅ Complete | Testing ⚠️ In Progress (22% → 70%)

*Last updated: December 22, 2025*
