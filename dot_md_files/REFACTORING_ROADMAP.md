# Refactoring Roadmap (Remaining Items)

**Last Updated:** December 16, 2025  
**Overall Status:** ~70% Complete

---

## 🔲 Remaining Tasks

### Phase 1: Frontend Cleanup

#### 1. Split `ReallocationPage.tsx` (~800 lines)
**Priority:** Medium  
**Effort:** 4-6 hours  
Extract to separate files:
- `src/components/reallocation/StationWiseView.tsx`
- `src/components/reallocation/HashMapView.tsx`
- `src/components/reallocation/CurrentStationMatchingView.tsx`

#### 2. Replace Alerts with Modals
**Priority:** High (demo impact)  
**Effort:** 2-3 hours  
Replace `window.alert()` / `window.confirm()` with React modals

---

### Phase 2: Backend Stability

#### 3. Fix Circular Dependency
**Priority:** High  
**Effort:** 2-3 hours  
Remove `setTimeout` hack in `reallocationController.js` - use dependency injection

#### 4. Slim Down Controllers
**Priority:** Medium  
**Effort:** 4-6 hours  
Move formatting/notification logic from controllers to services

#### 5. Standardize Error Handling
**Priority:** Low  
**Effort:** 2-3 hours  
Create `asyncHandler` wrapper to remove try-catch boilerplate

---

### Phase 3: Configuration

#### 6. Environment Variable Validation
**Priority:** High  
**Effort:** 1-2 hours  
Create `config/env.js` to validate required env vars on startup

#### 7. Externalize Magic Numbers
**Priority:** Low  
**Effort:** 1-2 hours  
Create `constants/index.js` for status strings, timeouts

---

## ✅ Already Completed

| Item | Status |
|------|--------|
| TypeScript Migration (all portals) | ✅ |
| Vite Migration | ✅ |
| Centralized API Calls | ✅ |
| Input Validation (Zod) | ✅ |
| Backend Unit Tests (1153 tests, 79.57% coverage) | ✅ |
| Documentation Updates | ✅ |
| CORS Configuration | ✅ |
| Rate Limiting | ✅ |
| JWT Refresh Tokens | ✅ |
| CSRF Protection | ✅ |
| httpOnly Cookies | ✅ |
| Frontend Token Auto-Refresh | ✅ |

---

## 📊 Priority Order

1. **Replace Alerts with Modals** - Best demo improvement
2. **Fix Circular Dependency** - Server reliability
3. **Environment Validation** - Prevent startup failures
4. **Split ReallocationPage** - Code maintainability
5. **Others** - Nice to have

---

**Total Remaining Effort:** ~2-3 days  
**Last Updated:** December 23, 2025
