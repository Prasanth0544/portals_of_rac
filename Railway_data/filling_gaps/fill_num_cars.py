"""
Fill train_info.num_cars from coach_positions collection.
Uses the existing total_coaches field from coach_positions.

Gap: 7,391 trains missing num_cars (57.7%)
Source: coach_positions collection (already in MongoDB)
"""
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["RailwayData"]

train_info = db["train_info"]
coach_pos = db["coach_positions"]

# Build lookup: train_number -> total_coaches
lookup = {}
for doc in coach_pos.find({}, {"train_number": 1, "total_coaches": 1}):
    lookup[doc["train_number"]] = doc.get("total_coaches", 0)

print(f"Coach data available for {len(lookup)} trains")

# Find trains missing num_cars
missing = list(train_info.find({"$or": [{"num_cars": ""}, {"num_cars": None}, {"num_cars": 0}, {"num_cars": {"$exists": False}}]}))
print(f"Trains missing num_cars: {len(missing)}")

filled = 0
for doc in missing:
    train_no = doc["train_no"]
    if train_no in lookup and lookup[train_no]:
        train_info.update_one(
            {"train_no": train_no},
            {"$set": {"num_cars": lookup[train_no]}}
        )
        filled += 1
        if filled <= 5:
            print(f"  {train_no}: {lookup[train_no]} coaches")

print(f"\nDone! Filled num_cars for {filled} trains.")
client.close()
