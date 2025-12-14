from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["rac"]
collection = db["17225_stations"]

# Train 17225 - Narasapur to Hubballi Jn
stations = [
    {"SNO": 1, "code": "NS", "Station_Name": "Narasapur", "Railway_Zone": "SCR", "Division": "BZA", "Arrival_Time": "First", "Departure_Time": "16.20", "Halt_Duration": 0, "Platform_Number": "-", "Distance": 0, "Day": 1, "Remarks": "-"},
    {"SNO": 2, "code": "PKO", "Station_Name": "Palakollu", "Railway_Zone": "SCR", "Division": "BZA", "Arrival_Time": "16.28", "Departure_Time": "16.30", "Halt_Duration": 2, "Platform_Number": "-", "Distance": 9, "Day": 1, "Remarks": "-"},
    {"SNO": 3, "code": "BVRM", "Station_Name": "Bhimavaram Jn", "Railway_Zone": "SCR", "Division": "BZA", "Arrival_Time": "16.48", "Departure_Time": "16.50", "Halt_Duration": 2, "Platform_Number": "-", "Distance": 30, "Day": 1, "Remarks": "-"},
    {"SNO": 4, "code": "BVRT", "Station_Name": "Bhimavaram Town", "Railway_Zone": "SCR", "Division": "BZA", "Arrival_Time": "16.58", "Departure_Time": "17.00", "Halt_Duration": 2, "Platform_Number": "-", "Distance": 31, "Day": 1, "Remarks": "-"},
    {"SNO": 5, "code": "AKVD", "Station_Name": "Akividu", "Railway_Zone": "SCR", "Division": "BZA", "Arrival_Time": "17.18", "Departure_Time": "17.20", "Halt_Duration": 2, "Platform_Number": "-", "Distance": 49, "Day": 1, "Remarks": "-"},
    {"SNO": 6, "code": "KKLR", "Station_Name": "Kaikolur", "Railway_Zone": "SCR", "Division": "BZA", "Arrival_Time": "17.38", "Departure_Time": "17.40", "Halt_Duration": 2, "Platform_Number": "-", "Distance": 66, "Day": 1, "Remarks": "-"},
    {"SNO": 7, "code": "GDV", "Station_Name": "Gudivada Jn", "Railway_Zone": "SCR", "Division": "BZA", "Arrival_Time": "18.13", "Departure_Time": "18.15", "Halt_Duration": 2, "Platform_Number": "-", "Distance": 95, "Day": 1, "Remarks": "-"},
    {"SNO": 8, "code": "BZA", "Station_Name": "Vijayawada Jn", "Railway_Zone": "SCR", "Division": "BZA", "Arrival_Time": "19.30", "Departure_Time": "19.45", "Halt_Duration": 15, "Platform_Number": 4, "Distance": 139, "Day": 1, "Remarks": "-"},
    {"SNO": 9, "code": "GNT", "Station_Name": "Guntur Jn", "Railway_Zone": "SCR", "Division": "GNT", "Arrival_Time": "21.00", "Departure_Time": "21.05", "Halt_Duration": 5, "Platform_Number": 4, "Distance": 171, "Day": 1, "Remarks": "-"},
    {"SNO": 10, "code": "NRT", "Station_Name": "Narasaraopet (PQ)", "Railway_Zone": "SCR", "Division": "GNT", "Arrival_Time": "21.29", "Departure_Time": "21.30", "Halt_Duration": 1, "Platform_Number": 2, "Distance": 216, "Day": 1, "Remarks": "-"},
    {"SNO": 11, "code": "VKN", "Station_Name": "Vinukonda", "Railway_Zone": "SCR", "Division": "GNT", "Arrival_Time": "22.03", "Departure_Time": "22.04", "Halt_Duration": 1, "Platform_Number": 1, "Distance": 253, "Day": 1, "Remarks": "-"},
    {"SNO": 12, "code": "KCD", "Station_Name": "Kurichedu", "Railway_Zone": "SCR", "Division": "GNT", "Arrival_Time": "22.20", "Departure_Time": "22.21", "Halt_Duration": 1, "Platform_Number": 1, "Distance": 278, "Day": 1, "Remarks": "-"},
    {"SNO": 13, "code": "DKD", "Station_Name": "Donakonda", "Railway_Zone": "SCR", "Division": "GNT", "Arrival_Time": "22.30", "Departure_Time": "22.31", "Halt_Duration": 1, "Platform_Number": "-", "Distance": 291, "Day": 1, "Remarks": "-"},
    {"SNO": 14, "code": "MRK", "Station_Name": "Markapur Road", "Railway_Zone": "SCR", "Division": "GNT", "Arrival_Time": "22.59", "Departure_Time": "23.00", "Halt_Duration": 1, "Platform_Number": 1, "Distance": 315, "Day": 1, "Remarks": "-"},
    {"SNO": 15, "code": "CBM", "Station_Name": "Cumbum", "Railway_Zone": "SCR", "Division": "GNT", "Arrival_Time": "23.24", "Departure_Time": "23.25", "Halt_Duration": 1, "Platform_Number": 1, "Distance": 341, "Day": 1, "Remarks": "-"},
    {"SNO": 16, "code": "GID", "Station_Name": "Giddalur", "Railway_Zone": "SCR", "Division": "GNT", "Arrival_Time": "00.03", "Departure_Time": "00.04", "Halt_Duration": 1, "Platform_Number": "-", "Distance": 374, "Day": 2, "Remarks": "-"},
    {"SNO": 17, "code": "NDL", "Station_Name": "Nandyal", "Railway_Zone": "SCR", "Division": "GNT", "Arrival_Time": "02.15", "Departure_Time": "02.20", "Halt_Duration": 5, "Platform_Number": "-", "Distance": 428, "Day": 2, "Remarks": "-"},
    {"SNO": 18, "code": "DHNE", "Station_Name": "Dhone Jn", "Railway_Zone": "SCR", "Division": "GTL", "Arrival_Time": "03.38", "Departure_Time": "03.40", "Halt_Duration": 2, "Platform_Number": "-", "Distance": 504, "Day": 2, "Remarks": "-"},
    {"SNO": 19, "code": "PDL", "Station_Name": "Pendekallu", "Railway_Zone": "SCR", "Division": "GTL", "Arrival_Time": "04.14", "Departure_Time": "04.15", "Halt_Duration": 1, "Platform_Number": "-", "Distance": 530, "Day": 2, "Remarks": "-"},
    {"SNO": 20, "code": "GTL", "Station_Name": "Guntakal Jn", "Railway_Zone": "SCR", "Division": "GTL", "Arrival_Time": "05.20", "Departure_Time": "05.30", "Halt_Duration": 10, "Platform_Number": 3, "Distance": 572, "Day": 2, "Remarks": "-"},
    {"SNO": 21, "code": "BAY", "Station_Name": "Bellary Jn", "Railway_Zone": "SWR", "Division": "UBL", "Arrival_Time": "06.50", "Departure_Time": "06.55", "Halt_Duration": 5, "Platform_Number": 2, "Distance": 623, "Day": 2, "Remarks": "-"},
    {"SNO": 22, "code": "TNGL", "Station_Name": "Toranagallu Jn", "Railway_Zone": "SWR", "Division": "UBL", "Arrival_Time": "07.30", "Departure_Time": "07.32", "Halt_Duration": 2, "Platform_Number": 2, "Distance": 655, "Day": 2, "Remarks": "-"},
    {"SNO": 23, "code": "HPT", "Station_Name": "Hosapete Jn", "Railway_Zone": "SWR", "Division": "UBL", "Arrival_Time": "08.10", "Departure_Time": "08.20", "Halt_Duration": 10, "Platform_Number": "-", "Distance": 688, "Day": 2, "Remarks": "-"},
    {"SNO": 24, "code": "MRB", "Station_Name": "Munirabad", "Railway_Zone": "SWR", "Division": "UBL", "Arrival_Time": "08.29", "Departure_Time": "08.30", "Halt_Duration": 1, "Platform_Number": 1, "Distance": 694, "Day": 2, "Remarks": "-"},
    {"SNO": 25, "code": "KBL", "Station_Name": "Koppal", "Railway_Zone": "SWR", "Division": "UBL", "Arrival_Time": "08.53", "Departure_Time": "08.55", "Halt_Duration": 2, "Platform_Number": 1, "Distance": 716, "Day": 2, "Remarks": "-"},
    {"SNO": 26, "code": "GDG", "Station_Name": "Gadag Jn", "Railway_Zone": "SWR", "Division": "UBL", "Arrival_Time": "09.40", "Departure_Time": "09.42", "Halt_Duration": 2, "Platform_Number": "-", "Distance": 773, "Day": 2, "Remarks": "-"},
    {"SNO": 27, "code": "NGR", "Station_Name": "Annigeri", "Railway_Zone": "SWR", "Division": "UBL", "Arrival_Time": "10.07", "Departure_Time": "10.08", "Halt_Duration": 1, "Platform_Number": "-", "Distance": 796, "Day": 2, "Remarks": "-"},
    {"SNO": 28, "code": "UBL", "Station_Name": "Hubballi Jn", "Railway_Zone": "SWR", "Division": "UBL", "Arrival_Time": "11.30", "Departure_Time": "Last", "Halt_Duration": 0, "Platform_Number": 2, "Distance": 831, "Day": 2, "Remarks": "-"}
]

# Insert all stations
collection.insert_many(stations)

print("✅ All stations for train 17225 inserted successfully with standardized field names!")
