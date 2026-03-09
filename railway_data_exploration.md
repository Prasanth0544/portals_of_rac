# 🚂 Railway Data Exploration Report

> Complete folder-by-folder exploration of the extracted data from `C:\Users\prasa\Documents\RailWayData\base`

---

## 📁 Top-Level APK Structure

```
base/
├── AndroidManifest.xml          (66 KB)
├── classes.dex                  (8.5 MB) — compiled app code
├── classes2.dex                 (4.1 MB)
├── classes3.dex                 (478 KB)
├── resources.arsc               (3.9 MB) — compiled resources
├── META-INF/                    — APK signing info
├── assets/                      — ⭐ OUR TARGET
├── javax/                       — Java extensions
├── lib/                         — native libraries
├── okhttp3/                     — HTTP client
├── org/                         — org libraries
└── res/                         — UI resources
```

---

## 📂 `assets/` — The Data Goldmine

### Overview

| Folder/File | Size | Contents |
|---|---|---|
| **`databases/`** | ~7.3 MB | **6 SQLite databases** |
| **`local/`** | ~14 MB | Multilingual station & train names (11 languages) |
| **`train_info/`** | ~1.7 MB | Coach layouts, station clusters, zone mappings |
| **`t/`** | ~4.6 MB | `ladoo` data file (binary index) |
| **`explore/`** | ~33 KB | Station protobuf files (4 cities) |
| **`events/`** | ~18 KB | Kumbh Mela event data |
| **`dexopt/`** | ~18 KB | Android optimization profiles |
| **`fonts/`** | 1.7 KB | Custom font (`helvatica.otf`) |
| **`phenotype/`** | ~434 B | Google library metadata |
| Standalone files | ~455 KB | Data version, timestamps, fare configs, binary blobs |
| Schedule maps | ~710 KB | 9 city maps (5 cities × 2 languages) |

---

## 🗄️ 1. `databases/` — SQLite Databases

### File Sizes

| Database | Size | Relevance |
|---|---|---|
| **`schedule.db`** | **4,044 KB** | 🟩 Railway network (stations, routes, stops) |
| **`whereismytrain.db`** | **3,064 KB** | 🟩 Train catalog (12,813 trains, 9,956 stations) |
| `userData.db` | 21 KB | ⬜ User data schema (8 empty tables) |
| `cinfo.db` | 5 KB | ⬜ Cell tower → lat/lng mapping (2 tables) |
| `alarm.db` | 3 KB | ⬜ Location alarm schema (1 empty table) |
| `chat.db` | 3 KB | ⬜ Chat history schema (1 empty table) |

---

### 🟢 `schedule.db` — Railway Network Structure

#### Record Counts

| Table | Records | Description |
|---|---|---|
| **Station** | **778** | Station master data with coordinates |
| **StationName** | **778** | Station names |
| **StopTimes** | **35,950** | Train stop sequences (the backbone!) |
| **Trip** | **25,826** | Train services / journeys |
| **TripCalendar** | **25** | Running day patterns |
| **Line** | **43** | Route lines (metro + rail) |
| **PlatformSequence** | **237** | Platform ordering |

#### Schema Details

**Station** (778 records)
```sql
CREATE TABLE Station (
  id INTEGER PRIMARY KEY NOT NULL,
  code TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  city INTEGER NOT NULL
);
```

Sample data:
| id | code | lat | lng | city |
|---|---|---|---|---|
| 0 | M-GHT | 19.086948 | 72.908015 | 1 |
| 1 | M-JGR | 19.092729 | 72.901633 | 1 |
| 5 | M-ARP | 19.110271 | 72.87386 | 1 |

> Note: `city` is an integer code (1 = Mumbai, 2 = Delhi, etc.)

---

**StopTimes** (35,950 records) — *Most Important Table*
```sql
CREATE TABLE StopTimes (
  id INTEGER NOT NULL,          -- Trip reference
  stop_seq INTEGER NOT NULL,    -- Stop order
  stn_id INTEGER NOT NULL,      -- Station ID
  arr_time_offset INTEGER NOT NULL,  -- Arrival (seconds from midnight)
  dep_time_offset INTEGER NOT NULL,  -- Departure (seconds from midnight)
  distance INTEGER NOT NULL,    -- Distance from origin
  is_stopping INTEGER NOT NULL, -- Whether train stops here
  metadata BLOB,
  PRIMARY KEY(id, stop_seq)
);
```

---

**Trip** (25,826 records)
```sql
CREATE TABLE Trip (
  id TEXT NOT NULL,
  calendar_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  line_id INTEGER NOT NULL,
  stop_times_id INTEGER NOT NULL,
  trip_type INTEGER NOT NULL,
  start_time INTEGER NOT NULL,
  metadata BLOB,
  PRIMARY KEY (id, calendar_id)
);
```

---

**TripCalendar** (25 running patterns)
```sql
CREATE TABLE TripCalendar (
  id INTEGER NOT NULL PRIMARY KEY,
  running_days_array TEXT NOT NULL,  -- "1,1,1,1,1,1,1"
  start_date INTEGER NOT NULL,       -- Unix timestamp
  end_date INTEGER
);
```

Sample:
| id | running_days_array | Meaning |
|---|---|---|
| 0 | 1,1,1,1,1,1,1 | Daily |
| 1 | 1,0,0,0,0,0,1 | Sun + Sat only |
| 2 | 0,1,1,1,1,1,0 | Mon-Fri only |

---

**Line** (43 lines) — Metro + Rail Routes

Sample:
| id | name | city | type |
|---|---|---|---|
| 0 | Navi Line 1 | 1 (Mumbai) | 2 |
| 1 | Mumbai Monorail | 1 (Mumbai) | 2 |
| 5 | Pink | 2 (Delhi) | 2 |
| 8 | Red | 2 (Delhi) | 2 |
| 9 | Airport Express | 2 (Delhi) | 2 |

> Lines include color metadata (hex codes) for map rendering!

---

### 🟢 `whereismytrain.db` — Train & Station Catalog

#### Record Counts (10 Tables)

| Table | Records | Description |
|---|---|---|
| **train_info** | **12,813** | All Indian trains |
| **station_info** | **9,956** | All Indian stations with GPS coordinates |
| **station_aka_info** | **775** | Station aliases (e.g., LTT = "Lokmanya Tilak Terminus" = "Kurla Terminus") |
| **platform_direction** | **351** | Platform → direction mapping (prev/next station per platform) |
| from_to_suggestions | 0 | Runtime: user's recent search pairs |
| station_aka_info_local | 0 | Runtime: station aliases in local language |
| station_info_local | 0 | Runtime: station names in local language |
| train_aka_info | 0 | Runtime: train alternate names |
| train_aka_info_local | 0 | Runtime: train names in local language |
| train_info_local | 0 | Runtime: train info in local language |

> The 6 empty `_local` and `_suggestions` tables are **runtime tables** — the app fills them when the user switches language or searches routes. They are empty in the APK because it ships as a fresh install.

#### `train_info` Schema (12,813 trains)

| Column | Type | Description |
|---|---|---|
| `train_no` | varchar(10) | **Train number** (PK) |
| `train_name` | varchar(128) | Full train name |
| `train_type` | varchar(128) | Type (Express, SF, etc.) |
| `classes` | INTEGER | **Bitmask** of available classes (see below) |
| `pop` | INTEGER | Popularity score (based on search frequency) |
| `city` | varchar(64) | City |
| `line` | varchar(32) | Line code |
| `speed_type` | varchar(8) | Speed category |
| `ac_type` | varchar(32) | AC classification |
| `ladies_special` | varchar(32) | Ladies special flag |
| `num_cars` | INTEGER | Number of coaches |

#### `station_info` Schema (9,956 stations)

| Column | Type | Description |
|---|---|---|
| `station_code` | varchar(10) | **Station code** (PK) |
| `title` | varchar(128) | Station name |
| `gid` | varchar(10) | Group ID |
| `pop` | INTEGER | Popularity |
| `lat` | double | Latitude |
| `lng` | double | Longitude |
| `uber_available` | INTEGER | Uber availability flag |
| `wifi_station` | INTEGER | WiFi availability |
| `city` | varchar(64) | City name |
| `lines` | varchar(64) | Rail lines served |
| `place_id` | varchar(128) | Google Place ID |

---

### ⬜ `alarm.db` — Location Alerts (Empty)

**1 table, 0 records**

`locationalarm` — Stores station proximity alerts:
| Column | Type | Description |
|---|---|---|
| `uuid` | varchar(128) | Alarm ID (PK) |
| `train_no` | varchar(10) | Train number |
| `from_station` | varchar(10) | Origin station |
| `to_station` | varchar(10) | Destination station |
| `station_code` | varchar(10) | Alert station |
| `distance` | float | Distance threshold |
| `time_diff_in_mins` | INTEGER | Time before arrival |
| `status` | varchar(20) | Alarm status |

> Empty template — populated at runtime on user's device.

---

### ⬜ `chat.db` — Feedback History (Empty)

**1 table, 0 records**

`history` — Stores chat/feedback messages:
| Column | Type | Description |
|---|---|---|
| `data` | TEXT | Chat message data |
| `timestamp` | long | Message timestamp (PK) |

> Empty template — populated at runtime.

---

### ⬜ `userData.db` — User Data Schema (All Empty)

**8 tables, all 0 records**

| Table | Purpose | Key Columns |
|---|---|---|
| `pnr_status` | PNR tracking | pnr, pnr_info, status, expiry |
| `train_history` | Search history | train_no, src_station, dest_station, train_name |
| `passenger_details` | Saved passengers | name, age, gender, meal_pref, berth_pref, type |
| `live_station_to_history` | Live tracking history | from_station, to_station |
| `pnr_job_ids` | Background PNR jobs | — |
| `pnr_notification_info` | PNR notifications | — |
| `pnr_update_info` | PNR update tracking | — |
| `pnr_new_pnr_retry_info` | PNR retry logic | — |

> All empty — these are runtime user data tables, not pre-populated.

---

### ⬜ `cinfo.db` — Cell Tower Mapping

**2 tables:** `cell_history`, `cellinfoToLatLng`

Maps cell tower IDs to geographic coordinates for offline location estimation.

---

## 📂 2. `local/` — Multilingual Data (11 Languages)

Station and train data in **11 Indian languages**:

| Language | Station Info | Station Aliases | Train Info |
|---|---|---|---|
| Assamese (as) | 328 KB | 32 KB | 1.1 MB |
| Bengali (bn) | 332 KB | 30 KB | 1.2 MB |
| Gujarati (gu) | 322 KB | 31 KB | 1.1 MB |
| Hindi (hi) | 321 KB | 29 KB | 1.1 MB |
| Kannada (kn) | 346 KB | 34 KB | 1.2 MB |
| Malayalam (ml) | 339 KB | 33 KB | 1.3 MB |
| Marathi (mr) | 316 KB | 31 KB | 1.1 MB |
| Odia (or) | 340 KB | 32 KB | 1.2 MB |
| Punjabi (pa) | 312 KB | 30 KB | 1.1 MB |
| Tamil (ta) | 366 KB | 32 KB | 1.2 MB |
| Telugu (te) | 354 KB | 31 KB | 1.2 MB |

> **Total: ~14 MB** of multilingual railway data

---

## 📂 3. `train_info/` — Coach & Station Data (6 Files)

| # | File | Size | Format | Records | Content |
|---|---|---|---|---|---|
| 1 | **`coach_positions.txt`** | **503 KB** | Text (pipe-delimited) | **12,445** | Coach layouts for trains |
| 2 | **`classes_gid.txt`** | **33 B** | Text (newline-delimited) | **11** | All ticket class codes |
| 3 | **`kodu`** | **70 KB** | Text (pipe-delimited) | **9,415** | Station-to-zone mapping |
| 4 | **`boondi`** | **61 KB** | Binary (compressed) | — | Compressed data blob |
| 5 | **`munthiri`** | **1,025 KB** | Binary | — | Lat/lng coordinate data |
| 6 | **`station_clusters.bin`** | **2 KB** | Binary | — | Station cluster grouping |

---

### ① `coach_positions.txt` — Real Coach Layouts! 🔥

**12,445 entries** — Coach position data for nearly every Indian train.

Format: `train_no|rake_type|stations|coach_sequence`

Sample:
```
01005|LHB Rake||L,SLR,A4,A3,A2,A1,B6,B5,B4,B3,B2,B1,S4,S3,S2,S1,GS,GS,GS,GS,EOG,L
01015|ICF Rake||L,SLR,GS,GS,S10,S9,S8,S7,S6,S5,S4,S3,S2,S1,A1,B5,B4,B3,B2,B1,GS,GS,SLR,L
01043|LHB Rake||L,EOG,B15,B14,...,B1,PC,A3,A2,H1,A1,EOG,L
```

| Code | Meaning |
|---|---|
| `L` | Locomotive |
| `SLR`/`SLRD` | Guard/Luggage van |
| `A1-A4` | AC First / AC 2-Tier |
| `B1-B15` | AC 3-Tier |
| `S1-S10` | Sleeper |
| `GS`/`GEN` | General |
| `EOG` | End-on-Generation (Power Car) |
| `H1` | First AC (Rajdhani) |
| `PC` | Pantry Car |
| `CC` | Chair Car |

---

### ② `classes_gid.txt` — All 11 Ticket Classes

```
2A    ← AC 2-Tier
3A    ← AC 3-Tier
SL    ← Sleeper
GN    ← General
1A    ← AC First Class
2S    ← Second Sitting
CC    ← Chair Car
3E    ← AC 3-Tier Economy
FC    ← First Class
EC    ← Executive Chair Car
EA    ← Executive Anubhuti
```

---

### ③ `kodu` — Station-to-Zone Mapping

**9,415 entries** — Maps every station code to its railway zone.

Format: `station_code|zone_id(s)`

Sample:
```
NDLS|9          ← New Delhi → Zone 9 (Northern Railway)
HWH|53          ← Howrah → Zone 53 (Eastern Railway)
MAS|61,67       ← Chennai → Zones 61,67 (Southern Railway)
SBC|71          ← Bengaluru → Zone 71
PUNE|41         ← Pune → Zone 41
ADI|13          ← Ahmedabad → Zone 13
```

---

### ④ `boondi` — Compressed Binary Data

**61 KB** — Compressed/serialized binary blob. Likely a protobuf or custom binary format used by the app internally. Cannot be read as plain text.

---

### ⑤ `munthiri` — Binary Coordinate Data

**1,025 KB** — Binary file containing what appears to be packed floating-point numbers (lat/lng coordinates for stations or route paths). Used for offline map rendering.

---

### ⑥ `station_clusters.bin` — Station Cluster Groups

**1,774 bytes** — Small binary file mapping stations into geographic clusters. First bytes suggest a header with cluster counts followed by station ID lists per cluster.

---

## 📂 4. Standalone Files in `assets/`

| # | File | Size | Format | Content |
|---|---|---|---|---|
| 1 | **`data_timestamp.txt`** | 1 KB | Text | Data snapshot timestamp: `1744319165885` → **April 10, 2025** |
| 2 | **`data_version.txt`** | 1 KB | Text | App data version: **7.2.9** |
| 3 | **`mankatha_part_2`** | 4.5 KB | **JSON** 🔥 | Railway fare charges per class & train type |
| 4 | **`mankatha_vari`** | 1.3 KB | **JSON** 🔥 | Service tax rules per class & train type |
| 5 | `mankatha` | 64 KB | Binary | Packed schedule time-offset data |
| 6 | `frodo` | 376 KB | Binary | Compressed/encrypted data blob |
| 7 | `open_source_licenses.html` | 45 KB | HTML | Open source license notices |
| 8 | `empty_asset_generated_by_bazel~` | 0 KB | Empty | Build artifact |

### 🔥 `mankatha_part_2` — Railway Fare Data (JSON)

Contains **catering and other charges** per travel class and train type:

```json
{
  "other_charges": [
    {"charge_type": 0, "charge": 40, "class_type": 8, "train_type": 9},
    {"charge_type": 0, "charge": 15, "class_type": 6, "train_type": 12},
    ...
  ]
}
```

### 🔥 `mankatha_vari` — Service Tax Rules (JSON)

Defines **service tax applicability** per class and train type:

```json
{
  "service_tax": [
    {"tax": true, "class_type": 8, "train_type": 9},
    {"tax": true, "class_type": 11, "train_type": 12},
    ...
  ]
}
```

---

## 📂 5. Other Folders

### `t/` — Large Data File
- `ladoo` (4.6 MB) — Binary data (compressed schedule/route index)

### `explore/` — Station Exploration Files
Protobuf files for 4 stations:
- Indore (INDB), Madurai (MDU), Patna (PNBE), Warangal (WAR)
- Contains detailed station info (platform maps, amenities)

### `events/` — Special Event Data
- `kumbh_mela_v1.pb` / `.txtpb` — Kumbh Mela train data

### `dexopt/` — Android Optimization
- `baseline.prof` (16 KB) + `baseline.profm` (2 KB) — App performance profiles
- ⬜ Not relevant for data extraction

---

## 🗺️ 6. Schedule Maps (9 PNGs)

Detailed **metro and local train route maps** with every station labeled:

| City | Languages | Lines Shown |
|---|---|---|
| **Bengaluru** | English + Kannada | Green Line + Purple Line (Namma Metro) |
| **Delhi** | English + Hindi | Red, Blue, Yellow, Pink, Magenta, Airport Express, Grey, Rapid Metro |
| **Mumbai** | English only | Western, Central, Harbour, Trans-Harbour Railway + Metro + Monorail |
| **Hyderabad** | English + Telugu | Blue, Red, Green Lines (Hyderabad Metro) |
| **Kolkata** | English + Bengali | Blue Line + Green Line (Kolkata Metro) |

> These maps show station names, transfer points, and terminus stations — could be used for station visualization in the app!

---

## 📊 Total Data Summary

| Category | Count |
|---|---|
| **Total trains** | **12,813** |
| **Total stations** | **9,956** |
| **Network stations** (with routes) | **778** |
| **Stop time records** | **35,950** |
| **Trip records** | **25,826** |
| **Metro/Rail lines** | **43** |
| **Running patterns** | **25** |
| **Coach layouts** | **12,445** |
| **Station-zone mappings** | **9,415** |
| **Languages supported** | **11** |
| **City schedule maps** | **5 cities (9 PNGs)** |
| **Fare/tax configs** | **2 JSON files** |
| **Data snapshot date** | **April 10, 2025** |
| **App data version** | **7.2.9** |
| **Total data size** | **~28 MB** |

---

## 🚫 Non-Assets Folders (Can Be Ignored)

| Folder | Contents | Useful? |
|---|---|---|
| `META-INF/` | APK signing certificate (CERT.RSA, MANIFEST.MF) | ❌ No |
| `javax/` | Java servlet library | ❌ No |
| `lib/` | Native ARM libraries (`libHelloJNI.so`) | ❌ No |
| `okhttp3/` | OkHttp networking library | ❌ No |
| `org/` | Joda Time library | ❌ No |
| `res/` | 1,449 obfuscated UI files (XML layouts, PNGs, fonts) | ❌ No |
| `classes*.dex` | Compiled Java bytecode (~13MB) | ❌ No |
| `resources.arsc` | Compiled Android resources | ❌ No |

> [!IMPORTANT]
> All railway data lives exclusively in `assets/`. The rest is Android app infrastructure.

---

## ✅ 8. What We Imported Into MongoDB

All extracted data was imported into the **`RailwayData` database** in MongoDB using **Python seed scripts** (located in `Railway_data/` folder). Each script reads from the source files, transforms the data, and inserts it into MongoDB with appropriate indexes.

### Imported Collections (33 total → 110,000+ documents)

#### 📊 Data Collections (with records)

These collections contain the **actual railway data** extracted from the APK. Each one serves a specific purpose in the RAC backend:

| Collection | Docs | Source | Use in RAC Backend |
|---|---|---|---|
| `train_info` | 12,813 | whereismytrain.db + erail.in | **Core reference** — when admin creates a train journey, backend looks up train name, type, available classes, running days, source/destination, and duration from this collection |
| `station_info` | 9,956 | whereismytrain.db | **Station lookup** — provides GPS coordinates for live train tracking on maps, WiFi availability info for passengers, Google Place ID for directions integration |
| `coach_positions` | 12,444 | coach_positions.txt | **Seat allocation engine** — the RAC algorithm uses this to know exactly how many coaches (S1-S9, B1-B3, A1, etc.) each train has, their order, and rake type (ICF/LHB) for correct berth assignment |
| `station_zones` | 10,458 | kodu | **Zone-based operations** — identifies which railway zone manages each station (e.g., SCR = South Central Railway). Used for TTE jurisdictions and zone-wise reporting |
| `ticket_classes` | 63 | classes_gid.txt | **Class validation** — maps coach codes (S, B, A, BE) to class names (SL, 3A, 2A, 3E) with bookable flags. Used to validate upgrade offers (e.g., SL → 3A is valid, SL → 1A might not be) |
| `station_aka_info` | 775 | whereismytrain.db | **Smart search** — allows passengers to find stations by alternate names (e.g., "Kurla Terminus" finds LTT) |
| `platform_direction` | 351 | whereismytrain.db | **Platform guidance** — tells which platform serves which direction at junction stations |
| `sch_stop_times` | 35,950 | schedule.db | **Metro/local schedules** — stop sequences for local trains, future expansion for suburban route support |
| `sch_trips` | 25,826 | schedule.db | **Trip definitions** — metro/local train services linked to stop times and running calendars |
| `sch_stations` | 778 | schedule.db | **Schedule station master** — stations in the metro/local network with coordinates |
| `sch_station_names` | 778 | schedule.db | **Display names** — human-readable station names for schedule display |
| `sch_platform_sequence` | 237 | schedule.db | **Platform ordering** — correct stop order at multi-platform stations |
| `sch_lines` | 43 | schedule.db | **Line definitions** — metro/rail lines with color codes for map rendering |
| `sch_trip_calendar` | 25 | schedule.db | **Running patterns** — which days each metro/local service operates |
| `catering_charges` | 34 | mankatha_part_2 | **Fare calculator** — adds catering charges to ticket fare based on class and train type |
| `convenience_fees` | 31 | mankatha_part_2 | **Fare calculator** — adds IRCTC convenience fees to total fare |
| `service_tax` | 27 | mankatha_vari | **Fare calculator** — determines whether service tax applies per class/train type |

#### 📋 Schema-Only Collections (empty — ready for runtime data)

These were empty in the source app. We imported their **schema structure with validation rules** so the RAC app has properly structured collections ready to accept data:

| Collection | Source | Use in RAC Backend |
|---|---|---|
| `passenger_details` | userData.db | **Passenger profiles** — stores saved passenger info (name, age, gender, berth preference) for quick booking |
| `train_history` | userData.db | **Search history** — recently searched trains for quick re-access |
| `pnr_status` | userData.db | **PNR tracking** — stores PNR numbers with status (CNF/RAC/WL) for monitoring |
| `pnr_jobs` | userData.db | **Background PNR checker** — schedules periodic PNR status checks |
| `pnr_updates` | userData.db | **Status change log** — tracks when PNR status changes (e.g., WL→RAC→CNF) |
| `pnr_notifications` | userData.db | **Push alerts** — notification records for PNR status changes |
| `pnr_retry` | userData.db | **Retry logic** — handles failed PNR check retries gracefully |
| `location_alarms` | alarm.db | **Station proximity alerts** — notifies passengers when approaching their destination |
| `chat_history` | chat.db | **Feedback system** — stores user feedback/support messages |
| `live_station_history` | userData.db | **Frequent routes** — remembers frequently searched station pairs |
| 6 local/suggestion collections | whereismytrain.db | **Multilingual support** — ready to accept translated station/train names when language features are added |

### Web-Scraped Enrichment

| Source | Target Collection | Fields Added |
|---|---|---|
| **erail.in** (web scrape) | `train_info` | `running_days`, `running_days_text`, `src_station_code/name`, `dest_station_code/name`, `departure_time`, `arrival_time`, `duration`, `distance_km`, `train_category`, `zone_erail`, `gauge` |

> The running days scraper (`scrape_running_days.py`) fetches data from **erail.in** for all 12,813 trains and adds 14 enrichment fields to the existing `train_info` collection.

### 🔥 `classes` Bitmask Decoded

The `classes` integer in `train_info` is a **bitmask** where each bit represents a ticket class:

| Bit | Position | Class | Example |
|---|---|---|---|
| 0 | `0000000001` | SL (Sleeper) | |
| 1 | `0000000010` | 3A (AC 3-Tier) | |
| 2 | `0000000100` | 2A (AC 2-Tier) | |
| 3 | `0000001000` | 1A (AC First) | |
| 4 | `0000010000` | CC (Chair Car) | |
| 5 | `0000100000` | EC (Executive Chair) | |
| 6 | `0001000000` | 2S (Second Sitting) | |
| 7 | `0010000000` | FC (First Class) | |
| 8 | `0100000000` | 3E (AC 3-Economy) | |

Examples:
| Train | classes | Binary | Available |
|---|---|---|---|
| 17225 (Amaravati) | 15 | `0001111` | SL, 3A, 2A, 1A |
| 12301 (Rajdhani) | 19 | `0010011` | SL, 3A, CC |
| 12839 (Chennai Mail) | 31 | `0011111` | SL, 3A, 2A, 1A, CC |

---

## ❌ 9. What Was NOT Imported (and why)

These files were analyzed but **deliberately excluded** from the MongoDB import. Each was skipped for a specific reason — either the data is **redundant** (already available from another source), **unreadable** (proprietary binary format), or **not relevant** to the RAC backend.

| File/Folder | Size | What It Contains | Why Neglected |
|---|---|---|---|
| `local/` (11 languages) | 14 MB | Station and train names in 11 Indian languages (Assamese, Bengali, Gujarati, Hindi, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu) | **Proprietary binary format** — not JSON/protobuf/CSV. Each file uses a custom serialization format that would require decompiling the app's Java code (`LocalDataParser.class`) to understand the byte layout. If multilingual support is needed later, Google Translate API or official Indian Railways data portals provide the same names in standard formats. |
| `boondi` | 61 KB | Binary station-pair lookup index — maps station code pairs to precomputed data | **App-internal search optimization** — this is a hash table the app uses to quickly find trains between two stations. The RAC backend doesn't need this because it queries MongoDB directly with station codes. The binary structure has no header or documentation. |
| `munthiri` | 1 MB | Packed latitude/longitude coordinates for route path rendering | **Redundant data** — station GPS coordinates are already available in `station_info` (9,956 stations with lat/lng). `munthiri` likely stores interpolated points along rail tracks for drawing curved route lines on maps, which the RAC backend doesn't need. |
| `station_clusters.bin` | 2 KB | Groups nearby stations into geographic clusters (e.g., all stations in Mumbai suburban area) | **Feature not needed** — the "Where is My Train" app uses clusters for its "nearby stations" feature. RAC doesn't have a nearby station finder; it works with specific train routes. Only 1,774 bytes — too small to justify reverse-engineering. |
| `frodo` | 376 KB | Binary graph/routing index — shares first bytes with `boondi`, indicating same encoding format | **Same reason as boondi** — internal search/routing data structure. The app uses these paired files (`frodo` + `boondi`) for its train-between-stations search. RAC handles routing differently using its own station collections. |
| `mankatha` | 64 KB | Packed fare calculation data — binary records of 12-byte uint16 pairs containing fare offsets and distance slabs | **Already captured in JSON form** — the same fare data is available in readable format from `mankatha_part_2` (catering charges) and `mankatha_vari` (service tax), which we DID import. The binary `mankatha` contains the raw calculation engine data that the JSON files summarize. |
| `t/ladoo` | 4.6 MB | Pre-computed route lookup table — the app's largest data file. Contains train numbers as packed uint16 integers indexed by route combinations | **Not directly usable** — while we found train 17225 inside this file (at byte offset 3,809,182), the data is a compressed lookup table optimized for the app's internal C/JNI code (`libHelloJNI.so`). Extracting meaningful data would require understanding the native code's exact memory layout. Route data is already available from `sch_stop_times`. |
| `cinfo.db` | 5 KB | Cell tower ID → GPS coordinate mapping (`cell_history`, `cellinfoToLatLng` tables) | **Empty + not relevant** — both tables have 0 records. This database is used for offline train location via cell tower triangulation (when GPS is unavailable, like in tunnels). The RAC backend uses real GPS for tracking, not cell towers. |
| `explore/*.pb` | 33 KB | Protobuf files with detailed station info for only 4 stations: Indore (INDB), Madurai (MDU), Patna (PNBE), Warangal (WAR) | **Too limited** — covers only 4 out of 9,956 stations. These appear to be pilot data for a "station explorer" feature that was never fully rolled out. The basic station info is already available in `station_info`. |
| `events/*.pb` | 18 KB | Special trains for Kumbh Mela religious festival (temporary services that run only during the event) | **One-time event data** — these are temporary train services that have already concluded. Not relevant to regular railway operations. If future events need support, event data can be added manually. |
| `sch_map_*.png` | 710 KB | Metro route map images for 5 cities (Bengaluru, Delhi, Hyderabad, Kolkata, Mumbai) in 2 languages each | **Static images, not structured data** — PNG files can't be queried or searched. If metro maps are needed in the RAC frontend, they could be served as static assets directly without MongoDB import. |
| `dexopt/` | 18 KB | Android ART optimization profiles (`baseline.prof`, `baseline.profm`) | **Android runtime files** — used by the Android Runtime (ART) to optimize app startup. Zero railway data content. |
| `fonts/` | 1.7 KB | Custom font file (`helvatica.otf`) | **UI asset** — a custom font used by the app's UI. Not data. |
| `phenotype/` | 434 B | Google Play Services configuration metadata (billing, auth, surveys, analytics) | **Google SDK config** — internal configuration for Google's own libraries. Not railway data. |

---

## 🐍 10. Seed Scripts Reference

All scripts in `Railway_data/` folder:

| Script | Source | Collections Created |
|---|---|---|
| `seed_whereismytrain.py` | whereismytrain.db | 10 collections |
| `seed_schedule.py` | schedule.db | 7 collections (sch_*) |
| `seed_station_zones.py` | kodu + whereismytrain.db | station_zones |
| `seed_coach_positions.py` | coach_positions.txt | coach_positions |
| `seed_ticket_classes.py` | classes_gid.txt + codes | ticket_classes |
| `seed_catering_charges.py` | mankatha_part_2 | catering_charges |
| `seed_convenience_fees.py` | mankatha_part_2 | convenience_fees |
| `seed_service_tax.py` | mankatha_vari | service_tax |
| `seed_passenger_details.py` | userData.db schema | passenger_details |
| `seed_train_history.py` | userData.db schema | train_history |
| `seed_pnr_status.py` | userData.db schema | pnr_status |
| `seed_pnr_collections.py` | userData.db schema | pnr_jobs + 3 more |
| `seed_location_alarms.py` | alarm.db schema | location_alarms |
| `seed_chat_history.py` | chat.db schema | chat_history |
| `seed_live_station_history.py` | userData.db schema | live_station_history |
| `scrape_running_days.py` | erail.in (web) | Updates train_info |

---

> [!IMPORTANT]
> This is a complete snapshot of the Indian Railways network data — **12,813 trains across 9,956 stations** with real coordinates, coach positions, fare data, zone mappings, running schedules, and metro route maps. All importable data has been loaded into the `RailwayData` MongoDB database (33 collections, 110,000+ documents).
