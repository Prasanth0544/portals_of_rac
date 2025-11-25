# Backend Architecture Analysis

## 📊 Overview

**Version:** 3.0.0  
**Type:** Express.js REST API + WebSocket Server  
**Database:** MongoDB (Dynamic - configurable collections)  
**Language:** JavaScript (ES6)

---

## 🏗️ Architecture Pattern

**Pattern:** MVC (Model-View-Controller) + Service Layer

```
┌─────────────────────────────────────────┐
│         Express Server (server.js)      │
└────────┬────────────────────────────────┘
         │
    ┌────┴────┐
    │  Routes │ (api.js)
    └────┬────┘
         │
    ┌────┴────────┐
    │ Controllers │ (8 controllers)
    └────┬────────┘
         │
    ┌────┴────────┐
    │  Services   │ (7 services)
    └────┬────────┘
         │
    ┌────┴────┐
    │ Models  │ (3 models)
    └────┬────┘
         │
    ┌────┴──────┐
    │ MongoDB   │
    └───────────┘
```

---

## 📁 File Structure

### **Core Files (8)**
```
backend/
├── server.js                   # Entry point, Express setup
├── config/
│   ├── db.js                   # MongoDB connection manager
│   └── websocket.js            # WebSocket server & broadcasting
├── routes/
│   └── api.js                  # API route definitions
└── .env                        # Environment variables
```

### **Controllers (8 files)**
Handle HTTP requests and responses:

```javascript
controllers/
├── configController.js         # System configuration (setup, dynamic config)
├── trainController.js          # Train initialization, state, movement
├── passengerController.js      # Add/search/board passengers
├── reallocationController.js   # RAC reallocation logic
├── tteController.js            # TTE-specific operations
├── visualizationController.js  # Data for UI visualizations
```

**Responsibilities:**
- Validate request data
- Call service layer for business logic
- Send WebSocket notifications
- Return JSON responses

---

### **Services (7 files)**
Business logic layer:

```javascript
services/
├── ReallocationService.js      # Eligibility matrix, RAC upgrades
├── StationEventService.js      # Board/deboard logic, station arrival
├── QueueService.js             # RAC queue management
├── ValidationService.js        # PNR, data validation
├── SegmentService.js           # Segment occupancy calculations
├── DataService.js              # Data transformation utilities
├── UpgradeNotificationService.js # Upgrade offer management
└── VisualizationService.js     # Chart/graph data preparation
```

**Key Service:** `ReallocationService.js`
- **Lines:** 931 (largest file)
- **Functions:** 15+
- **Contains:** 11 eligibility rules, upgrade logic, co-passenger handling

---

### **Models (3 files)**
Data models and in-memory state:

```javascript
models/
├── TrainState.js               # Main train state (the "brain")
├── Berth.js                    # Berth logic, segment occupancy
├── SegmentMatrix.js            # Segment-based berth allocation
```

**TrainState.js** (Core Model):
```javascript
class TrainState {
  constructor() {
    this.trainNo = null;
    this.trainName = null;
    this.currentStationIdx = 0;
    this.coaches = [];          // Array of coaches
    this.racQueue = [];         // Array of RAC passengers
    this.stats = {};            // Real-time statistics
    this.eventLog = [];         // Audit trail
  }
  
  // 30+ methods
  getAllPassengers()
  findPassenger(pnr)
  moveToNextStation()
  updateStats()
  // ... etc
}
```

---

### **Middleware (1 file)**
```javascript
middleware/
└── validation.js               # Request validation, dynamic config validation
```

**Functions:**
- `validateDynamicConfig` - Validates configuration payload
- Input sanitization
- Error formatting

---

### **Utilities (2 files)**
```javascript
utils/
├── berthAllocator.js          # Berth allocation algorithms
├── constants.js               # App-wide constants
├── helpers.js                 # Helper functions
└── stationOrder.js            # Station ordering logic
```

---

## 📦 Dependencies

### **Production Dependencies (5)**
```json
{
  "express": "^4.18.2",        // Web framework
  "mongodb": "^6.3.0",         // Database driver
  "ws": "^8.14.2",             // WebSocket server
  "cors": "^2.8.5",            // CORS middleware
  "dotenv": "^16.3.1"          // Environment variables
}
```

### **Dev Dependencies (1)**
```json
{
  "nodemon": "^3.0.2"          // Auto-restart during development
}
```

**Analysis:**
- ✅ Minimal dependencies (good for security)
- ✅ No heavy frameworks (lightweight)
- ❌ Missing: `jsonwebtoken`, `bcrypt` (auth not implemented yet)
- ❌ Missing: `joi` or `zod` (validation library)

---

## 🔄 Data Flow Example

**Scenario:** Train moves to next station

```
1. Admin clicks "Next Station" (Frontend)
   ↓
2. POST /api/train/next-station (Route)
   ↓
3. trainController.moveToNextStation() (Controller)
   ↓
4. trainState.currentStationIdx++ (Model)
   ↓
5. StationEventService.processStationArrival() (Service)
   ├─→ boardPassengers()
   ├─→ deboardPassengers()
   ├─→ processRACUpgrades()
   └─→ processNoShows()
   ↓
6. Update MongoDB (Database)
   ↓
7. WebSocket broadcast "STATION_CHANGED" (WebSocket)
   ↓
8. All clients receive update (Frontend)
```

---

## 🎯 Key Features Implemented

### **1. Dynamic Configuration** ✅
- Can configure MongoDB URI, databases, collections at runtime
- Bootstrap mode (connects to default DB if config missing)
- Saves config to file system

### **2. Segment-Based Allocation** ✅
- Each berth has `segmentOccupancy` array
- Tracks which passenger occupies which segment
- Allows partial berth usage

**Example:**
```javascript
berth.segmentOccupancy = [
  "PNR1",  // Segment 0-1 (Station A → B)
  "PNR1",  // Segment 1-2 (Station B → C)
  null,    // Segment 2-3 (VACANT)
  "PNR2",  // Segment 3-4 (Station D → E)
]
```

### **3. RAC Reallocation Engine** ✅
- 11 eligibility rules
- Priority-based (RAC 1 > RAC 2 > RAC 3)
- Journey overlap detection
- 70km minimum distance check
- Solo RAC constraint

### **4. WebSocket Real-Time Updates** ✅
```javascript
wsManager.broadcast('STATION_CHANGED', data);
wsManager.broadcastRACUpgrade(data);
wsManager.broadcastNoShow(data);
```

### **5. Fuzzy Matching** ✅
Handles database schema inconsistencies:
```javascript
// Handles "Station Name" vs "Station Name  " (trailing spaces)
const stationName = Object.keys(doc).find(key => 
  key.trim().toLowerCase() === 'station_collection_name'
);
```

---

## 🚨 Current Gaps

### **Missing Features:**
1. ❌ **Authentication** - No JWT, no user management
2. ❌ **Rate Limiting** - No protection against abuse
3. ❌ **Input Validation** - Basic validation only
4. ❌ **Error Handling** - Generic try-catch, no custom errors
5. ❌ **Logging** - Console.log only, no structured logging
6. ❌ **Testing** - Zero unit tests
7. ❌ **API Documentation** - No Swagger/OpenAPI
8. ❌ **Database Indexes** - No performance optimization

### **Code Quality Issues:**
1. ⚠️ **Large Files** - `ReallocationService.js` (931 lines)
2. ⚠️ **Circular Dependencies** - `trainController` imported in services
3. ⚠️ **Magic Numbers** - Hardcoded `5000ms` timeouts, `70km` threshold
4. ⚠️ **No TypeScript** - Runtime errors possible
5. ⚠️ **Inconsistent Naming** - `PNR_Number` (DB) vs `pnr` (code)

---

## 💡 Recommendations

### **Priority 1 (Must Have):**
1. **Add Authentication**
   ```javascript
   npm install jsonwebtoken bcrypt
   // Create authMiddleware.js
   // Add login endpoints
   ```

2. **Add Database Indexes**
   ```javascript
   db.collection('passengers').createIndex({ PNR_Number: 1 });
   db.collection('passengers').createIndex({ Boarded: 1, PNR_Status: 1 });
   ```

3. **Structured Error Handling**
   ```javascript
   class APIError extends Error {
     constructor(message, statusCode, code) {
       super(message);
       this.statusCode = statusCode;
       this.code = code;
     }
   }
   ```

### **Priority 2 (Should Have):**
4. **Input Validation with Joi**
   ```javascript
   const schema = Joi.object({
     pnr: Joi.string().length(10).required()
   });
   ```

5. **Environment-based Configuration**
   ```javascript
   const config = {
     development: { mongoUri: 'localhost' },
     production: { mongoUri: process.env.MONGO_URI }
   };
   ```

6. **API Rate Limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');
   app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
   ```

### **Priority 3 (Nice to Have):**
7. **Refactor Large Files** - Split `ReallocationService.js` into smaller modules
8. **Add Unit Tests** - Use Jest or Mocha
9. **Add API Documentation** - Swagger UI
10. **Migrate to TypeScript** - For type safety

---

## 📈 Code Metrics

| Metric | Value |
|:---|:---:|
| Total JS Files | 108 (excluding node_modules) |
| Core Application Files | 23 |
| Lines of Code (estimate) | ~5,000 |
| Controllers | 8 |
| Services | 7 |
| Models | 3 |
| Utilities | 4 |
| Middleware | 1 |
| Routes | 1 |
| Dependencies | 5 (production) |

---

## 🎯 Strengths

1. ✅ **Clean Separation of Concerns** - MVC + Service layer
2. ✅ **Complex Business Logic** - 11 eligibility rules implemented
3. ✅ **Real-Time Updates** - WebSocket integration
4. ✅ **Dynamic Configuration** - Flexible DB setup
5. ✅ **Event Logging** - Good audit trail

---

## ⚠️ Weaknesses

1. ❌ **No Authentication** - Security risk
2. ❌ **Large Service Files** - Hard to maintain
3. ❌ **No Tests** - Regression risk
4. ❌ **No Type Safety** - Runtime errors likely
5. ❌ **Manual Error Handling** - Inconsistent

---

## 🚀 Next Steps

**Implementation Order:**
1. Authentication & Authorization (Week 1)
2. Boarding Verification Map data structure (Week 1)
3. Database indexes + Error handling (Week 2)
4. Input validation + Rate limiting (Week 2)
5. Unit tests for critical services (Week 3)
6. Refactor large files (Week 3)
7. API documentation (Week 4)
8. TypeScript migration (Future)

---

**Overall Rating: 7/10**
- ✅ Solid architecture
- ✅ Complex logic implemented
- ❌ Missing production essentials (auth, tests, validation)
- ❌ Code quality improvements needed
