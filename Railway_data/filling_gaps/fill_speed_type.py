"""
Fill train_info.speed_type by deriving from train_type and train_category.

Mapping logic:
  - SUP/SF/Superfast -> "SF" (Superfast)
  - RAJ/Rajdhani     -> "RAJ"
  - SHT/Shatabdi     -> "SHT"
  - DRON/Duronto     -> "DRN"
  - VB/Vande Bharat  -> "VB"
  - MEX/EXP/Express  -> "M" (Mail/Express)
  - PAS/Passenger    -> "P" (Passenger)
  - MEMU/DMU/Local   -> "L" (Local)
  - Others           -> "O" (Other)

Gap: 7,391 trains missing speed_type (57.7%)
Source: train_type + train_category fields (already in MongoDB)
"""
from pymongo import MongoClient

SPEED_MAP = {
    "SUP": "SF", "SF": "SF", "SSF": "SF",
    "RAJ": "RAJ",
    "SHT": "SHT", "JNS": "SHT",
    "DRON": "DRN", "DRN": "DRN",
    "VB": "VB", "VNDE": "VB",
    "MEX": "M", "EXP": "M", "SPL": "M",
    "PAS": "P",
    "MEMU": "L", "DMU": "L", "LOC": "L", "FMU": "L",
    "GR": "G", "GRBN": "G",  # Garib Rath
}

CATEGORY_MAP = {
    "SUPERFAST": "SF",
    "RAJDHANI": "RAJ",
    "SHATABDI": "SHT",
    "DURONTO": "DRN",
    "MAIL_EXPRESS": "M",
    "PASSENGER": "P",
    "MEMU": "L",
    "GARIB_RATH": "G",
}

client = MongoClient("mongodb://localhost:27017")
db = client["RailwayData"]
train_info = db["train_info"]

missing = list(train_info.find({"$or": [{"speed_type": ""}, {"speed_type": None}, {"speed_type": {"$exists": False}}]}))
print(f"Trains missing speed_type: {len(missing)}")

filled = 0
for doc in missing:
    train_type = doc.get("train_type", "").upper().strip()
    category = doc.get("train_category", "").upper().strip()

    speed = None
    # Try train_type first
    if train_type in SPEED_MAP:
        speed = SPEED_MAP[train_type]
    # Then try category
    elif category in CATEGORY_MAP:
        speed = CATEGORY_MAP[category]
    # Default
    else:
        speed = "O"

    train_info.update_one(
        {"train_no": doc["train_no"]},
        {"$set": {"speed_type": speed}}
    )
    filled += 1
    if filled <= 5:
        print(f"  {doc['train_no']}: type={train_type}, cat={category} -> {speed}")

print(f"\nDone! Filled speed_type for {filled} trains.")
client.close()
