"""
Seed PNR-related collections (schema only) into RailwayData MongoDB
Source: userData.db -> pnr_job_ids, pnr_update_info, pnr_notification_info, pnr_new_pnr_retry_info

Creates: pnr_jobs, pnr_updates, pnr_notifications, pnr_retry
"""
from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"

COLLECTIONS = {
    "pnr_jobs": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["pnr"],
                "properties": {
                    "pnr":              {"bsonType": "string", "description": "PNR number"},
                    "next_update_time": {"bsonType": "long",   "description": "Next check timestamp"},
                    "job_id":           {"bsonType": "int",    "description": "Background job ID"},
                }
            }
        },
    },
    "pnr_updates": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["pnr"],
                "properties": {
                    "pnr":     {"bsonType": "string", "description": "PNR number"},
                    "message": {"bsonType": "string", "description": "Update message (e.g. RAC->Confirmed)"},
                    "color":   {"bsonType": "string", "description": "Status color (green/red/orange)"},
                }
            }
        },
    },
    "pnr_notifications": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["pnr"],
                "properties": {
                    "pnr":     {"bsonType": "string", "description": "PNR number"},
                    "send_at": {"bsonType": "long",   "description": "Notification send timestamp"},
                }
            }
        },
    },
    "pnr_retry": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["pnr"],
                "properties": {
                    "pnr":         {"bsonType": "string", "description": "PNR number"},
                    "next_update": {"bsonType": "int",    "description": "Next retry time"},
                    "count":       {"bsonType": "int",    "description": "Retry count"},
                }
            }
        },
    },
}


def main():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    for col_name, config in COLLECTIONS.items():
        if col_name in db.list_collection_names():
            db.drop_collection(col_name)
        db.create_collection(col_name, validator=config["validator"])
        db[col_name].create_index("pnr")
        fields = list(config["validator"]["$jsonSchema"]["properties"].keys())
        print(f"✅ {col_name:20} | {len(fields)} fields | index: pnr")

    print(f"\n✅ Created {len(COLLECTIONS)} PNR collections in {DB_NAME}")
    client.close()

if __name__ == "__main__":
    main()
