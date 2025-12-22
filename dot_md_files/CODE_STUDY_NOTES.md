# 📚 RAC Reallocation System - Complete Code Study Notes

**Generated:** December 18, 2025  
**System:** Railway RAC (Reservation Against Cancellation) Seat Reallocation System  
**Tech Stack:** MERN (MongoDB, Express.js, React 19, Node.js)

---

## 🏗️ PROJECT ARCHITECTURE OVERVIEW

### System Components

```
RAC-Reallocation-System/
├── backend/              # Node.js + Express API Server (Port 5000)
├── frontend/             # React Admin Portal (Port 5173)
├── passenger-portal/     # React Passenger Portal (Port 5175)
└── tte-portal/          # React TTE Portal (Port 5174)
```

### Technology Stack Summary

| Component | Technologies |
|-----------|-------------|
| **Backend** | Node.js 14+, Express.js 4.18, MongoDB 6.3, WebSocket (ws 8.14) |
| **Frontend** | Vite, React 19, TypeScript, Material-UI, Axios |
| **Database** | MongoDB (2 DBs: `rac` + `PassengerDB`) |
| **Real-time** | WebSocket for live updates |
| **Auth** | JWT (jsonwebtoken 9.0), bcrypt 6.0 |
| **Notifications** | Web Push API (VAPID), Nodemailer |
| **Testing** | Jest 30.2, Supertest 7.1 |
| **DevOps** | Docker, Kubernetes (k8s/), Docker Compose |

---

## 🗄️ DATABASE ARCHITECTURE

### Two-Database Design

The system uses **TWO separate MongoDB databases**:

#### 1. `rac` Database (Runtime State)
**Collections:**
- `TrainState` - Current train journey state (in-memory, persisted)
- `station_reallocations` - Pending TTE approvals for upgrades
- `upgrade_notifications` - Push notifications to passengers
- `action_history` - TTE action log for undo functionality
- `push_subscriptions` - Web push notification subscriptions
- `in_app_notifications` - In-app notification queue
- `offline_upgrades` - Offline upgrade queue (TTE-initiated)

#### 2. `PassengerDB` Database (Source Data)
**Collections:**
- `Train_Details` - Static train configuration (train number, name, route)
- `Station_Details` - Station master data (names, codes, arrival/departure times)
- `Passenger_Details` - Passenger booking data (PNR, seat, journey, status)
- `Users` - Authentication (Staff: ADMIN/TTE, Passengers: IRCTC ID)
- `RefreshTokens` - JWT refresh token management

### Global Configuration
```javascript
global.RAC_CONFIG = {
  stationsDb: 'PassengerDB',
  stationsCollection: 'Station_Details',
  passengersDb: 'PassengerDB',
  passengersCollection: 'Passenger_Details',
  trainNo: '17225',
  trainName: 'Amaravathi Express',
  journeyDate: 'YYYY-MM-DD'
}
```

---

## 📂 BACKEND STRUCTURE (backend/)

### Directory Layout

```
backend/
├── config/              # Configuration files
│   ├── db.js           # MongoDB connection manager
│   ├── swagger.js      # API documentation config
│   └── websocket.js    # WebSocket server manager
├── constants/          
│   └── messages.js     # System messages & templates
├── controllers/        # Request handlers (9 files)
│   ├── trainController.js
│   ├── passengerController.js
│   ├── reallocationController.js
│   ├── tteController.js
│   ├── authController.js
│   ├── otpController.js
│   ├── visualizationController.js
│   ├── configController.js
│   └── StationWiseApprovalController.js
├── middleware/         # Express middleware (8 files)
│   ├── auth.js         # JWT authentication & authorization
│   ├── validation.js   # Input validation & sanitization
│   ├── errorHandler.js # Global error handling
│   ├── rateLimiter.js  # Rate limiting
│   └── csrf.js         # CSRF protection
├── models/             # Data models (3 core classes)
│   ├── TrainState.js   # Main train state model
│   ├── Berth.js        # Berth with segment occupancy
│   └── SegmentMatrix.js # Segment visualization matrix
├── routes/
│   └── api.js          # All API route definitions (804 lines)
├── services/           # Business logic (26 services)
│   ├── DataService.js
│   ├── CurrentStationReallocationService.js
│   ├── StationEventService.js
│   ├── QueueService.js
│   ├── NotificationService.js
│   ├── CacheService.js
│   ├── PassengerService.js
│   ├── OTPService.js
│   └── reallocation/   # Reallocation sub-services
│       ├── AllocationService.js
│       ├── EligibilityService.js
│       ├── VacancyService.js
│       ├── RACQueueService.js
│       ├── NoShowService.js
│       └── reallocationConstants.js
├── utils/              # Utility functions (9 files)
│   ├── berthAllocator.js
│   ├── stationOrder.js
│   ├── helpers.js
│   ├── queryUtils.js
│   ├── logger.js
│   ├── envValidator.js
│   └── error-handler.js
├── validation/
│   └── schemas.js      # Joi/Zod validation schemas
├── __tests__/          # Jest test suites (29 files)
└── server.js           # Main entry point (239 lines)
```

---

## 🎯 CORE MODELS & CLASSES

### 1. TrainState Class (`models/TrainState.js`)

**Purpose:** Central in-memory state for the entire train journey

**Properties:**
```javascript
{
  trainNo: String,           // e.g., "17225"
  trainName: String,         // e.g., "Amaravathi Express"
  journeyDate: String,       // Journey date
  currentStationIdx: Number, // Current station index (0-based)
  journeyStarted: Boolean,   // Has journey begun?
  stations: Array,           // All stations in route
  coaches: Array,            // All coaches with berths
  racQueue: Array,           // RAC passengers waiting
  segmentMatrix: SegmentMatrix,
  stats: {
    totalPassengers: Number,
    currentOnboard: Number,
    cnfPassengers: Number,
    racPassengers: Number,
    vacantBerths: Number,
    totalNoShows: Number,
    totalRACUpgraded: Number
  },
  stationUpgradeLock: {      // Per-station upgrade control
    locked: Boolean,
    lockedAtStation: Number,
    pendingUpgrades: Array,
    completedUpgrades: Array,
    rejectedUpgrades: Array,
    usedBerths: Set,
    usedPassengers: Set
  },
  boardingVerificationQueue: Map, // TTE boarding verification
  actionHistory: Array       // Undo functionality (max 10)
}
```

**Key Methods:**

| Method | Description |
|--------|-------------|
| `initializeCoaches(sleeperCount, threeAcCount)` | Create coaches with berths |
| `startJourney()` | Board passengers at origin |
| `findBerth(coachNo, seatNo)` | Find berth by coach and seat |
| `findPassenger(pnr)` | Find passenger in berths |
| `findPassengerByPNR(pnr)` | Find in berths + RAC queue |
| `getVacantBerths()` | Get ALL vacant berth segments across journey |
| `getAllPassengers()` | Get all passengers (berths + RAC) |
| `getBoardedRACPassengers()` | Get boarded RAC passengers |
| `updateStats()` | Recalculate statistics |
| `prepareForBoardingVerification()` | Setup TTE boarding queue |
| `confirmAllBoarded()` | Confirm all passengers boarded |
| `markBoardedPassengerNoShow(pnr)` | Mark passenger as NO_SHOW |
| `revertBoardedPassengerNoShow(pnr)` | Revert NO_SHOW (with collision check) |
| `recordAction(type, pnr, prevState, newState)` | Record for undo |
| `undoLastAction(actionId)` | Undo within 30 mins |
| `completeUpgrade(upgradeId)` | Complete pending upgrade |
| `rejectUpgrade(upgradeId, reason)` | Reject pending upgrade |
| `unlockStationForUpgrades()` | Reset upgrade lock |

---

### 2. Berth Class (`models/Berth.js`)

**Purpose:** Segment-based berth occupancy tracking

**Properties:**
```javascript
{
  coachNo: String,           // e.g., "S1"
  berthNo: Number,           // 1-72 (SL) or 1-64 (3A)
  fullBerthNo: String,       // "S1-42"
  type: String,              // "Lower Berth", "Side Lower", etc.
  status: String,            // "VACANT", "OCCUPIED", "SHARED"
  totalSegments: Number,     // Number of station-to-station segments
  segmentOccupancy: Array[], // Array of PNR arrays per segment
  passengers: Array          // All passengers on this berth
}
```

**Berth Types:**
- **Sleeper (SL):** 72 berths (Lower, Middle, Upper, Side Lower, Side Upper)
- **3-Tier AC (3A):** 64 berths (same types but different mapping)
- **RAC Berths:** Side Lower (2 passengers can share)

**Key Methods:**

| Method | Description |
|--------|-------------|
| `addPassenger(passenger)` | Add passenger and mark segments |
| `removePassenger(pnr)` | Remove passenger and clear segments |
| `updateStatus()` | Update VACANT/OCCUPIED/SHARED status |
| `isAvailableForSegment(fromIdx, toIdx)` | Check segment availability |
| `getOccupancyForSegment(segmentIdx)` | Get PNRs occupying segment |
| `getBoardedPassengers()` | Get currently boarded passengers |

---

### 3. SegmentMatrix Class (`models/SegmentMatrix.js`)

**Purpose:** Visualize berth occupancy across journey segments

**Structure:**
```javascript
{
  stations: Array,           // Station list
  matrix: Map,               // Berth → Segment array
  totalSegments: Number      // stations.length - 1
}
```

**Visual Representation:**
```
Berth    | Seg0 | Seg1 | Seg2 | Seg3 | Seg4 |
---------|------|------|------|------|------|
S1-1     | P001 | P001 |      | P002 | P002 |
S1-2     | RAC1 | RAC1 | RAC1 |      |      |
```

---

## 🛣️ API ROUTES OVERVIEW (`routes/api.js`)

### Route Categories (30+ endpoints)

#### Authentication Routes
```
POST   /api/auth/staff/login       - Staff (Admin/TTE) login
POST   /api/auth/passenger/login   - Passenger login
GET    /api/auth/verify            - Verify JWT token
POST   /api/auth/logout            - Logout
POST   /api/auth/refresh           - Refresh access token
GET    /api/csrf-token             - Get CSRF token
```

#### Train Management
```
POST   /api/train/initialize       - Initialize train
POST   /api/train/start-journey    - Start journey
GET    /api/train/state            - Get complete train state
POST   /api/train/next-station     - Move to next station
POST   /api/train/reset            - Reset train
GET    /api/train/stats            - Get statistics
GET    /api/trains                 - List all trains
```

#### Passenger Operations
```
GET    /api/passenger/pnr/:pnr                    - PNR lookup
GET    /api/passengers/all                        - Get all passengers
GET    /api/passengers/status/:status            - Filter by status
POST   /api/passenger/approve-upgrade            - Passenger approves upgrade
POST   /api/passenger/change-boarding-station    - Change boarding point
POST   /api/passenger/self-cancel                - Self-cancel ticket
```

#### Reallocation & Upgrades
```
GET    /api/reallocation/eligibility              - Get eligible RAC passengers
POST   /api/reallocation/apply                    - Apply manual reallocation
GET    /api/reallocation/pending                  - Get pending approvals (TTE)
POST   /api/reallocation/approve-batch            - Approve batch (TTE)
POST   /api/reallocation/upgrade/:id/approve      - Approve upgrade
POST   /api/reallocation/upgrade/:id/reject       - Reject upgrade
GET    /api/reallocation/current-station-matching - Get current station matches
POST   /api/reallocation/create-from-matches      - Create pending reallocations
```

#### TTE Operations
```
POST   /api/tte/mark-no-show           - Mark passenger NO_SHOW
POST   /api/tte/revert-no-show          - Revert NO_SHOW
GET    /api/tte/passengers              - Get filtered passengers
GET    /api/tte/boarded-passengers      - Currently boarded
GET    /api/tte/boarding-queue          - Boarding verification queue
POST   /api/tte/confirm-all-boarded     - Confirm all boarded
POST   /api/tte/offline-upgrades/add    - Add offline upgrade
POST   /api/tte/offline-upgrades/confirm - Confirm offline upgrade
GET    /api/tte/action-history          - Get action history
POST   /api/tte/undo                    - Undo last action
```

#### Visualization
```
GET    /api/visualization/segment-matrix    - Segment occupancy matrix
GET    /api/visualization/graph             - Graph data
GET    /api/visualization/heatmap           - Occupancy heatmap
GET    /api/visualization/berth-timeline/:coach/:berth - Berth timeline
GET    /api/visualization/vacancy-matrix    - Vacancy matrix
```

#### Push Notifications
```
GET    /api/push/vapid-public-key           - Get VAPID key
POST   /api/passenger/push-subscribe        - Subscribe to push
POST   /api/tte/push-subscribe              - TTE subscribe
POST   /api/admin/push-subscribe            - Admin subscribe
```

#### OTP Verification
```
POST   /api/otp/send     - Send OTP (rate limited: 3/hour)
POST   /api/otp/verify   - Verify OTP
```

---

## 🎮 CONTROLLERS DEEP DIVE

### trainController.js

**Responsibilities:** Train lifecycle management

**Key Methods:**

#### `initializeTrain(req, res)` - Async
- **Purpose:** Initialize train from MongoDB data
- **Process:**
  1. Get trainNo, journeyDate from request
  2. Clear stale data (upgrade_notifications, station_reallocations)
  3. Call `DataService.loadTrainData(trainNo, date, name)`
  4. Broadcast TRAIN_INITIALIZED via WebSocket
- **Returns:** Train summary with stats

#### `startJourney(req, res)` - Async
- **Purpose:** Start journey and board origin passengers
- **Process:**
  1. Check train initialized
  2. Call `trainState.startJourney()`
  3. Board passengers at idx 0 (CNF + RAC)
  4. Update stats
  5. Broadcast JOURNEY_STARTED
- **Returns:** Journey started confirmation

#### `getTrainState(req, res)` - Sync
- **Purpose:** Get complete train state
- **Returns:** Complete train state with stations, coaches, racQueue, stats

#### `moveToNextStation(req, res)` - Async
- **Purpose:** Progress train to next station
- **Process:**
  1. Check trainState and journeyStarted
  2. Check if journey complete
  3. Call `StationEventService.processStationArrival()`
  4. Increment currentStationIdx
  5. Unlock station for upgrades
  6. Broadcast station arrival
- **Returns:** Processed station results

#### `resetTrain(req, res)` - Async
- **Purpose:** Reload train data to initial state
- **Returns:** Reset confirmation

#### `getTrainStats(req, res)` - Sync
- **Purpose:** Get current statistics
- **Returns:** stats with progress percentage

#### `list(req, res)` - Async
- **Purpose:** List all trains from Train_Details collection
- **Returns:** Array of trains

---

### passengerController.js (476 lines)

**Responsibilities:** Passenger operations and upgrade handling

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `getAllPassengers()` | Get all passengers with pagination |
| `getPassengersByStatus(status)` | Filter by CNF/RAC/WL |
| `getPNRDetails(pnr)` | Public PNR lookup |
| `getPassengerByIRCTC(irctcId)` | Get by IRCTC ID (auth required) |
| `approveUpgrade()` | Passenger approves upgrade offer |
| `getPendingUpgrades(irctcId)` | Get pending upgrade offers |
| `acceptUpgrade()` | Accept upgrade notification |
| `denyUpgrade()` | Deny upgrade notification |
| `changeBoardingStation()` | Change boarding point (one-time) |
| `selfCancelTicket()` | Passenger self-cancel |
| `selfRevertNoShow()` | Passenger revert NO_SHOW |
| `setPassengerStatus()` | Set online/offline status |
| `subscribeToPush()` | Subscribe to push notifications |
| `getInAppNotifications()` | Get in-app notifications |

---

### tteController.js (361 lines)

**Responsibilities:** TTE operations, boarding, no-show management

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `getAllPassengersFiltered()` | Get passengers with filters |
| `getCurrentlyBoardedPassengers()` | Currently boarded only |
| `getBoardedRACPassengers()` | Boarded RAC for offline upgrade |
| `getBoardingQueue()` | Boarding verification queue |
| `confirmAllBoarded()` | Bulk confirm boarding |
| `markNoShow()` | Mark passenger NO_SHOW |
| `revertNoShow()` | Revert NO_SHOW status |
| `manualMarkBoarded()` | Manual boarding |
| `manualMarkDeboarded()` | Manual deboarding |
| `confirmUpgrade()` | TTE confirms upgrade |
| `addOfflineUpgrade()` | Add offline upgrade to queue |
| `confirmOfflineUpgrade()` | Confirm offline upgrade |
| `rejectOfflineUpgrade()` | Reject offline upgrade |
| `getOfflineUpgrades()` | Get pending offline upgrades |
| `getActionHistory()` | Get action history for undo |
| `undoAction()` | Undo last action (30 min limit) |
| `getStatistics()` | Journey statistics |
| `getUpgradedPassengers()` | Get all upgraded passengers |

---

### reallocationController.js

**Responsibilities:** RAC reallocation logic

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `markPassengerNoShow()` | Mark NO_SHOW (creates vacancy) |
| `getRACQueue()` | Get RAC queue |
| `getVacantBerths()` | Get all vacant berth segments |
| `searchPassenger(pnr)` | Search by PNR |
| `getEligibilityMatrix()` | Get eligible RAC for vacant berths |
| `applyReallocation()` | Manually apply reallocation (Admin) |

---

### StationWiseApprovalController.js

**Responsibilities:** TTE approval workflow for station-wise reallocations

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `getPendingReallocations()` | Get pending TTE approvals |
| `approveBatch()` | Approve batch of reallocations |
| `rejectReallocation(id)` | Reject specific reallocation |
| `getStationWiseData()` | Get station-wise reallocation data |
| `getApprovedReallocations()` | Get approved/completed upgrades |

---

## 🔧 SERVICES ARCHITECTURE

### Critical Services (0% Coverage - High Priority)

#### CurrentStationReallocationService.js (179 lines)
**Purpose:** NEW APPROACH - Only process current station data

**Key Methods:**

| Method | Description |
|--------|-------------|
| `getCurrentStationData(trainState)` | Get RAC passengers + vacant berths at current station |
| `_getRACPassengersAtCurrentStation()` | HashMap of RAC boarded at current idx |
| `_getVacantBerthsFromCurrentStation()` | HashMap of berths vacant from current idx |
| `_findMatches(racMap, vacantMap)` | Match RAC to berths |
| `createPendingReallocationsFromMatches()` | Create pending approvals in MongoDB |
| `_groupByDestination()` | Group RAC by destination |
| `_groupByVacancyEnd()` | Group berths by vacancy end |

**Workflow:**
1. Get boarded RAC passengers at current station
2. Get berths vacant from current station onwards
3. Match RAC to berths with overlapping journey segments
4. Create pending reallocations in `station_reallocations` collection
5. TTE approves/rejects via StationWiseApprovalController
6. Upon approval, upgrade applied via AllocationService

---

#### AllocationService.js (145 lines)
**Purpose:** Apply berth allocations and upgrades

**Key Methods:**

| Method | Description |
|--------|-------------|
| `applyUpgrade(pnr, berthId, trainState)` | Apply RAC → CNF upgrade |
| `allocateBerth(passenger, berth)` | Allocate berth to passenger |
| `deallocateBerth(passenger, berth)` | Deallocate berth |
| `validateAllocation()` | Validate allocation constraints |
| `rollbackAllocation()` | Rollback failed allocation |

---

#### EligibilityService.js (108 lines)
**Purpose:** Determine RAC passenger eligibility for upgrades

**Eligibility Criteria:**
1. ✅ Passenger is RAC status
2. ✅ Passenger has boarded (`boarded === true`)
3. ✅ Passenger not marked NO_SHOW
4. ✅ Journey overlaps with vacant berth segment
5. ✅ Passenger at or past boarding station

---

### Data & State Services

#### DataService.js (171 lines)
**Purpose:** Load train data from MongoDB

**Key Methods:**

| Method | Description |
|--------|-------------|
| `loadTrainData(trainNo, date, name)` | Main loader - creates TrainState |
| `getStations(trainNo)` | Load stations from Station_Details |
| `getPassengers(trainNo, date)` | Load passengers from Passenger_Details |
| `getTrainName(trainNo)` | Get train name from Train_Details |
| `_mapPassengersToCoaches()` | Map passengers to berths |
| `_populateRACQueue()` | Populate RAC queue |

**Loading Process:**
1. Load stations from PassengerDB.Station_Details
2. Load passengers from PassengerDB.Passenger_Details
3. Create TrainState instance
4. Initialize coaches (9 SL + 0 3A default)
5. Map CNF passengers to berths
6. Populate RAC queue
7. Calculate initial stats
8. Return trainState

---

#### StationEventService.js (132 lines)
**Purpose:** Process station arrival events

**Key Methods:**

| Method | Description |
|--------|-------------|
| `processStationArrival(trainState)` | Main station processor |
| `_boardPassengers(idx)` | Board passengers at station |
| `_deboardPassengers(idx)` | Deboard passengers |
| `_markNoShows(idx)` | Auto-mark no-shows |
| `_triggerReallocations(idx)` | Trigger reallocation checks |

**Station Arrival Flow:**
1. Board passengers scheduled for this station
2. Deboard passengers ending journey here
3. Mark no-shows (passengers who didn't board)
4. Update statistics
5. Trigger reallocation eligibility checks
6. Broadcast station arrival via WebSocket

---

### Notification Services

#### NotificationService.js (82 lines)
**Purpose:** Multi-channel notification orchestrator

**Channels:**
- 📱 Web Push (via WebPushService)
- 📧 Email (via Nodemailer)
- 📧 Email (via Nodemailer)
- 🔔 In-app notifications

**Key Methods:**

| Method | Description |
|--------|-------------|
| `sendUpgradeNotification(pnr, passenger, berthDetails)` | Send upgrade offer |
| `sendNoShowMarkedNotification(pnr, passenger)` | Send NO_SHOW notification |
| `sendBoardingReminder(pnr, passenger)` | Send boarding reminder |
| `sendUpgradeConfirmation(pnr, passenger)` | Send upgrade confirmed |
| `sendUpgradeRejection(pnr, passenger)` | Send upgrade rejected |

---

#### WebPushService.js (67 lines)
**Purpose:** Web Push API (VAPID) implementation

**Configuration:**
```javascript
VAPID_PUBLIC_KEY=BNxxxxx...
VAPID_PRIVATE_KEY=xxxxx...
VAPID_SUBJECT=mailto:admin@example.com
```

**Key Methods:**

| Method | Description |
|--------|-------------|
| `sendPushNotification(subscription, payload)` | Send push to subscriber |
| `sendToPassenger(pnr, title, body)` | Send to passenger |
| `sendToTTE(tteId, title, body)` | Send to TTE |
| `sendToAdmin(adminId, title, body)` | Send to admin |
| `getVapidPublicKey()` | Get public key for client |

---

#### InAppNotificationService.js (47 lines)
**Purpose:** In-app notification queue management

**Schema:**
```javascript
{
  recipientPNR: String,
  recipientIRCTC: String,
  type: String,        // 'upgrade', 'no-show', 'boarding'
  title: String,
  message: String,
  data: Object,
  status: String,      // 'unread', 'read'
  createdAt: Date,
  readAt: Date
}
```

---

### Utility Services

#### QueueService.js (23 lines)
**Purpose:** RAC queue management

**Key Methods:**

| Method | Description |
|--------|-------------|
| `addToQueue(passenger)` | Add RAC passenger to queue |
| `removeFromQueue(pnr)` | Remove from queue (after upgrade) |
| `getQueuePosition(pnr)` | Get position in queue |
| `getEligibleRAC()` | Get eligible RAC for upgrades |

---

#### CacheService.js (110 lines)
**Purpose:** In-memory caching (node-cache)

**Configuration:**
```javascript
{
  stdTTL: 600,        // 10 minutes default
  checkperiod: 120,   // Check every 2 minutes
  useClones: false    // Performance optimization
}
```

**Cached Data:**
- Train state snapshots
- Passenger lookups
- Station data
- Eligibility matrices

---

#### OTPService.js (65 lines)
**Purpose:** OTP generation and verification

**Key Methods:**

| Method | Description |
|--------|-------------|
| `generateOTP(length)` | Generate random OTP |
| `sendOTP(recipient, channel)` | Send via email |
| `verifyOTP(recipient, otp)` | Verify OTP |
| `clearOTP(recipient)` | Clear after verification |

**Storage:** In-memory Map with 5-minute expiry

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Auth Middleware (`middleware/auth.js`)

**JWT Token Structure:**
```javascript
{
  userId: String,        // IRCTC ID (passengers) or Employee ID (staff)
  role: String,          // 'ADMIN', 'TTE', 'PASSENGER'
  username: String,
  iat: Number,           // Issued at
  exp: Number            // Expiry (24 hours)
}
```

**Middleware Functions:**

| Middleware | Purpose |
|------------|---------|
| `authMiddleware` | Verify JWT token |
| `requireRole(['ADMIN', 'TTE'])` | Check user role |
| `requirePermission('action')` | Check specific permission |

**Password Hashing:**
- Algorithm: bcrypt
- Rounds: 10
- Salt: Auto-generated

---

### Rate Limiting (`middleware/rateLimiter.js`)

**Limits:**

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/*` | 5 requests | 15 minutes |
| `/api/otp/send` | 3 requests | 1 hour |
| `/api/*` (general) | 100 requests | 15 minutes |

---

## 📡 WEBSOCKET ARCHITECTURE

### WebSocket Manager (`config/websocket.js`)

**Purpose:** Real-time updates to all connected clients

**Events Broadcasted:**

| Event Type | When | Payload |
|------------|------|---------|
| `TRAIN_UPDATE` | Train state changes | trainState summary |
| `STATION_ARRIVAL` | Train arrives at station | station details |
| `RAC_REALLOCATION` | RAC upgraded | upgrade details |
| `NO_SHOW` | Passenger marked NO_SHOW | passenger PNR |
| `STATS_UPDATE` | Statistics change | updated stats |
| `UPGRADE_OFFER` | New upgrade offer | passenger, berth |
| `BOARDING_QUEUE` | Boarding queue updated | queue data |

**Client Connection:**
```javascript
const ws = new WebSocket('ws://localhost:5000');

ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  
  switch(type) {
    case 'TRAIN_UPDATE':
      // Update train state UI
      break;
    case 'UPGRADE_OFFER':
      // Show notification to passenger
      break;
  }
};
```

**Methods:**

| Method | Description |
|--------|-------------|
| `initialize(httpServer)` | Initialize WebSocket server |
| `broadcastTrainUpdate(type, data)` | Broadcast to all clients |
| `broadcastStatsUpdate(stats)` | Broadcast stats |
| `getClientCount()` | Get connected client count |
| `closeAll()` | Close all connections (shutdown) |

---

## 🎨 FRONTEND ARCHITECTURE

### Admin Portal (`frontend/`)

**Tech Stack:**
- Vite 5.x
- React 19
- TypeScript
- Material-UI (MUI) 6.x
- Axios for API calls
- React Router for navigation

**Pages:**

| Page | Route | Purpose |
|------|-------|---------|
| `HomePage` | `/` | Dashboard & train initialization |
| `ConfigPage` | `/config` | Runtime configuration |
| `CoachesPage` | `/coaches` | Coach & berth visualization |
| `PassengersPage` | `/passengers` | Passenger management |
| `RACQueuePage` | `/rac-queue` | RAC queue management |
| `ReallocationPage` | `/reallocation` | Reallocation controls |
| `PhaseOnePage` | `/phase-one` | Station-wise approvals |
| `VisualizationPage` | `/visualization` | Segment matrix & graphs |
| `AllocationDiagnosticsPage` | `/diagnostics` | Allocation error logs |
| `LoginPage` | `/login` | Admin/TTE login |

**Components Structure:**
```
src/
├── components/
│   ├── CoachGrid.tsx        # Coach visualization
│   ├── BerthCard.tsx        # Individual berth
│   ├── PassengerTable.tsx   # Passenger list
│   ├── RACQueueCard.tsx     # RAC queue item
│   ├── SegmentMatrix.tsx    # Segment visualization
│   └── StatsCard.tsx        # Statistics card
├── services/
│   ├── api.ts               # Axios instance
│   └── websocket.ts         # WebSocket client
├── hooks/
│   ├── useTrainState.ts     # Train state hook
│   ├── useWebSocket.ts      # WebSocket hook
│   └── useAuth.ts           # Authentication hook
└── types/
    └── train.ts             # TypeScript interfaces
```

---

### Passenger Portal (`passenger-portal/`)

**Purpose:** Passenger journey management & upgrade notifications

**Pages:**

| Page | Route | Purpose |
|------|-------|---------|
| `LoginPage` | `/login` | Passenger login (PNR + IRCTC) |
| `DashboardPage` | `/dashboard` | Journey status & notifications |
| `PNRCheckPage` | `/pnr-check` | Public PNR lookup |
| `BoardingPassPage` | `/boarding-pass` | QR code boarding pass |
| `NotificationsPage` | `/notifications` | Notification history |

**Key Features:**
- 🔔 Real-time upgrade notifications with countdown timer
- 📱 Web Push notification support
- 🎫 QR code boarding pass generation
- 📊 Journey progress visualization
- ✅ Accept/Deny upgrade offers
- 🚫 Self-cancellation (mark NO_SHOW)
- 🔄 Revert NO_SHOW status
- 📍 Change boarding station (one-time)

---

### TTE Portal (`tte-portal/`)

**Purpose:** TTE operations & journey management

**Pages:**

| Page | Route | Purpose |
|------|-------|---------|
| `LoginPage` | `/login` | TTE login |
| `DashboardPage` | `/dashboard` | Journey statistics |
| `PassengersPage` | `/passengers` | Passenger verification |
| `BoardingQueuePage` | `/boarding-queue` | Boarding verification |
| `NoShowPage` | `/no-show` | No-show management |
| `UpgradesPage` | `/upgrades` | Upgrade approvals |
| `OfflineUpgradesPage` | `/offline-upgrades` | Offline upgrade queue |
| `ActionHistoryPage` | `/history` | Action history & undo |

**Key Features:**
- 📋 Boarding verification queue
- ❌ Mark/Revert NO_SHOW
- ✅ Approve/Reject RAC upgrades
- 🔄 Undo last action (30 min window)
- 📊 Real-time statistics
- 🚫 Offline upgrade management
- 📱 Push notification support

---

## 🔄 RAC REALLOCATION WORKFLOW

### Complete Flow (Step-by-Step)

#### Phase 1: NO_SHOW Event
1. TTE marks passenger as NO_SHOW via `/api/tte/mark-no-show`
2. `tteController.markNoShow()` called
3. `trainState.markBoardedPassengerNoShow(pnr)` executed
4. Passenger marked: `{noShow: true, boarded: false}`
5. Berth vacancy created
6. Database updated: `Passenger_Details.NO_show = true`
7. WebSocket broadcasts: `NO_SHOW` event
8. Stats updated: `totalNoShows++, vacantBerths++`

#### Phase 2: Station Arrival
1. Train arrives at next station
2. `/api/train/next-station` called
3. `StationEventService.processStationArrival()` executed
4. Passengers board/deboard
5. `trainState.currentStationIdx++`
6. `trainState.unlockStationForUpgrades()` called
7. Station unlocked for reallocation

#### Phase 3: Reallocation Calculation
1. Admin/TTE navigates to "Phase One" page
2. Frontend calls `/api/reallocation/current-station-matching`
3. `CurrentStationReallocationService.getCurrentStationData()` executed
4. **HashMap 1:** RAC passengers boarded at current station
5. **HashMap 2:** Berths vacant from current station
6. Matches found (journey overlap + eligibility)
7. Frontend displays matches to TTE

#### Phase 4: Create Pending Reallocations
1. TTE clicks "Create Pending Reallocations"
2. Frontend calls `/api/reallocation/create-from-matches`
3. `CurrentStationReallocationService.createPendingReallocationsFromMatches()` executed
4. For each match:
   - Insert into `station_reallocations` collection
   - Status: `'pending'`
   - Includes: PNR, berthId, station, priority
5. Return count of created reallocations

#### Phase 5: TTE Approval
1. TTE navigates to "Pending Upgrades" tab
2. Frontend calls `/api/reallocation/pending`
3. `StationWiseApprovalController.getPendingReallocations()` returns list
4. TTE reviews each upgrade
5. **Option A - Approve:**
   - TTE clicks "Approve"
   - Frontend calls `/api/reallocation/approve-batch`
   - For each upgrade:
     - Check collision (berth not used, passenger not upgraded)
     - Call `AllocationService.applyUpgrade(pnr, berthId)`
     - Update passenger: `pnrStatus = 'CNF'`, assign berth
     - Remove from RAC queue
     - Update `station_reallocations.status = 'completed'`
     - Create upgrade notification
6. **Option B - Reject:**
   - TTE clicks "Reject"
   - Frontend calls `/api/reallocation/reject/:id`
   - Update `station_reallocations.status = 'rejected'`

#### Phase 6: Passenger Notification
1. `NotificationService.sendUpgradeNotification()` called
2. **Web Push:** Send via WebPushService
3. **In-App:** Insert into `in_app_notifications`
4. **Email:** Send via Nodemailer (optional)

6. Passenger receives notification with 5-minute countdown

#### Phase 7: Passenger Response
1. **Option A - Accept:**
   - Passenger clicks "Accept" in portal
   - Frontend calls `/api/passenger/accept-upgrade`
   - Upgrade confirmed
   - Notification status: `'ACCEPTED'`
   - Passenger can now use new berth
2. **Option B - Deny:**
   - Passenger clicks "Deny"
   - Frontend calls `/api/passenger/deny-upgrade`
   - Berth returned to available pool
   - Notification status: `'DENIED'`
3. **Option C - Timeout:**
   - 5 minutes elapse
   - Auto-accept (configurable)
   - Notification status: `'TIMEOUT'`

---

## 🧪 TESTING STRUCTURE

### Test Coverage Summary (from COVERAGE_GAP_70_PERCENT.md)

| Category | Current | Target | Files |
|----------|---------|--------|-------|
| **Overall** | 22.21% | 70% | All |
| **Utils** | 71.33% | 70% | ✅ Met |
| **Controllers** | 29.47% | 70% | Need +40.53% |
| **Services** | 9.70% | 70% | Need +60.30% |

### Test Files (`__tests__/`)

```
__tests__/
├── controllers/
│   ├── trainController.test.js
│   ├── passengerController.test.js
│   ├── authController.test.js
│   └── ...
├── services/
│   ├── DataService.test.js
│   ├── QueueService.test.js
│   ├── ValidationService.test.js
│   └── ...
├── utils/
│   ├── berthAllocator.test.js
│   ├── helpers.test.js
│   └── stationOrder.test.js
└── integration/
    └── reallocation.test.js
```

### Testing Tools

```json
{
  "jest": "30.2.0",
  "supertest": "7.1.4",
  "@types/jest": "30.0.0"
}
```

**Run Tests:**
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Generate coverage report
```

---

## 🔧 CONFIGURATION & ENVIRONMENT

### Environment Variables (`backend/.env`)

**Database:**
```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=rac
PASSENGERS_DB=PassengerDB
```

**JWT:**
```env
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=7d
```

**VAPID (Web Push):**
```env
VAPID_PUBLIC_KEY=BNxxxxx...
VAPID_PRIVATE_KEY=xxxxx...
VAPID_SUBJECT=mailto:admin@example.com
```

**Email (Nodemailer):**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="RAC System <noreply@rac.com>"
```


```

**Server:**
```env
NODE_ENV=development
PORT=5000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
```

---

## 🐳 DEPLOYMENT (Docker & Kubernetes)

### Docker Compose (`docker-compose.yml`)

**Services:**
1. `mongodb` - MongoDB 6.0
2. `backend` - Node.js API
3. `frontend` - Admin Portal (Nginx)
4. `passenger-portal` - Passenger Portal (Nginx)
5. `tte-portal` - TTE Portal (Nginx)

**Start All Services:**
```bash
docker-compose up -d
```

### Kubernetes (`k8s/`)

**Manifests:**
- `mongodb-deployment.yaml` - MongoDB StatefulSet
- `backend-deployment.yaml` - Backend Deployment
- `frontend-deployment.yaml` - Frontend Deployment
- `passenger-portal-deployment.yaml`
- `tte-portal-deployment.yaml`
- `ingress.yaml` - Ingress rules
- `configmap.yaml` - Configuration
- `secrets.yaml` - Sensitive data

**Deploy to K8s:**
```bash
kubectl apply -f k8s/
```

---

## 📊 KEY ALGORITHMS & LOGIC

### Segment-Based Occupancy

**Concept:** A berth can be occupied by different passengers on non-overlapping journey segments.

**Example:**
```
Journey: A → B → C → D → E

Berth S1-42:
- Segment 0 (A→B): Passenger P001
- Segment 1 (B→C): Passenger P001
- Segment 2 (C→D): [VACANT]
- Segment 3 (D→E): Passenger P002

Result: S1-42 is vacant from C→D, can be allocated to RAC passenger
```

**Implementation:**
```javascript
berth.segmentOccupancy = [
  ['P001'],    // Segment 0
  ['P001'],    // Segment 1
  [],          // Segment 2 - VACANT
  ['P002']     // Segment 3
];
```

---

### RAC Queue Priority

**Priority Factors:**
1. **Booking Priority:** Lower RAC number = higher priority
2. **Journey Length:** Longer journey = higher priority
3. **Boarding Status:** Already boarded = eligible
4. **Station Index:** Current station match = eligible

**Eligibility Check:**
```javascript
function isEligible(racPassenger, vacantBerth, currentIdx) {
  return (
    racPassenger.boarded === true &&
    racPassenger.noShow === false &&
    racPassenger.pnrStatus === 'RAC' &&
    racPassenger.fromIdx <= currentIdx &&
    racPassenger.toIdx > currentIdx &&
    hasJourneyOverlap(racPassenger, vacantBerth)
  );
}
```

---

### Collision Detection

**Purpose:** Prevent double-allocation of berths

**Checks:**
1. **Berth Collision:** Berth already allocated to another passenger
2. **Passenger Collision:** Passenger already upgraded
3. **Segment Collision:** Segment already occupied

**Implementation:**
```javascript
function checkBerthCollision(berthId, excludePNR) {
  const berth = findBerth(berthId);
  const occupants = berth.passengers.filter(p => 
    p.pnr !== excludePNR && 
    p.boarded && 
    !p.noShow
  );
  return occupants.length > 0;
}
```

---

## 🚀 STARTUP SEQUENCE

### 1. Backend Startup (`server.js`)

```
1. Load environment variables (dotenv.config())
2. Validate environment (validateEnv())
3. Create Express app
4. Setup middleware (CORS, body-parser, cookie-parser, CSRF, rate-limiter)
5. Create HTTP server
6. Try MongoDB connection (may fail if not configured)
7. Initialize WebSocket server
8. Mount API routes (/api)
9. Setup Swagger docs (/api-docs)
10. Start HTTP server on PORT 5000
11. Log startup info (DB config, WebSocket status)
12. Setup graceful shutdown handlers (SIGINT, SIGTERM)
```

### 2. Frontend Startup (`frontend/src/main.tsx`)

```
1. Load Vite app
2. Initialize React 19
3. Setup React Router
4. Connect to WebSocket (ws://localhost:5000)
5. Setup authentication state
6. Render App component
7. Listen for WebSocket events
8. Serve on PORT 5173
```

### 3. Passenger Portal Startup (`passenger-portal/src/main.tsx`)

```
1. Load Vite app
2. Initialize React 19
3. Setup React Router
4. Request notification permission
5. Subscribe to Web Push
6. Connect to WebSocket
7. Render App component
8. Serve on PORT 5175
```

### 4. TTE Portal Startup (`tte-portal/src/main.tsx`)

```
1. Load Vite app
2. Initialize React 19
3. Setup React Router
4. Setup authentication
5. Connect to WebSocket
6. Subscribe to TTE push notifications
7. Render App component
8. Serve on PORT 5174
```

---

## 📈 PERFORMANCE CONSIDERATIONS

### Caching Strategy

**CacheService (node-cache):**
- Train state snapshots: 10 min TTL
- Passenger lookups: 5 min TTL
- Station data: 30 min TTL
- Eligibility matrices: 2 min TTL

**MongoDB Indexes:**
```javascript
// Passenger_Details
{ PNR_Number: 1 }
{ IRCTC_ID: 1 }
{ Train_Number: 1, Journey_Date: 1 }

// Users
{ username: 1 }
{ email: 1 }

// station_reallocations
{ status: 1, createdAt: -1 }
```

---

### WebSocket Optimization

**Connection Pooling:**
- Reuse connections
- Heartbeat every 30 seconds
- Auto-reconnect on disconnect

**Message Batching:**
- Batch stats updates (max 1/second)
- Debounce frequent events

---

## 🔒 SECURITY FEATURES

### Authentication
- ✅ JWT tokens with 24-hour expiry
- ✅ Refresh tokens with 7-day expiry
- ✅ bcrypt password hashing (10 rounds)
- ✅ Role-based access control (RBAC)

### Input Validation
- ✅ Joi schemas for request validation
- ✅ Sanitization (xss-clean)
- ✅ Parameter validation middleware

### CSRF Protection
- ✅ CSRF tokens for state-changing requests
- ✅ Cookie-based CSRF validation

### Rate Limiting
- ✅ Login attempts: 5/15 min
- ✅ OTP requests: 3/hour
- ✅ General API: 100/15 min

### Database Security
- ✅ MongoDB connection string in .env
- ✅ Parameterized queries (prevent injection)
- ✅ Input sanitization

---

## 🐛 DEBUGGING & LOGGING

### Log Levels (`utils/logger.js`)

```javascript
logger.error('Critical error', { error });
logger.warn('Warning message', { context });
logger.info('Info message', { data });
logger.debug('Debug details', { verbose });
```

### Debug Endpoints

```
GET /api/health           - Server health check
GET /api/train/stats      - Train statistics
GET /api/train/allocation-errors - Allocation error logs
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| MongoDB not connected | Run `mongod` or check MONGODB_URI |
| CORS errors | Check ALLOWED_ORIGINS in .env |
| Login fails | Run `node scripts/createTestAccounts.js` |
| Push notifications not working | Regenerate VAPID keys |
| WebSocket disconnect | Check firewall, enable heartbeat |

---

## 📚 LEARNING RESOURCES

### Key Concepts to Understand

1. **Segment-Based Occupancy:** How berths are tracked per journey segment
2. **RAC Queue Management:** Priority-based queue for upgrades
3. **WebSocket Broadcasting:** Real-time updates to all clients
4. **JWT Authentication:** Token-based auth with refresh tokens
5. **Web Push API:** VAPID-based push notifications
6. **MongoDB Aggregation:** Complex queries for statistics

### Recommended Reading

- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [MongoDB Manual](https://www.mongodb.com/docs/manual/)
- [WebSocket Protocol](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [React 19 Docs](https://react.dev/)

---

## 🎯 NEXT STEPS FOR DEVELOPERS

### For New Developers

1. ✅ Read README.md and QUICKSTART.md
2. ✅ Setup local environment (MongoDB + Node.js)
3. ✅ Run `npm install` in all folders
4. ✅ Create test accounts: `node scripts/createTestAccounts.js`
5. ✅ Start all servers and explore admin portal
6. ✅ Test RAC reallocation workflow manually
7. ✅ Review CODE_STUDY_NOTES.md (this file)
8. ✅ Read COVERAGE_GAP_70_PERCENT.md for testing plan

### For Contributors

1. ✅ Check COVERAGE_GAP_70_PERCENT.md for testing priorities
2. ✅ Follow testing patterns in `__tests__/`
3. ✅ Write tests for 0% coverage files first
4. ✅ Aim for 70% coverage minimum
5. ✅ Run `npm run test:coverage` before committing

---

**Last Updated:** December 18, 2025, 11:24 PM IST  
**Version:** 3.0.0  
**Maintainer:** Development Team  
**Status:** 🟢 Active Development
