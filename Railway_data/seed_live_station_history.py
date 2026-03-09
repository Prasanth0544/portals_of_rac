"""
Seed live_station_history collection (schema only) into RailwayData MongoDB
Source: userData.db -> live_station_to_history table
"""
from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"
COLLECTION = "live_station_history"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "properties": {
            "from_station": {"bsonType": "string", "description": "Source station code"},
            "to_station":   {"bsonType": "string", "description": "Destination station code"},
        }
    }
}

def main():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    if COLLECTION in db.list_collection_names():
        db.drop_collection(COLLECTION)
    db.create_collection(COLLECTION, validator=VALIDATOR)
    db[COLLECTION].create_index("from_station")
    print(f"✅ {COLLECTION}: created with schema validation in {DB_NAME}")
    client.close()

if __name__ == "__main__":
    main()
