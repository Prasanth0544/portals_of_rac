
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")

db = client["PassengersDB"]
collection = db["P_1"]

new_passenger = {
    "IRCTC_ID": "IR_0001",
    "PNR_Number": "1000000001",
    "Train_Number": "17225",
    "Train_Name": "Amaravati Express",
    "Journey_Date": "15-11-2025",

    "Name": "Prasanth Gannavarapu",
    "Age": 20,
    "Gender": "Male",
    "Mobile": "9515796516",
    "Email": "prasanthgannavarapu12@gmail.com",

    "PNR_Status": "RAC",
    "Class": "Sleeper",
    "Rac_status": "1",

    "Boarding_Station": "Narasapur",
    "Deboarding_Station": "Nandyal",

    "Assigned_Coach": "S1",
    "Assigned_berth": 7,
    "Berth_Type": "Side Lower",

    "Passenger_Status": "Online",
    "NO_show": False
}

result = collection.insert_one(new_passenger)

print("Inserted _id:", result.inserted_id)
