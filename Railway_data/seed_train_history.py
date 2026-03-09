"""
Seed train_history collection (schema only) into RailwayData MongoDB
Source: userData.db -> train_history table
"""
from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"
COLLECTION = "train_history"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["train_no"],
        "properties": {
            "train_no":     {"bsonType": "string", "description": "Train number"},
            "train_name":   {"bsonType": "string", "description": "Train name"},
            "src_station":  {"bsonType": "string", "description": "Source station code"},
            "dest_station": {"bsonType": "string", "description": "Destination station code"},
            "created_at":   {"bsonType": "long",   "description": "Timestamp"},
            "valid":        {"bsonType": "int",    "description": "Is entry valid (1/0)"},
        }
    }
}

def main():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    if COLLECTION in db.list_collection_names():
        db.drop_collection(COLLECTION)
    db.create_collection(COLLECTION, validator=VALIDATOR)
    db[COLLECTION].create_index("train_no")
    print(f"✅ {COLLECTION}: created with schema validation in {DB_NAME}")
    client.close()

if __name__ == "__main__":
    main()
