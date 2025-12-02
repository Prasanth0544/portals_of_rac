# Backend Analysis - RAC Reallocation System
**Version**: 3.0.0  
**Last Updated**: 2025-12-02  
**Architecture**: Node.js + Express + MongoDB

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Controllers](#controllers)
4. [Services](#services)
5. [Models](#models)
6. [Routes](#routes)
7. [Middleware](#middleware)
8. [Configuration](#configuration)
9. [Database Structure](#database-structure)
10. [WebSocket Integration](#websocket-integration)

---

## Overview

The RAC Reallocation System backend is built on Node.js with Express, providing a comprehensive REST API and WebSocket server for real-time train berth management and RAC (Reservation Against Cancellation) passenger upgrades.

### Key Features
- ✅ Dual MongoDB database architecture (rac + PassengersDB)
- ✅ Real-time updates via WebSocket
- ✅ Segment-based berth vacancy tracking
- ✅ Two-stage eligibility checking (11 rules)
- ✅ Action history with undo functionality
- ✅ Multi-channel notifications (Email, SMS, Push, In-app)
- ✅ JWT authentication with role-based access control
- ✅ Comprehensive API with Swagger documentation

### Technology Stack
```json
{
  "runtime": "Node.js",
  "framework": "Express v4.18.2",
  "database": "MongoDB v6.3.0",
  "authentication": "JWT (jsonwebtoken v9.0.2)",
  "security": "bcrypt v6.0.0",
  "validation": "Joi v17.11.0",
  "websocket": "ws v8.14.2",
  "notifications": {
    "email": "nodemailer v7.0.11",
    "sms": "twilio v5.10.6",
    "push": "web-push v3.6.7"
  }
}
```

---

## Architecture

### High-Level Structure
```
backend/
├── server.js              # Main entry point with HTTP & WebSocket servers
├── config/                # Database, WebSocket, Swagger configuration
├── controllers/           # Request handlers (7 files)
├── services/             # Business logic (15+ files)
│   └── reallocation/     # Specialized reallocation services (6 files)
├── models/               # Data models & state management (3 files)
├── routes/               # API route definitions (1 file, 457 lines)
├── middleware/           # Authentication, validation, error handling (4 files)
├── utils/                # Helper functions and utilities (6 files)
└── constants/            # Reallocation rules and constants
```

### Design Patterns
- **MVC Architecture**: Controllers handle requests, services contain business logic, models manage data
- **Service Layer Pattern**: Business logic separated from controllers
- **Singleton Pattern**: Services exported as single instances
- **Factory Pattern**: TrainState model initialization
- **Observer Pattern**: WebSocket manager for real-time updates

---

## Controllers

### 1. **tteController.js** (1,230 lines)
**Purpose**: TTE (Traveling Ticket Examiner) specific operations

**Methods** (21 total):
```javascript
// Passenger Management
getAllPassengersFiltered(req, res)           // Get all passengers with filters
getCurrentlyBoardedPassengers(req, res)      // Boarded passengers only
getBoardedRACPassengers(req, res)            // RAC passengers onboard
manualMarkBoarded(req, res)                  // Manual boarding confirmation
manualMarkDeboarded(req, res)                // Manual deboarding

// Boarding Verification
getBoardingQueue(req, res)                   // Get verification queue
confirmAllBoarded(req, res)                  // Bulk boarding confirmation
markNoShow(req, res)                         // Mark passenger as NO_SHOW
revertNoShow(req, res)                       // Revert NO_SHOW status

// Upgrade Management
confirmUpgrade(req, res)                     // Confirm RAC upgrade (offline)
addOfflineUpgrade(req, res)                  // Add to offline queue
getOfflineUpgrades(req, res)                 // Get pending offline upgrades
confirmOfflineUpgrade(req, res)              // Confirm offline upgrade
rejectOfflineUpgrade(req, res)               // Reject offline upgrade
getSentUpgradeOffers(req, res)               // Track sent offers

// Action History
getActionHistory(req, res)                   // Get last 10 actions
undoAction(req, res)                         // Undo specific action

// Statistics
getStatistics(req, res)                      // Dashboard statistics
```

**Key Features**:
- Boarding verification queue management
- No-show handling with collision detection
- Offline upgrade queue for non-connected passengers
- Comprehensive action tracking with undo support

---

### 2. **passengerController.js** (1,117 lines)
**Purpose**: Passenger-facing operations and self-service

**Methods** (25 total):
```javascript
// PNR Operations
getPNRDetails(req, res)                      // Public PNR lookup
getPassengerByIRCTC(req, res)                // Get by IRCTC ID
searchPassenger(req, res)                    // Search by PNR

// Self-Service
markNoShow(req, res)                         // Self-cancel booking
selfRevertNoShow(req, res)                   // Revert own NO_SHOW
setPassengerStatus(req, res)                 // Set online/offline status

// Berth Information
getVacantBerths(req, res)                    // List vacant berths
getAllPassengers(req, res)                   // Get all passengers
getPassengersByStatus(req, res)              // Filter by status
getPassengerCounts(req, res)                 // Status counts

// Upgrade Management
getUpgradeNotifications(req, res)            // Pending upgrade offers
acceptUpgrade(req, res)                      // Accept upgrade offer
denyUpgrade(req, res)                        // Decline upgrade offer

// Notifications
getInAppNotifications(req, res)              // Get notifications
getUnreadCount(req, res)                     // Unread count
markNotificationRead(req, res)               // Mark as read
markAllNotificationsRead(req, res)           // Mark all as read

// Push Notifications
subscribeToPush(req, res)                    // Subscribe to browser push
unsubscribeFromPush(req, res)                // Unsubscribe from push
getVapidPublicKey(req, res)                  // Get VAPID public key
```

---

### 3. **reallocationController.js** (17,506 bytes)
**Purpose**: Core reallocation and eligibility management

**Key Methods**:
```javascript
getRACQueue(req, res)                        // Get RAC passenger queue
getVacantBerths(req, res)                    // Get ALL vacant segments
searchPassenger(req, res)                    // Search by PNR

// Eligibility Matrix
getEligibilityMatrix(req, res)               // LEGACY: Single-stage eligibility
getStage1Eligible(req, res)                  // NEW: Stage 1 eligible passengers
getStage2Results(req, res)                   // NEW: Stage 2 filtered results

// Reallocation
applyReallocation(req, res)                  // Apply upgrade allocation
sendUpgradeOffer(req, res)                   // Send offer to online passenger
processNoShow(req, res)                      // Process no-show and send offers
```

**Two-Stage Eligibility System**:
- **Stage 1**: Hard constraints (Rules 0, 2, 3, 4, 10, 11)
- **Stage 2**: Refinement filters (Rules 5, 6, 7, 8, 9)

---

### 4. **trainController.js** (11,116 bytes)
**Purpose**: Train lifecycle and journey management

**Methods**:
```javascript
initializeTrain(req, res)                    // Load train data from MongoDB
startJourney(req, res)                       // Begin journey & board passengers
getTrainState(req, res)                      // Get current state
moveToNextStation(req, res)                  // Progress to next station
resetTrain(req, res)                         // Reset train state
getStats(req, res)                           // Get statistics
getStations(req, res)                        // Get station list
```

---

### 5. **authController.js** (8,716 bytes)
**Purpose**: Authentication and user management

**Methods**:
```javascript
registerPassenger(req, res)                  // Passenger registration
registerTTE(req, res)                        // TTE registration
login(req, res)                              // User login
verifyToken(req, res)                        // JWT verification
logout(req, res)                             // User logout
getUserProfile(req, res)                     // Get profile
getTicketsByIRCTC(req, res)                  // Get user tickets
```

---

### 6. **visualizationController.js** (6,706 bytes)
**Purpose**: Data visualization and analytics

**Methods**:
```javascript
getStationSchedule(req, res)                 // Station arrival/departure times
getSegmentMatrix(req, res)                   // Berth occupancy matrix
getGraph(req, res)                           // Journey graph data
getHeatmap(req, res)                         // Occupancy heatmap
getBerthTimeline(req, res)                   // Individual berth timeline
getVacancyMatrix(req, res)                   // Vacancy visualization
```

---

### 7. **configController.js** (1,933 bytes)
**Purpose**: Runtime configuration management

**Methods**:
```javascript
setup(req, res)                              // Apply configuration & connect DB
```

---

## Services

### Core Services

#### 1. **DataService.js** (16,311 bytes)
**Purpose**: MongoDB data loading and train initialization

**Key Methods**:
```javascript
loadTrainData(trainNo, journeyDate, trainName)  // Main loader
loadStations()                               // Load station schedule
loadPassengers(trainNo, journeyDate)         // Load passenger data
allocatePassengers(trainState, passengers)   // Allocate to berths
buildRACQueue(trainState, passengers)        // Build RAC queue
findStation(stations, stationStr)            // Fuzzy station matching
getTrainName(trainNo)                        // Get train name
getTrainDetails(trainNo)                     // Get train metadata
```

**Features**:
- Supports dynamic collection names per train
- Graceful handling of empty passenger lists
- Fuzzy station name matching
- Detailed error reporting for allocation failures

---

#### 2. **ReallocationService.js** (12,234 bytes)
**Purpose**: Main orchestrator for RAC reallocation

**Architecture**: Delegates to specialized services

**Dependencies**:
```javascript
const NoShowService = require('./reallocation/NoShowService');
const VacancyService = require('./reallocation/VacancyService');
const EligibilityService = require('./reallocation/EligibilityService');
const RACQueueService = require('./reallocation/RACQueueService');
const AllocationService = require('./reallocation/AllocationService');
```

**Key Methods**:
```javascript
// Delegation Methods
markNoShow(trainState, pnr)                  // → NoShowService
getRACQueue(trainState)                      // → RACQueueService
getVacantBerths(trainState)                  // → VacancyService

// Eligibility
getStage1Eligible(trainState)                // Stage 1 matrix
getStage2Results(trainState, vacantBerthData) // Stage 2 filtering
getEligibilityMatrix(trainState)             // LEGACY method

// Reallocation
applyReallocation(trainState, allocations)   // Apply upgrades
processVacancyForUpgrade(trainState, vacantBerth) // Send offers
upgradeRACPassengerWithCoPassenger(...)      // Upgrade with co-passenger

// Stats
getRACStats(trainState)                      // RAC statistics
```

---

### Specialized Reallocation Services (6 files)

#### 1. **EligibilityService.js** (10,971 bytes)
**Purpose**: Two-stage eligibility checking

**11 Eligibility Rules**:
```javascript
// STAGE 1: Hard Constraints (must pass ALL)
Rule 0:  PNR Status = RAC
Rule 2:  Passenger is boarded
Rule 3:  Journey overlap (fromIdx <= vacantFrom, toIdx >= vacantTo)
Rule 4:  Class compatibility
Rule 10: Gender compatibility (if sharing)
Rule 11: Passenger is online (for online offers)

// STAGE 2: Refinement Filters
Rule 5:  Solo RAC constraint (2-segment lookahead exception)
Rule 6:  No conflicting CNF passenger
Rule 7:  Journey distance >= 200km
Rule 8:  Not already offered this berth
Rule 9:  RAC number priority (lower is better)
```

**Methods**:
```javascript
checkStage1Eligibility(racPassenger, vacantSegment, ...)
checkStage2Eligibility(racPassenger, vacantSegment, ...)
checkSoloRACConstraint(racPassenger, trainState, ...)
findCoPassenger(racPassenger, trainState)
checkConflictingCNFPassenger(vacantSegment, ...)
getStage1EligibleRAC(vacantSegment, currentStationIdx, trainState)
getStage2Results(stage1Eligible, vacantSegment, ...)
```

---

#### 2. **VacancyService.js** (4,734 bytes)
**Purpose**: Identify vacant berth segments

**Methods**:
```javascript
getVacantBerths(trainState)                  // Get ALL vacant segments
findVacantRanges(berth)                      // Find vacant ranges for berth
```

**Returns**: Array of vacant segments with:
- `coach`, `berthNo`, `type`, `class`
- `vacantFrom`, `vacantTo` (station codes)
- `vacantFromIdx`, `vacantToIdx` (indices)

---

#### 3. **RACQueueService.js** (6,049 bytes)
**Purpose**: Manage RAC passenger queue

**Methods**:
```javascript
getRACQueue(trainState)                      // Get all RAC passengers
getBoardedRACPassengers(trainState, currentStationIdx) // Boarded only
sortByRAC Number(racPassengers)              // Sort by priority
```

---

#### 4. **AllocationService.js** (6,409 bytes)
**Purpose**: Execute berth allocations

**Methods**:
```javascript
allocateBerth(racPNR, vacantBerth, trainState)  // Upgrade passenger
deallocateBerth(pnr, trainState)             // Remove from berth
updatePassengerStatus(pnr, status, trainState) // Update status
```

---

#### 5. **NoShowService.js** (3,407 bytes)
**Purpose**: Handle no-show operations

**Methods**:
```javascript
markPassengerNoShow(pnr, trainState)         // Mark as NO_SHOW
revertNoShow(pnr, trainState)                // Revert NO_SHOW
checkBerthCollision(coach, berth, pnr, trainState) // Collision detection
```

---

#### 6. **reallocationConstants.js** (4,498 bytes)
**Purpose**: Define eligibility rules and constants

**Exports**:
```javascript
ELIGIBILITY_RULES = {
  RULE_0_RAC_STATUS: {...},
  RULE_2_BOARDED: {...},
  RULE_3_JOURNEY_OVERLAP: {...},
  RULE_4_CLASS_COMPATIBILITY: {...},
  RULE_5_SOLO_RAC_CONSTRAINT: {...},
  RULE_6_NO_CONFLICTING_CNF: {...},
  RULE_7_JOURNEY_DISTANCE: {...},
  RULE_8_NO_DUPLICATE_OFFERS: {...},
  RULE_9_RAC_PRIORITY: {...},
  RULE_10_GENDER_COMPATIBILITY: {...},
  RULE_11_PASSENGER_ONLINE: {...}
}
```

---

### Notification Services

#### **NotificationService.js** (20,383 bytes)
**Purpose**: Multi-channel notification orchestration

**Channels**:
- Email (Nodemailer)
- SMS (Twilio)
- Browser Push (Web Push)
- In-app notifications

**Methods**:
```javascript
sendUpgradeOffer(passenger, berthDetails)    // Send upgrade notification
sendNoShowAlert(passenger)                   // Send NO_SHOW alert
sendBoardingReminder(passenger)              // Boarding reminder
notifyUpgradeAccepted(passenger, berth)      // Upgrade confirmation
notifyUpgradeDenied(passenger)               // Upgrade declined
```

---

#### **WebPushService.js** (6,092 bytes)
**Purpose**: Browser push notifications using VAPID

**Methods**:
```javascript
initializeVapid()                            // Setup VAPID keys
getVapidPublicKey()                          // Get public key for clients
sendPushNotification(subscription, payload)  // Send push
sendToMultiple(subscriptions, payload)       // Bulk send
```

---

#### **PushSubscriptionService.js** (5,292 bytes)
**Purpose**: Manage push subscriptions in MongoDB

**Methods**:
```javascript
subscribe(pnr, subscription)                 // Save subscription
unsubscribe(pnr, endpoint)                   // Remove subscription
getSubscriptions(pnr)                        // Get passenger subscriptions
```

---

#### **InAppNotificationService.js** (4,861 bytes)
**Purpose**: In-app notification management

**Methods**:
```javascript
createNotification(pnr, type, message, data) // Create notification
getNotifications(pnr)                        // Get all notifications
getUnreadCount(pnr)                          // Count unread
markAsRead(notificationId)                   // Mark as read
markAllAsRead(pnr)                           // Mark all as read
```

---

### Other Services

#### **PassengerService.js** (6,761 bytes)
**Purpose**: Passenger data operations

#### **QueueService.js** (1,264 bytes)
**Purpose**: Generic queue management

#### **SegmentService.js** (3,026 bytes)
**Purpose**: Segment-based berth operations

#### **StationEventService.js** (10,437 bytes)
**Purpose**: Station arrival/departure processing

#### **ValidationService.js** (4,629 bytes)
**Purpose**: Data validation

#### **VisualizationService.js** (4,781 bytes)
**Purpose**: Generate visualization data

#### **UpgradeNotificationService.js** (6,080 bytes)
**Purpose**: Upgrade offer tracking

---

## Models

### 1. **TrainState.js** (1,025 lines, 31,009 bytes)
**Purpose**: Core business logic model - manages entire train journey state

**Responsibilities**:
- Train initialization with coaches and berths
- Journey progression (start, station movement)
- Passenger boarding/deboarding
- Segment-based vacancy tracking
- No-show marking/reverting with collision detection
- Action history with undo support (3 action types)
- Statistics calculation

**Key Properties**:
```javascript
{
  trainNo: Number,
  trainName: String,
  journeyDate: String,
  currentStationIdx: Number,
  journeyStarted: Boolean,
  journeyComplete: Boolean,
  
  stations: Array,           // Station schedule
  coaches: Array,            // Coach objects with berths
  racQueue: Array,           // RAC passengers
  boardingQueue: Array,      // Boarding verification queue
  
  stats: {
    totalPassengers: Number,
    cnfPassengers: Number,
    racPassengers: Number,
    vacantBerths: Number,
    occupiedBerths: Number,
    noShowCount: Number
  },
  
  actionHistory: Array,      // For undo functionality
  allocationErrors: Array    // Diagnostic data
}
```

**Key Methods**:
```javascript
// Initialization
initializeCoaches(sleeperCount, threeAcCount)
getBerthType(seatNo, coachClass)

// Journey Management
startJourney()
getCurrentStation()
isJourneyComplete()

// Passenger Operations
findPassenger(pnr)
getAllPassengers()

// Berth Operations
findBerth(coachNo, seatNo)
getVacantBerths()
_findAllVacantRanges(berth)

// Boarding
prepareForBoardingVerification()
confirmAllBoarded()
markNoShowFromQueue(pnr)
markBoardedPassengerNoShow(pnr)
revertBoardedPassengerNoShow(pnr)

// Action History & Undo
recordAction(actionType, targetPNR, previousState, newState)
undoLastAction(actionId)
_undoNoShow(action)
_undoBoarding(action)
_undoRACUpgrade(action)
onStationChange()           // Disable undo for previous station actions
getActionHistory()

// Statistics
updateStats()
getVerificationStats()
```

**Action Types**:
1. `NO_SHOW` - Passenger marked as no-show
2. `BOARDING` - Passenger boarding confirmation
3. `RAC_UPGRADE` - RAC passenger upgraded to CNF

**Collision Detection**:
When reverting NO_SHOW, checks if berth has been reallocated to another passenger.

---

### 2. **Berth.js** (4,716 bytes)
**Purpose**: Individual berth with segment-based occupancy tracking

**Structure**:
```javascript
{
  coach: String,              // e.g., "S1", "S2"
  seatNo: Number,             // 1-72 (Sleeper) or 1-64 (3AC)
  type: String,               // Lower, Middle, Upper, Side Lower, Side Upper
  class: String,              // SL, 3A
  maxPassengers: Number,      // 1 or 2 (Side Lower only)
  
  passengers: Array,          // Current passengers on berth
  segmentOccupancy: Array,    // PNR per segment (or null)
  history: Array              // Allocation history
}
```

**Key Methods**:
```javascript
isAvailableForSegment(fromIdx, toIdx)  // Check if berth available
addPassenger(passengerData)            // Allocate passenger
removePassenger(pnr)                   // Deallocate passenger
getSegmentStatus()                     // Get occupancy per segment
```

---

### 3. **SegmentMatrix.js** (1,316 bytes)
**Purpose**: Track berth occupancy across journey segments

**Simple storage structure** for segment-based tracking.

---

## Routes

### API Routes (`routes/api.js` - 457 lines)

**Total Endpoints**: 50+ REST endpoints

**Categories**:

#### Authentication (5 endpoints)
```javascript
POST   /auth/register/passenger
POST   /auth/register/tte
POST   /auth/login
GET    /auth/verify              [AUTH]
POST   /auth/logout              [AUTH]
```

#### Train Management (7 endpoints)
```javascript
POST   /train/initialize
POST   /train/start-journey      [INITIALIZED]
GET    /train/state              [INITIALIZED]
POST   /train/next-station       [INITIALIZED, STARTED]
POST   /train/reset
GET    /train/stats              [INITIALIZED]
GET    /train/stations
```

#### TTE Operations (15 endpoints)
```javascript
// Passenger Management
GET    /tte/passengers           [AUTH, TTE/ADMIN, INITIALIZED, STARTED]
GET    /tte/boarded-passengers   [AUTH, TTE/ADMIN, INITIALIZED, STARTED]
GET    /tte/rac-passengers       [AUTH, TTE/ADMIN, INITIALIZED, STARTED]
POST   /tte/manual-board         [AUTH, TTE/ADMIN]
POST   /tte/manual-deboard       [AUTH, TTE/ADMIN]

// No-Show
POST   /tte/mark-no-show         [AUTH, TTE/ADMIN]
POST   /tte/revert-no-show       [AUTH, TTE/ADMIN]

// Boarding Verification
GET    /tte/boarding-queue       [AUTH, TTE/ADMIN, INITIALIZED]
POST   /tte/confirm-all-boarded  [AUTH, TTE/ADMIN]

// Upgrades
POST   /tte/confirm-upgrade      [AUTH, TTE/ADMIN]
GET    /tte/offline-upgrades     [AUTH, TTE/ADMIN]
POST   /tte/offline-upgrades/add [AUTH, TTE/ADMIN]
POST   /tte/offline-upgrades/confirm [AUTH, TTE/ADMIN]
POST   /tte/offline-upgrades/reject  [AUTH, TTE/ADMIN]
GET    /tte/sent-offers          [AUTH, TTE/ADMIN]

// Action History
GET    /tte/action-history       [AUTH, TTE/ADMIN]
POST   /tte/undo-action          [AUTH, TTE/ADMIN]

// Statistics
GET    /tte/statistics           [AUTH, TTE/ADMIN, INITIALIZED]
```

#### Passenger Operations (13 endpoints)
```javascript
// PNR & Profile
GET    /passenger/pnr/:pnr       [INITIALIZED, STARTED]
GET    /passenger/pnr-by-irctc/:irctcId [INITIALIZED, STARTED]
GET    /passenger/profile        [AUTH]

// Status Management
POST   /passenger/set-status     [INITIALIZED, STARTED]
POST   /passenger/revert-no-show [INITIALIZED, STARTED]

// Upgrade Offers
GET    /passenger/upgrade-notifications/:pnr [INITIALIZED, STARTED]
POST   /passenger/accept-upgrade [INITIALIZED, STARTED]
POST   /passenger/deny-upgrade   [INITIALIZED, STARTED]

// Notifications
GET    /passenger/notifications  [INITIALIZED, STARTED]
GET    /passenger/notifications/unread-count
POST   /passenger/notifications/:id/read
POST   /passenger/notifications/mark-all-read

// Push Notifications
POST   /passenger/push-subscribe
POST   /passenger/push-unsubscribe
GET    /push/vapid-public-key
```

#### Reallocation (6 endpoints)
```javascript
GET    /train/rac-queue          [INITIALIZED, STARTED]
GET    /train/vacant-berths      [INITIALIZED, STARTED]
GET    /passenger/search/:pnr    [INITIALIZED, STARTED]
GET    /reallocation/eligibility [INITIALIZED, STARTED]
GET    /reallocation/stage1      [INITIALIZED, STARTED]
POST   /reallocation/apply       [INITIALIZED, STARTED]
```

#### Passengers (3 endpoints)
```javascript
GET    /passengers/all           [INITIALIZED, STARTED]
GET    /passengers/status/:status [INITIALIZED, STARTED]
GET    /passengers/counts        [INITIALIZED, STARTED]
```

#### Visualization (6 endpoints)
```javascript
GET    /visualization/station-schedule
GET    /visualization/segment-matrix [INITIALIZED, STARTED]
GET    /visualization/graph      [INITIALIZED, STARTED]
GET    /visualization/heatmap    [INITIALIZED, STARTED]
GET    /visualization/berth-timeline/:coach/:berth [INITIALIZED, STARTED]
GET    /visualization/vacancy-matrix [INITIALIZED, STARTED]
```

#### Configuration (1 endpoint)
```javascript
POST   /config/setup
```

**Middleware Annotations**:
- `[AUTH]` - Requires JWT authentication
- `[TTE/ADMIN]` - Requires TTE or ADMIN role
- `[INITIALIZED]` - Requires train to be initialized
- `[STARTED]` - Requires journey to be started

---

## Middleware

### 1. **auth.js** (3,404 bytes)
**Purpose**: JWT authentication and authorization

**Exports**:
```javascript
authMiddleware(req, res, next)               // Verify JWT token
requireRole(roles)(req, res, next)           // Check user role
```

**Attaches to `req.user`**:
```javascript
{
  userId: String,
  role: 'PASSENGER' | 'TTE' | 'ADMIN',
  irctcId: String  // for passengers
}
```

---

### 2. **validation.js** (6,583 bytes)
**Purpose**: Request validation middleware

**Validators**:
```javascript
checkTrainInitialized(req, res, next)        // Verify train state exists
checkJourneyStarted(req, res, next)          // Verify journey started
validatePNR(req, res, next)                  // Validate PNR format
sanitizeBody(req, res, next)                 // Sanitize request body
```

---

### 3. **validate-request.js** (2,797 bytes)
**Purpose**: Joi schema-based request validation

**Methods**:
```javascript
validateBody(schema)(req, res, next)         // Validate req.body
validateParams(schema)(req, res, next)       // Validate req.params
validateQuery(schema)(req, res, next)        // Validate req.query
```

---

### 4. **validation-schemas.js** (4,299 bytes)
**Purpose**: Joi validation schemas

**Schemas**:
```javascript
trainInitSchema                              // Train initialization
passengerAddSchema                           // Add passenger
upgradeAcceptSchema                          // Accept upgrade
authLoginSchema                              // User login
authRegisterSchema                           // User registration
```

---

## Configuration

### 1. **db.js** (9,791 bytes)
**Purpose**: MongoDB connection manager with dual-database architecture

**Features**:
- Supports multiple databases (rac, PassengersDB)
- Dynamic collection switching per train
- Connection pooling
- Graceful shutdown

**Key Methods**:
```javascript
connect(config)                              // Connect to MongoDB
close()                                      // Close connections
switchTrain(trainNo, stationsCol, passengersCol) // Switch collections
getStationsCollection()                      // Get stations collection
getPassengersCollection()                    // Get passengers collection
getTrainDetailsCollection()                  // Get train metadata
getConfig()                                  // Get active config
```

**Configuration Structure**:
```javascript
{
  mongoUri: String,
  stationsDb: String,
  stationsCollection: String,
  passengersDb: String,
  passengersCollection: String,
  trainDetailsDb: String,
  trainDetailsCollection: String,
  trainNo: String
}
```

---

### 2. **websocket.js** (14,172 bytes)
**Purpose**: WebSocket server for real-time updates

**Events Emitted**:
```javascript
'TRAIN_UPDATE'          // Train state changed
'STATION_ARRIVAL'       // Arrived at station
'RAC_REALLOCATION'      // RAC passenger upgraded
'NO_SHOW'               // Passenger marked no-show
'STATS_UPDATE'          // Statistics updated
'UPGRADE_OFFER'         // Upgrade offer sent to passenger
```

**Methods**:
```javascript
initialize(httpServer)                       // Setup WebSocket server
broadcast(event, data)                       // Broadcast to all clients
sendToUser(userId, event, data)              // Send to specific user
getClientCount()                             // Get connected clients
closeAll()                                   // Close all connections
```

---

### 3. **swagger.js** (3,648 bytes)
**Purpose**: API documentation with Swagger/OpenAPI

**Generates**:
- Interactive API documentation at `/api-docs`
- OpenAPI 3.0 specification
- Try-it-out functionality

---

## Database Structure

### Collections

#### 1. **Stations Collection** (per train)
```javascript
{
  SNO: Number,                  // Serial number (1-based)
  Station_Code: String,         // e.g., "GNT", "BZA"
  Station_Name: String,
  Arrival_Time: String,
  Departure_Time: String,
  Distance: Number,             // km from origin
  Day: Number,
  Halt_Duration: String,
  Railway_Zone: String,
  Division: String,
  Platform_Number: String,
  Remarks: String
}
```

#### 2. **Passengers Collection** (per train + date)
```javascript
{
  PNR_Number: String,           // Primary identifier
  IRCTC_ID: String,             // For authentication
  Name: String,
  Age: Number,
  Gender: String,
  Train_Number: String,
  Journey_Date: String,         // DD-MM-YYYY
  Boarding_Station: String,
  Deboarding_Station: String,
  Assigned_Coach: String,
  Assigned_berth: Number,
  Berth_Type: String,
  Class: String,
  PNR_Status: String,           // CNF, RAC, WL
  Rac_status: String,           // RAC number (e.g., "1", "2")
  Passenger_Status: String,     // Online, Offline
  NO_show: Boolean
}
```

#### 3. **Train_Details Collection**
```javascript
{
  Train_No: Number,
  Train_Name: String,
  Sleeper_Coaches_Count: Number,
  Three_TierAC_Coaches_Count: Number,
  Station_Collection_Name: String,
  Stations_Db: String,
  Passengers_Collection: String,
  Passengers_Db: String
}
```

#### 4. **Users Collection**
```javascript
{
  irctcId: String,              // Unique identifier
  email: String,
  password: String,             // Bcrypt hashed
  role: String,                 // PASSENGER, TTE, ADMIN
  name: String,
  createdAt: Date
}
```

#### 5. **PushSubscriptions Collection**
```javascript
{
  pnr: String,
  endpoint: String,
  keys: {
    p256dh: String,
    auth: String
  },
  subscribedAt: Date
}
```

#### 6. **InAppNotifications Collection**
```javascript
{
  pnr: String,
  type: String,                 // UPGRADE_OFFER, NO_SHOW, BOARDING, etc.
  message: String,
  data: Object,
  read: Boolean,
  createdAt: Date
}
```

---

## WebSocket Integration

### Connection Flow
1. Client connects to `ws://localhost:5000`
2. Server assigns unique client ID
3. Client subscribes to specific events
4. Server broadcasts relevant updates

### Event Examples

#### TRAIN_UPDATE
```javascript
{
  type: 'TRAIN_UPDATE',
  data: {
    currentStation: 'Guntur Junction',
    currentStationIdx: 2,
    stats: {
      totalPassengers: 150,
      cnfPassengers: 120,
      racPassengers: 30,
      vacantBerths: 5
    }
  }
}
```

#### UPGRADE_OFFER
```javascript
{
  type: 'UPGRADE_OFFER',
  data: {
    pnr: 'PNR123456',
    berth: 'S1-12',
    berthType: 'Lower',
    offerId: 'offer-uuid',
    expiresAt: '2025-12-02T23:00:00Z'
  }
}
```

#### NO_SHOW
```javascript
{
  type: 'NO_SHOW',
  data: {
    pnr: 'PNR789012',
    berth: 'S2-45',
    vacancyCreated: true
  }
}
```

---

## Summary

The RAC Reallocation System backend is a **well-architected, feature-rich** application with:

✅ **Comprehensive API**: 50+ endpoints with role-based access  
✅ **Real-time Updates**: WebSocket integration for live data  
✅ **Advanced Reallocation**: Two-stage eligibility with 11 rules  
✅ **Robust State Management**: TrainState model with undo support  
✅ **Multi-channel Notifications**: Email, SMS, Push, In-app  
✅ **Scalable Architecture**: Service layer pattern with specialized services  
✅ **Security**: JWT authentication, bcrypt hashing, input validation  
✅ **Maintainability**: Clear separation of concerns, comprehensive documentation

**Total Lines of Code**: ~15,000+ lines across all backend files  
**Architecture Grade**: A (Excellent design and implementation)
