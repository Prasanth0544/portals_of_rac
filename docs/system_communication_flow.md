# System Communication Flow - RAC Reallocation System
**Last Updated**: 2025-12-02  
**Version**: 3.0.0

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Server Components](#server-components)
3. [Communication Patterns](#communication-patterns)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [API Communication](#api-communication)
6. [WebSocket Real-time Updates](#websocket-real-time-updates)
7. [Complete Workflows](#complete-workflows)

---

## Architecture Overview

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACES                          │
├───────────────────┬─────────────────┬───────────────────────────┤
│  Frontend/Admin   │   TTE Portal    │   Passenger Portal        │
│  (React + CRA)    │ (React + Vite)  │   (React + Vite)         │
│  Port: 3000       │  Port: 5173     │   Port: 5174             │
└─────────┬─────────┴────────┬────────┴──────────┬───────────────┘
          │ HTTP/REST        │ HTTP/REST          │ HTTP/REST
          │                  │                    │
          └──────────────────┼────────────────────┘
                             │
                             ▼
          ┌──────────────────────────────────────┐
          │        Backend Server (Node.js)      │
          │        Express + WebSocket           │
          │            Port: 5000                │
          ├──────────────────────────────────────┤
          │  • REST API (50+ endpoints)          │
          │  • WebSocket Server (real-time)      │
          │  • JWT Authentication                │
          │  • Multi-channel Notifications       │
          └─────────┬────────────────────┬───────┘
                    │                    │
        ┌───────────┴─────────┐      ┌───┴──────────────┐
        │   MongoDB (rac)     │      │ External Services│
        │   • users           │      │ • Nodemailer     │
        │   • Train_Details   │      │ • Twilio         │
        │   • pushSubscriptions│     │ • Web Push       │
        └─────────────────────┘      └──────────────────┘
        
        ┌──────────────────────┐
        │ MongoDB (PassengersDB)│
        │ • Stations_12715     │
        │ • Passengers_12715   │
        └──────────────────────┘
```

---

## Server Components

### 1. Backend Server (Node.js)
**Port**: 5000  
**Responsibilities**:
- REST API endpoint handling
- WebSocket server for real-time updates
- Database operations (MongoDB)
- Business logic execution
- Multi-channel notification dispatch
- JWT authentication
- Session management

### 2. Frontend/Admin Portal (React)
**Port**: 3000  
**Build**: Create React App  
**Responsibilities**:
- Admin configuration
- Train initialization
- Full passenger management
- Reallocation matrix view
- System configuration

### 3. TTE Portal (React + Vite)
**Port**: 5173  
**Build**: Vite  
**Responsibilities**:
- Passenger boarding verification
- No-show management
- Offline upgrade confirmation
- Action history with undo
- Real-time statistics

### 4. Passenger Portal (React + Vite)
**Port**: 5174  
**Build**: Vite  
**Responsibilities**:
- Journey tracking
- Digital boarding pass
- Upgrade offer acceptance
- Push notification subscription
- Self-service no-show revert

---

## Communication Patterns

### Pattern 1: HTTP REST API
**Direction**: Frontend ←→ Backend

**Characteristics**:
- Synchronous request-response
- JSON data format
- JWT token authentication
- CORS enabled for multiple origins

**Example Flow**:
```
[Frontend] → HTTP POST /api/tte/mark-no-show
              Headers: { Authorization: Bearer <token> }
              Body: { pnr: "PNR123456" }
              
[Backend]  → Validates JWT
          → Processes no-show
          → Updates database
          → Triggers reallocation
          → Broadcasts WebSocket event
          
[Frontend] ← HTTP 200 OK
              Body: { success: true, message: "...", data: {...} }
```

### Pattern 2: WebSocket (Bidirectional)
**Direction**: Backend ←→ All Clients

**Characteristics**:
- Real-time, event-driven
- Persistent connection
- Broadcast to all or specific users
- Automatic reconnection

**Event Types**:
```javascript
// Server → Clients
'TRAIN_UPDATE'       // Journey state changed
'STATION_ARRIVAL'    // Arrived at station
'RAC_REALLOCATION'   // RAC passenger upgraded
'NO_SHOW'            // Passenger marked no-show
'STATS_UPDATE'       // Statistics refreshed
'UPGRADE_OFFER'      // Upgrade sent to passenger
```

### Pattern 3: Browser Push Notifications
**Direction**: Backend → Browser → User

**Characteristics**:
- Uses Web Push API
- VAPID authentication
- Works even when tab closed
- Requires user permission

**Flow**:
```
1. User subscribes in Passenger Portal
2. Service worker registered
3. Push subscription sent to backend
4. Backend stores subscription
5. On event (e.g., upgrade offer):
   → Backend → Push Service → Browser → User notification
```

### Pattern 4: Multi-channel Notifications
**Direction**: Backend → External Services → User

**Channels**:
- **Email** (Nodemailer) - Critical updates
- **SMS** (Twilio) - High-priority alerts
- **Push** (Web Push) - Real-time offers
- **In-app** (Database) - Notification center

---

## Data Flow Diagrams

### Flow 1: Train Initialization

```
[Admin Portal]
     │ 1. Navigate to Config Page
     │ 2. Select Train 12715
     │ 3. Set Journey Date
     │ 4. Click "Initialize"
     ▼
[HTTP POST /api/config/setup]
     ▼
[Backend]
  ┌──┴─────────────────────────┐
  │ 1. Validate input          │
  │ 2. Connect to MongoDB      │
  │ 3. Load Train_Details      │
  │ 4. Load stations from      │
  │    All_Stations_12715      │
  │ 5. Load passengers from    │
  │    Passengers_12715        │
  │ 6. Initialize TrainState   │
  │ 7. Assign berths           │
  │ 8. Build RAC queue         │
  │ 9. Store in global state   │
  └──┬─────────────────────────┘
     ▼
[MongoDB: rac & PassengersDB]
     ▼
[Response]
     ▼
[Admin Portal]
     │ Shows success message
     │ Enables "Start Journey"
```

### Flow 2: No-Show Mark & Reallocation (Complete Chain)

```
[TTE Portal]
     │ 1. Navigate to Boarding Verification
     │ 2. Find passenger not boarded
     │ 3. Click "Mark No-Show"
     ▼
[HTTP POST /api/tte/mark-no-show]
     │ Body: { pnr: "PNR123456" }
     ▼
[Backend: TTEController.markNoShow]
  ┌──┴──────────────────────────────────────┐
  │ 1. Validate JWT (TTE role)              │
  │ 2. Find passenger in TrainState          │
  │ 3. Check if already no-show              │
  │ 4. Check berth collision                 │
  └──┬──────────────────────────────────────┘
     ▼
[Backend: TrainState.markBoardedPassengerNoShow]
  ┌──┴──────────────────────────────────────┐
  │ 1. Set passenger.noShow = true           │
  │ 2. Remove from berth.passengers          │
  │ 3. Clear segmentOccupancy                │
  │ 4. Update stats                          │
  │ 5. Record action in history              │
  └──┬──────────────────────────────────────┘
     ▼
[Backend: ReallocationService.processVacancyForUpgrade]
  ┌──┴──────────────────────────────────────┐
  │ 1. Get vacant berth details              │
  │ 2. Find eligible RAC passengers          │
  │    (Stage 1 + Stage 2 checks)            │
  │ 3. Sort by RAC number (priority)         │
  │ 4. Get top candidate                     │
  └──┬──────────────────────────────────────┘
     ▼
[Check: Is passenger ONLINE?]
     │                              │
     │ YES                          │ NO
     ▼                              ▼
[Send Upgrade Offer]        [Add to Offline Queue]
     │                              │
     ├─→ [Push Notification]        └─→ [OfflineUpgradesPage]
     ├─→ [In-app Notification]           (TTE manually confirms)
     └─→ [WebSocket Event]
         
[WebSocket Broadcast: 'NO_SHOW']
     ├─→ [TTE Portal]     → Refresh stats
     ├─→ [Admin Portal]   → Refresh passenger list
     └─→ [Passenger Portal (PNR123456)] → Show NO_SHOW status
     
[Response to TTE Portal]
     └─→ Success + updated train state
```

### Flow 3: Passenger Accepts Upgrade

```
[Passenger Portal]
     │ 1. Login with IRCTC ID
     │ 2. See Upgrade Offer notification
     │ 3. Navigate to "Upgrade Offers"
     │ 4. Review berth: S1-12, Lower
     │ 5. Click "Accept Upgrade"
     ▼
[HTTP POST /api/passenger/accept-upgrade]
     │ Body: { pnr: "PNR789", offerId: "...", berth: {...} }
     ▼
[Backend: PassengerController.acceptUpgrade]
  ┌──┴──────────────────────────────────────┐
  │ 1. Validate passenger & offer            │
  │ 2. Check offer not expired               │
  │ 3. Verify berth still vacant             │
  └──┬──────────────────────────────────────┘
     ▼
[Backend: ReallocationService.applyReallocation]
  ┌──┴──────────────────────────────────────┐
  │ 1. Upgrade RAC → CNF                     │
  │ 2. Allocate new berth                    │
  │ 3. Update segmentOccupancy               │
  │ 4. Remove from RAC queue                 │
  │ 5. Handle co-passenger (if exists)       │
  │ 6. Record action                         │
  │ 7. Update offer status                   │
  └──┬──────────────────────────────────────┘
     ▼
[Notification Dispatch]
     ├─→ Email: "Upgrade Confirmed"
     ├─→ SMS: "Berth S1-12 allocated"
     └─→ Push: "Congratulations!"
     
[WebSocket Broadcast: 'RAC_REALLOCATION']
     ├─→ [TTE Portal]       → Update passenger list
     ├─→ [Admin Portal]     → Update stats
     └─→ [Passenger Portal] → Update boarding pass
     
[Response]
     └─→ Success + new passenger data
```

### Flow 4: Action Undo

```
[TTE Portal]
     │ 1. Navigate to Action History
     │ 2. Find action: "NO_SHOW_MARKED (PNR123)"
     │ 3. Click "Undo"
     ▼
[HTTP POST /api/tte/undo-action]
     │ Body: { actionId: "action-uuid" }
     ▼
[Backend: TTEController.undoAction]
  ┌──┴──────────────────────────────────────┐
  │ 1. Validate action exists                │
  │ 2. Check action.canUndo === true         │
  │ 3. Verify is from current station        │
  └──┬──────────────────────────────────────┘
     ▼
[Backend: TrainState.undoLastAction]
  ┌──┴──────────────────────────────────────┐
  │ 1. Get action type                       │
  │ 2. Switch on type:                       │
  │    case NO_SHOW:                         │
  │      → _undoNoShow()                     │
  │        • Check berth collision           │
  │        • Restore passenger to berth      │
  │        • Set noShow = false              │
  │    case RAC_UPGRADE:                     │
  │      → _undoRACUpgrade()                 │
  │        • Revert CNF → RAC                │
  │        • Deallocate berth                │
  │    case BOARDING:                        │
  │      → _undoBoarding()                   │
  │        • Set boarded = false             │
  │ 3. Mark action as undone                 │
  │ 4. Update stats                          │
  └──┬──────────────────────────────────────┘
     ▼
[WebSocket Broadcast: 'TRAIN_UPDATE']
     └─→ All portals refresh
     
[Response]
     └─→ Success + updated state
```

---

## API Communication

### Request/Response Structure

#### Standard Request
```http
POST /api/tte/mark-no-show HTTP/1.1
Host: localhost:5000
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "pnr": "PNR123456"
}
```

#### Standard Response (Success)
```json
{
  "success": true,
  "message": "Passenger marked as NO_SHOW and vacancy processed",
  "data": {
    "passenger": {...},
    "vacancyCreated": true,
    "upgradeOffersCount": 1
  }
}
```

#### Standard Response (Error)
```json
{
  "success": false,
  "error": "Passenger not found",
  "code": "NOT_FOUND"
}
```

### Authentication Flow

```
[Client] 
   ↓ 1. POST /api/auth/login
     Body: { irctcId: "...", password: "..." }
   
[Backend]
   ↓ 2. Validate credentials (bcrypt)
   ↓ 3. Generate JWT token
   
[Client]
   ← 4. Receive: { token: "...", user: {...} }
   ↓ 5. Store in localStorage
   
[Subsequent Requests]
   → Headers: { Authorization: "Bearer <token>" }
   
[Backend Middleware]
   ↓ 1. Extract token
   ↓ 2. Verify JWT
   ↓ 3. Decode payload: { userId, role, irctcId }
   ↓ 4. Attach to req.user
   ↓ 5. Check role (if requireRole middleware)
   ↓ 6. Continue to controller
```

---

## WebSocket Real-time Updates

### Connection Lifecycle

```
[Client]
   ↓ 1. Connect: new WebSocket('ws://localhost:5000')
   
[Backend WebSocket Manager]
   ↓ 2. Accept connection
   ↓ 3. Assign client ID
   ↓ 4. Add to clients Map
   
[Client]
   ↓ 5. Listen to events: ws.onmessage
   
[Backend: Event Triggers]
   ↓ When train state changes:
     → wsManager.broadcast(eventType, data)
   
[All Connected Clients]
   ← Receive event
   ↓ Update UI accordingly
   
[Client Disconnect]
   ↓ ws.close()
   
[Backend]
   ↓ Remove from clients Map
```

### Event Examples

#### TRAIN_UPDATE
```javascript
{
  type: 'TRAIN_UPDATE',
  data: {
    trainNo: "12715",
    currentStation: "Guntur Junction",
    currentStationIdx: 2,
    nextStation: "Vijayawada Junction",
    journeyStarted: true,
    stats: {
      totalPassengers: 150,
      cnfPassengers: 120,
      racPassengers: 30,
      boardedCount: 145,
      noShowCount: 5,
      vacantBerths: 8
    }
  }
}
```

#### UPGRADE_OFFER
```javascript
{
  type: 'UPGRADE_OFFER',
  targetPNR: 'PNR789012',  // Send to specific passenger
  data: {
    offerId: 'offer-uuid-123',
    berth: 'S1-12',
    berthType: 'Lower',
    coach: 'S1',
    expiresAt: '2025-12-02T23:00:00Z',
    message: 'You have a new upgrade offer!'
  }
}
```

---

## Complete Workflows

### Workflow 1: System Startup to First No-Show

```
STEP 1: SYSTEM STARTUP
├─ [Admin] Start backend: npm start (Port 5000)
├─ [Admin] Start TTE portal: npm run dev (Port 5173)
├─ [Admin] Start Passenger portal: npm run dev (Port 5174)
└─ [Backend] Connects to MongoDB

STEP 2: TRAIN INITIALIZATION
├─ [Admin Portal] Configure & Initialize Train 12715
├─ [Backend] Loads stations (15 stations)
├─ [Backend] Loads passengers (150 passengers)
├─ [Backend] Allocates 120 CNF berths
├─ [Backend] Builds RAC queue (30 passengers)
└─ [WebSocket] Broadcast: TRAIN_UPDATE

STEP 3: START JOURNEY
├─ [Admin/TTE Portal] Click "Start Journey"
├─ [Backend] Set journeyStarted = true
├─ [Backend] currentStationIdx = 0
├─ [Backend] Prepare boarding verification queue
└─ [WebSocket] Broadcast: STATION_ARRIVAL

STEP 4: BOARDING VERIFICATION
├─ [TTE Portal] View boarding queue
├─ [TTE] Verifies passengers physically
├─ [TTE] Clicks "Confirm All Boarded" (145 board)
├─ [Backend] Sets boarded = true for all
└─ [TTE] Marks 5 passengers as NO_SHOW

STEP 5: NO-SHOW PROCESSING (First One)
├─ [TTE] Marks PNR123456 as NO_SHOW
├─ [Backend] NoShowService.markPassengerNoShow()
│   ├─ Checks berth collision
│   ├─ Sets noShow = true
│   ├─ Clears berth S2-45
│   └─ Records action in history
├─ [Backend] VacancyService identifies segment
│   └─ Berth S2-45, Lower, vacant from GNT to final
├─ [Backend] EligibilityService.getStage1Eligible()
│   ├─ Finds 10 RAC passengers
│   ├─ Applies Stage 1 rules
│   └─ 6 passengers pass
├─ [Backend] EligibilityService.getStage2Results()
│   ├─ Applies Stage 2 rules
│   ├─ Online: 2 passengers
│   ├─ Offline: 4 passengers
│   └─ Top candidate: RAC 1 (online)
├─ [Backend] NotificationService.sendUpgradeOffer()
│   ├─ Creates in-app notification
│   ├─ Sends push notification
│   ├─ Sends email
│   └─ Sends SMS
└─ [WebSocket] Broadcast: NO_SHOW + UPGRADE_OFFER

STEP 6: PASSENGER RESPONSE
├─ [Passenger] Receives push notification
├─ [Passenger] Opens Passenger Portal
├─ [Passenger] Logs in with PNR (RAC 1)
├─ [Passenger] Sees upgrade offer
├─ [Passenger] Clicks "Accept Upgrade"
├─ [Backend] AllocationService.allocateBerth()
│   ├─ Changes status RAC → CNF
│   ├─ Assigns berth S2-45
│   ├─ Updates segment occupancy
│   └─ Removes from RAC queue
├─ [Backend] Updates upgrade offer status
└─ [Backend] Sends confirmation notifications

STEP 7: SYSTEM UPDATE
├─ [WebSocket] Broadcast: RAC_REALLOCATION
├─ [TTE Portal] Refreshes passenger list
│   └─ Shows passenger now CNF, S2-45
├─ [Passenger Portal] Updates boarding pass
│   └─ Shows new berth with QR code
└─ [Admin Portal] Updates statistics
    ├─ CNF: 121 (was 120)
    ├─ RAC: 29 (was 30)
    └─ Vacant: 7 (was 8)
```

---

## Database Interaction Flow

```
[Backend Controllers]
        ↓
[Services Layer]
        ↓
[TrainState (In-Memory)]
        ↑↓ Load    ↑↓ Store
[MongoDB: rac DB]   [MongoDB: PassengersDB]
   ├─ users                ├─ All_Stations_12715
   ├─ Train_Details        └─ Passengers_12715
   ├─ pushSubscriptions
   └─ inAppNotifications
```

**Data Flow**:
1. **Load**: MongoDB → TrainState (at initialization)
2. **Process**: All operations in TrainState (in-memory)
3. **Persist**: Critical updates → MongoDB (users, notifications, subscriptions)
4. **Note**: TrainState is NOT persisted (ephemeral for journey duration)

---

## Summary Table

| Component | Port | Protocol | Direction | Purpose |
|-----------|------|----------|-----------|---------|
| Backend | 5000 | HTTP/WS | Server | API + Real-time |
| Frontend/Admin | 3000 | HTTP | Client | Admin ops |
| TTE Portal | 5173 | HTTP/WS | Client | TTE ops |
| Passenger Portal | 5174 | HTTP/WS/Push | Client | Self-service |
| MongoDB (rac) | 27017 | MongoDB | Server | Auth + Metadata |
| MongoDB (PassengersDB) | 27017 | MongoDB | Server | Journey data |
| Email | SMTP | SMTP | External | Notifications |
| SMS | HTTPS | HTTPS | External | Notifications |
| Web Push | HTTPS | HTTPS | External | Notifications |

---

## Performance & Scalability

### Current Architecture
- **In-Memory State**: Fast but not horizontally scalable
- **WebSocket**: Single server, broadcast to all
- **MongoDB**: Can scale with clustering

### Scalability Recommendations
1. Move TrainState to Redis for distributed access
2. Use Socket.io with Redis adapter for multi-server WebSocket
3. Implement message queues (RabbitMQ/Kafka) for notifications
4. Add load balancer for backend servers
5. Implement caching (Redis) for frequent queries

---

**System Communication Flow Complete! 🚂**
