# Multi-Train Support — Phase 3 Implementation Plan

## Overview

This document outlines the complete plan for implementing multi-train support in the RAC Reallocation System. The system will allow administrators to manage multiple trains simultaneously from a single admin portal, with each train having its own passengers, stations, and TTEs.

---

## Design Principles

### 1. Convention Over Configuration
- **Auto-derived naming**: Train `17225` → `rac.17225_stations` + `PassengersDB.17225_passengers`
- **No manual collection input** (except ConfigPage as manual override)
- **TTE IDs embedded with train number**: `17225_TTE001`, `12345_TTE002`

### 2. Single Page Application (SPA)
- All navigation within one admin portal window
- React Router for seamless transitions
- No new browser tabs/windows

### 3. Singleton DB Model (Phase 3)
- One train active at a time in admin portal
- DB switches collections when navigating between trains
- Multi-tab support deferred to future phase

---

## Database Architecture

```
MongoDB:
├── rac (DB)
│   ├── Trains_Details              ← Registry of all trains
│   ├── tte_users                   ← All TTEs (trainAssigned field)
│   ├── passenger_accounts          ← Passenger logins
│   ├── 17225_stations              ← Stations for train 17225
│   ├── 12345_stations              ← Stations for train 12345
│   └── station_reallocations       ← Pending upgrades
│
└── PassengersDB (DB)
    ├── 17225_passengers            ← Passengers for train 17225
    ├── 12345_passengers            ← Passengers for train 12345
    └── P_1                         ← Legacy/default collection
```

### Naming Conventions

| Component | Format | Example | Storage |
|---|---|---|---|
| Stations | `{trainNo}_stations` | `17225_stations` | `rac` DB |
| Passengers | `{trainNo}_passengers` | `17225_passengers` | `PassengersDB` |
| TTE ID | `{trainNo}_TTE{seq}` | `17225_TTE001` | `rac.tte_users` |

---

## Implementation Changes

### Backend (4 new endpoints + 1 modification)

#### 1. Register Train
```javascript
POST /api/trains/register
Body: { trainNo: "17225", trainName: "Godavari Express" }

Flow:
  1. Validate trainNo format
  2. Check rac.{trainNo}_stations exists
  3. Check PassengersDB.{trainNo}_passengers exists
  4. Insert into Trains_Details:
     {
       trainNo: "17225",
       trainName: "Godavari Express",
       status: "registered",
       createdAt: Date,
       stationsDb: "rac",
       stationsCollection: "17225_stations",
       passengersDb: "PassengersDB",
       passengersCollection: "17225_passengers"
     }
  5. Return success
```

#### 2. List Trains
```javascript
GET /api/trains/list

Response:
  [
    { trainNo: "17225", trainName: "Godavari Express", status: "running" },
    { trainNo: "12345", trainName: "Rajdhani Express", status: "ready" },
    ...
  ]
```

#### 3. Get Train Config
```javascript
GET /api/trains/:trainNo/config

Response:
  {
    mongoUri: "mongodb://localhost:27017",
    stationsDb: "rac",
    stationsCollection: "17225_stations",
    passengersDb: "PassengersDB",
    passengersCollection: "17225_passengers",
    trainNo: "17225",
    trainName: "Amaravathi Express"
  }
```

#### 4. TTE Registration (Modified)
```javascript
POST /api/auth/staff/register
Body: { trainNo: "17225", name: "Ravi Kumar", role: "TTE" }

Flow:
  1. Validate trainNo exists in Trains_Details
  2. Count existing TTEs for this train
  3. Auto-generate employeeId: "{trainNo}_TTE{count+1}"
     Example: "17225_TTE001"
  4. Hash default password "Prasanth@123"
  5. Insert into rac.tte_users:
     {
       employeeId: "17225_TTE001",
       name: "Ravi Kumar",
       role: "TTE",
       trainAssigned: "17225",
       passwordHash: "...",
       permissions: ["MARK_BOARDING", "MARK_NO_SHOW", "VIEW_PASSENGERS"]
     }
```

---

### Frontend (Admin Portal)

#### New Routes Structure
```javascript
/ → LandingPage (train cards grid)
/train/:trainNo → HomePage (auto-configured for that train)
/config → ConfigPage (manual override option)
/passengers → PassengersPage
/coaches → CoachesPage
...
```

#### Landing Page Components

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  🚂 RAC Reallocation System — Admin Control     │
│                                                  │
│  ════════════ ACTIONS ═══════════════           │
│  [🚂 Add Train] [👤 Sign Up TTE] [📊 Stats]     │
│                                                  │
│  ════════════ YOUR TRAINS ══════════════         │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 🚂 12345 │ │ 🚂 12951 │ │ 🚂 22691 │        │
│  │ Rajdhani │ │ Mumbai R │ │ Duronto  │        │
│  │ 🟢 Running│ │ 🟡 Ready │ │ 🟢 Running│        │
│  │ Stn: 4/10│ │ Stn: 0/12│ │ Stn: 7/8 │        │
│  │ [Open ↗] │ │ [Open ↗] │ │ [Open ↗] │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                                  │
│  ┌──────────┐ ┌──────────┐                      │
│  │ 🚂 12301 │ │ 🚂 20501 │                      │
│  │ Howrah R │ │ Tejas Exp│                      │
│  │ ⚪ NotInit│ │ ✅ Complete│                      │
│  │ Stn: —   │ │ Stn: 6/6 │                      │
│  │ [Open ↗] │ │ [Open ↗] │                      │
│  └──────────┘ └──────────┘                      │
└─────────────────────────────────────────────────┘
```

**Status Indicators:**
- 🟢 Running: Journey started, actively processing stations
- 🟡 Ready: Initialized but not started
- ⚪ Not Init: Registered but not initialized
- ✅ Complete: Journey completed

**Add Train Modal:**
```javascript
Train Number: [_______]
Train Name:   [_______]
[Cancel] [Add Train]
```

**Sign Up TTE Modal:**
```javascript
Select Train: [▼ 17225 - Godavari Express]
TTE Name:     [_______________________]
[Cancel] [Sign Up TTE]

Note: Password will be set to "Prasanth@123"
      TTE ID will be auto-generated
```

---

### TTE Portal

#### Login Form (Modified)
```javascript
TTE ID:       [17225_TTE001]
Password:     [••••••••••••]
Train Number: [17225]
[Login]
```

**Validation:**
- TTE ID must start with entered train number
- Backend verifies `trainAssigned` field matches

---

## Complete User Flows

### Flow 1: Admin Adds a New Train

```
1. Admin lands on LandingPage (/)
2. Clicks [Add Train]
3. Modal opens
4. Enters: trainNo="17225", trainName="Godavari Express"
5. Clicks [Add Train]
   → POST /api/trains/register
   → Backend validates collections exist
   → Saves to Trains_Details
6. Modal closes
7. New train card appears in grid with status "⚪ Not Init"
```

### Flow 2: Admin Creates a TTE

```
1. On LandingPage, clicks [Sign Up TTE]
2. Modal opens with dropdown of registered trains
3. Selects: Train="17225 - Godavari Express"
4. Enters: name="Ravi Kumar"
5. Clicks [Sign Up TTE]
   → POST /api/auth/staff/register { trainNo: "17225", name: "Ravi Kumar" }
   → Auto-generates ID: "17225_TTE001"
   → Saves with hashed password "Prasanth@123"
6. Success message shows: "TTE 17225_TTE001 created"
```

### Flow 3: Admin Opens a Train

```
1. On LandingPage, clicks [Open ↗] on train "17225"
2. React Router navigates to /train/17225 (same window)
3. useEffect in HomePage:
   a. GET /api/trains/17225/config
   b. POST /api/config/setup with auto-config
   c. db.js switches to 17225_stations + 17225_passengers
4. HomePage loads showing:
   - Train stats
   - Station progress
   - Initialize/Start Journey buttons
   - Passenger list (from 17225_passengers)
5. Admin can navigate back to "/" to see landing page
```

### Flow 4: TTE Logs In

```
1. TTE opens TTE portal
2. Enters:
   - TTE ID: 17225_TTE001
   - Password: Prasanth@123
   - Train Number: 17225
3. Backend validates:
   - tte_users.employeeId === "17225_TTE001"
   - employeeId.startsWith("17225_")
   - trainAssigned === "17225"
4. JWT token issued with trainAssigned: "17225"
5. TTE dashboard loads for train 17225
```

---

## File Changes Summary

### Backend Files

| File | Change | Description |
|---|---|---|
| `routes/api.js` | Add routes | `/api/trains/register`, `/api/trains/list`, `/api/trains/:trainNo/config` |
| `controllers/configController.js` | Add methods | `registerTrain()`, `listTrains()`, `getTrainConfig()` |
| `controllers/authController.js` | Modify | `staffRegister()` - auto-generate TTE ID, validate trainNo |

### Frontend Files (Admin)

| File | Change | Description |
|---|---|---|
| `src/pages/LandingPage.tsx` | NEW | Train cards grid, Add Train, Sign Up TTE |
| `src/styles/pages/LandingPage.css` | NEW | Styling for landing page |
| `src/App.tsx` | Modify | Add routes: `/` → Landing, `/train/:trainNo` → HomePage |
| `src/services/apiWithErrorHandling.ts` | Add APIs | `registerTrain()`, `listTrains()`, `getTrainConfig()` |

### Frontend Files (TTE Portal)

| File | Change | Description |
|---|---|---|
| `src/pages/LoginPage.tsx` | Modify | Add "Train Number" field to login form |

---

## Key Technical Details

### Auto-Configuration Logic
When navigating to `/train/17225`:
```javascript
useEffect(() => {
  const trainNo = params.trainNo;
  
  // 1. Fetch auto-config
  const config = await api.getTrainConfig(trainNo);
  
  // 2. Apply config to backend
  await api.setupConfig(config);
  
  // 3. Load train state
  await loadTrainState();
}, [params.trainNo]);
```

### TTE ID Generation
```javascript
async function generateTteId(trainNo) {
  const tteUsers = await db.collection('tte_users');
  const count = await tteUsers.countDocuments({ 
    employeeId: { $regex: `^${trainNo}_TTE` } 
  });
  return `${trainNo}_TTE${String(count + 1).padStart(3, '0')}`;
}
// Examples: 17225_TTE001, 17225_TTE002
```

### Collection Validation
```javascript
async function validateTrainCollections(trainNo) {
  const racDb = client.db('rac');
  const passengersDb = client.db('PassengersDB');
  
  const stationsExists = await racDb
    .listCollections({ name: `${trainNo}_stations` })
    .hasNext();
    
  const passengersExists = await passengersDb
    .listCollections({ name: `${trainNo}_passengers` })
    .hasNext();
    
  return stationsExists && passengersExists;
}
```

---

## Testing Checklist

- [ ] Register train 17225 from landing page
- [ ] Verify train card appears with "Not Init" status
- [ ] Create TTE "17225_TTE001" 
- [ ] Verify TTE saved with correct fields
- [ ] Click [Open] on train 17225
- [ ] Verify navigation to /train/17225
- [ ] Verify HomePage loads with 17225 data
- [ ] Click Initialize → verify TrainState created
- [ ] Navigate back to "/" → verify landing page shows
- [ ] TTE login with 17225_TTE001 → verify access
- [ ] Register second train 12345
- [ ] Navigate between trains → verify DB switches
- [ ] Verify ConfigPage still accessible at /config

---

## Future Enhancements (Post-Phase 3)

1. **Multi-tab support**: Per-request collection resolution instead of singleton
2. **Train simulation**: Auto-progress through stations for demos
3. **Train deletion/archival**: Remove completed trains
4. **TTE management**: Edit/delete TTEs, password reset
5. **Real-time train status**: WebSocket updates for train cards
6. **Search/filter**: Filter trains by status, search by number/name

---

## Migration Notes

### For Existing Installations
1. Current `P_1` and `17225_stations` collections remain unchanged
2. No data migration needed
3. ConfigPage continues to work for manual setup
4. New trains must follow naming convention

### Default Train (17225)
- Already has `17225_stations` in `rac`
- Passengers in `17225_passengers` (or `P_1` as alias)
- Can be registered immediately via landing page

---

## Success Criteria

✅ Admin can register multiple trains from landing page  
✅ Admin can create TTEs with auto-generated IDs  
✅ Admin can navigate between trains seamlessly  
✅ Each train loads with correct passengers/stations  
✅ TTE login restricted to assigned train  
✅ ConfigPage available as manual override  
✅ No new browser tabs required  
✅ All flows work in single admin portal window  

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-15  
**Phase**: 3 (Multi-Train Support)
