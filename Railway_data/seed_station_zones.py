"""
Seed station_zones collection into RailwayData MongoDB
Reads: kodu file (station_code|zone_id mappings)
       whereismytrain.db (station names)
Maps zone IDs to official Indian Railway zone abbreviations and full names.

Output: 7 columns per document:
  - station_code        (e.g. "NDLS")
  - station_name        (e.g. "New Delhi")
  - zone_id             (e.g. 9)
  - zone                (e.g. "NR")
  - zone_name           (e.g. "Northern Railway")
  - zone_mapping        (e.g. "9" or "61,67" — original raw mapping)
  - zone_mapping_name   (e.g. "Northern Railway" or "Southern Railway, Southern Railway")
"""

from pymongo import MongoClient
import sqlite3

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"
COLLECTION = "station_zones"

DATA_FILE = r"C:\Users\prasa\Documents\RailWayData\base\assets\train_info\kodu"
STATION_DB = r"C:\Users\prasa\Documents\RailWayData\base\assets\databases\whereismytrain.db"

# Zone ID -> (Abbreviation, Full Name)
ZONE_MAP = {
    2:  ("NWR",  "North Western Railway"),
    3:  ("NR",   "Northern Railway (Delhi Division)"),
    5:  ("NR",   "Northern Railway (Ferozepur Division)"),
    7:  ("NR",   "Northern Railway (Ambala Division)"),
    9:  ("NR",   "Northern Railway"),
    13: ("WR",   "Western Railway"),
    17: ("SCR",  "South Central Railway"),
    19: ("NFR",  "Northeast Frontier Railway"),
    23: ("NER",  "North Eastern Railway"),
    27: ("NFR",  "Northeast Frontier Railway (Lumding Division)"),
    29: ("SER",  "South Eastern Railway"),
    31: ("SR",   "Southern Railway (Kerala)"),
    37: ("CR",   "Central Railway (Mumbai Division)"),
    41: ("CR",   "Central Railway"),
    43: ("ECR",  "East Central Railway"),
    47: ("ECoR", "East Coast Railway"),
    53: ("ER",   "Eastern Railway"),
    59: ("NR",   "Northern Railway (Jammu Division)"),
    61: ("SR",   "Southern Railway (Chennai Division)"),
    67: ("SR",   "Southern Railway"),
    71: ("SWR",  "South Western Railway"),
    73: ("NCR",  "North Central Railway"),
    79: ("WCR",  "West Central Railway"),
    89: ("SECR", "South East Central Railway"),
}


def load_station_names():
    """Load station_code -> station_name from whereismytrain.db"""
    conn = sqlite3.connect(STATION_DB)
    cursor = conn.execute("SELECT station_code, title FROM station_info")
    names = {row[0]: row[1] for row in cursor.fetchall()}
    conn.close()
    print(f"   📖 Loaded {len(names)} station names from whereismytrain.db")
    return names


def main():
    print("🚂 Station Zones Seeder")
    print("=" * 50)

    # Load station names
    station_names = load_station_names()

    with open(DATA_FILE, "r") as f:
        lines = [l.strip() for l in f if l.strip()]

    docs = []
    skipped = 0

    for line in lines:
        parts = line.split("|")
        station_code = parts[0]
        zone_ids_str = parts[1] if len(parts) > 1 else ""

        if not zone_ids_str:
            skipped += 1
            continue

        # Get station name from SQLite
        station_name = station_names.get(station_code, "")

        # A station can belong to multiple zones (e.g. MAS|61,67)
        zone_ids = [int(z.strip()) for z in zone_ids_str.split(",") if z.strip()]

        # Build full name mapping string (e.g. "61,67" -> "Southern Railway (Chennai Division), Southern Railway")
        zone_mapping_name = ", ".join(
            ZONE_MAP.get(int(z.strip()), ("", f"Unknown Zone {z.strip()}"))[1]
            for z in zone_ids_str.split(",") if z.strip()
        )

        for zid in zone_ids:
            zone_abbr, zone_name = ZONE_MAP.get(zid, (f"Z{zid}", f"Unknown Zone {zid}"))
            docs.append({
                "station_code": station_code,
                "station_name": station_name,
                "zone_id": zid,
                "zone": zone_abbr,
                "zone_name": zone_name,
                "zone_mapping": zone_ids_str,
                "zone_mapping_name": zone_mapping_name,
            })

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    db[COLLECTION].drop()
    db[COLLECTION].insert_many(docs)

    # Create indexes
    db[COLLECTION].create_index("station_code")
    db[COLLECTION].create_index("zone")

    unique_stations = len(set(d["station_code"] for d in docs))
    unique_zones = len(set(d["zone"] for d in docs))

    print(f"\n✅ {COLLECTION}: {len(docs)} documents inserted into {DB_NAME}")
    print(f"   📊 Unique stations: {unique_stations}")
    print(f"   📊 Unique zones: {unique_zones}")
    print(f"   ⚠️  Skipped (no zone): {skipped}")

    print("\n📋 Sample documents:")
    samples = ["NDLS", "HWH", "MAS", "ADI", "SBC", "PUNE", "PNBE", "GKP", "SC", "CSTM"]
    for s in samples:
        matches = [d for d in docs if d["station_code"] == s]
        for m in matches:
            print(f"   {m['station_code']:6} | {m['station_name']:25} | {m['zone']:5} | {m['zone_name']}")
            if m['zone_mapping'].find(',') != -1:
                print(f"          zone_mapping_name: {m['zone_mapping_name']}")

    client.close()
    print(f"\n✅ Done!")


if __name__ == "__main__":
    main()

