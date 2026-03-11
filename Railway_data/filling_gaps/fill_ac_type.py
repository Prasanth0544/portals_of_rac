"""
Fill train_info.ac_type by analyzing the classes bitmask.
If a train has AC classes (1A, 2A, 3A, 3E, CC, EC, EA), it's "AC".
If it only has non-AC classes (SL, GN, 2S, FC), it's "NON_AC".

Gap: 7,391 trains missing ac_type (57.7%)
Source: classes bitmask in train_info (already in MongoDB)
"""
from pymongo import MongoClient

# Bitmask positions for AC classes
AC_BITS = {
    1: "3A",   # bit 1
    2: "2A",   # bit 2
    3: "1A",   # bit 3
    4: "CC",   # bit 4
    5: "EC",   # bit 5
    8: "3E",   # bit 8
}

client = MongoClient("mongodb://localhost:27017")
db = client["RailwayData"]
train_info = db["train_info"]

missing = list(train_info.find({"$or": [{"ac_type": ""}, {"ac_type": None}, {"ac_type": {"$exists": False}}]}))
print(f"Trains missing ac_type: {len(missing)}")

filled = 0
ac_count = 0
non_ac_count = 0

for doc in missing:
    classes = doc.get("classes", 0)
    if not isinstance(classes, int):
        try:
            classes = int(classes)
        except:
            continue

    # Check if any AC class bit is set
    has_ac = any((classes >> bit) & 1 for bit in AC_BITS.keys())

    ac_type = "AC" if has_ac else "NON_AC"
    train_info.update_one(
        {"train_no": doc["train_no"]},
        {"$set": {"ac_type": ac_type}}
    )
    filled += 1
    if has_ac:
        ac_count += 1
    else:
        non_ac_count += 1

    if filled <= 5:
        print(f"  {doc['train_no']}: classes={classes} -> {ac_type}")

print(f"\nDone! Filled ac_type for {filled} trains.")
print(f"  AC: {ac_count} | NON_AC: {non_ac_count}")
client.close()
