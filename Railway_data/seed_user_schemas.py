"""
Seed user data schemas into RailwayData MongoDB
Source: alarm.db, chat.db, userData.db (all empty tables - schema only)

Creates collections with schema validation and indexes.
Excludes: meal_preference field from passenger_details.
"""

from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"

SCHEMAS = {
    # From alarm.db
    "location_alarms": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["uuid", "train_no"],
                "properties": {
                    "uuid":            {"bsonType": "string", "description": "Unique alarm ID"},
                    "train_no":        {"bsonType": "string", "description": "Train number"},
                    "from_station":    {"bsonType": "string", "description": "Source station code"},
                    "to_station":      {"bsonType": "string", "description": "Destination station code"},
                    "server_updated":  {"bsonType": "bool",   "description": "Sync status"},
                }
            }
        },
        "indexes": [("uuid", 1)],
    },

    # From chat.db
    "chat_history": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "properties": {
                    "message":  {"bsonType": "string", "description": "Chat/feedback message"},
                    "source":   {"bsonType": "string", "description": "Message source (user/support)"},
                }
            }
        },
        "indexes": [],
    },

    # From userData.db
    "train_history": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["train_no"],
                "properties": {
                    "train_no":      {"bsonType": "string", "description": "Train number"},
                    "train_name":    {"bsonType": "string", "description": "Train name"},
                    "src_station":   {"bsonType": "string", "description": "Source station code"},
                    "dest_station":  {"bsonType": "string", "description": "Destination station code"},
                    "created_at":    {"bsonType": "long",   "description": "Timestamp"},
                    "valid":         {"bsonType": "int",    "description": "Is entry valid (1/0)"},
                }
            }
        },
        "indexes": [("train_no", 1)],
    },

    "pnr_status": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["pnr"],
                "properties": {
                    "pnr":               {"bsonType": "string", "description": "PNR number"},
                    "pnr_info":          {"bsonType": "string", "description": "PNR details JSON"},
                    "status":            {"bsonType": "int",    "description": "Status code"},
                    "expiry_timestamp":  {"bsonType": "long",   "description": "Cache expiry"},
                }
            }
        },
        "indexes": [("pnr", 1)],
    },

    "passenger_details": {
        "validator": {
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
        },
        "indexes": [("id", 1), ("name", 1)],
    },

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
        "indexes": [("pnr", 1)],
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
        "indexes": [("pnr", 1)],
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
        "indexes": [("pnr", 1)],
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
        "indexes": [("pnr", 1)],
    },

    "live_station_history": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "properties": {
                    "from_station": {"bsonType": "string", "description": "Source station code"},
                    "to_station":   {"bsonType": "string", "description": "Destination station code"},
                }
            }
        },
        "indexes": [("from_station", 1)],
    },
}


def main():
    print("📋 User Data Schemas Seeder")
    print("=" * 50)

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    for col_name, config in SCHEMAS.items():
        # Drop if exists
        if col_name in db.list_collection_names():
            db.drop_collection(col_name)

        # Create with schema validation
        db.create_collection(col_name, validator=config["validator"])

        # Create indexes
        col = db[col_name]
        for idx_field, direction in config["indexes"]:
            col.create_index([(idx_field, direction)])

        # Get field count from schema
        props = config["validator"]["$jsonSchema"].get("properties", {})
        fields = list(props.keys())
        print(f"   ✅ {col_name:25} | {len(fields)} fields | indexes: {[i[0] for i in config['indexes']]}")

    print(f"\n✅ Created {len(SCHEMAS)} collections in {DB_NAME} (all empty, with schema validation)")

    # Print summary by source
    print("\n📋 Source mapping:")
    print("   alarm.db    → location_alarms")
    print("   chat.db     → chat_history")
    print("   userData.db → train_history, pnr_status, passenger_details,")
    print("                  pnr_jobs, pnr_updates, pnr_notifications,")
    print("                  pnr_retry, live_station_history")
    print("\n   ❌ Excluded: meal_preference (from passenger_details)")

    client.close()
    print("\n✅ Done!")


if __name__ == "__main__":
    main()
