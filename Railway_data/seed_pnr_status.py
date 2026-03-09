"""
Seed pnr_status collection (schema only) into RailwayData MongoDB
Source: userData.db -> pnr_status table
"""
from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"
COLLECTION = "pnr_status"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["pnr"],
        "properties": {
            "pnr":              {"bsonType": "string", "description": "PNR number"},
            "pnr_info":         {"bsonType": "string", "description": "PNR details JSON"},
            "status":           {"bsonType": "int",    "description": "Status code"},
            "expiry_timestamp": {"bsonType": "long",   "description": "Cache expiry"},
        }
    }
}

def main():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    if COLLECTION in db.list_collection_names():
        db.drop_collection(COLLECTION)
    db.create_collection(COLLECTION, validator=VALIDATOR)
    db[COLLECTION].create_index("pnr")
    print(f"✅ {COLLECTION}: created with schema validation in {DB_NAME}")
    client.close()

if __name__ == "__main__":
    main()
