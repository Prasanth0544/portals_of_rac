# Complete System Analysis - RAC Reallocation System v3.0

## 📋 Executive Summary

This document provides a comprehensive analysis of the **RAC (Reservation Against Cancellation) Reallocation System**, a production-ready MERN stack application that simulates and manages railway seat allocation with real-time updates.

**Version:** 3.0.0  
**Status:** ✅ PRODUCTION READY  
**Release Date:** November 9, 2025  
**Architecture:** MERN Stack (MongoDB, Express.js, React, Node.js)

---

## 🎯 System Purpose

The RAC Reallocation System solves a complex real-world problem in Indian Railway booking:

### **The Problem:**
- Trains have limited confirmed (CNF) seats
- Excess demand leads to RAC (Reservation Against Cancellation) - waiting list
- When passengers cancel or don't show up, berths become vacant
- RAC passengers should be automatically upgraded to vacant berths
- This must happen dynamically throughout the journey

### **The Solution:**
This system provides:
1. **Segment-based berth tracking** - Track occupancy for each journey segment
2. **Automatic RAC upgrades** - Priority-based allocation to vacant berths
3. **Real-time updates** - WebSocket broadcasting of all changes
4. **Journey simulation** - Station-by-station progression
5. **Dynamic configuration** - Support any train/database without code changes
6. **Visual management** - Interactive UI for monitoring and control

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Home   │  │ Coaches  │  │Passengers│  │   RAC    │   │
│  │   Page   │  │   Page   │  │   Page   │  │  Queue   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │   API Service        │  │   WebSocket Service       │   │
│  │   (Axios)            │  │   (Real-time updates)     │   │
│  └──────────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/WS
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   API Routes                          │  │
│  │  /train  /passenger  /reallocation  /visualization   │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↕                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Train   │  │Passenger │  │Realloc   │  │  Visual  │  │
│  │Controller│  │Controller│  │Controller│  │Controller│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                            ↕                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Data   │  │  Station │  │Realloc   │  │Validation│  │
│  │ Service  │  │  Event   │  │ Service  │  │ Service  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                            ↕                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Core Models                         │  │
│  │      TrainState   |   Berth   |   SegmentMatrix      │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↕                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Database Layer (db.js)                   │  │
│  │         Dynamic MongoDB Connection Manager            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      MongoDB Database                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Stations   │  │  Passengers  │  │Train_Details │     │
│  │  Collection  │  │  Collection  │  │  Collection  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Core Concepts

### 1. **Segment-Based Occupancy**

This is the **most critical concept** in the system.

#### **Traditional Problem:**
- Passenger A travels from Station 1 to Station 5
- They occupy a berth for their entire journey
- When they deboard at Station 5, the berth becomes vacant
- But how do we know the berth is vacant for Station 5→6→7?

#### **Segment-Based Solution:**
```
Journey: A → B → C → D → E (4 segments)
Segments: 0:A→B, 1:B→C, 2:C→D, 3:D→E

Berth S1-15:
  segmentOccupancy[0] = "PNR001" (Passenger1: A→C)
  segmentOccupancy[1] = "PNR001" (Passenger1: A→C)
  segmentOccupancy[2] = "PNR002" (Passenger2: C→E)
  segmentOccupancy[3] = "PNR002" (Passenger2: C→E)

Availability Check:
  - For journey B→D: Check segments [1,2]
  - Segment 1: Occupied by PNR001 ❌
  - Result: NOT AVAILABLE

  - For journey D→E: Check segment [3]
  - Segment 3: Occupied by PNR002 ❌
  - Result: NOT AVAILABLE
```

#### **Implementation:**
```javascript
// Berth.js
class Berth {
  constructor(coachNo, berthNo, type, totalSegments) {
    this.segmentOccupancy = new Array(totalSegments).fill(null);
    // null = vacant, PNR = occupied
  }

  isAvailableForSegment(fromIdx, toIdx) {
    for (let i = fromIdx; i < toIdx; i++) {
      if (this.segmentOccupancy[i] !== null) {
        return false; // Occupied by someone
      }
    }
    return true; // All segments vacant
  }
}
```

---

### 2. **RAC Queue & Priority Allocation**

#### **RAC Status Examples:**
- `RAC 1` - Highest priority
- `RAC 2` - Second priority
- `RAC 15` - 15th in queue

#### **Allocation Algorithm:**
```
When berth becomes vacant:

1. Sort RAC queue by priority (RAC 1, RAC 2, RAC 3...)
2. For each RAC passenger:
   - Check if passenger's class matches berth class (SL/3A)
   - Check if berth is available for passenger's journey segments
   - If YES:
     * Remove passenger from RAC queue
     * Upgrade status: RAC → CNF
     * Assign to berth
     * Mark segments as occupied
     * Broadcast upgrade event
     * STOP (one passenger per berth)
```

#### **Example:**
```
Vacant Berth: S2-10 (Sleeper class)
Available segments: [5, 6, 7, 8] (Station F→J)

RAC Queue:
  1. RAC 1: Class=3A, Journey: A→D ❌ (wrong class)
  2. RAC 2: Class=SL, Journey: A→E ❌ (needs segments 0-4, not available)
  3. RAC 3: Class=SL, Journey: F→H ✅ (needs segments 5-7, available!)
     → Upgrade RAC 3 to CNF
     → Assign to S2-10
     → Mark segments [5,6,7] as occupied
```

---

### 3. **Dynamic Configuration (v3.0)**

#### **The Problem:**
- Different trains use different MongoDB collections
- Hardcoded names = inflexible, requires code changes
- Testing different trains = edit code, restart server

#### **The Solution:**
```javascript
// Global configuration object
global.RAC_CONFIG = {
  mongoUri: 'mongodb://localhost:27017',
  stationsDb: 'rac',                    // Any database name
  passengersDb: 'rac',                  // Can be same or different
  stationsCollection: '17225',          // Any collection name
  passengersCollection: 'train_17225_passengers',
  trainNo: '17225',
  trainName: 'Amaravathi Express',
  journeyDate: '2025-11-15'
}

// Database layer uses this config
await db.connect(global.RAC_CONFIG);
```

#### **Multiple Configuration Methods:**
1. **Interactive CLI** (Default)
   ```bash
   npm start
   # Answer prompts interactively
   ```

2. **Environment Variables**
   ```env
   MONGODB_URI=mongodb://localhost:27017
   STATIONS_DB=rac
   STATIONS_COLLECTION=17225
   ```

3. **Frontend Configuration UI**
   ```javascript
   POST /api/config/setup
   {
     mongoUri: "mongodb://localhost:27017",
     stationsDb: "rac",
     ...
   }
   ```

---

### 4. **Station Event Processing**

This is the **heart of the journey simulation**.

#### **Event Flow at Each Station:**
```
Train arrives at Station X (currentStationIdx = X)

┌─────────────────────────────────────────┐
│ 1. DEBOARD PASSENGERS                   │
│    - Find passengers where toIdx = X    │
│    - Remove from berth                  │
│    - Clear segment occupancy            │
│    - Increment totalDeboarded           │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 2. PROCESS NO-SHOWS                     │
│    - Find passengers where:             │
│      * fromIdx <= X                     │
│      * noShow = true                    │
│      * boarded = false                  │
│    - Remove from berth                  │
│    - Clear segment occupancy            │
│    - Increment totalNoShows             │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 3. FIND VACANT BERTHS                   │
│    - Check each berth's segment:        │
│      segmentOccupancy[X] === null       │
│    - Collect all vacant berths          │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 4. ALLOCATE RAC PASSENGERS              │
│    - For each vacant berth:             │
│      * Find eligible RAC (priority)     │
│      * Check class match                │
│      * Check segment availability       │
│      * Upgrade RAC → CNF                │
│      * Assign to berth                  │
│    - Increment totalRACUpgraded         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 5. BOARD NEW PASSENGERS                 │
│    - Find passengers where fromIdx = X  │
│    - Mark boarded = true                │
│    - Increment totalBoarded             │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 6. UPDATE STATISTICS                    │
│    - Count vacant berths at station X   │
│    - Count currently onboard            │
│    - Calculate RAC queue size           │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 7. BROADCAST UPDATES                    │
│    - WebSocket: STATION_ARRIVAL         │
│    - WebSocket: RAC_REALLOCATION        │
│    - WebSocket: STATS_UPDATE            │
└─────────────────────────────────────────┘
```

---

## 📊 Data Models

### **TrainState** (Complete Train State)
```javascript
{
  trainNo: "17225",
  trainName: "Amaravathi Express",
  journeyDate: "2025-11-15",
  currentStationIdx: 0,
  journeyStarted: false,
  
  stations: [
    {
      idx: 0,
      code: "NS",
      name: "Narasapur",
      arrival: "00:00",
      departure: "18:00",
      distance: 0
    },
    // ... more stations
  ],
  
  coaches: [
    {
      coachNo: "S1",
      class: "SL",
      capacity: 72,
      berths: [
        // Berth objects
      ]
    },
    // ... 9 coaches total
  ],
  
  racQueue: [
    {
      pnr: "1234567890",
      name: "John Doe",
      racNumber: 1,
      from: "NS",
      to: "HBD",
      fromIdx: 0,
      toIdx: 5
    },
    // ... more RAC passengers
  ],
  
  stats: {
    totalPassengers: 1395,
    currentOnboard: 352,
    cnfPassengers: 1334,
    racPassengers: 61,
    vacantBerths: 296,
    totalDeboarded: 120,
    totalNoShows: 11,
    totalRACUpgraded: 51
  },
  
  eventLogs: [
    {
      timestamp: "2025-11-15T10:30:00Z",
      station: "Narasapur",
      type: "JOURNEY_STARTED",
      message: "Journey started..."
    },
    // ... more events
  ]
}
```

### **Berth** (Individual Berth)
```javascript
{
  coachNo: "S1",
  berthNo: 15,
  fullBerthNo: "S1-15",
  type: "Lower Berth",
  status: "OCCUPIED", // VACANT, OCCUPIED, SHARED
  
  totalSegments: 10,
  segmentOccupancy: [
    "PNR001", // Segment 0: A→B
    "PNR001", // Segment 1: B→C
    "PNR001", // Segment 2: C→D
    null,     // Segment 3: D→E (vacant)
    null,     // Segment 4: E→F (vacant)
    "PNR002", // Segment 5: F→G
    "PNR002", // Segment 6: G→H
    // ... more segments
  ],
  
  passengers: [
    {
      pnr: "PNR001",
      name: "John Doe",
      fromIdx: 0,
      toIdx: 3,
      boarded: true,
      noShow: false
    },
    {
      pnr: "PNR002",
      name: "Jane Smith",
      fromIdx: 5,
      toIdx: 7,
      boarded: false,
      noShow: false
    }
  ]
}
```

### **SegmentMatrix** (Journey Segments)
```javascript
{
  stations: [...],
  segments: [
    {
      id: 0,
      from: "NS",
      to: "BVM",
      fromIdx: 0,
      toIdx: 1,
      name: "NS→BVM"
    },
    {
      id: 1,
      from: "BVM",
      to: "KVR",
      fromIdx: 1,
      toIdx: 2,
      name: "BVM→KVR"
    },
    // ... all segments
  ]
}
```

---

## 🔄 Complete Data Flow

### **1. System Initialization**
```
User runs: npm start
     ↓
Interactive CLI prompts for configuration
     ↓
Validate MongoDB connection
     ↓
Store config in global.RAC_CONFIG
     ↓
Start Express server
     ↓
Initialize WebSocket server
     ↓
System ready at http://localhost:5000
```

### **2. Train Initialization**
```
Frontend: POST /api/train/initialize
  {
    trainNo: "17225",
    journeyDate: "2025-11-15"
  }
     ↓
trainController.initializeTrain()
     ↓
DataService.loadTrainData()
     ↓
Load stations from MongoDB
  SELECT * FROM stations_collection ORDER BY SNO
     ↓
Create TrainState object
     ↓
Initialize 9 coaches × 72 berths = 648 berths
  Create segmentOccupancy arrays
     ↓
Load passengers from MongoDB
  SELECT * FROM passengers_collection 
  WHERE train_no = "17225" AND journey_date = "2025-11-15"
     ↓
Allocate passengers to berths
  For each passenger:
    - Find berth by coach + seat_no
    - Add passenger to berth
    - Mark segments as occupied
     ↓
Build RAC queue
  Filter passengers where pnr_status LIKE "RAC%"
  Sort by RAC number (RAC 1, RAC 2, ...)
     ↓
Calculate initial statistics
     ↓
Broadcast: TRAIN_UPDATE (TRAIN_INITIALIZED)
     ↓
Return train state to frontend
```

### **3. Journey Start**
```
Frontend: POST /api/train/start-journey
     ↓
trainController.startJourney()
     ↓
trainState.startJourney()
     ↓
Board all passengers at origin (idx = 0)
  For each berth:
    For each passenger:
      If fromIdx === 0 && !boarded && !noShow:
        passenger.boarded = true
        boardedCount++
     ↓
Update statistics
  Count currently onboard
  Count vacant berths at station 0
     ↓
Broadcast: TRAIN_UPDATE (JOURNEY_STARTED)
     ↓
Frontend updates UI
  - Enable "Next Station" button
  - Show onboard count
  - Show vacant berths
```

### **4. Move to Next Station**
```
Frontend: POST /api/train/next-station
     ↓
trainController.moveToNextStation()
     ↓
StationEventService.processStationArrival()
     ↓
┌─── DEBOARD ───────────────────────────┐
│ For each coach:                       │
│   For each berth:                     │
│     passengers = berth.passengers     │
│       .filter(p => p.toIdx === currentIdx) │
│     For each passenger:               │
│       berth.removePassenger(p.pnr)    │
│       Clear segmentOccupancy          │
│       deboardedCount++                │
└───────────────────────────────────────┘
     ↓
┌─── PROCESS NO-SHOWS ──────────────────┐
│ For each coach:                       │
│   For each berth:                     │
│     passengers = berth.passengers     │
│       .filter(p =>                    │
│         p.fromIdx <= currentIdx &&    │
│         p.noShow &&                   │
│         !p.boarded)                   │
│     For each passenger:               │
│       berth.removePassenger(p.pnr)    │
│       noShowCount++                   │
└───────────────────────────────────────┘
     ↓
┌─── FIND VACANCIES ────────────────────┐
│ vacantBerths = []                     │
│ For each coach:                       │
│   For each berth:                     │
│     if segmentOccupancy[currentIdx] === null: │
│       vacantBerths.push(berth)        │
└───────────────────────────────────────┘
     ↓
┌─── ALLOCATE RAC ──────────────────────┐
│ For each vacantBerth:                 │
│   Find first eligible RAC passenger:  │
│     - Same class (SL/3A)              │
│     - Berth available for segments    │
│   If found:                           │
│     Remove from old berth             │
│     Add to new berth as CNF           │
│     Remove from RAC queue             │
│     racAllocated++                    │
└───────────────────────────────────────┘
     ↓
┌─── BOARD NEW ─────────────────────────┐
│ For each coach:                       │
│   For each berth:                     │
│     passengers = berth.passengers     │
│       .filter(p => p.fromIdx === currentIdx) │
│     For each passenger:               │
│       passenger.boarded = true        │
│       boardedCount++                  │
└───────────────────────────────────────┘
     ↓
Update statistics
     ↓
trainState.currentStationIdx++
     ↓
Broadcast: STATION_ARRIVAL
  {
    station: "Station Name",
    deboarded: 15,
    noShows: 2,
    racAllocated: 8,
    boarded: 5,
    stats: {...}
  }
     ↓
Broadcast: RAC_REALLOCATION (if any)
     ↓
Broadcast: STATS_UPDATE
     ↓
Frontend updates all pages in real-time
```

### **5. Mark No-Show**
```
Frontend: POST /api/passenger/no-show { pnr: "1234567890" }
     ↓
reallocationController.markPassengerNoShow()
     ↓
ReallocationService.markNoShow()
     ↓
Find passenger by PNR
  trainState.findPassenger(pnr)
     ↓
Validate passenger can be marked no-show
  - Not already boarded
  - Not already marked no-show
     ↓
Mark passenger.noShow = true
     ↓
Clear segment occupancy
  For i from fromIdx to toIdx:
    segmentOccupancy[i] = null
     ↓
Update MongoDB
  UPDATE passengers_collection
  SET no_show = true
  WHERE pnr = "1234567890"
     ↓
Update berth status
     ↓
Broadcast: NO_SHOW
  {
    passenger: {
      pnr: "1234567890",
      name: "John Doe"
    }
  }
     ↓
Frontend shows notification
```

---

## 🎨 Frontend Architecture

### **Page Structure**

#### **HomePage.jsx**
- **Purpose:** Main dashboard and control center
- **Features:**
  - Real-time statistics display
  - Journey controls (Start, Next Station, Reset)
  - Quick actions (Mark no-show, view RAC queue)
  - Station progress indicator
  - Navigation to other pages

#### **ConfigPage.jsx**
- **Purpose:** Dynamic system configuration
- **Features:**
  - Configure MongoDB connection
  - Select database and collections
  - Set train number and journey date
  - Validate configuration
  - Save and apply settings

#### **CoachesPage.jsx**
- **Purpose:** Visual berth layout
- **Features:**
  - 9 coaches × 72 berths grid
  - Color-coded berth status:
    - 🟢 Green = Vacant
    - 🔴 Red = Occupied
    - 🟡 Yellow = Shared
  - Click berth to view passenger details
  - Filter by coach
  - Segment-based vacancy display

#### **PassengersPage.jsx**
- **Purpose:** Complete passenger list
- **Features:**
  - Paginated table view
  - Search by PNR, name
  - Filter by status (CNF, RAC, Boarded)
  - Sort by any column
  - View passenger journey details
  - Navigation to add passenger

#### **RACQueuePage.jsx**
- **Purpose:** RAC waiting list
- **Features:**
  - Priority-ordered queue (RAC 1, RAC 2, ...)
  - Passenger details display
  - Journey segment information
  - Real-time queue updates
  - Upgrade history

#### **AddPassengerPage.jsx**
- **Purpose:** Add new bookings
- **Features:**
  - Form with all passenger fields
  - Auto-fill train details from state
  - Coach and berth selection
  - Journey segment selection
  - PNR status (CNF/RAC) selection
  - Form validation
  - Real-time berth availability check

#### **ReallocationPage.jsx**
- **Purpose:** Manual RAC allocation
- **Features:**
  - Eligibility matrix display
  - Vacant berth list
  - Eligible RAC passengers per berth
  - Manual allocation controls
  - Apply reallocations in batch
  - Undo functionality

#### **VisualizationPage.jsx**
- **Purpose:** Data visualization
- **Features:**
  - Segment occupancy matrix
  - Heatmap of berth usage
  - Berth timeline graphs
  - Station-wise statistics
  - Vacancy patterns
  - RAC upgrade trends

### **Component Hierarchy**
```
App.jsx
├── ConfigPage
├── HomePage
│   ├── TrainVisualization
│   ├── StationProgress
│   └── PassengerList (preview)
├── CoachesPage
│   └── BerthGrid (inline)
├── PassengersPage
│   └── PassengerList
├── RACQueuePage
│   └── RACQueue
├── AddPassengerPage
│   └── PassengerForm (inline)
├── ReallocationPage
│   └── EligibilityMatrix (inline)
└── VisualizationPage
    ├── SegmentMatrix
    ├── Heatmap
    └── Timeline graphs
```

---

## 🔌 API Endpoints

### **Configuration**
```
POST   /api/config/setup
       Setup dynamic configuration
       Body: { mongoUri, stationsDb, passengersDb, ... }
```

### **Train Management**
```
GET    /api/trains
       List all available trains from Train_Details

POST   /api/train/initialize
       Initialize train with data
       Body: { trainNo, journeyDate, trainName }

POST   /api/train/start-journey
       Start the journey (board origin passengers)

GET    /api/train/state
       Get complete train state

POST   /api/train/next-station
       Move to next station (process events)

POST   /api/train/reset
       Reset train to initial state

GET    /api/train/stats
       Get current statistics
```

### **Reallocation**
```
POST   /api/passenger/no-show
       Mark passenger as no-show
       Body: { pnr }

GET    /api/train/rac-queue
       Get RAC queue (priority ordered)

GET    /api/train/vacant-berths
       Get all vacant berths

GET    /api/passenger/search/:pnr
       Search passenger by PNR

GET    /api/reallocation/eligibility
       Get eligibility matrix (vacant berths × eligible RAC)

POST   /api/reallocation/apply
       Apply manual reallocation
       Body: { allocations: [{ berth, coach, pnr }] }
```

### **Passengers**
```
GET    /api/passengers/all
       Get all passengers (paginated)

GET    /api/passengers/status/:status
       Get passengers by status (CNF/RAC/WL)

GET    /api/passengers/counts
       Get passenger count by status

POST   /api/passengers/add
       Add new passenger
       Body: { passenger data }
```

### **Visualization**
```
GET    /api/visualization/station-schedule
       Get station schedule

GET    /api/visualization/segment-matrix
       Get segment occupancy matrix

GET    /api/visualization/graph
       Get graph data for charts

GET    /api/visualization/heatmap
       Get occupancy heatmap data

GET    /api/visualization/berth-timeline/:coach/:berth
       Get berth occupancy timeline

GET    /api/visualization/vacancy-matrix
       Get vacancy patterns
```

---

## 📡 WebSocket Events

### **Client → Server**
```javascript
// Subscribe to updates
{ type: 'SUBSCRIBE' }

// Unsubscribe
{ type: 'UNSUBSCRIBE' }

// Keep-alive ping
{ type: 'PING' }
```

### **Server → Client**
```javascript
// Connection established
{
  type: 'CONNECTION_SUCCESS',
  clientId: 'client_123456',
  timestamp: '2025-11-15T10:00:00Z'
}

// Train state update
{
  type: 'TRAIN_UPDATE',
  eventType: 'TRAIN_INITIALIZED' | 'JOURNEY_STARTED' | 'TRAIN_RESET',
  data: { ... },
  timestamp: '...'
}

// Station arrival processed
{
  type: 'STATION_ARRIVAL',
  data: {
    station: 'Narasapur',
    stationCode: 'NS',
    deboarded: 15,
    noShows: 2,
    racAllocated: 8,
    boarded: 5,
    stats: { ... }
  },
  timestamp: '...'
}

// RAC reallocation occurred
{
  type: 'RAC_REALLOCATION',
  data: {
    totalAllocated: 8,
    allocations: [
      { pnr, name, berth, previousStatus: 'RAC 1', newStatus: 'CNF' }
    ]
  },
  timestamp: '...'
}

// Passenger marked no-show
{
  type: 'NO_SHOW',
  data: {
    passenger: { pnr, name, berth }
  },
  timestamp: '...'
}

// Statistics updated
{
  type: 'STATS_UPDATE',
  data: {
    stats: { currentOnboard, vacantBerths, ... }
  },
  timestamp: '...'
}

// Keep-alive response
{ type: 'PONG', timestamp: '...' }
```

---

## 🗄️ Database Schema

### **Stations Collection** (e.g., `17225`, `12345`)
```javascript
{
  _id: ObjectId("..."),
  SNO: 1,                        // Station sequence number (1-based)
  Station_Code: "NS",            // Short code
  Station_Name: "Narasapur",     // Full name
  Arrival