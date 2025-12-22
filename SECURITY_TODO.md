# 🔒 Security & Testing - TODO

**Last Updated:** December 23, 2025  
**Focus:** Pending tasks and improvements

---

## 📊 Testing Coverage - ✅ **TARGET EXCEEDED!**

**Current:** 79.57% overall coverage ✅  
**Target:** 70% coverage  
**Achievement:** **+9.57% above target!**

---

## ✅ Controllers Coverage: 68.58%

All 9 controllers now have test coverage. Only 2 files still need improvement to reach 70%:

- [/] `passengerController.js` - **41.78% coverage** (needs more tests)
- [/] `tteController.js` - **64.72% coverage** (close to target)

**Status:** 7 of 9 controllers at 70%+ coverage

---

## ✅ Services Coverage: 88.37%

Most services now have excellent coverage! Only 3 services still below 70%:

- [/] `VisualizationService.js` - **2.08% coverage** (needs full test suite)
- [/] `WebPushService.js` - **18.57% coverage** (needs improvement)
- [/] `ReallocationService.js` - **58.58% coverage** (close to target)

**Achievement:** 18 of 21 services at 70%+ coverage ✅

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

| Category | Current | Target | Status |
|----------|---------|--------|--------|
| **Overall** | **79.57%** | 70% | ✅ **+9.57%** |
| Controllers | 68.58% | 70% | 🟡 -1.42% |
| Services | 88.37% | 70% | ✅ +18.37% |
| Reallocation | 89.71% | 70% | ✅ +19.71% |
| Utils | 71.55% | 70% | ✅ +1.55% |
| Middleware | 0% | 70% | ❌ Not tested |
| Frontend | 0% | 50% | ❌ Not tested |

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

**Status:** Security ✅ Complete | Testing ✅ **Target Exceeded (79.57% > 70%)**

*Last updated: December 23, 2025*

**Backend Test Coverage:** 79.57% (1,153 tests, 50 suites) ✅
