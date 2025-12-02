# RAC System - Quick Actions Checklist
**Priority**: IMMEDIATE | **Time Estimate**: 5-6 hours | **Date**: December 2, 2025

---

## ✅ IMMEDIATE ACTION ITEMS (Today/Tomorrow)

### 1. Create .env.example 📝
**File**: `backend/.env.example`  
**Time**: 15 minutes  
**Importance**: 🔴 CRITICAL

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
RAC_DB_NAME=rac
PASSENGERS_DB_NAME=PassengersDB
STATIONS_COLLECTION=All_Stations_12715
PASSENGERS_COLLECTION=Passengers_12715

# JWT Configuration
JWT_SECRET=replace-with-strong-secret-in-production
JWT_EXPIRY=24h

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Web Push VAPID Keys
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@example.com

# CORS Configuration
FRONTEND_URL=http://localhost:3000
TTE_PORTAL_URL=http://localhost:5173
PASSENGER_PORTAL_URL=http://localhost:5174

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Action**:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your actual values
```

---

### 2. Fix JWT Secret Fallback 🔐
**File**: `backend/middleware/auth.js`  
**Time**: 10 minutes  
**Importance**: 🔴 CRITICAL

**Current (Line 6)**:
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```

**Change to**:
```javascript
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable not set. Check your .env file.');
}
```

**Alternative**: Add validation in `server.js` startup:
```javascript
async function startServer() {
  // Validate critical env vars
  const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
  
  // ... rest of startup
}
```

---

### 3. Remove Debug Console Logs 📝
**Files to Clean**: (High Priority)
1. `backend/config/db.js` - 50+ logs
2. `backend/config/websocket.js` - 30+ logs
3. `backend/controllers/tteController.js` - 10+ logs

**Time**: 45 minutes per file

**Quick Find & Replace Strategy**:

```bash
# List all console statements
grep -r "console\.log\|console\.error\|console\.warn" backend/

# Count by file
grep -r "console\.log" backend/ | wc -l
```

**Manual Approach**:

1. Open `backend/config/db.js`
2. Find all `console.log(` statements
3. Delete or replace with logger.info()
4. Keep only error messages initially
5. Repeat for other files

**Example Changes**:

Before:
```javascript
console.log('✅ MongoDB Connected (Stations)');
console.log(`📦 Database: ${this.stationsDbName}`);
```

After:
```javascript
// Keep only essential logs or use logger
// For now, comment out or remove
```

---

### 4. Delete Duplicate/Backup Files 🧹
**Files to Delete**: 
1. `backend/services/ReallocationService.js.bak`
2. Review for duplicate constants

**Time**: 5 minutes

```bash
# Delete backup
rm backend/services/ReallocationService.js.bak

# Check for other .bak files
find . -name "*.bak" -o -name "*.backup"
```

**Update .gitignore**:
```bash
# Add to .gitignore
*.bak
*.backup
*.tmp
```

---

### 5. Create Basic Logger Service 🔧
**File**: `backend/services/LoggerService.js` (NEW)  
**Time**: 30 minutes  
**Importance**: 🟡 MEDIUM

```javascript
// backend/services/LoggerService.js

class LoggerService {
  info(message, meta = {}) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INFO] ${message}`, meta);
    }
  }

  error(message, error, meta = {}) {
    console.error(`[ERROR] ${message}`, error?.message, meta);
  }

  warn(message, meta = {}) {
    console.warn(`[WARN] ${message}`, meta);
  }

  debug(message, meta = {}) {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[DEBUG] ${message}`, meta);
    }
  }
}

module.exports = new LoggerService();
```

**Usage in code**:
```javascript
// Before
console.log('Connected to database');

// After
const logger = require('../services/LoggerService');
logger.info('Connected to database', { db: 'rac' });
```

---

### 6. Add Input Validation to Top 5 Endpoints 🛡️
**Files**: `backend/controllers/*.js`  
**Time**: 1 hour  
**Importance**: 🔴 CRITICAL

**Target Endpoints** (Start with these):

#### Endpoint 1: POST /api/tte/mark-no-show
**File**: `backend/controllers/tteController.js`  
**Line**: ~200

```javascript
// Add schema
const markNoShowSchema = Joi.object({
  pnr: Joi.string().required().pattern(/^\d{10}$/).messages({
    'string.pattern.base': 'PNR must be 10 digits'
  })
});

// Update route
router.post('/tte/mark-no-show',
  authMiddleware,
  requireRole(['TTE', 'ADMIN']),
  validateBody(markNoShowSchema),  // ADD THIS
  tteController.markNoShow
);
```

#### Endpoint 2: POST /api/passenger/accept-upgrade
**File**: `backend/controllers/passengerController.js`

```javascript
const acceptUpgradeSchema = Joi.object({
  pnr: Joi.string().required().pattern(/^\d{10}$/),
  offerId: Joi.string().required(),
  berth: Joi.object({
    coach: Joi.string().required(),
    berthNo: Joi.number().required(),
    type: Joi.string().valid('Lower', 'Middle', 'Upper', 'Side Lower', 'Side Upper')
  }).required()
});
```

#### Endpoint 3: POST /api/config/setup
**File**: `backend/controllers/configController.js`

```javascript
const configSchema = Joi.object({
  mongoUri: Joi.string().required().uri(),
  stationsDb: Joi.string().required(),
  passengersDb: Joi.string().required(),
  stationsCollection: Joi.string().required(),
  passengersCollection: Joi.string().required(),
  trainNo: Joi.string().required(),
  journeyDate: Joi.string().required().pattern(/^\d{2}-\d{2}-\d{4}$/)
});
```

---

## 🔍 VERIFICATION CHECKLIST

After completing above items, verify:

- [ ] `.env.example` created and committed to git
- [ ] `.env` file created locally (NOT committed)
- [ ] `JWT_SECRET` validation added to startup
- [ ] All `.bak` files deleted
- [ ] LoggerService created and working
- [ ] Input validation on 5 critical endpoints
- [ ] No console.log statements visible in startup logs
- [ ] Application starts without errors

---

## 📊 Quick Test

**After implementing, run this test**:

```powershell
# 1. Start backend
cd backend
npm start

# Expected output (WITHOUT console.logs):
# ✅ Server running on port 5000
# ✅ MongoDB connected
# ✅ WebSocket initialized

# 2. Test invalid PNR
curl -X POST http://localhost:5000/api/tte/mark-no-show \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"pnr": "invalid"}'

# Expected: 400 Bad Request (validation error)

# 3. Test missing JWT_SECRET
# Temporarily remove from .env and restart
# Expected: Error on startup, process exits
```

---

## 📋 NEXT STEPS (Week 2)

After completing above:

1. ✅ Implement request logging middleware (2h)
2. ✅ Add rate limiting middleware (2h)
3. ✅ Create error boundary component (1h)
4. ✅ Add request timeout handling (1h)
5. ✅ Review and document validation rules (1h)

---

## 💡 TIPS

**Don't get overwhelmed**:
- Focus on ONE file at a time
- Test after each change
- Commit to git frequently
- Use `git diff` to verify changes

**Useful Commands**:
```bash
# Find all console statements
grep -r "console\." backend/ | grep -v "node_modules" | wc -l

# Find all validation schemas
grep -r "Joi\.object" backend/

# Test specific endpoint
curl -X GET http://localhost:5000/api/health

# Check env vars
echo $JWT_SECRET  # Should print your secret
```

**Tools to Use**:
- VS Code: Find & Replace (Ctrl+H)
- Git: `git add -p` for selective commits
- Postman: Test endpoints with different inputs
- MongoDB Compass: Verify data

---

## 🎯 SUCCESS CRITERIA

You'll know you're done when:

1. ✅ Application starts without console.log
2. ✅ `.env.example` matches your setup
3. ✅ Startup fails if JWT_SECRET missing
4. ✅ Invalid PNR rejected with 400 error
5. ✅ No `.bak` files in repo
6. ✅ LoggerService working correctly
7. ✅ All endpoints have input validation
8. ✅ Git history shows your changes

---

## 📞 COMMON ISSUES

**Issue**: "JWT_SECRET is not a function"
```
Solution: Make sure you're exporting the logger, not calling it
```

**Issue**: "Validation middleware not defined"
```
Solution: Ensure validateBody middleware is imported from validation.js
```

**Issue**: "Too many console.logs, don't know where to start"
```
Solution: Use grep to find them all, then batch replace in VS Code
```

---

**Estimated Time to Complete**: 5-6 hours spread over 2-3 days  
**Skill Level**: Intermediate  
**Difficulty**: 🟢 Easy

**Start with**: Create .env.example (easiest, most valuable)

