# Security Improvements - Implementation Notes

## Completed Changes (Dec 9, 2025)

### 1. Rate Limiting ✅
- `backend/middleware/rateLimiter.js` - Auth (5/15min), OTP (3/hr), API (100/15min)

### 2. Circular Dependencies Fixed ✅
- Moved dynamic `require()` to top-level in `StationEventService.js`, `ReallocationService.js`, `api.js`

### 3. JWT Refresh Tokens ✅
- Access token: **15 minutes** (was 48h)
- Refresh token: **7 days** (stored in MongoDB)
- New endpoint: `POST /api/auth/refresh`

### 4. Frontend CSS Reorganization ✅
- CSS files moved to `src/styles/pages/` and `src/styles/components/`

### 5. Performance Optimizations ✅
- **Caching**: `backend/services/CacheService.js` with node-cache
- **Connection Pooling**: min: 10, max: 50 connections in `db.js`
- **Query Utilities**: `backend/utils/queryUtils.js` with timeout/retry/pagination
- **Database Indexes**: Run `node backend/scripts/createIndexes.js`

---

## ⚠️ Pending: Frontend Token Auto-Refresh

The backend now uses short-lived access tokens (15 minutes). Frontend API services need updating to:

1. Store `refreshToken` from login response
2. Detect 401 errors with expired tokens
3. Call `/api/auth/refresh` to get new access token
4. Retry the failed request

**Example implementation** (add to each portal's `api.ts`):

```typescript
// Add axios interceptor for auto-refresh
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && error.response?.data?.message?.includes('expired')) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        localStorage.setItem('token', data.token);
        error.config.headers.Authorization = `Bearer ${data.token}`;
        return api.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);
```

Update login handlers to save `refreshToken`:
```typescript
localStorage.setItem('refreshToken', response.data.refreshToken);
```
