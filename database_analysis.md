# RailwayData Database — Analysis & Backend Readiness Report

> **Last Updated:** March 10, 2026 | **Database:** MongoDB `RailwayData` | **28 Collections**

---

## Database Overview

| Category | Collections | Records |
|---|---|---|
| 🚂 Train Data | `train_info`, `coach_positions` | **25,257** |
| 🏛️ Station Data | `station_info`, `station_zones`, `station_aka_info`, `platform_direction` | **21,841** |
| 🗓️ Schedule (Metro/Local) | `schedule_trips`, `schedule_stop_times`, `schedule_stations`, etc. | **63,637** |
| 💰 Pricing & Classes | `catering_charges`, `convenience_fees`, `service_tax`, `ticket_classes` | **155** |
| 👤 User/Runtime | `passenger_details`, `pnr_status`, `chat_history`, etc. | **0** (schemas ready) |

---

## Core Collections (Data-Filled)

### 1. `train_info` — 12,813 trains ⭐

**The central table.** Every Indian railway train. All other train data links here via `train_no`.

| Field | Fill % | Purpose |
|---|---|---|
| `train_no` | 100% | **Primary Key** — links to `coach_positions` |
| `train_name`, `train_type` | 100% | Identity (MEX, RAJ, SF, etc.) |
| `src/dest_station_code/name` | 96.3% | Origin/destination — links to station tables |
| `departure/arrival_time` | 96.3% | Schedule |
| `running_days` / `running_days_text` | 96.3% | `"1111100"` / `"Mon Tue Wed Thu Fri"` |
| `distance_km`, `duration`, `total_stops` | 96.3% | Route metrics |
| `classes` | 94.8% | Bitmask of available classes |
| `ac_type`, `speed_type`, `num_cars` | 100% | ✅ Recently filled by gap scripts |
| `gauge` | 91.0% | BG/MG/NG |
| `city`, `line` | 100% | ✅ Recently filled from datameet |

> [!NOTE]
> The 3.7% gap (472 trains) = metro/local/decommissioned trains not on erail.in. Expected and acceptable.

---

### 2. `station_info` — 9,956 stations

**Station master data** with GPS coordinates and search support.

| Field | Fill % | Purpose |
|---|---|---|
| `station_code` | 100% | **Primary Key** |
| `title` | 100% | Display name ("New Delhi") |
| `lat`, `lng` | 100% | GPS — map views, distance calculations |
| `city` | 100% | ✅ Recently filled from datameet |
| `place_id` | 100% | Google Places API ID |
| `pop` | 84.9% | Popularity ranking |
| `title_soundex` | 100% | Fuzzy search |

---

### 3. `station_zones` — 10,760 stations

**Zone/division mapping.** 804 more entries than `station_info` (includes halt stations).

| Field | Fill % | Purpose |
|---|---|---|
| `station_code` | 100% | Links to `station_info` |
| `station_name` | 99%+ | ✅ Recently filled from datameet |
| `zone` / `zone_name` | 100% | NR → "Northern Railway" etc. |

---

### 4. `coach_positions` — 12,444 trains

**Coach layout data** — critical for RAC upgrade algorithm.

| Field | Fill % | Purpose |
|---|---|---|
| `train_number` | 100% | Links to `train_info.train_no` |
| `coaches` | 100% | Array: `["L", "SLR", "S1", "S2"...]` |
| `total_coaches` | 100% | Count |
| `rake_type` | 100% | "ICF Rake" / "LHB Rake" |
| `reversal_stations` | 100% | Coach order reversal points |

---

### 5. `ticket_classes` — 63 entries

**Master class definitions.** Links coach codes to booking classes.

| Field | Purpose |
|---|---|
| `code` | `L`, `SLR`, `1A`, `2A`, `3A`, `SL`, `CC` etc. |
| `name` | "First AC", "Sleeper", "Chair Car" |
| `category` | "Engine", "AC", "Non-AC" |
| `is_bookable` | Can passengers book? |

---

### 6-8. Pricing Tables — 92 entries total

`catering_charges` (34) + `convenience_fees` (31) + `service_tax` (27)

Lookup by `train_type` + `class_code` → charge amount in INR.

---

### 9. Supporting Collections

| Collection | Records | Purpose |
|---|---|---|
| `station_aka_info` | 775 | Alt station names for search |
| `platform_direction` | 351 | Platform approach direction |
| `schedule_trips` | 25,826 | Metro/local train trips |
| `schedule_stop_times` | 35,950 | Metro/local stop schedules |
| `schedule_stations` | 778 | Metro/local station data |

---

### 10. Empty Collections (15) — Runtime Schemas

| Collection | Will Store |
|---|---|
| `passenger_details` | Booking/passenger info |
| `pnr_status` | PNR check results |
| `pnr_jobs` / `pnr_retry` | Background PNR queue |
| `pnr_notifications` / `pnr_updates` | Push notifications |
| `chat_history` | AI chatbot conversations |
| `live_station_history` | Real-time train locations |
| `location_alarms` | Station proximity alerts |
| `from_to_suggestions` | Search autocomplete cache |
| `train_history` | Past journeys |
| `*_local` variants | Multilingual content |

---

## Entity Relationships

```mermaid
erDiagram
    train_info ||--o{ coach_positions : "train_no = train_number"
    train_info }o--|| station_info : "src_station_code"
    train_info }o--|| station_info : "dest_station_code"
    train_info }o--|| ticket_classes : "classes bitmask"
    
    station_info ||--o| station_zones : "station_code"
    station_info ||--o{ station_aka_info : "station_code"
    station_info ||--o{ platform_direction : "station_code"
    
    catering_charges }o--|| ticket_classes : "class_code = code"
    convenience_fees }o--|| ticket_classes : "class_code = code"
    service_tax }o--|| ticket_classes : "class_code = code"
    
    coach_positions ||--o{ ticket_classes : "coaches[] = code"
    
    schedule_trips }o--|| schedule_lines : "line_id"
    schedule_trips ||--o{ schedule_stop_times : "stop_times_id"
    schedule_stop_times }o--|| schedule_stations : "stn_id"
```

### Linking Fields

| Field | Collections | Role |
|---|---|---|
| `station_code` | `station_info`, `station_zones`, `station_aka_info`, `platform_direction`, `train_info` | Station identifier |
| `train_no` / `train_number` | `train_info`, `coach_positions` | Train identifier |
| `class_code` / `code` | `ticket_classes`, pricing tables, `coach_positions.coaches[]` | Class/coach type |
| `train_type` | `train_info`, pricing tables | Pricing category |

> [!WARNING]
> **Naming inconsistency:** `train_info` uses `train_no` but `coach_positions` uses `train_number`. Backend must map between them.

### Cross-Reference Stats

| Relationship | Overlap | Only Left | Only Right |
|---|---|---|---|
| `station_info` ↔ `station_zones` | 8,633 | 1,323 | 2,127 |
| `train_info` ↔ `coach_positions` | ~12,400 | ~400 | ~44 |

---

## Backend API Recommendations

### Suggested Endpoints

```
# Train APIs
GET  /api/trains?search=rajdhani           → train_info (search)
GET  /api/trains/:trainNo                  → train_info + coach_positions
GET  /api/trains/:trainNo/coaches          → coach_positions + ticket_classes
GET  /api/trains/between/:from/:to         → train_info (filter by stations)

# Station APIs  
GET  /api/stations?search=new+delhi        → station_info (autocomplete)
GET  /api/stations/:code                   → station_info + station_zones
GET  /api/stations/:code/trains            → train_info (src/dest filter)

# Pricing APIs
GET  /api/pricing/:trainType/:classCode    → catering + convenience + tax

# Metro APIs
GET  /api/metro/lines                      → schedule_lines
GET  /api/metro/trips/:lineId              → schedule_trips + stop_times

# User APIs (runtime)
POST /api/pnr/check                        → pnr_status, pnr_jobs
POST /api/passengers                       → passenger_details
```

### Required MongoDB Indexes

```javascript
// Essential indexes for performance
db.train_info.createIndex({ "train_no": 1 }, { unique: true })
db.train_info.createIndex({ "train_name": "text" })
db.train_info.createIndex({ "src_station_code": 1, "dest_station_code": 1 })
db.train_info.createIndex({ "train_type": 1 })

db.station_info.createIndex({ "station_code": 1 }, { unique: true })
db.station_info.createIndex({ "title": "text" })

db.coach_positions.createIndex({ "train_number": 1 }, { unique: true })
db.station_zones.createIndex({ "station_code": 1 })
```

---

## Authorization Model (Planned)

### Roles

| Role | Scope | Example User |
|---|---|---|
| **Public** | Read train/station data | Anonymous visitor |
| **Passenger** | + PNR tracking, bookings, alerts | Logged-in user |
| **Admin** | Full CRUD on all collections | App administrator |
| **System** | Background jobs, scraping | Internal services |

### Access Matrix

| Collection | Public | Passenger | Admin | System |
|---|---|---|---|---|
| `train_info`, `station_*` | ✅ Read | ✅ Read | ✅ CRUD | ✅ CRUD |
| `coach_positions`, `ticket_classes` | ✅ Read | ✅ Read | ✅ CRUD | ✅ CRUD |
| Pricing tables | ✅ Read | ✅ Read | ✅ CRUD | ✅ CRUD |
| `passenger_details` | ❌ | ✅ Own | ✅ All | ❌ |
| `pnr_status` | ❌ | ✅ Own | ✅ All | ✅ Write |
| `chat_history` | ❌ | ✅ Own | ✅ All | ❌ |
| `location_alarms` | ❌ | ✅ Own | ✅ All | ❌ |
| `pnr_jobs/retry` | ❌ | ❌ | ✅ | ✅ |
| `live_station_history` | ❌ | ✅ Read | ✅ | ✅ Write |

---

## Data Completeness Verdict

### ✅ READY TO BUILD

| Area | Status |
|---|---|
| Train master data (12,813) | ✅ 96%+ complete |
| Station master data (9,956) | ✅ 100% — city, GPS, zones all filled |
| Coach layouts (12,444) | ✅ 100% complete |
| Pricing & classes | ✅ Complete |
| Metro/local schedules | ✅ 25K+ trips |

### Remaining Minor Gaps

| Gap | Count | Impact | Action |
|---|---|---|---|
| `train_info` missing erail data | 472 (3.7%) | Low — metro/decommissioned | Ignore |
| `station_info.pop` = 0 | ~1,500 | Low — cosmetic ranking | Fill from usage data over time |
| `station_info.wifi_station` | 95.7% = 0 | Low — nice-to-have feature | Not critical |
| `train_no` vs `train_number` | All trains | Medium — naming mismatch | Handle in backend code |

---

## Recommendations

### Immediate (Before Building Backend)

1. **Create MongoDB indexes** — the queries listed above will be slow without them
2. **Define Mongoose/Pydantic schemas** for the 15 empty runtime collections
3. **Standardize `train_no`/`train_number`** — pick one and create a consistent API layer

### Phase 1 (Core Backend)

4. **Train search API** — text search on `train_name`, filter by `train_type`, `running_days`
5. **Station search API** — autocomplete using `title_soundex`, filter by `zone`
6. **Coach position API** — join `coach_positions` + `ticket_classes` for RAC algorithm
7. **Trains between stations** — query by `src_station_code` + `dest_station_code`

### Phase 2 (User Features)

8. **PNR tracking system** — populate `pnr_status`, `pnr_jobs`, `pnr_notifications`
9. **Passenger management** — populate `passenger_details` with booking data
10. **Real-time tracking** — populate `live_station_history` from live API feeds
11. **Chat system** — populate `chat_history` for AI assistant

### Phase 3 (Enrichment)

12. **Google Places data** — use `station_info.place_id` for photos/reviews
13. **Popularity scores** — compute `pop` from actual search/booking frequency
14. **Multilingual support** — populate `*_local` collections with Hindi/regional names
