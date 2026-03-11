# v2 Backend Architecture — RailwayData as Primary Database

## Architecture Shift

```
v1 (OLD):                          v2 (NEW):
┌─────────────┐                    ┌────────────────────────┐
│   rac DB    │ → manual config    │    RailwayData DB      │ → everything
│  PassengersDB│ → live data       │    PassengersData DB   │ → live passenger data
└─────────────┘                    └────────────────────────┘
  3 hardcoded trains                 12,813 trains auto-available
  manual station seeding             9,956 stations pre-loaded
  no coach position data             12,444 coach layouts ready
```

---

## RailwayData Collections → Backend Requirements

### 1. `train_info` (12,813) — **Replaces `rac.Trains_Details`**

The v1 backend used `rac.Trains_Details` where trains were manually added one by one. In v2, `train_info` IS the trains catalog — all 12,813 trains are instantly available.

| RailwayData Field | Backend Use | Replaces (v1) |
|---|---|---|
| `train_number` | Train identifier | `Trains_Details.Train_No` |
| `train_name` | Display name | `Trains_Details.Train_Name` |
| `train_type` | MEX/RAJ/SF — filter, pricing | — (didn't exist) |
| `train_category` | MAIL_EXPRESS/SUPERFAST | — |
| `src_station_code` | Journey origin | — |
| `src_station_name` | Origin display | — |
| `dest_station_code` | Journey destination | — |
| `dest_station_name` | Destination display | — |
| `departure_time` | Schedule | — |
| `arrival_time` | Schedule | — |
| `duration` | Journey length | — |
| `distance_km` | Route distance | — |
| `total_stops` | Number of halts | `Trains_Details.totalStations` |
| `running_days` | `"1111100"` — which days it runs | — |
| `running_days_text` | `"Mon-Fri"` human readable | — |
| `classes` | Bitmask of available classes | — |
| `ac_type` | AC/NON_AC | — |
| `speed_type` | S/M/R speed category | — |
| `num_cars` | Total coaches | `Trains_Details.Sleeper_Coaches_Count + 3AC_Count` |
| `gauge` | BG/MG/NG | — |
| `city` | Origin city | — |

**What `train_info` replaces:**
- ❌ No more `rac.Trains_Details` collection
- ❌ No more manual train registration via admin
- ✅ Admin just selects from 12,813 pre-loaded trains(through search)
- ✅ Running days validation (does train run on selected date?)

**What `train_info` DOESN'T have (need to add at runtime):**
- `status`: NOT_INIT / RUNNING / COMPLETED — add as runtime field or separate collection
- `currentStation` / `currentStationIdx` — runtime tracking
- `journeyDate` — per-journey
- `stationsCollection` / `passengersCollection` — per-journey dynamic names

**→ New approach:** Add a `active_journeys` collection in `RailwayData`:
```javascript
{
    train_number: "17225",        // links to train_info
    journey_date: "10-03-2026",
    status: "RUNNING",
    current_station_idx: 5,
    current_station: "GNT",
    passengers_collection: "17225_20260310_passengers",  // in PassengersData DB
    started_at: ISODate,
    tte_assigned: "EMP001"
}
```

---

### 2. `coach_positions` (12,444) — **Auto Coach Counts**

v1 required manually entering `Sleeper_Coaches_Count` and `Three_TierAC_Coaches_Count`. Now we READ them directly.

| RailwayData Field | Backend Use |
|---|---|
| `train_number` | Links to `train_info` |
| `coaches` | Array: `["L","SLR","S1","S2"..."B1","SLR"]` — exact coach order |
| `total_coaches` | Total count |
| `rake_type` | "ICF Rake" / "LHB Rake" — berth layout differs |
| `reversal_stations` | Where coach order reverses (important for platform display) |
| `has_layout` | Whether detailed layout is available |

**Backend mapping:**
```javascript
// OLD (v1): Manual input
TrainState.initializeCoaches(sleeperCount=9, threeAcCount=0)

// NEW (v2): Auto from coach_positions
const cp = await db.collection('coach_positions').findOne({ train_number: "17225" });
const sleeperCount = cp.coaches.filter(c => c.match(/^S\d/)).length;
const ac3Count = cp.coaches.filter(c => c.match(/^B\d/)).length;
const ac2Count = cp.coaches.filter(c => c.match(/^A\d/)).length;
TrainState.initializeCoaches(sleeperCount, ac3Count, ac2Count);
```

---

### 3. `station_info` (9,956) — **Station Search & Details**

| RailwayData Field | Backend Use |
|---|---|
| `station_code` | Primary key — links to everything |
| `title` | Display name ("New Delhi") |
| `lat`, `lng` | Map views, distance calculation, live tracking |
| `city` | City filter |
| `pop` | Search ranking (popular stations first) |
| `title_soundex` | Fuzzy search / autocomplete |
| `place_id` | Google Places integration |

**→ Powers:** Station search autocomplete on admin landing page, station details in passenger view, map-based tracking.

---

### 4. `station_zones` (10,760) — **Zone/Division Info**

| RailwayData Field | Backend Use |
|---|---|
| `station_code` | Links to `station_info` |
| `station_name` | Alternative name source |
| `zone` / `zone_name` | NR → "Northern Railway" — display, filtering |
| `zone_mapping_name` | Division-level grouping |

**→ Powers:** Zone-based filtering, TTE zone assignments, regional analytics.

---

### 5. `ticket_classes` (63) — **Class Validation**

| RailwayData Field | Backend Use |
|---|---|
| `code` | L, SLR, S1, 1A, 2A, 3A, SL, CC... |
| `name` | "First AC", "Sleeper" |
| `category` | "Engine", "AC", "Non-AC" |
| `is_bookable` | Can passengers book this class? |
| `is_base_class` | Is this a primary class? |

**→ Powers:** Coach validation, class-based upgrade logic (SL→3AC→2AC), display labels.

---

### 6. `station_aka_info` (775) — **Station Aliases**

| Field | Use |
|---|---|
| `station_code` | Links to station_info |
| `title` | Alternative name (e.g., LTT = "Lokmanya Tilak Terminus") |

**→ Powers:** Better search — user types "LTT" or "Lokmanya", both work.

---

### 7. `platform_direction` (351) — **Platform Info**

| Field | Use |
|---|---|
| `station_code` | Links to station_info |
| `platform_number` | Which platform |
| `direction` | Up/Down/Both |

**→ Powers:** Passenger notification: "Your train arrives on Platform 3".

---

### 8-10. Pricing Tables (92 total)

`catering_charges` (34) + `convenience_fees` (31) + `service_tax` (27)

| Field | Use |
|---|---|
| `train_type` + `class_code` | Lookup key |
| `charge` | Amount in INR |

**→ Not needed now** (user confirmed no fare calculation). Keep for future.

---

### 11-16. Schedule Collections (63K+ records)

Metro/local train data. **Separate system**, doesn't affect the mainline RAC backend.

---

## New Collections to Add in RailwayData

These replace what was in `rac` DB:

| New Collection | Replaces (v1) | Purpose |
|---|---|---|
| `active_journeys` | `rac.Trains_Details` | Runtime state per active train journey |
| `tte_users` | `rac.tte_users` | TTE authentication (move as-is) |
| `passenger_accounts` | `rac.passenger_accounts` | Passenger auth (move as-is) |
| `refresh_tokens` | `rac.refresh_tokens` | JWT tokens (move as-is) |
| `otp_store` | `rac.otp_store` | OTP verification (move as-is) |
| `push_subscriptions` | `rac.push_subscriptions` | Web push (move as-is) |
| `upgrade_notifications` | `rac.upgrade_notifications` | Upgrade tracking (move as-is) |
| `in_app_notifications` | `rac.in_app_notifications` | In-app alerts (move as-is) |
| `station_reallocations` | `PassengersDB.station_reallocations` | Pending upgrades (move as-is) |
| `journey_history` | — (new) | Per-journey completion stats |
| `upgrade_history` | — (new) | Upgrade audit trail |
| `analytics` | — (new) | Performance metrics |
| `system_config` | — (new) | Global settings |

---

## Backend Layer Mapping

### Controllers

| Controller | v1 (rac DB) | v2 (RailwayData) |
|---|---|---|
| `configController` | Reads `rac.Trains_Details` | Reads `train_info` + `coach_positions` + `active_journeys` |
| `trainController` | Reads `rac.Trains_Details` | Reads `train_info` → auto-creates `active_journeys` entry |
| `passengerController` | Reads `PassengersDB.{train}_passengers` | Reads `PassengersData.{train}_passengers` (same pattern) |
| `authController` | Reads `rac.tte_users` | Reads `RailwayData.tte_users` |
| `tteController` | Reads `rac.Trains_Details` | Reads `train_info` + `active_journeys` |
| **NEW: `searchController`** | — | Reads `train_info` + `station_info` for admin search |
| `reallocationController` | Same | Same (uses in-memory TrainState) |

### Services

| Service | Change Needed |
|---|---|
| `DataService.loadTrainData()` | Read from `train_info` + `coach_positions` instead of `Trains_Details` |
| `DataService.loadStations()` | **Can auto-generate** from `train_info.total_stops` + erail route data |
| `DataService.loadPassengers()` | Same — reads from `PassengersData` |
| `CacheService` | Update DB references |
| `RefreshTokenService` | Point to `RailwayData.refresh_tokens` |
| `OTPService` | Point to `RailwayData.otp_store` |
| **NEW: `RailwayDataService`** | Train search, station search, auto coach counts |
| **NEW: `JourneyHistoryService`** | Record completed journeys |
| **NEW: `UpgradeHistoryService`** | Record upgrades |

### Models

| Model | Change Needed |
|---|---|
| `TrainState.js` | `initializeCoaches()` reads from `coach_positions` automatically |
| `Berth.js` | No change needed |
| `SegmentMatrix.js` | No change needed |
| `Passenger.ts` | Add `Original_Class`, `Concession_Type` fields |
| **NEW: `ActiveJourney.js`** | Schema for `active_journeys` collection |

### Config

| Config File | Change Needed |
|---|---|
| `db.js` | Remove `rac` DB, add all collections from `RailwayData` |
| `collections.js` | Update all collection names, add new ones |
| `fields.js` | Already updated (Train_Number, Assigned_Berth) |

### Middleware & WebSocket

| Component | Change Needed |
|---|---|
| `websocket.js` | Update DB references only |
| Auth middleware | Point to `RailwayData.tte_users` / `passenger_accounts` |
| CSRF middleware | No change |

---

## How Train Initialization Changes

```
v1 (OLD):
  1. Admin manually creates train in Trains_Details
  2. Admin manually seeds station collection
  3. Admin manually seeds passenger collection
  4. Backend reads from manual data

v2 (NEW):
  1. Admin searches train on landing page → train_info
  2. Admin selects train + sets journey date
  3. Backend auto-reads coach_positions → coach counts
  4. Backend creates active_journeys entry
  5. Passengers are loaded (from PNR data or manual entry)
  6. TrainState initializes from RailwayData automatically
```

---

## Database Connection (v2)

```javascript
// backend/config/db.js (v2)
class Database {
    constructor() {
        this.railwayDataDb = null;    // RailwayData (primary)
        this.passengersDataDb = null;  // PassengersData (per-train live)
    }

    async connect() {
        const client = new MongoClient(mongoUri);
        await client.connect();
        
        this.railwayDataDb = client.db("RailwayData");
        this.passengersDataDb = client.db("PassengersData");
    }

    // Reference collections (read-only)
    getTrainInfo()        → railwayDataDb.collection("train_info")
    getStationInfo()      → railwayDataDb.collection("station_info")
    getStationZones()     → railwayDataDb.collection("station_zones")
    getCoachPositions()   → railwayDataDb.collection("coach_positions")
    getTicketClasses()    → railwayDataDb.collection("ticket_classes")
    
    // Auth collections
    getTTEUsers()         → railwayDataDb.collection("tte_users")
    getPassengerAccounts()→ railwayDataDb.collection("passenger_accounts")
    getRefreshTokens()    → railwayDataDb.collection("refresh_tokens")
    getOTPStore()         → railwayDataDb.collection("otp_store")
    
    // Runtime collections
    getActiveJourneys()   → railwayDataDb.collection("active_journeys")
    getJourneyHistory()   → railwayDataDb.collection("journey_history")
    getUpgradeHistory()   → railwayDataDb.collection("upgrade_history")
    getAnalytics()        → railwayDataDb.collection("analytics")
    getSystemConfig()     → railwayDataDb.collection("system_config")
    
    // Per-train collections (PassengersData)
    getPassengersCollection(name) → passengersDataDb.collection(name)
}
```
