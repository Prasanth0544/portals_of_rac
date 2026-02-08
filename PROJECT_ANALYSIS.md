# 🚂 RAC Reallocation System - Deep Analysis

> **A comprehensive line-by-line analysis of every component, connection, and communication flow**

---

## 📌 What is This Project?

The **RAC Reallocation System** is a **real-time railway seat management platform** built for Indian Railways. It automates the process of upgrading **RAC (Reservation Against Cancellation)** passengers to **Confirmed (CNF)** berths when seats become vacant due to:
- No-shows (passengers who don't board)
- Early deboarding
- Journey cancellations

### The Three-Portal Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      RAC REALLOCATION SYSTEM                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│   │  ADMIN       │   │  TTE         │   │  PASSENGER   │       │
│   │  PORTAL      │   │  PORTAL      │   │  PORTAL      │       │
│   │  :3000       │   │  :5174       │   │  :5175       │       │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘       │
│          │                  │                   │               │
│          │     REST API + WebSocket             │               │
│          └──────────────┬───────────────────────┘               │
│                         │                                       │
│                 ┌───────▼───────┐                               │
│                 │  BACKEND API  │                               │
│                 │   :5000       │                               │
│                 └───────┬───────┘                               │
│                         │                                       │
│                 ┌───────▼───────┐                               │
│                 │   MongoDB     │                               │
│                 │   :27017      │                               │
│                 └───────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🖼️ Architecture Diagrams (From Architecture_Diagrams Folder)

The project includes **4 visual architecture diagrams** that illustrate the complete system flow:

### 1. Main RAC Architecture (`rac_architecture_diagram.png`)

This shows the **complete layered architecture** from all 3 portals to data storage:

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: Frontend Portals                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │Admin Portal │  │ TTE Portal  │  │Pass. Portal │          │
│  │ (frontend/) │  │(tte-portal) │  │(passenger-) │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         └────────────────┼────────────────┘                 │
│                         ▼                                   │
│  LAYER 2: HTTP Requests / WebSocket                         │
│                         ▼                                   │
│  LAYER 3: API Layer (Express.js)                            │
│                         ▼                                   │
│  LAYER 4: api.js Routes (70+ endpoints)                     │
│                         ▼                                   │
│  LAYER 5: Controllers                                       │
│  ┌────────────┬────────────┬─────────────┬────────────┐     │
│  │authContlr  │trainContlr │reallocContlr│passContlr  │     │
│  └────────────┴────────────┴─────────────┴────────────┘     │
│                         ▼                                   │
│  LAYER 6: ReallocationService.js (Orchestrator)             │
│                         ▼                                   │
│  LAYER 7: Specialized Services                              │
│  ┌──────────┬─────────────┬─────────────┬────────────┐      │
│  │Vacancy   │Eligibility  │RACQueue     │Allocation  │      │
│  │Service   │Service      │Service      │Service     │      │
│  └──────────┴─────────────┴─────────────┴────────────┘      │
│                         ▼                                   │
│  LAYER 8: Data Layer                                        │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │     MongoDB      │  │ In-Memory State  │                 │
│  │(stations+pass.)  │◄─┤  (TrainState)    │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### 2. Admin Portal Flow (`admin_portal_flow.png`)

Shows the **train management workflow**:

| Layer | Components |
|-------|------------|
| **Pages** | HomePage, ConfigPage, CoachesPage, PassengersPage, ReallocationPage, RACQueuePage, VisualizationPage, PhaseOnePage |
| **Routes** | `/config/*`, `/train/*`, `/reallocation/*`, `/passengers/*`, `/visualization/*` |
| **Controllers** | configController, trainController, reallocationController, visualizationController |
| **Core Service** | ReallocationService.js |
| **Specialized** | DataService, VacancyService, EligibilityService, AllocationService |
| **Data** | MongoDB (stationsDb, passengersDb) ↔ TrainState (In-Memory) |

### 3. TTE Portal Flow (`tte_portal_flow.png`)

Shows the **ticket examiner operations workflow**:

| Layer | Components |
|-------|------------|
| **Pages** | DashboardPage, PassengersPage, BoardingVerificationPage, PendingReallocationsPage, OfflineUpgradesPage, BoardedPassengersPage |
| **Middleware** | authMiddleware, requireRole(['TTE']) |
| **Routes** | `/tte/*`, `/reallocation/pending`, `/reallocation/approve-batch` |
| **Controllers** | tteController, reallocationController, stationWiseApprovalController |
| **Core Service** | StationWiseApprovalService.js |
| **Specialized** | NoShowService, AllocationService, NotificationService, RACQueueService |
| **Data** | MongoDB ↔ TrainState + ActionHistory |

### 4. Passenger Portal Flow (`passenger_portal_flow.png`)

Shows the **self-service passenger workflow**:

| Layer | Components |
|-------|------------|
| **Pages** | DashboardPage, PNRSearchPage, JourneyVisualizationPage, UpgradeOffersPage, ViewTicketPage |
| **Communication** | HTTP Requests + Push Notifications |
| **Middleware** | authMiddleware, requireRole(['PASSENGER']) |
| **Routes** | `/passenger/*`, `/auth/passenger/*`, `/push/*` |
| **Controllers** | passengerController, authController, otpController |
| **Core Service** | PassengerService.js |
| **Specialized** | OTPService, UpgradeNotificationService, PushNotificationService, InAppNotificationService |
| **Data** | MongoDB (passengers) + Push Subscriptions |

---

## 🔴 The Current Problem (Why This is Needed)

### Problem 1: Manual, Paper-Based Upgrades
Currently, Indian Railways uses a **manual paper-based system** where:
- TTEs (Ticket Examiners) manually check who didn't board
- They write down vacant berths on paper
- RAC passengers are upgraded by verbal announcement
- No real-time notification to passengers

**Result:** Passengers miss upgrades, TTEs are overworked, and berths remain underutilized.

### Problem 2: No Segment-Based Tracking
A berth can be used by **multiple passengers on different segments**:
- Passenger A: Station 1 → Station 5
- Passenger B: Station 5 → Station 10

Current systems don't track this, wasting potential capacity.

### Problem 3: No Passenger Communication
RAC passengers don't know when upgrades are available. They must:
- Constantly check with TTE
- Miss upgrades if they're asleep or in another coach

### Problem 4: No Priority System
Multiple RAC passengers may be eligible for the same vacant berth. Without a system:
- First-come-first-served (unfair)
- TTE discretion (inconsistent)
- No audit trail

### Problem 5: Single Passenger Per PNR Limitation
Family bookings with multiple passengers under one PNR:
- Each passenger needs individual seat preferences (elderly need lower berths)
- No way to track group relationships
- Notifications go only to one contact

---

## ✅ How This System Solves the Problems

| Problem | Solution |
|---------|----------|
| Manual tracking | **Automated station arrival processing** |
| No segment tracking | **Segment-based occupancy matrix** |
| No communication | **WebSocket + Push notifications** |
| No priority | **Preference-based priority (seniors → women → adults)** |
| No TTE control | **Dual-approval workflow** |
| No audit | **Complete action history with undo** |
| Single passenger/PNR | **Multi-passenger booking (up to 6 per PNR)** |

---

## 🏗️ Architecture Deep Dive

### 1. Backend Server (`backend/server.js`)

The server is the heart of the system. Here's a line-by-line breakdown:

```javascript
// Lines 1-16: Import dependencies
require('dotenv').config();           // Load environment variables
const express = require('express');   // HTTP framework
const cors = require('cors');         // Cross-origin support
const http = require('http');          // HTTP server for WebSocket
```

**Key Configurations:**
```javascript
// Lines 31-43: CORS Configuration
app.use(cors({
  origin: ['http://localhost:3000', ...],  // Admin, TTE, Passenger portals
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,                        // Allow cookies for CSRF
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
```

**Server Startup Sequence:**
```
1. validateEnv()     → Check required environment variables
2. db.connect()      → Connect to MongoDB (stations + passengers DBs)
3. Cleanup old data  → Clear stale reallocations and notifications
4. wsManager.init()  → Start WebSocket server
5. httpServer.listen() → Start HTTP API
```

---

### 2. Database Architecture (`backend/config/db.js`)

The system uses a **dual-database architecture**:

```
┌─────────────────────────────────────────────────┐
│                   MongoDB                        │
├─────────────────────────────────────────────────┤
│ Database: rac                                   │
│ ├── Collection: 17225 (Station list)            │
│ ├── Collection: Trains_Details                  │
│ ├── Collection: tte_users                       │
│ ├── Collection: passenger_accounts              │
│ └── Collection: station_reallocations           │
├─────────────────────────────────────────────────┤
│ Database: PassengersDB                          │
│ ├── Collection: P_1 (Passengers for train 1)   │
│ │   ├── PNR_Number (string)                     │
│ │   ├── Passenger_Index (number) ← NEW          │
│ │   └── Is_Group_Leader (boolean) ← NEW         │
│ ├── Collection: P_2 (Passengers for train 2)   │
│ └── Collection: upgrade_notifications          │
└─────────────────────────────────────────────────┘
```

**Connection Pooling (Lines 70-80):**
```javascript
const poolOptions = {
  minPoolSize: 10,           // Keep 10 connections ready
  maxPoolSize: 50,           // Scale up to 50 under load
  maxIdleTimeMS: 45000,      // Release idle connections
  connectTimeoutMS: 10000,   // 10s connection timeout
  retryWrites: true,         // Auto-retry failed writes
  retryReads: true           // Auto-retry failed reads
};
```

---

### 3. Train State Model (`backend/models/TrainState.js`)

This is the **central in-memory data structure** that holds the entire train state:

```javascript
class TrainState {
  constructor(trainNo, trainName) {
    this.trainNo = trainNo;           // e.g., "17225"
    this.trainName = trainName;        // e.g., "Amaravathi Express"
    this.journeyDate = null;           // e.g., "2025-11-15"
    this.currentStationIdx = 0;        // Current position (0 = origin)
    this.journeyStarted = false;       // Has journey begun?
    this.stations = [];                // Array of 17 stations
    this.coaches = [];                 // Array of coach objects
    this.racQueue = [];                // RAC passengers waiting for upgrade
    this.segmentMatrix = null;         // Segment occupancy tracking
  }
}
```

**Statistics Tracking:**
```javascript
this.stats = {
  totalPassengers: 0,      // All passengers
  currentOnboard: 0,       // Currently on train
  cnfPassengers: 0,        // Confirmed berth holders
  racPassengers: 0,        // RAC queue count
  racCnfPassengers: 0,     // RAC upgraded to CNF
  vacantBerths: 0,         // Empty berths
  totalDeboarded: 0,       // Left at destination
  totalNoShows: 0,         // Didn't board
  totalRACUpgraded: 0,     // Successful upgrades
  totalBoarded: 0          // Total boarded
};
```

**Berth Type Mapping (Lines 98-113):**
```javascript
// Sleeper (SL) coaches: 72 berths per coach
const berthMapping = {
  lowerBerths: [1, 4, 9, 12, ...],    // Positions 1, 4, 9...
  middleBerths: [2, 5, 10, 13, ...],
  upperBerths: [3, 6, 11, 14, ...],
  sideLower: [7, 15, 23, ...],        // RAC-eligible berths
  sideUpper: [8, 16, 24, ...]
};
```

---

### 4. WebSocket Real-Time Communication (`backend/config/websocket.js`)

This enables **instant updates** without page refresh:

```javascript
class WebSocketManager {
  constructor() {
    this.wss = null;                    // WebSocket server
    this.clients = new Set();           // All connected clients
    this.pnrSubscriptions = new Map(); // PNR → Set of clients
  }
}
```

**Connection Lifecycle:**
```
1. Client connects → Generate unique clientId
2. Send CONNECTION_SUCCESS message
3. Client subscribes to PNR: subscribe:offers {pnr: "1722500001"}
4. Server tracks subscription in pnrSubscriptions Map
5. When upgrade available → sendOfferToPassenger(pnr, offer)
6. Client receives: upgrade:offer {berth, coach, expiry}
7. Heartbeat every 30s to detect dead connections
8. On disconnect → cleanup subscriptions and event listeners
```

**Event Types Broadcast:**
```javascript
// Lines 426-472: Broadcast methods
broadcastTrainUpdate()       // Train state changed
broadcastStationArrival()    // Arrived at station
broadcastRACReallocation()   // RAC upgrade happened
broadcastNoShow()            // Passenger marked no-show
broadcastStatsUpdate()       // Statistics changed
```

---

### 5. Station Event Service (`backend/services/StationEventService.js`)

This orchestrates **what happens when train arrives at a station**:

```javascript
async processStationArrival(trainState) {
  // STEP 1: Board passengers (CNF + RAC)
  result.boarded = this.boardPassengers(trainState);
  
  // STEP 2: Deboard passengers at destination
  const deboardResult = this.deboardPassengers(trainState);
  
  // STEP 3: RAC upgrades (now using manual TTE approval)
  // OLD: automatic upgrades
  // NEW: Creates pending reallocations for TTE approval
  
  // STEP 4: Process no-shows
  result.noShows = this.processNoShows(trainState);
  
  // STEP 5: Update statistics
  trainState.updateStats();
}
```

**Boarding Logic (Lines 309-338):**
```javascript
boardPassengers(trainState) {
  // Board CNF passengers from berths
  trainState.coaches.forEach(coach => {
    coach.berths.forEach(berth => {
      berth.passengers
        .filter(p => p.fromIdx === currentIdx && !p.boarded && !p.noShow)
        .forEach(p => {
          p.boarded = true;
          console.log(`✅ ${p.name} boarded at ${p.from}`);
        });
    });
  });
  
  // Also board RAC passengers
  trainState.racQueue
    .filter(rac => rac.fromIdx === currentIdx && !rac.boarded)
    .forEach(rac => {
      rac.boarded = true;
    });
}
```

**Deboarding Logic (Lines 83-114):**
```javascript
deboardPassengers(trainState) {
  const newlyVacantBerths = [];
  
  trainState.coaches.forEach(coach => {
    coach.berths.forEach(berth => {
      const deboarding = berth.getDeboardingPassengers(currentIdx);
      
      deboarding.forEach(p => {
        berth.removePassenger(p.pnr);
        // Track berth as newly vacant for upgrade processing
        newlyVacantBerths.push({
          berth, coachNo, berthNo, type, class
        });
      });
    });
  });
  
  return { count, newlyVacantBerths };
}
```

---

### 6. Reallocation Service (`backend/services/ReallocationService.js`)

This handles the **core RAC upgrade logic**:

```javascript
class ReallocationService {
  // Delegate to specialized services
  markNoShow(trainState, pnr)     → NoShowService
  getRACQueue(trainState)         → RACQueueService
  getVacantBerths(trainState)     → VacancyService
  isEligibleForSegment(...)       → EligibilityService
  applyReallocation(...)          → AllocationService
}
```

**Stage 1 Eligibility (Lines 183-218):**
```javascript
getStage1Eligible(trainState) {
  // Find all vacant segments
  const vacantSegments = VacancyService.getVacantSegments(trainState);
  
  vacantSegments.forEach(vacantSegment => {
    // For each vacant segment, find eligible RAC passengers
    const eligible = EligibilityService.getStage1EligibleRAC(
      vacantSegment, currentStationIdx, trainState
    );
    
    // Return matrix: [berth → eligible passengers]
  });
}
```

**Stage 2 Results (Lines 225-279):**
```javascript
getStage2Results(trainState, vacantBerthData) {
  // Get Stage 1 eligible passengers
  const stage1Eligible = EligibilityService.getStage1EligibleRAC(...);
  
  // Categorize by status
  return {
    onlineEligible: [],    // Passengers with app open
    offlineEligible: [],   // Passengers without app
    notEligible: []        // Ineligible passengers
  };
}
```

---

## 🔗 Communication Flows

### Flow 1: Admin Initializes Train

```
ADMIN PORTAL                    BACKEND                   MONGODB
     │                             │                          │
     │ POST /train/initialize      │                          │
     │ {trainNo: "17225", date}    │                          │
     │────────────────────────────►│                          │
     │                             │ Find stations collection  │
     │                             │───────────────────────────►
     │                             │◄──────────────────────────│
     │                             │                          │
     │                             │ Find passengers collection│
     │                             │───────────────────────────►
     │                             │◄──────────────────────────│
     │                             │                          │
     │ {success, trainState}       │ Create TrainState        │
     │◄────────────────────────────│ in memory                │
     │                             │                          │
     │ WebSocket: TRAIN_UPDATE     │                          │
     │◄════════════════════════════│                          │
```

### Flow 2: TTE Marks No-Show

```
TTE PORTAL                      BACKEND                   PASSENGER PORTAL
     │                             │                              │
     │ POST /tte/mark-no-show      │                              │
     │ {pnr: "1722500001"}         │                              │
     │────────────────────────────►│                              │
     │                             │                              │
     │                             │ Update trainState             │
     │                             │ Find vacant berth             │
     │                             │ Match eligible RAC            │
     │                             │                              │
     │                             │ WebSocket: upgrade:offer     │
     │                             │════════════════════════════►│
     │                             │                              │
     │                             │ Push Notification            │
     │                             │────────────────────────────►│
     │                             │                              │
     │ {success, vacancies}        │                              │
     │◄────────────────────────────│                              │
```

### Flow 3: Passenger Accepts Upgrade

```
PASSENGER PORTAL                BACKEND                   TTE PORTAL
     │                             │                              │
     │ POST /passenger/approve     │                              │
     │ {pnr, offerId}              │                              │
     │────────────────────────────►│                              │
     │                             │                              │
     │                             │ Validate eligibility         │
     │                             │ Apply reallocation          │
     │                             │ Update berth occupancy       │
     │                             │ Remove from RAC queue        │
     │                             │                              │
     │                             │ WebSocket: upgrade:confirmed │
     │                             │════════════════════════════►│
     │                             │                              │
     │ {success, newBerth}         │                              │
     │◄────────────────────────────│                              │
```

### Flow 4: Station Arrival Processing

```
ADMIN PORTAL                    BACKEND                   ALL PORTALS
     │                             │                              │
     │ POST /train/next-station    │                              │
     │────────────────────────────►│                              │
     │                             │                              │
     │                             │ StationEventService.process() │
     │                             │                              │
     │                             │ 1. boardPassengers()         │
     │                             │    Mark CNF+RAC as boarded   │
     │                             │                              │
     │                             │ 2. deboardPassengers()       │
     │                             │    Remove at destination     │
     │                             │    Return vacant berths      │
     │                             │                              │
     │                             │ 3. processRACUpgrades()      │
     │                             │    Create pending upgrades   │
     │                             │                              │
     │                             │ 4. processNoShows()          │
     │                             │    Auto-mark overdue         │
     │                             │                              │
     │                             │ WebSocket: STATION_ARRIVAL   │
     │                             │════════════════════════════►│
     │                             │                              │
     │ {station, stats}            │                              │
     │◄────────────────────────────│                              │
```

---

## 🛠️ Key Services Breakdown

### Services and Their Responsibilities

| Service | File | Purpose |
|---------|------|---------|
| **ReallocationService** | `ReallocationService.js` | Main orchestrator, delegates to specialized services |
| **AllocationService** | `reallocation/AllocationService.js` | Assigns berths to RAC passengers |
| **EligibilityService** | `reallocation/EligibilityService.js` | Checks if RAC passenger can use vacant segment |
| **VacancyService** | `reallocation/VacancyService.js` | Finds all vacant berth segments |
| **NoShowService** | `reallocation/NoShowService.js` | Handles no-show marking |
| **RACQueueService** | `reallocation/RACQueueService.js` | Manages RAC priority queue |
| **StationEventService** | `StationEventService.js` | Orchestrates station arrival |
| **StationWiseApprovalService** | `StationWiseApprovalService.js` | TTE approval workflow |
| **UpgradeNotificationService** | `UpgradeNotificationService.js` | Upgrade offer expiry timers |
| **WebPushService** | `WebPushService.js` | Browser push notifications |
| **InAppNotificationService** | `InAppNotificationService.js` | In-app notification bell |
| **OTPService** | `OTPService.js` | Passenger OTP verification |
| **CacheService** | `CacheService.js` | Performance caching layer |
| **DataService** | `DataService.js` | MongoDB CRUD operations |

---

## 🌐 Portal Features

### Admin Portal (`frontend/`)

| Page | Purpose |
|------|---------|
| **HomePage** | Dashboard with train stats |
| **ConfigPage** | MongoDB connection setup |
| **CoachesPage** | Visual berth layout |
| **PassengersPage** | All passengers with filters |
| **ReallocationPage** | RAC upgrade management |
| **RACQueuePage** | Current RAC queue |
| **VisualizationPage** | Segment occupancy charts |
| **PhaseOnePage** | Station-wise upgrades |

### TTE Portal (`tte-portal/`)

| Page | Purpose |
|------|---------|
| **DashboardPage** | Quick stats and actions |
| **PassengersPage** | Search and filter |
| **BoardingVerificationPage** | Mark passengers boarded |
| **PendingReallocationsPage** | Approve/reject upgrades |
| **OfflineUpgradesPage** | Handle offline passengers |
| **BoardedPassengersPage** | Currently on train |

### Passenger Portal (`passenger-portal/`)

| Page | Purpose |
|------|---------|
| **DashboardPage** | Ticket status |
| **PNRSearchPage** | Find ticket by PNR |
| **JourneyVisualizationPage** | Train progress map |
| **UpgradeOffersPage** | Accept/reject upgrades |
| **ViewTicketPage** | Digital boarding pass |

---

## 🔐 Security Features

| Feature | Implementation |
|---------|---------------|
| **JWT Authentication** | 24h access tokens, 7d refresh tokens |
| **Password Hashing** | bcrypt with 10 salt rounds |
| **CSRF Protection** | Cookie-based with X-CSRF-Token header |
| **Rate Limiting** | 5 login attempts/15min, 3 OTP/hour |
| **Role-Based Access** | ADMIN, TTE, PASSENGER roles |
| **Input Validation** | Zod schemas for all endpoints |
| **CORS** | Configured allowed origins only |

---

## 📊 API Endpoints Summary

| Category | Count | Examples |
|----------|-------|----------|
| **Authentication** | 5 | `/auth/staff/login`, `/auth/verify` |
| **Train** | 10 | `/train/initialize`, `/train/next-station` |
| **TTE** | 19 | `/tte/mark-no-show`, `/tte/passengers` |
| **Passenger** | 19 | `/passenger/pnr/:pnr`, `/passenger/approve-upgrade` |
| **Reallocation** | 13 | `/reallocation/pending`, `/reallocation/approve-batch` |
| **Visualization** | 6 | `/visualization/segment-matrix`, `/visualization/heatmap` |
| **Push** | 5 | `/push/vapid-key`, `/push/subscribe` |
| **Config** | 2 | `/config/setup`, `/config/current` |

**Total: 84+ REST API endpoints**

---

## 📏 Project Metrics

| Metric | Value |
|--------|-------|
| **Total Code Lines** | ~75,000+ |
| **Backend Files** | 252 |
| **Frontend Files** | 72 |
| **TTE Portal Files** | 46 |
| **Passenger Portal Files** | 54 |
| **Test Suites** | 50 |
| **Test Cases** | 1,153 |
| **Test Coverage** | 79.59% |
| **API Endpoints** | 86 |
| **WebSocket Events** | 12 types |
| **Services** | 26 |
| **Controllers** | 9 |

---

## 🎯 How It All Works Together

```
┌───────────────────────────────────────────────────────────────────────┐
│                           COMPLETE FLOW                               │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. ADMIN initializes train with passengers from MongoDB              │
│     → TrainState created with coaches, berths, RAC queue             │
│                                                                       │
│  2. Journey starts → All passengers at origin boarded                 │
│     → WebSocket broadcasts TRAIN_UPDATE to all portals                │
│                                                                       │
│  3. Train arrives at station                                          │
│     → StationEventService.processStationArrival()                     │
│     → Board new passengers, deboard at destination                    │
│     → Find newly vacant berths                                        │
│                                                                       │
│  4. TTE marks no-show passenger                                       │
│     → Berth becomes vacant                                           │
│     → System finds eligible RAC passengers                            │
│     → Creates pending reallocation                                    │
│                                                                       │
│  5. Eligible RAC passenger receives notification                      │
│     → WebSocket: upgrade:offer (real-time)                            │
│     → Push notification (even if browser closed)                      │
│     → In-app notification bell                                        │
│                                                                       │
│  6. Passenger accepts upgrade                                         │
│     → Removed from RAC queue                                          │
│     → Added to CNF berth                                              │
│     → Segment occupancy updated                                       │
│     → Stats recalculated                                              │
│                                                                       │
│  7. Train moves to next station → Repeat from step 3                  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Unique Innovations

1. **Segment-Based Occupancy**: Same berth can serve multiple passengers on non-overlapping journey segments

2. **Dual-Approval Workflow**: TTE approves → Passenger confirms → Upgrade completes

3. **Real-time Notifications**: WebSocket + Push + In-app for guaranteed delivery

4. **Action History + Undo**: TTE can undo actions (no-show marking, etc.)

5. **Multi-Train Support**: Single system can manage multiple trains

6. **Offline Passenger Handling**: TTEs can upgrade passengers without smartphones

7. **Multi-Passenger Booking (NEW)**: Up to 6 passengers per PNR with individual seat preferences

8. **Preference-Based Priority**: Senior citizens and women get priority for lower berths

---

## 👥 Multi-Passenger Booking Feature (NEW)

### Database Schema
```javascript
{
  PNR_Number: "1722500001",
  Passenger_Index: 1,              // 1, 2, 3... up to 6
  Is_Group_Leader: true,           // Primary contact for notifications
  Name: "Passenger Name",
  Age: 25,
  Gender: "Male",
  Mobile: "9876543210",
  Email: "passenger@example.com"
}
```

### API Endpoints
```http
POST /api/passenger/booking           # Create booking (max 6 passengers)
GET  /api/passenger/booking/:pnr      # Get all passengers in booking
GET  /api/passenger/pnr/:pnr          # Returns ALL passengers in booking
PUT  /api/passenger/:pnr/:index/preference  # Update individual preference
POST /api/passenger/:pnr/board-all    # Board entire group
```

### Unique Compound Index
```javascript
// Allows multiple passengers per PNR
{ PNR_Number: 1, Passenger_Index: 1 }  // UNIQUE
```

---

*Deep Analysis Generated: February 2, 2026*
