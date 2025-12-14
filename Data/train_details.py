from pymongo import MongoClient

# ─── 1️⃣ Connect to MongoDB ─────────────────────────────
client = MongoClient("mongodb://localhost:27017/")  # Update if using Mongo Atlas or custom URL

# ─── 2️⃣ Create / Connect to Database ─────────────────────
db = client["rac"]

# ─── 3️⃣ Create / Connect to Collection ────────────────────
collection = db["Trains_Details"]

# ─── 4️⃣ Define Train Data ─────────────────────────────────
trains_data = [
    {"S_No": 1, "Train_No": 17225, "Train_Name": "Amaravathi Express", "Total_Coaches": 16, "Sleeper_Coaches_Count": 9, "Three_TierAC_Coaches_Count": 2, "Station_Collection_Name ": "17225_stations" },
    {"S_No": 2, "Train_No": 12295, "Train_Name": "Sanghamitra Express", "Total_Coaches": 23, "Sleeper_Coaches_Count": 7, "Three_TierAC_Coaches_Count": 5, "Station_Collection_Name ": "12295_stations"  },
    {"S_No": 3, "Train_No": 12615, "Train_Name": "Grand Trunk Express", "Total_Coaches": 22, "Sleeper_Coaches_Count": 6, "Three_TierAC_Coaches_Count": 6, "Station_Collection_Name ": "12615_stations"  },
    {"S_No": 4, "Train_No": 12627, "Train_Name": "Karnataka Express", "Total_Coaches": 23, "Sleeper_Coaches_Count": 7, "Three_TierAC_Coaches_Count": 6, "Station_Collection_Name ": "12627_stations"  },
    {"S_No": 5, "Train_No": 12809, "Train_Name": "Howrah Mail Express", "Total_Coaches": 23, "Sleeper_Coaches_Count": 7, "Three_TierAC_Coaches_Count": 5, "Station_Collection_Name ": "12809_stations"  },
    {"S_No": 6, "Train_No": 15120, "Train_Name": "Dehradun–Banaras Express", "Total_Coaches": 16, "Sleeper_Coaches_Count": 3, "Three_TierAC_Coaches_Count": 0, "Station_Collection_Name ": "15120_stations"  },
    {"S_No": 7, "Train_No": 17247, "Train_Name": "Narasapur–Dharmavaram Express", "Total_Coaches": 23, "Sleeper_Coaches_Count": 13, "Three_TierAC_Coaches_Count": 4, "Station_Collection_Name ": "17247_stations"  },
    {"S_No": 8, "Train_No": 17480, "Train_Name": "Tirupati–Puri Express", "Total_Coaches": 20, "Sleeper_Coaches_Count": 9, "Three_TierAC_Coaches_Count": 5, "Station_Collection_Name ": "17480_stations" },
    {"S_No": 9, "Train_No": 18519, "Train_Name": "Visakhapatnam–LTT Express", "Total_Coaches": 20, "Sleeper_Coaches_Count": 6, "Three_TierAC_Coaches_Count": 6, "Station_Collection_Name ": "18519_stations"  },
    {"S_No": 10, "Train_No": 22536, "Train_Name": "Banaras–Rameswaram Express", "Total_Coaches": 21, "Sleeper_Coaches_Count": 5, "Three_TierAC_Coaches_Count": 8, "Station_Collection_Name ": "22536_stations" },
    {"S_No": 11, "Train_No": 16734, "Train_Name": "Okha–Rameswaram Express", "Total_Coaches": 20, "Sleeper_Coaches_Count": 6, "Three_TierAC_Coaches_Count": 8, "Station_Collection_Name ": "16734_stations" }
]

# ─── 5️⃣ Insert Data into Collection ──────────────────────
insert_result = collection.insert_many(trains_data)

# ─── 6️⃣ Confirmation Output ──────────────────────────────
print(f"train records inserted successfully into 'Trains_details' collection!")
