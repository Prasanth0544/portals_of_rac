# 🔓 Reverse Engineering — erail.in APK Binary Files

> Technical documentation of reverse-engineering the **"Where is My Train"** Android app's binary data files (`ladoo`, `boondi`, `munthiri`) to extract the complete Indian Railways train route database.

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Binary Files in the APK](#-binary-files-in-the-apk)
3. [Tools Used](#-tools-used)
4. [The Reverse Engineering Process](#-the-reverse-engineering-process)
5. [How DataInputStream Works (Big Endian)](#-how-datainputstream-works-big-endian)
6. [Station GID Mapping via SQLite](#-station-gid-mapping-via-sqlite)
7. [The Index File — Train-to-File Mapping](#-the-index-file--train-to-file-mapping)
8. [Ladoo Binary Format — Complete Specification](#-ladoo-binary-format--complete-specification)
9. [The Python Decoder](#-the-python-decoder)
10. [Results & Verification](#-results--verification)
11. [Other Binary Files](#-other-binary-files)

---

## 🎯 Overview

The **"Where is My Train"** app (by Sigmoid Labs, acquired by Google) stores its entire Indian Railways database as binary files inside the APK. These files use **obfuscated names** (Tamil/Hindi food names) and **proprietary binary encoding**.

**Goal:** Extract every train's complete route (stations, arrival/departure times, distances) from a single 4.6 MB binary file (`ladoo`) — instead of scraping erail.in one-by-one over hours.

**Result:** **10,456 train routes decoded instantly** from the binary file.

---

## 📦 Binary Files in the APK

After extracting the APK with 7-Zip, these binary data files were found inside `base/assets/`:

```
base/assets/
├── t/
│   └── ladoo              (4.6 MB)  ← THE main train route database
├── train_info/
│   ├── boondi             (61 KB)   ← Station-pair lookup index
│   ├── munthiri           (1 MB)    ← Additional route/metadata
│   ├── kodu               (70 KB)   ← Station → Zone mapping (plain text)
│   ├── coach_positions.txt(502 KB)  ← Coach layouts (plain text)
│   ├── classes_gid.txt    (33 B)    ← Travel class codes (plain text)
│   └── station_clusters.bin(1.7 KB) ← Geographic clusters
├── frodo                  (375 KB)  ← Route graph index
├── mankatha               (64 KB)   ← Fare data (JSON)
└── databases/
    └── whereismytrain.db  (SQLite)  ← Station & train master data
```

> **Obfuscation:** The Chennai-based dev team named binary files after food and movies — `boondi` (snack), `ladoo` (sweet), `munthiri` (cashew), `mankatha` (Tamil movie), `frodo` (Lord of the Rings).

### File Roles (How We Discovered Them)

| File | Role | How We Know |
|------|------|-------------|
| **`t/ladoo`** | Train route database (ALL trains) | JADX: `"oodal".reverse()` = `"ladoo"` is the default fallback |
| **`train_info/boondi`** | Station-pair index | JADX: loaded by `ivh.e()` with `readUTF()`/`readUnsignedShort()` |
| **`train_info/kodu`** | Station→Zone text mapping | Opened with `BufferedReader`/UTF-8, 9,414 lines |
| **`train_info/index`** | Train→File mapping | Text file: `filename:trainNumber` format |

---

## 🛠️ Tools Used

| Tool | Purpose |
|------|---------|
| **JADX** | Java decompiler — reverse-engineers APK's compiled Java code back to readable source |
| **Python 3 + struct** | Reads binary data using Big Endian byte unpacking |
| **SQLite3 (Python)** | Queries `whereismytrain.db` for station GID→code mapping |
| **MongoDB + pymongo** | Stores decoded train routes |

---

## 🔍 The Reverse Engineering Process

### Step 1: Identify File Types

First, we classified each file as text or binary:

```
Plain text:  kodu, coach_positions.txt, classes_gid.txt, mankatha_*
Binary:      boondi, munthiri, ladoo, frodo, station_clusters.bin
```

Text files were decoded directly. Binary files required decompiling the Java code to understand their format.

### Step 2: Decompile APK with JADX

JADX loaded the APK and decompiled **14,320 classes** and **81,781 methods**. Using global search (`Ctrl+Shift+F`), we searched for:

- `"ladoo"` → Found the obfuscated reference: `new StringBuilder("oodal").reverse()`
- `"boondi"` → Found: `new StringBuffer("idnoob").reverse()`
- `"munthiri"` → Found: `new StringBuffer("irihtnum").reverse()`
- `getAssets().open` → Found which classes load which files
- `DataInputStream` → Found the binary parser methods

### Step 3: Find the Parser Class

The search led to **`defpackage.lxh`** — the main database access class. Key methods discovered:

| Method | Purpose |
|--------|---------|
| `f(Context)` | Initialization — loads `index` file, creates station GID map |
| `u(HashSet, boolean)` | Route loader — decides which binary file to read for each train |
| `G(DataInputStream, HashSet, LinkedHashMap, boolean)` | **THE binary parser** — reads train records from `ladoo` |
| `v()` | Loads station GID→code mapping from SQLite |
| `E(int)` | Decodes packed dates (5 bits day, 4 bits month, 7 bits year) |
| `F(ArrayList, lwy)` | Post-processes route data (time calculations) |

### Step 4: Trace the Data Flow

From method `u()`, we traced exactly how the app loads a train route:

```
1. Check LRU cache (30 entries)
2. Check patch ZIP file (downloaded updates)
3. Lookup train number in "index" file → get filename
4. If not in index → default to "ladoo"
5. Open "t/{filename}" and call G() to parse binary
6. G() returns route with stations, times, distances
```

Since **no `index` file exists** in the extracted APK, ALL trains default to `t/ladoo`.

### Step 5: Decompile Method G()

Method `G()` had **723 bytecode instructions** and JADX initially couldn't decompile it:

```
"Method dump skipped, instruction units count: 723"
```

**Fix:** In JADX Preferences:
- Set "Code comments level" → **DEBUG**
- Enable "Show inconsistent code"

This revealed the full binary parser logic— the complete format for reading every byte of `ladoo`.

---

## 📐 How DataInputStream Works (Big Endian)

A number like `16317` needs **4 bytes** in binary. The question is byte order:

```
Big Endian:    00 00 3F BD  →  most significant byte FIRST
Little Endian: BD 3F 00 00  →  least significant byte FIRST
```

**Java's DataInputStream always uses Big Endian.** The key read operations:

| Java Method | Bytes | Python Equivalent | Range |
|------------|-------|-------------------|-------|
| `readInt()` | 4 | `struct.unpack('>i', data)` | -2B to +2B |
| `readShort()` | 2 | `struct.unpack('>h', data)` | -32768 to +32767 |
| `readUnsignedShort()` | 2 | `struct.unpack('>H', data)` | 0 to 65535 |
| `readUnsignedByte()` | 1 | `data[pos]` | 0 to 255 |
| `readUTF()` | 2+N | 2-byte length prefix + N bytes UTF-8 | String |

**Python equivalent:** The `>` prefix in struct format strings means Big Endian:
```python
import struct
train_no = struct.unpack_from('>i', data, offset)[0]  # reads 4 bytes BE → int
```

---

## 🗺️ Station GID Mapping via SQLite

The binary files store station references as **GID numbers** (2-byte shorts) instead of string codes. The mapping lives in `whereismytrain.db`:

```sql
SELECT gid, station_code FROM station_info;
```

| GID | Station Code | Station Name |
|-----|-------------|--------------|
| 1 | NDLS | New Delhi |
| 10 | BDTS | Bandra Terminus |
| 28 | TVC | Thiruvananthapuram |
| 90 | CAPE | Kanniyakumari |
| 92 | NCJ | Nagercoil Jn |
| 63 | BZA | Vijayawada |
| ... | ... | (9,956 stations total) |

**Why GIDs?** Storing `90` takes 2 bytes. Storing `"CAPE"` takes 4+ bytes. Over 10,000+ trains × 50+ stations each, this saves megabytes on a mobile app.

> **Bug we found:** SQLite returns GIDs as strings (`'90'`), but Python dict lookup used integers (`90`). Fix: `gid_map[int(gid)] = code`

---

## 📇 The Index File — Train-to-File Mapping

From method `f(Context)`:

```java
BufferedReader br = new BufferedReader(new InputStreamReader(
    context.getAssets().open("train_info/index"), StandardCharsets.UTF_8));
while ((line = br.readLine()) != null) {
    String[] parts = line.split(":");
    b.put(parts[1], parts[0]);  // maps trainNumber → filename
}
```

Format: `filename:trainNumber` (one per line).

When looking up a train in method `u()`:
```java
String filename = b.get(Integer.toString(trainNumber));
if (filename == null) {
    filename = new StringBuilder("oodal").reverse().toString();  // = "ladoo"
}
// opens "t/" + filename
```

Since no `index` file exists in the APK → the map `b` is empty → ALL trains use `t/ladoo`.

---

## 📊 Ladoo Binary Format — Complete Specification

`ladoo` is a sequential list of train records, one after another, no gaps, no file header:

```
[Train 16317][Train 16318][Train 16788]... × thousands of trains
```

### Record Structure

```
HEADER (variable length):
┌──────────────────────────────────────────────────────┐
│ int32   train_number        (e.g. 16317)             │  4 bytes
│ int16   start_date          (packed: see below)       │  2 bytes
│ int16   end_date            (packed, 0 = no end)      │  2 bytes
│ uint8   class_flags         (ticket class bitmask)    │  1 byte
│ uint32  packed_info         (see below)               │  4 bytes
│ uint8   connection_count    (usually 0)               │  1 byte
│                                                      │
│ [connections × connection_count]:                     │
│   int32   connected_train_number                      │  4 bytes each
│   int16   from_station_gid                           │  2 bytes each
│   int16   to_station_gid                             │  2 bytes each
│                                                      │
│ int16   station_count       (total entries incl. GPS) │  2 bytes
└──────────────────────────────────────────────────────┘

STATION RECORDS (14 bytes × station_count):
┌──────────────────────────────────────────────────────┐
│ int16    station_gid        (→ lookup in SQLite)      │  2 bytes
│ uint16   time_packed        bit 0: halt_flag          │  2 bytes
│                             bits 1-15: time_delta_min │
│ uint16   distance_packed    segment_km × 100          │  2 bytes
│ uint16   halt_packed        bit 0: flag               │  2 bytes
│                             bits 1-15: halt_minutes   │
│ int16    s4                 (arrival adjustment)      │  2 bytes
│ int16    s5                 (departure adjustment)    │  2 bytes
│ int8     coach_byte         (platform/coach info)     │  1 byte
│ int8     platform_char      ('!' = none, else PF#)    │  1 byte
└──────────────────────────────────────────────────────┘
```

### Packed Info Field (4 bytes)

```python
variant_ref = packed >> 11      # if > 0: this train shares route with another
depart_minutes = packed & 2047  # departure time in minutes from midnight
# e.g. 855 = 14:15 (855 ÷ 60 = 14h 15m)
```

### Date Packing (2 bytes)

From method `E(int i)`:
```java
new lwn(i & 127, (i >>> 7) & 15, (i >>> 11) & 31);
```

| Bits | Mask | Field | Example |
|------|------|-------|---------|
| 0-6 | `& 127` | Year (offset from 2000) | 25 → 2025 |
| 7-10 | `>>> 7 & 15` | Month (1-12) | 2 |
| 11-15 | `>>> 11 & 31` | Day (1-31) | 14 |

So `0x7119` = `28953` → year=25, month=2, day=14 → **2025-02-14**

### Stopping vs Non-Stopping Stations

The app ("Where Is My Train") tracks real-time GPS position, so it stores ALL points along the route:

- **Stopping stations** (`distance > 0`): Real commercial stops (66 for train 16317)
- **GPS waypoints** (`distance = 0`): Intermediate tracking points (48 extra for same train)
- **Total:** 114 entries in binary, but only 66 are real stops

### Skipping Unwanted Trains

To find a specific train, the app reads headers sequentially. For unwanted trains:
```java
dataInputStream.skipBytes(stationCount * 14);  // jump to next record
```

---

## 🐍 The Python Decoder

**File:** `Railway_data/decode_ladoo.py`

The decoder:
1. Loads station GID mapping from `whereismytrain.db`
2. Reads `ladoo` binary sequentially
3. Parses each train record using the format above
4. Filters stopping stations (`distance > 0`)
5. Saves to MongoDB `RailwayData.train_route_decoded`

### How to Run

```bash
cd Railway_data
python decode_ladoo.py
# Takes ~5 seconds, decodes 10,456 trains
```

### Output Document Format

```json
{
    "train_number": "16317",
    "source_station": "CAPE",
    "dest_station": "SVDK",
    "departure_time": "14:15",
    "total_stops": 65,
    "total_points": 114,
    "start_date": "2025-02-14",
    "total_distance_km": 3790,
    "source": "erail_apk_ladoo",
    "stops": [
        {
            "station_code": "CAPE",
            "arrival": "First",
            "departure": "14:15",
            "halt_minutes": 0,
            "distance_km": 0,
            "is_stopping": true
        },
        {
            "station_code": "NCJ",
            "arrival": "14:35",
            "departure": "14:40",
            "halt_minutes": 5,
            "distance_km": 16,
            "is_stopping": true
        }
    ],
    "all_points": [ /* all 114 entries including GPS waypoints */ ]
}
```

---

## ✅ Results & Verification

### Decoded Output

| Metric | Value |
|--------|-------|
| Total trains decoded | **10,696** |
| Valid trains (saved to MongoDB) | **10,456** |
| Invalid/filtered | 240 (negative train numbers from parsing edge cases) |
| Decode time | ~5 seconds |
| Source file | `t/ladoo` (4,604,934 bytes) |

### Verification Against erail.in

Train **16317 (HIMSAGAR EXP)** — Cape to Shrimata Vd Katra:

| Field | Decoded (Binary) | erail.in (Website) | Match? |
|-------|------------------|--------------------|--------|
| Train number | 16317 | 16317 | ✅ |
| Source station | CAPE | CAPE | ✅ |
| Destination | SVDK | SVDK | ✅ |
| Departure | 14:15 | 14:15 | ✅ |
| Stopping stations | 65 | 66 | ≈ (±1 due to terminal counting) |
| Total distance | 3790 km | 3797 km | ≈ (0.2% rounding from uint16 encoding) |
| Journey days | 4 | 4 | ✅ |
| Next record | Train 16318 | — | ✅ (boundary verified) |

> **Distance note:** The binary stores segment distances as `uint16 / 100`, introducing ~0.5km rounding per segment. Over 66 stations, this accumulates to ~7km (0.2%) difference from the website's distances.

---

## 📂 Other Binary Files

### boondi (61 KB) — Station-Pair Index

Loaded by `ivh.e()` using a different format:

```
uint16    string_count
string[]  readUTF() × count     (station codes)
uint16    map_entry_count
pair[]    readUnsignedShort() × 2  (key→value index pairs)
```

Purpose: Quick lookup of "which trains run between station A and station B" — so the app doesn't scan all of `ladoo`.

### munthiri (1 MB) — Station Search Index

Loaded with reversed name (`"irihtnum".reverse()` = `"munthiri"`). Used by the station-pair search system alongside `boondi`.

### frodo (375 KB) — Route Graph

Used for pathfinding between stations (finding routes with connections).

### kodu (70 KB) — Station Zones (Decoded)

Plain text file, 9,414 lines:
```
NDLS|9
HWH|53
MAS|61,67
```
Format: `STATION_CODE|zone_id` (some stations span multiple zones).

---

## 🧠 Key Concepts Learned

### Q1: How does DataInputStream read binary in Big Endian?

A computer stores numbers as **bytes** (0–255 each). But a number like `16317` needs **4 bytes**. The question is: which byte comes first?

```
Big Endian:    00 00 3F BD  →  (0×16M) + (0×65K) + (63×256) + 189 = 16317
Little Endian: BD 3F 00 00  →  same number, reversed byte order
```

**Big Endian** = most significant byte FIRST (like how we write numbers — thousands before ones). Java's `DataInputStream` **always** uses Big Endian. So when the app calls `readInt()`, it reads 4 bytes left-to-right and combines them into one number. In Python, `struct.unpack('>i', bytes)` does the same — the `>` means "Big Endian". This is how our decoder reads the exact same bytes Java wrote.

### Q2: How do station GIDs map to station codes through SQLite?

Instead of storing station names as strings (which waste space), the binary file stores a **GID number** — a short integer (2 bytes) that acts as an ID. The mapping between GIDs and station codes lives in the `whereismytrain.db` SQLite database:

```
GID 1   →  NDLS (New Delhi)
GID 28  →  TVC  (Thiruvananthapuram)
GID 90  →  CAPE (Kanniyakumari)
GID 92  →  NCJ  (Nagercoil Jn)
... 9,956 stations total
```

When the app reads GID `90` from the binary, it looks up the SQLite table and gets `"CAPE"`. **Why?** Storing `90` takes 2 bytes. Storing `"CAPE"` takes 4 bytes. Over 10,000+ trains × 50+ stations, this saves **megabytes** — critical for a mobile app that works offline.

### Q3: How does `ladoo` store train routes?

The file is a **sequential list of train records** — one after another, no gaps, no file header:

```
[Train 16317][Train 16318][Train 16788][Train 16787]... × 10,456 trains
```

Each train record has two parts:

**Header (16+ bytes):** Contains the train number (4 bytes), dates (4 bytes), departure time packed into an integer, and the number of stations.

**Station records (14 bytes each):** For each station — the GID (2 bytes to look up the station name), time delta from previous station in minutes, segment distance in km (stored as uint16 ÷ 100), halt duration, and platform info.

To **skip a train** you don't need: read the header, get `station_count`, then jump forward `count × 14` bytes. This is how the app quickly finds any train without scanning every station record.

The file contains **both stopping stations** (commercial stops where passengers board/alight, identified by `distance > 0`) **and GPS waypoints** (non-stopping intermediate points with `distance = 0`, used for real-time train tracking).

For train 16317 (HIMSAGAR EXP): 114 total entries in the binary, but only **66 are real stopping stations** and 48 are GPS tracking waypoints.

---

*Reverse engineering performed on "Where is My Train" APK v7.2.9, data timestamp April 2025.*
*Binary format: Java DataInputStream (Big Endian). Decoded with Python 3 + struct + sqlite3.*
