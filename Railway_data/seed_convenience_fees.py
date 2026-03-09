"""
Seed convenience_fees collection into RailwayData MongoDB
Reads: mankatha_part_2 (charge_type=1 entries = convenience fees)
"""

from pymongo import MongoClient
import json

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"
COLLECTION = "convenience_fees"

DATA_FILE = r"C:\Users\prasa\Documents\RailWayData\base\assets\mankatha_part_2"

CLASS_MAP = {
    0: ("1A", "AC First Class"),
    1: ("2A", "AC 2-Tier"),
    2: ("3A", "AC 3-Tier"),
    3: ("SL", "Sleeper"),
    4: ("GN", "General"),
    5: ("2S", "Second Sitting"),
    6: ("CC", "Chair Car"),
    7: ("3E", "AC 3-Tier Economy"),
    8: ("FC", "First Class"),
    9: ("EC", "Executive Chair Car"),
    10: ("EA", "Executive Anubhuti"),
    11: ("HA", "AC First (Rajdhani/Premium)"),
}

TRAIN_MAP = {
    0: "Rajdhani Express", 1: "Shatabdi Express", 3: "Duronto Express",
    4: "Jan Shatabdi", 5: "Garib Rath", 6: "Tejas Express",
    8: "Vande Bharat", 9: "Humsafar Express", 10: "Antyodaya Express",
    11: "Mahamana Express", 12: "Superfast Express",
}

def main():
    with open(DATA_FILE, "r") as f:
        raw = json.load(f)

    docs = []
    for entry in raw["other_charges"]:
        if entry["charge_type"] != 1:
            continue
        cls = CLASS_MAP.get(entry["class_type"], (f"TYPE_{entry['class_type']}", f"Unknown {entry['class_type']}"))
        docs.append({
            "class_code": cls[0],
            "class_name": cls[1],
            "class_type_id": entry["class_type"],
            "train_type": TRAIN_MAP.get(entry["train_type"], f"Unknown {entry['train_type']}"),
            "train_type_id": entry["train_type"],
            "charge": entry["charge"],
            "currency": "INR",
            "charge_category": "Convenience Fee",
        })

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    db[COLLECTION].drop()
    db[COLLECTION].insert_many(docs)
    print(f"✅ {COLLECTION}: {len(docs)} documents inserted into {DB_NAME}")
    for d in docs[:3]:
        print(f"   {d['class_code']} | {d['train_type']} | ₹{d['charge']}")
    client.close()

if __name__ == "__main__":
    main()
