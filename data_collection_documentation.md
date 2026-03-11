# 🚂 Railway App Data Extraction & Integration

> Full technical documentation of extracting railway data from the **"Where is My Train"** Android app and integrating it into the RAC (Railway Allocation & Confirmation) project's MongoDB backend.

## 🎯 What is this document about?

The **RAC project** is a railway berth management system that handles passenger seat allocation, waitlist upgrades, and real-time train operations. To power this system, we needed a **comprehensive Indian Railways dataset** — train details, station information, coach layouts, fare structures, zone mappings, and schedules.

Rather than manually compiling this data, we extracted it from **"Where is My Train"** — a widely-used Indian Railways app (developed by Sigmoid Labs, later acquired by Google). This app ships with a rich offline dataset embedded inside its APK (Android application package). We reverse-engineered the APK to extract this data and imported it into our project's MongoDB database.

This document covers the **complete end-to-end process** — from pulling the APK off an Android phone, through web scraping enrichment and open dataset integration, to having a fully populated MongoDB database with 29 collections and over 120,000 documents.

---

## 📋 Table of Contents

1. [Tools Used](#-tools-used)
2. [Data Extraction Process](#-data-extraction-process)
3. [Extracted Data Overview](#-extracted-data-overview)
4. [Dataset Pipeline](#-dataset-pipeline)
5. [System Architecture](#-system-architecture)
6. [MongoDB Collections](#-mongodb-collections)
7. [Seed Scripts](#-seed-scripts)
8. [Web Scraping — erail.in Enrichment (Running Days)](#-web-scraping--erailin-enrichment)
9. [Web Scraping — erail.in Train Routes](#-web-scraping--erailin-train-routes)
10. [Gap Filling — Datameet & Internal Data](#-gap-filling--datameet--internal-data)

---

## 🛠️ Tools Used

The following tools were used at various stages of the extraction and integration process. No paid software or special hardware was required — everything is open-source or freely available.

| Tool | Purpose |
|------|---------|
| **ADB Platform Tools** | Android Debug Bridge — communicates with the phone over USB to pull app files |
| **7-Zip** | Extracts APK contents (an APK is essentially a ZIP archive containing all app resources) |
| **DB Browser for SQLite** | GUI tool to visually inspect the SQLite databases found inside the APK |
| **Python 3 + pymongo** | Custom scripts to parse extracted data, transform it, and load it into MongoDB |
| **MongoDB Compass** | GUI tool to verify that all collections were correctly imported |

---

## 📱 Data Extraction Process

The extraction process involves connecting an Android phone (which has the app installed) to a laptop, pulling the APK file, and then extracting its embedded data assets. Here's how it was done:

### Step 1: Enable Developer Mode & USB Debugging

Android phones hide developer tools by default. To access them, we need to enable "Developer Options" and turn on "USB Debugging", which allows the laptop to communicate with the phone.

```
Settings → About Phone → Tap Build Number 7 times
Settings → Developer Options → Enable USB Debugging
```

### Step 2: Connect Device & Verify

Once USB Debugging is enabled, we connect the phone to the laptop via USB and verify that ADB (Android Debug Bridge) can see the device.

```bash
# Connect phone via USB (File Transfer Mode)
adb devices
# Output: 10BD8H0KHG000AN   device
```

### Step 3: Locate & Pull APK

Every Android app is stored as an APK file on the device. We find the exact path of the "Where is My Train" app's APK and download it to the laptop.

```bash
# Find package
adb shell pm list packages | findstr train
# Result: package:com.whereismytrain.android

# Get APK path
adb shell pm path com.whereismytrain.android
# Result: /data/app/~~YEP.../com.whereismytrain.android/base.apk

# Pull to laptop
adb pull /data/app/~~YEP.../com.whereismytrain.android/base.apk
```

### Step 4: Extract APK

An APK file is just a ZIP archive with a different extension. We extract it to access the app's embedded resources — databases, configuration files, images, and binary data files.

```bash
7z x base.apk -o"RailWayData"
```

**After extraction, the key data lives inside the `assets/` folder:**
```
base/
├── assets/
│   ├── databases/          ← 6 SQLite databases
│   ├── train_info/         ← Coach layouts, zone mappings, fare data
│   ├── local/              ← 11 language translations (binary encoded)
│   ├── explore/            ← Station details (protobuf)
│   ├── events/             ← Special event trains (protobuf)
│   ├── t/                  ← Precomputed route index (binary)
│   ├── sch_map_*.png       ← Metro maps (5 cities)
│   ├── data_timestamp.txt  ← April 2025
│   └── data_version.txt   ← v7.2.9
├── classes.dex             ← Compiled Java code
├── AndroidManifest.xml
└── res/                    ← UI resources
```

---

## 📊 Extracted Data Overview

The extracted APK contained a rich dataset organized across **SQLite databases** (structured relational data) and **custom data files** (text, JSON, and proprietary binary formats). Here's what was found:

### SQLite Databases (6 files)

SQLite is a lightweight database format commonly used by mobile apps for offline storage. The app ships with 6 pre-populated databases:

| Database | Tables | Records | Content |
|----------|--------|---------|---------|
| **whereismytrain.db** | 10 | 23,895 | Master train & station catalog |
| **schedule.db** | 7 | 63,637 | Metro/local train schedules |
| **cinfo.db** | — | — | App configuration |
| **userData.db** | 8 | 0 | Runtime schemas (empty) |
| **alarm.db** | 1 | 0 | Location alarm schema |
| **chat.db** | 1 | 0 | Feedback schema |

### Train Info Files

Beyond the databases, the app stores additional data in custom file formats inside the `train_info/` folder. Some are human-readable (text, JSON), while others use proprietary binary encoding:

| File | Format | Records | Content |
|------|--------|---------|---------|
| `coach_positions.txt` | Pipe-delimited | 12,444 | Coach layouts for all trains |
| `classes_gid.txt` | Text | 11 | Ticket class codes |
| `kodu` | Pipe-delimited | 9,414 | Station → Zone mappings |
| `mankatha_part_2` | JSON | 65 | Catering charges & convenience fees |
| `mankatha_vari` | JSON | 27 | Service tax rules |
| `boondi` | Binary | — | Compressed internal index |
| `munthiri` | Binary | — | Packed GPS coordinates |
| `station_clusters.bin` | Binary | — | Geographic station clusters |

> **Fun fact:** File names like *boondi*, *munthiri*, *mankatha*, *ladoo* are Tamil/Hindi food & movie names — a common obfuscation practice by the Chennai-based dev team (Sigmoid Labs, acquired by Google).

### Final Dataset Size (After All Enrichment)

| Category | Count | Sources |
|----------|-------|---------|
| Trains | 12,813 | APK + erail.in |
| Train Routes | ~8,000+ | erail.in (Selenium scraper) |
| Stations | 9,956 | APK |
| Station-Zone Mappings | 10,760 | APK (`kodu`) + datameet |
| Coach Layouts | 12,444 | APK (`coach_positions.txt`) |
| Schedule Stations | 778 | APK (`schedule.db`) |
| Stop Time Records | 35,950 | APK (`schedule.db`) |
| Ticket/Coach Classes | 63 | APK |
| Fare Rules | 92 | APK |

---

## 🔄 Dataset Pipeline

The overall data flow follows a classic **ETL (Extract, Transform, Load)** pattern with **three data sources**: APK extraction, erail.in web scraping, and datameet open dataset integration.

```mermaid
graph LR
    subgraph "📱 Source 1: APK"
        APK["Where is My Train<br/>Android APK"]
    end

    subgraph "🌐 Source 2: Web"
        ERAIL["erail.in<br/>Train Enquiry"]
    end

    subgraph "� Source 3: Open Data"
        DATAMEET["datameet/railways<br/>GitHub Dataset"]
    end

    subgraph "�🔧 Extraction"
        ADB["ADB Pull"] --> ZIP["7-Zip Extract"]
    end

    subgraph "📂 Raw Data"
        DB1["SQLite DBs"]
        TXT["Text/JSON Files"]
    end

    subgraph "🐍 Transform"
        SEED["Seed Scripts (15)"]
        SCRAPE["scrape_running_days.py"]
        ROUTES["scrape_train_routes.py"]
        FILL["filling_gaps/ (5 scripts)"]
    end

    subgraph "🍃 MongoDB"
        MONGO["RailwayData<br/>Database<br/>(29 collections)"]
    end

    APK --> ADB
    ZIP --> DB1 & TXT
    DB1 & TXT --> SEED
    ERAIL --> SCRAPE
    ERAIL --> ROUTES
    DATAMEET --> FILL
    SEED --> MONGO
    SCRAPE --> MONGO
    ROUTES --> MONGO
    FILL --> MONGO
```

### Pipeline Steps (in detail)

Each step in the pipeline serves a specific purpose:

| Step | Tool | Input | Output |
|------|------|-------|--------|
| 1. **Pull** | ADB | Phone APK | `base.apk` |
| 2. **Extract** | 7-Zip | `base.apk` | `assets/` folder |
| 3. **Parse** | Python + sqlite3 | SQLite DBs + text files | Structured dicts |
| 4. **Transform** | Python scripts | Raw records | Cleaned documents (human-readable mappings) |
| 5. **Load** | pymongo | Documents | MongoDB `RailwayData` collections |
| 6. **Index** | pymongo | Collections | Optimized query indexes |

---

## 🏗️ System Architecture

The RAC project uses **three separate MongoDB databases**, each serving a distinct role. The `RailwayData` database (populated through this extraction process) serves as a **read-only reference catalog** that the backend queries when it needs train details, station information, fare calculations, or coach layouts.

```mermaid
graph TB
    subgraph "🍃 MongoDB (localhost:27017)"
        subgraph "RailwayData DB (Reference)"
            TRAIN["train_info<br/>12,813 trains"]
            STN["station_info<br/>9,956 stations"]
            ZONES["station_zones<br/>10,458 mappings"]
            COACH["coach_positions<br/>12,444 layouts"]
            FARE["catering_charges<br/>convenience_fees<br/>service_tax"]
            CLASS["ticket_classes<br/>63 types"]
            SCH["sch_* collections<br/>63,637 schedules"]
            PLAT["platform_direction<br/>351 platforms"]
        end

        subgraph "rac DB (Runtime)"
            TD["Trains_Details"]
            TTE["tte_users"]
            PA["passenger_accounts"]
            AUTH["refresh_tokens<br/>otp_store"]
        end

        subgraph "PassengersDB (Per-Train)"
            PS["{train}_stations"]
            PP["{train}_passengers"]
            SR["station_reallocations"]
        end
    end

    subgraph "🖥️ RAC Backend (Node.js)"
        API["Express API Server"]
        WS["WebSocket Server"]
    end

    subgraph "🌐 Frontends"
        ADMIN["Admin Portal"]
        PASS["Passenger Portal"]
        TTEP["TTE Portal"]
    end

    TRAIN & STN & ZONES & COACH & FARE & CLASS -.->|"Reference<br/>Lookups"| API
    TD & TTE & PA & AUTH -->|"Auth &<br/>Config"| API
    PS & PP & SR -->|"Live<br/>Data"| API
    API --> WS
    WS --> ADMIN & PASS & TTEP
```

### How the three databases work together

The separation into three databases follows the principle of **separating reference data from operational data**:

| Database | Role | Access |
|----------|------|--------|
| **RailwayData** | 📚 Reference catalog — trains, stations, fares, schedules, zones | Read-only lookups |
| **rac** | 🔐 Auth & config — users, tokens, train configurations | Read/Write |
| **PassengersDB** | 🚃 Live operations — passengers, berths, reallocations | Read/Write (per-train) |

---

## 🍃 MongoDB Collections

After running all seed scripts, scrapers, and gap-filling scripts, the `RailwayData` database contains **29 collections** totaling over **120,000 documents**.

### RailwayData Database — 29 Collections

#### 📊 Data Collections (populated with extracted records)

| Collection | Documents | Source(s) |
|------------|-----------|--------|
| `train_info` | 12,813 | whereismytrain.db + erail.in + gap scripts |
| `train_routes` | ~8,000+ | erail.in (Selenium scraper) |
| `coach_positions` | 12,444 | coach_positions.txt |
| `station_zones` | 10,760 | kodu + datameet |
| `station_info` | 9,956 | whereismytrain.db + datameet |
| `schedule_stop_times` | 35,950 | schedule.db |
| `schedule_trips` | 25,826 | schedule.db |
| `station_aka_info` | 775 | whereismytrain.db |
| `schedule_stations` | 778 | schedule.db |
| `schedule_station_names` | 778 | schedule.db |
| `platform_direction` | 351 | whereismytrain.db |
| `schedule_platform_sequence` | 237 | schedule.db |
| `ticket_classes` | 63 | classes_gid.txt + coach_positions.txt |
| `schedule_lines` | 43 | schedule.db |
| `catering_charges` | 34 | mankatha_part_2 |
| `convenience_fees` | 31 | mankatha_part_2 |
| `service_tax` | 27 | mankatha_vari |
| `schedule_trip_calendar` | 25 | schedule.db |

#### 📋 Schema-Only Collections (empty templates)

These collections were empty in the source app (they get populated at runtime when users interact with the app). We created them in MongoDB with **schema validation rules** so they're ready to accept data when the RAC app starts using them:

| Collection | Source | Purpose |
|------------|--------|---------|
| `passenger_details` | userData.db | Passenger profiles |
| `train_history` | userData.db | Train search history |
| `pnr_status` | userData.db | PNR tracking |
| `pnr_jobs` | userData.db | PNR check scheduler |
| `pnr_updates` | userData.db | PNR status changes |
| `pnr_notifications` | userData.db | PNR push notifications |
| `pnr_retry` | userData.db | PNR retry logic |
| `location_alarms` | alarm.db | Location-based alerts |
| `chat_history` | chat.db | Feedback messages |
| `live_station_history` | userData.db | Frequent station pairs |
| `from_to_suggestions` | whereismytrain.db | Search suggestions |
| `station_aka_info_local` | whereismytrain.db | Local language aliases |
| `station_info_local` | whereismytrain.db | Local language names |
| `train_aka_info` | whereismytrain.db | Train alternate names |
| `train_aka_info_local` | whereismytrain.db | Train local names |
| `train_info_local` | whereismytrain.db | Train local info |

---

## 🐍 Seed Scripts

Each collection has a corresponding **Python seed script** that handles the extraction, transformation, and loading. All scripts are self-contained — they read from the source files, transform the data (e.g., mapping integer codes to human-readable names), and insert into MongoDB.

All scripts are located in the `Railway_data/` folder:

| Script | Collections | Docs |
|--------|------------|------|
| `seed_whereismytrain.py` | 10 collections (train_info, station_info, etc.) | 23,895 |
| `seed_schedule.py` | 7 collections (schedule_*) | 63,637 |
| `seed_station_zones.py` | station_zones | 10,458 |
| `seed_coach_positions.py` | coach_positions | 12,444 |
| `seed_ticket_classes.py` | ticket_classes | 63 |
| `seed_catering_charges.py` | catering_charges | 34 |
| `seed_convenience_fees.py` | convenience_fees | 31 |
| `seed_service_tax.py` | service_tax | 27 |
| `seed_passenger_details.py` | passenger_details | 0 |
| `seed_train_history.py` | train_history | 0 |
| `seed_pnr_status.py` | pnr_status | 0 |
| `seed_pnr_collections.py` | pnr_jobs, pnr_updates, pnr_notifications, pnr_retry | 0 |
| `seed_location_alarms.py` | location_alarms | 0 |
| `seed_chat_history.py` | chat_history | 0 |
| `seed_live_station_history.py` | live_station_history | 0 |
| `scrape_running_days.py` | Updates train_info (adds running_days + 14 fields) | 12,341 |
| `scrape_train_routes.py` | train_routes (all stopping stations per train) | ~8,000+ |
| `filling_gaps/fill_num_cars.py` | Updates train_info.num_cars | 7,028 |
| `filling_gaps/fill_ac_type.py` | Updates train_info.ac_type | 7,391 |
| `filling_gaps/fill_speed_type.py` | Updates train_info.speed_type | 7,391 |
| `filling_gaps/fill_station_names.py` | Updates station_zones.station_name | 288 |
| `filling_gaps/fill_from_datameet.py` | Updates station_info.city + station_zones | 302+ |

### How to run all seeds

To populate the entire `RailwayData` database from scratch, run these commands in order. Each script is idempotent — it drops and recreates its collection, so it's safe to run multiple times.

```bash
cd Railway_data
python seed_whereismytrain.py
python seed_schedule.py
python seed_station_zones.py
python seed_coach_positions.py
python seed_ticket_classes.py
python seed_catering_charges.py
python seed_convenience_fees.py
python seed_service_tax.py
python seed_passenger_details.py
python seed_train_history.py
python seed_pnr_status.py
python seed_pnr_collections.py
python seed_location_alarms.py
python seed_chat_history.py
python seed_live_station_history.py

# Web scrape enrichment (run AFTER seeds)
python scrape_running_days.py        # ~20 min (running days)
python scrape_train_routes.py --all   # ~3-4 hrs (full route data)
```

> **Prerequisite:** `pip install pymongo requests selenium`

---

## 🌐 Web Scraping — erail.in Enrichment

The APK data does **not** include running days for long-distance trains (only metro/local trains have this in `schedule.db`). To fill this gap, we built a web scraper that fetches running days and other details from **erail.in** — a public Indian Railways enquiry website.

### How It Works

```mermaid
graph LR
    DB["train_info<br/>(12,813 trains)"] --> SCRIPT["scrape_running_days.py"]
    SCRIPT -->|"5 parallel threads"| ERAIL["erail.in<br/>getTrains.aspx"]
    ERAIL -->|"~ delimited response"| PARSE["Parse 15 fields<br/>per train"]
    PARSE -->|"$set update"| DB
```

The scraper reads all train numbers from `train_info`, queries erail.in using **5 parallel threads** (`ThreadPoolExecutor`), parses the `~` delimited response, and updates each document with 15 new fields.

### Source & API

| Detail | Value |
|---|---|
| **Website** | [erail.in](https://erail.in) (public Indian Railways enquiry) |
| **Endpoint** | `https://erail.in/rail/getTrains.aspx?TrainNo=XXXXX&DataSource=0&Language=0&Cache=true` |
| **Response format** | `~` delimited text (field[13] = running days as 7-digit string) |
| **Concurrency** | 5 threads with 0.1s delay per thread |
| **Resume** | Progress saved to `scrape_progress.json` every 50 trains |

### Scraping Results

| Result | Count | Notes |
|---|---|---|
| ✅ Completed | 12,341 | Successfully scraped and updated |
| ⚠️ Not Found | 472 | Metro, local, decommissioned trains (expected) |
| ❌ Failed | 0 | All retried successfully |

Output files generated:
- `scrape_completed.json` — 12,341 train numbers successfully scraped
- `scrape_not_found.json` — 472 trains not indexed on erail.in
- `scrape_failed.json` — historical failures (all resolved on retry)

### Fields Added to `train_info`

| Field | Example | Description |
|---|---|---|
| `running_days` | `"1111111"` | 7 chars: Mon,Tue,Wed,Thu,Fri,Sat,Sun (1=runs) |
| `running_days_text` | `"Daily"` | Human readable: "Daily" or "Mon, Wed, Fri" |
| `src_station_name` | `"Narasapur"` | Origin station name |
| `src_station_code` | `"NS"` | Origin station code |
| `dest_station_name` | `"Hubballi Jn"` | Destination station name |
| `dest_station_code` | `"UBL"` | Destination station code |
| `departure_time` | `"16.20"` | Departure from origin |
| `arrival_time` | `"11.30"` | Arrival at destination |
| `duration` | `"19.10"` | Total journey time (HH.MM) |
| `total_stops` | `28` | Number of stops |
| `distance_km` | `831` | Total distance in km |
| `train_category` | `"MAIL_EXPRESS"` | Train category |
| `gauge` | `"BG"` | Track gauge (BG = Broad Gauge) |
| `data_source` | `"erail.in"` | Source attribution |

### How to Run

```bash
cd Railway_data
python scrape_running_days.py
# Takes ~20 minutes (5 parallel threads)
# Safe to interrupt — resume by running again
```

> **Note:** Run this AFTER all seed scripts, as it updates existing `train_info` documents.

---

## 🛤️ Web Scraping — erail.in Train Routes

While the running days scraper uses erail's lightweight API, route data (all stopping stations for a train) requires **Selenium browser automation** — the route tables on erail.in are rendered by JavaScript and aren't available via simple HTTP requests.

This data is critical for the RAC project's **"Alternative Trains for RAC Passengers"** feature — finding trains that share common stations with a passenger's journey.

### How It Works

```mermaid
graph LR
    DB["train_info<br/>(12,813 trains)"] --> SCRIPT["scrape_train_routes.py"]
    SCRIPT -->|"5 Chrome workers"| CHROME["Headless Chrome<br/>(Selenium)"]
    CHROME -->|"Navigate & search"| ERAIL["erail.in<br/>Train Route Table"]
    ERAIL -->|"JS extraction"| PARSE["Parse stops:<br/>code, name, zone,<br/>arr, dep, halt, dist, day"]
    PARSE --> ROUTES["train_routes<br/>collection"]
```

For each train, the scraper:

1. Opens erail.in in headless Chrome
2. Types the train number into the `txtTrain_no` input field
3. Clicks the "Find Train" link (an `<a>` tag, not a button)
4. Polls for up to 10 seconds until the route table loads
5. Extracts all stop data via JavaScript DOM traversal
6. Saves to MongoDB and a JSON file

### Technical Details

| Detail | Value |
|---|---|
| **Tool** | Selenium WebDriver with headless Chrome |
| **Concurrency** | Multi-threaded (configurable, default 5 workers) |
| **Page load** | `eager` strategy (skips images/ads), 60s timeout |
| **Data wait** | Polling every 1s for up to 10s (adaptive, not fixed wait) |
| **Resume** | Progress saved to `route_scrape_progress.json` |
| **Error handling** | Auto-dismiss JS alerts, recreate driver after 3 consecutive failures |
| **Output** | MongoDB `train_routes` collection + individual `route_XXXXX.json` files |

### Data Format (per document in `train_routes`)

```json
{
    "train_number": "17225",
    "total_stops": 28,
    "source_station": "NS",
    "dest_station": "UBL",
    "stop_codes": ["NS", "DHNE", "PDL", "GTL", "...", "UBL"],
    "total_distance_km": 831,
    "stops": [
        {
            "stop_number": 1,
            "station_code": "NS",
            "station_name": "Narasapur",
            "zone": "SCR",
            "arrival": "First",
            "departure": "16.20",
            "halt_minutes": 0,
            "distance_km": 0,
            "day": 1
        },
        ...
    ],
    "scraped_at": "2026-03-10 22:29:54",
    "source": "erail.in"
}
```

### Key Query: Finding Alternative Trains

The `stop_codes` array field is indexed, enabling fast queries to find trains sharing common stations:

```javascript
// Find all trains that pass through both Vijayawada and Hyderabad
db.train_routes.find({
    stop_codes: { $all: ["BZA", "SC"] }
})
```

### How to Run

```bash
cd Railway_data

# Single train test
python scrape_train_routes.py 17225

# Small batch test (first 10 trains, 3 workers)
python scrape_train_routes.py --batch 10 --workers 3

# Full run (all 12,813 trains)
python scrape_train_routes.py --all --workers 5

# Re-run to retry failed trains (skips already completed)
python scrape_train_routes.py --all --workers 5
```

### Scraping Results

| Result | Approx Count | Notes |
|---|---|---|
| ✅ Route scraped | ~8,000+ | Mainline express, superfast, rajdhani, passenger trains |
| ❌ No data on erail | ~4,000+ | Local/suburban, metro, cancelled, test trains |

Trains with "no data" are local/suburban/metro trains — they don't have route pages on erail.in, and they don't carry RAC passengers, so they're not relevant to the feature.

> **Note:** Failed trains are retried on each re-run. Only successfully scraped trains are skipped. The scraper can be Ctrl+C'd and resumed safely.

> **Prerequisite:** `pip install selenium pymongo` + Chrome browser installed

---

## � Gap Filling — Datameet & Internal Data

After the initial APK extraction and erail.in scraping, several fields remained empty (57.7% gap in some fields). We filled these using **two strategies**: cross-referencing existing MongoDB data and integrating the **datameet/railways** open dataset from GitHub.

### Data Source: datameet/railways

| Detail | Value |
|---|---|
| **Repository** | [github.com/datameet/railways](https://github.com/datameet/railways) |
| **File** | `stations.json` (GeoJSON format) |
| **Records** | 8,736 stations with code, name, state, zone, address, lat/lng |
| **License** | Open Data |

### Gap-Filling Scripts

All scripts are in the `Railway_data/filling_gaps/` folder:

| Script | What it fills | Source | Records Updated |
|---|---|---|---|
| `fill_num_cars.py` | `train_info.num_cars` | `coach_positions.total_coaches` | 7,028 |
| `fill_ac_type.py` | `train_info.ac_type` | `train_info.classes` bitmask | 7,391 |
| `fill_speed_type.py` | `train_info.speed_type` | `train_info.train_type` + `train_category` | 7,391 |
| `fill_station_names.py` | `station_zones.station_name` | datameet `stations.json` | 288 |
| `fill_from_datameet.py` | `station_info.city` + `station_zones` (new entries) | datameet `stations.json` | 302+ |

### How Each Script Works

**`fill_num_cars.py`** — Counts coaches from `coach_positions.total_coaches` and writes to `train_info.num_cars`. No external data needed.

**`fill_ac_type.py`** — Analyzes the `classes` bitmask in `train_info` to determine if a train is AC or NON_AC. Result: 6,858 AC + 533 NON_AC.

**`fill_speed_type.py`** — Maps `train_type` (MEX, RAJ, SF) and `train_category` (MAIL_EXPRESS, SUPERFAST) to speed codes: S(uperfast), M(ail/Express), R(ajdhani).

**`fill_station_names.py`** — Downloads `stations.json` from datameet GitHub, builds a code→name lookup, and fills empty `station_name` fields in `station_zones`. Also marks prefixed codes (XX-, YY-) as operational.

**`fill_from_datameet.py`** — Comprehensive enrichment from datameet:
- Fills empty `station_info.city` with state/city from datameet addresses
- Fixes zero lat/lng coordinates
- Adds 302 new station entries to `station_zones` with zone data

### How to Run

```bash
cd Railway_data/filling_gaps
python fill_num_cars.py
python fill_ac_type.py
python fill_speed_type.py
python fill_station_names.py
python fill_from_datameet.py
```

> **Prerequisite:** `pip install pymongo requests`
>
> **Note:** Run these AFTER the seed scripts and scraper, as they depend on existing data.

---

## �🧠 Skills Demonstrated

- Android reverse engineering (ADB + APK extraction)
- SQLite database analysis
- Binary file format investigation
- Data engineering & ETL pipeline
- MongoDB schema design with validation rules
- Python scripting for data transformation
- Web scraping with rate limiting, parallelism & resume capability
- Browser automation (Selenium + headless Chrome) for JS-rendered content
- Multi-threaded scraping with progress tracking & error recovery
- Open dataset integration (datameet/railways GeoJSON)
- Cross-collection data enrichment strategies
- System architecture design

---

*Data snapshot: April 2025 | App version: 7.2.9*
*Sources: Where is My Train (Sigmoid Labs / Google) + erail.in (running days) + datameet/railways (station enrichment)*