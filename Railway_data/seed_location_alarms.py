"""
Seed location_alarms collection (schema only) into RailwayData MongoDB
Source: alarm.db -> locationalarm table
"""
from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"
COLLECTION = "location_alarms"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["uuid", "train_no"],
        "properties": {
            "uuid":           {"bsonType": "string", "description": "Unique alarm ID"},
            "train_no":       {"bsonType": "string", "description": "Train number"},
            "from_station":   {"bsonType": "string", "description": "Source station code"},
            "to_station":     {"bsonType": "string", "description": "Destination station code"},
            "server_updated": {"bsonType": "bool",   "description": "Sync status"},
        }
    }
}

def main():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    if COLLECTION in db.list_collection_names():
        db.drop_collection(COLLECTION)
    db.create_collection(COLLECTION, validator=VALIDATOR)
    db[COLLECTION].create_index("uuid")
    print(f"✅ {COLLECTION}: created with schema validation in {DB_NAME}")
    client.close()

if __name__ == "__main__":
    main()
