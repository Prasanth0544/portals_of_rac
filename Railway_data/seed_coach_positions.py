"""
Seed coach_positions collection into RailwayData MongoDB
Reads: coach_positions.txt (12,444 train coach layouts)

Each document:
  - train_number       (e.g. "01005")
  - rake_type          (e.g. "LHB Rake")
  - reversal_stations  (list, e.g. ["KURJ", "PRYJ"])
  - coaches            (list, e.g. ["L","SLR","A4",...,"EOG","L"])
  - total_coaches      (int, total coach count)
  - has_layout         (bool, False if only "L")
"""

from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"
COLLECTION = "coach_positions"

DATA_FILE = r"C:\Users\prasa\Documents\RailWayData\base\assets\train_info\coach_positions.txt"


def main():
    print("🚃 Coach Positions Seeder")
    print("=" * 50)

    with open(DATA_FILE, "r") as f:
        lines = [l.strip() for l in f if l.strip()]

    print(f"   📖 Read {len(lines)} lines from coach_positions.txt")

    docs = []
    no_layout = 0

    for line in lines:
        parts = line.split("|")
        train_number = parts[0].strip() if len(parts) > 0 else ""
        rake_type = parts[1].strip() if len(parts) > 1 else ""
        reversal_str = parts[2].strip() if len(parts) > 2 else ""
        coaches_str = parts[3].strip() if len(parts) > 3 else ""

        reversal_stations = [s.strip() for s in reversal_str.split(",") if s.strip()] if reversal_str else []
        coaches = [c.strip() for c in coaches_str.split(",") if c.strip()] if coaches_str else []

        has_layout = not (len(coaches) <= 1 and (not coaches or coaches == ["L"]))
        if not has_layout:
            no_layout += 1

        docs.append({
            "train_number": train_number,
            "rake_type": rake_type,
            "reversal_stations": reversal_stations,
            "coaches": coaches,
            "total_coaches": len(coaches),
            "has_layout": has_layout,
        })

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    db[COLLECTION].drop()
    db[COLLECTION].insert_many(docs)

    db[COLLECTION].create_index("train_number")
    db[COLLECTION].create_index("rake_type")

    with_layout = len(docs) - no_layout

    print(f"\n✅ {COLLECTION}: {len(docs)} documents inserted into {DB_NAME}")
    print(f"   📊 With full layout: {with_layout}")
    print(f"   📊 Layout unknown (L only): {no_layout}")

    # Rake type summary
    rake_counts = {}
    for d in docs:
        rt = d["rake_type"] or "(empty)"
        rake_counts[rt] = rake_counts.get(rt, 0) + 1

    print("\n📋 Rake Type Distribution:")
    for rt, count in sorted(rake_counts.items(), key=lambda x: -x[1]):
        print(f"   {rt:20} : {count}")

    # Sample docs
    print("\n📋 Sample documents:")
    samples = [d for d in docs if d["has_layout"] and d["total_coaches"] > 10][:5]
    for d in samples:
        coaches_preview = ",".join(d["coaches"][:8]) + ("..." if len(d["coaches"]) > 8 else "")
        rev = ",".join(d["reversal_stations"]) if d["reversal_stations"] else "-"
        print(f"   {d['train_number']} | {d['rake_type']:15} | {d['total_coaches']:2} coaches | rev={rev}")
        print(f"          [{coaches_preview}]")

    client.close()
    print(f"\n✅ Done!")


if __name__ == "__main__":
    main()
