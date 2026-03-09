"""
Seed schedule.db tables into RailwayData MongoDB
Source: schedule.db (metro/local train schedules)
All collections prefixed with ' schedule_' for grouping.

Collections created:
  - schedule_lines             (43 docs)
  - schedule_platform_sequence (237 docs)
  - schedule_stations          (778 docs)
  - schedule_station_names     (778 docs)
  - schedule_stop_times        (35,950 docs)
  - schedule_trips             (25,826 docs)
  - schedule_trip_calendar     (25 docs)
"""

from pymongo import MongoClient
import sqlite3

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"
SCHEDULE_DB = r"C:\Users\prasa\Documents\RailWayData\base\assets\databases\schedule.db"


def get_rows(conn, table):
    """Fetch all rows from a table as list of dicts."""
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {table}")
    cols = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    docs = []
    for row in rows:
        d = {}
        for k, v in zip(cols, row):
            if isinstance(v, bytes):
                d[k] = list(v)  # Convert binary to array of ints for MongoDB
            else:
                d[k] = v
        docs.append(d)
    return docs


def main():
    print("📅 Schedule DB Seeder (schedule_ prefix)")
    print("=" * 50)

    conn = sqlite3.connect(SCHEDULE_DB)
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    # Table → Collection mapping with indexes
    tables = {
        "Line": {
            "collection": "schedule_lines",
            "indexes": ["id"],
        },
        "PlatformSequence": {
            "collection": "schedule_platform_sequence",
            "indexes": ["id"],
        },
        "Station": {
            "collection": "schedule_stations",
            "indexes": ["id", "code"],
        },
        "StationName": {
            "collection": "schedule_station_names",
            "indexes": ["station_id", "name"],
        },
        "StopTimes": {
            "collection": "schedule_stop_times",
            "indexes": ["id", "stn_id"],
        },
        "Trip": {
            "collection": "schedule_trips",
            "indexes": ["id", "line_id"],
        },
        "TripCalendar": {
            "collection": "schedule_trip_calendar",
            "indexes": ["id"],
        },
    }

    total = 0

    for table_name, config in tables.items():
        col_name = config["collection"]

        # Get data from SQLite
        docs = get_rows(conn, table_name)

        # Drop and insert into MongoDB
        db[col_name].drop()
        if docs:
            db[col_name].insert_many(docs)

        # Create indexes
        for idx in config["indexes"]:
            db[col_name].create_index(idx)

        total += len(docs)
        print(f"   ✅ {col_name:25} | {len(docs):6} docs | indexes: {config['indexes']}")

    conn.close()
    client.close()

    print(f"\n✅ Total: {total} documents inserted into {DB_NAME}")
    print("✅ Done!")


if __name__ == "__main__":
    main()
