"""
Seed chat_history collection (schema only) into RailwayData MongoDB
Source: chat.db -> history table
"""
from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"
COLLECTION = "chat_history"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "properties": {
            "message": {"bsonType": "string", "description": "Chat/feedback message"},
            "source":  {"bsonType": "string", "description": "Message source (user/support)"},
        }
    }
}

def main():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    if COLLECTION in db.list_collection_names():
        db.drop_collection(COLLECTION)
    db.create_collection(COLLECTION, validator=VALIDATOR)
    print(f"✅ {COLLECTION}: created with schema validation in {DB_NAME}")
    client.close()

if __name__ == "__main__":
    main()
