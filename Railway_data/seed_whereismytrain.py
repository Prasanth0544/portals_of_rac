"""
Seed whereismytrain.db tables into RailwayData MongoDB
Source: whereismytrain.db (master train & station catalog)
Uses original table names as collection names.

Collections created:
  - station_info          (9,956 docs)
  - train_info            (12,813 docs)
  - station_aka_info      (775 docs)
  - platform_direction    (351 docs)
  - from_to_suggestions   (schema only)
  - station_aka_info_local (schema only)
  - station_info_local    (schema only)
  - train_aka_info        (schema only)
  - train_aka_info_local  (schema only)
  - train_info_local      (schema only)
"""

from pymongo import MongoClient
import sqlite3

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"
WIMT_DB = r"C:\Users\prasa\Documents\RailWayData\base\assets\databases\whereismytrain.db"


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
                d[k] = list(v)
            else:
                d[k] = v
        docs.append(d)
    return docs


def main():
    print("🚂 WhereIsMyTrain DB Seeder")
    print("=" * 50)

    conn = sqlite3.connect(WIMT_DB)
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    # All 10 tables with their indexes
    tables = {
        "station_info":          ["station_code", "title"],
        "train_info":            ["train_no", "train_name"],
        "station_aka_info":      ["station_code"],
        "platform_direction":    ["station_code"],
        "from_to_suggestions":   ["from_station"],
        "station_aka_info_local": ["station_code"],
        "station_info_local":    ["gid"],
        "train_aka_info":        ["train_no"],
        "train_aka_info_local":  ["train_no"],
        "train_info_local":      ["train_no"],
    }

    total = 0

    for table_name, indexes in tables.items():
        docs = get_rows(conn, table_name)

        db[table_name].drop()

        if docs:
            db[table_name].insert_many(docs)
        else:
            # Create empty collection
            db.create_collection(table_name)

        for idx in indexes:
            db[table_name].create_index(idx)

        total += len(docs)
        status = f"{len(docs):6} docs" if docs else "schema only"
        print(f"   ✅ {table_name:25} | {status} | indexes: {indexes}")

    conn.close()
    client.close()

    print(f"\n✅ Total: {total} documents inserted into {DB_NAME}")
    print("✅ Done!")


if __name__ == "__main__":
    main()
