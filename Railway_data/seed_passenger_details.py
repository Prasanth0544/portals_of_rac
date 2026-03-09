"""
Seed passenger_details collection (schema only) into RailwayData MongoDB
Source: userData.db -> passenger_details table
Note: meal_preference field excluded as per user request
"""
from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"
COLLECTION = "passenger_details"

VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["id", "name"],
        "properties": {
            "id":                  {"bsonType": "string", "description": "Passenger ID"},
            "name":                {"bsonType": "string", "description": "Full name"},
            "age":                 {"bsonType": "int",    "description": "Age"},
            "gender":              {"bsonType": "string", "description": "Gender"},
            "berth_preference":    {"bsonType": "string", "description": "Preferred berth (LB/UB/MB/SL/SU)"},
            "passenger_type":      {"bsonType": "string", "description": "Adult/Child/Senior"},
            "opt_child_berth":     {"bsonType": "int",    "description": "Child berth option (0/1)"},
            "senior_citizen_flag": {"bsonType": "int",    "description": "Senior citizen (0/1)"},
            "updated_at":          {"bsonType": "long",   "description": "Last update timestamp"},
        }
    }
}

def main():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    if COLLECTION in db.list_collection_names():
        db.drop_collection(COLLECTION)
    db.create_collection(COLLECTION, validator=VALIDATOR)
    db[COLLECTION].create_index("id")
    db[COLLECTION].create_index("name")
    print(f"✅ {COLLECTION}: created with schema validation in {DB_NAME} (meal_preference excluded)")
    client.close()

if __name__ == "__main__":
    main()
