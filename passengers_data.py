# passengers_data.py
# MULTI-PASSENGER BOOKING SUPPORT: 1-6 passengers per PNR
# RAC + CNF ONLY (no Waitlist)
# Total: 1505 passengers

import random
import csv
import json
from collections import defaultdict
from pymongo import MongoClient

# ==============================
# DATABASE CONNECTIONS
# ==============================
LOCAL_URI = "mongodb://localhost:27017/"
local_client = MongoClient(LOCAL_URI)
local_db = local_client["PassengersDB"]

ATLAS_URI = "mongodb+srv://prasanth_gannavarapu05:Prasanth_147@trainsdata.exem1wb.mongodb.net/?retryWrites=true&w=majority"
atlas_client = MongoClient(ATLAS_URI)
atlas_db = atlas_client["PassengersDB"]

databases = [
    ("LOCAL", local_db),
    ("ATLAS", atlas_db),
]

# ----------------------------
# DETERMINISTIC SEED
# ----------------------------
SEED = 20260202
random.seed(SEED)

# ----------------------------
# CONFIG
# ----------------------------
TRAIN_NUMBER = "17225"
TRAIN_NAME = "Amaravati Express"
JOURNEY_DATE = "15-11-2025"
TOTAL_PASSENGERS = 1451
RAC_TARGET = 150  # ~150 RAC passengers
CNF_TARGET = TOTAL_PASSENGERS - RAC_TARGET
MAX_ONBOARD_CAPACITY = 823
SLEEPER_COACHES = 9
AC_COACHES = 2

print("="*80)
print("🚂 AMARAVATI EXPRESS - MULTI-PASSENGER BOOKING SUPPORT")
print("="*80)
print(f"Target: {TOTAL_PASSENGERS} passengers in booking groups (1-6 per PNR)")
print(f"RAC: ~{RAC_TARGET} | CNF: ~{CNF_TARGET}")
print("="*80 + "\n")

# ----------------------------
# STATIONS
# ----------------------------
stations = [
    ("Narasapur", 195, 0),
    ("Palakollu", 98, 11),
    ("Bhimavaram Jn", 76, 22),
    ("Bhimavaram Town", 74, 6),
    ("Akividu", 33, 11),
    ("Kaikolur", 44, 6),
    ("Gudivada Jn", 66, 22),
    ("Vijayawada Jn", 198, 89),
    ("Guntur Jn", 132, 66),
    ("Narasaraopet (NR)", 33, 11),
    ("Vinukonda", 27, 11),
    ("Kurichedu", 16, 11),
    ("Donakonda", 11, 22),
    ("Markapur Road", 39, 11),
    ("Cumbum", 11, 11),
    ("Giddalur", 11, 17),
    ("Nandyal", 44, 33),
    ("Dhone Jn", 39, 44),
    ("Pendekallu", 18, 11),
    ("Guntakal Jn", 94, 111),
    ("Bellary Jn", 74, 66),
    ("Toranagallu Jn", 27, 33),
    ("Hosapete Jn", 39, 66),
    ("Munirabad", 20, 23),
    ("Koppal", 27, 44),
    ("Gadag Jn", 39, 111),
    ("Annigeri", 20, 56),
    ("Hubballi Jn", 0, 579)
]
NUM_STATIONS = len(stations)

# ----------------------------
# BERTH MAPS
# ----------------------------
sleeper_berths = {
    "Lower": [1,4,9,12,17,20,25,28,33,36,41,44,49,52,57,60,65,68],
    "Middle": [2,5,10,13,18,21,26,29,34,37,42,45,50,53,58,61,66,69],
    "Upper": [3,6,11,14,19,22,27,30,35,38,43,46,51,54,59,62,67,70],
    "Side Lower": [7,15,23,31,39,47,55,63,71],
    "Side Upper": [8,16,24,32,40,48,56,64,72]
}
ac_berths = {
    "Lower": [1,4,9,12,17,20,25,28,33,36,41,44,49,52,57,60],
    "Middle": [2,5,10,13,18,21,26,29,34,37,42,45,50,53,58,61],
    "Upper": [3,6,11,14,19,22,27,30,35,38,43,46,51,54,59,62],
    "Side Lower": [7,15,23,31,39,47,55,63],
    "Side Upper": [8,16,24,32,40,48,56,64]
}

s_coaches = [f"S{i}" for i in range(1, SLEEPER_COACHES + 1)]
a_coaches = [f"B{i}" for i in range(1, AC_COACHES + 1)]

# ----------------------------
# NAME GENERATOR
# ----------------------------
first_male = ["Aarav","Aarush","Aayush","Aditya","Advik","Arjun","Arnav","Aryan","Atharv","Avi",
    "Darsh","Dhruv","Ishaan","Kabir","Kian","Krish","Krishna","Laksh","Manan","Mivaan",
    "Nirvaan","Pranav","Reyansh","Rudra","Sai","Shaurya","Shivansh","Tanay","Veer","Vihaan"]

first_female = ["Aadhya","Aanya","Aaradhya","Aditi","Ananya","Anika","Avni","Diya","Gauri","Ira",
    "Jiya","Kavya","Kiara","Mahika","Navya","Pari","Riya","Saisha","Tanya","Zara"]

middle = ["Kumar","Singh","Raj","Dev","Prasad","Prakash","Chandra","Mohan","Babu","Reddy",
    "Nath","Pal","Das","Lal","Rao","Naidu","Varma","Gupta","Verma","Patel"]

last = ["Sharma","Verma","Singh","Kumar","Patel","Reddy","Nair","Iyer","Rao","Das",
    "Gupta","Joshi","Agarwal","Pandey","Mishra","Tiwari","Chauhan","Yadav","Jain","Shah",
    "Mehta","Desai","Khan","Ali","Chopra","Kapoor","Bhatia","Malhotra","Khanna","Saxena"]

first_names = first_male + first_female
used_names = set()
used_mobiles = set()
used_emails = set()

def gen_name():
    for _ in range(5000):
        f = random.choice(first_names)
        m = random.choice(middle)
        l = random.choice(last)
        name = f"{f} {m} {l}" if random.random() < 0.7 else f"{f} {l}"
        if name not in used_names:
            used_names.add(name)
            return name
    name = f"Passenger {len(used_names)}"
    used_names.add(name)
    return name

def gen_mobile():
    for _ in range(5000):
        m = f"{random.choice('6789')}{random.randint(100000000,999999999)}"
        if m not in used_mobiles:
            used_mobiles.add(m)
            return m
    return f"9{1000000000+len(used_mobiles)}"

def gen_email(name):
    base = name.lower().replace(" ",".").replace("'","")
    for i in range(100):
        e = f"{base}{i}@gmail.com" if i else f"{base}@gmail.com"
        if e not in used_emails:
            used_emails.add(e)
            return e
    return f"{base}{len(used_emails)}@gmail.com"

pnr_counter = 0  # Counter for unique PNRs

def gen_pnr():
    global pnr_counter
    pnr_counter += 1
    return str(1000000000 + pnr_counter)

def gen_irctc_id(sequence_number):
    return f"IR_{sequence_number:04d}"

def calculate_preference_priority(age, gender):
    """Priority: 3=senior(60+), 2=female, 1=adult(18+), 0=child"""
    if age >= 60: return 3
    elif gender == 'Female': return 2
    elif age >= 18: return 1
    else: return 0

# ----------------------------
# BERTH ALLOCATOR
# ----------------------------
class BerthAllocator:
    def __init__(self):
        self.allocations = defaultdict(list)
        self.rac_pairs = defaultdict(list)
    
    def is_available_for_cnf(self, coach, berth, start, end):
        for alloc_start, alloc_end, _, _ in self.allocations[(coach, berth)]:
            if start < alloc_end and end > alloc_start:
                return False
        return True
    
    def add_cnf(self, coach, berth, start, end, pid, berth_type):
        if not self.is_available_for_cnf(coach, berth, start, end):
            return False
        self.allocations[(coach, berth)].append((start, end, pid, False))
        return True
    
    def can_add_rac(self, coach, berth, start, end):
        if len(self.rac_pairs[(coach, berth)]) >= 2:
            return False
        for alloc_start, alloc_end, _, _ in self.allocations[(coach, berth)]:
            if start < alloc_end and end > alloc_start:
                return False
        return True
    
    def add_rac(self, coach, berth, start, end, pid):
        if not self.can_add_rac(coach, berth, start, end):
            return False
        self.allocations[(coach, berth)].append((start, end, pid, True))
        self.rac_pairs[(coach, berth)].append(pid)
        return len(self.rac_pairs[(coach, berth)])

allocator = BerthAllocator()

# ----------------------------
# PHASE 1: GENERATE BOOKING GROUPS
# ----------------------------
print("PHASE 1: Generating booking groups...")

booking_groups = []
remaining_passengers = TOTAL_PASSENGERS

# Weighted distribution: singles most common, 6-pax least common
group_weights = [35, 25, 18, 12, 7, 3]  # for sizes 1,2,3,4,5,6

while remaining_passengers > 0:
    group_size = random.choices([1,2,3,4,5,6], weights=group_weights)[0]
    group_size = min(group_size, remaining_passengers)
    booking_groups.append(group_size)
    remaining_passengers -= group_size

print(f"✅ Created {len(booking_groups)} booking groups for {TOTAL_PASSENGERS} passengers")
print(f"   Group distribution: {dict(zip(range(1,7), [booking_groups.count(i) for i in range(1,7)]))}")

# ----------------------------
# PHASE 2: BUILD JOURNEY PAIRS FOR ALL GROUPS
# ----------------------------
print("\nPHASE 2: Building journey pairs for groups...")

boarding_pool = []
alighting_pool = []
for idx, (name, b_cnt, a_cnt) in enumerate(stations):
    boarding_pool.extend([idx] * b_cnt)
    alighting_pool.extend([idx] * a_cnt)

random.shuffle(boarding_pool)

# Each group gets one journey
group_journeys = []
for group_idx, group_size in enumerate(booking_groups):
    if boarding_pool:
        board_idx = boarding_pool.pop()
    else:
        board_idx = random.randint(0, NUM_STATIONS - 2)
    
    # Find valid alighting station
    alight_idx = random.randint(board_idx + 1, NUM_STATIONS - 1)
    group_journeys.append((board_idx, alight_idx))

print(f"✅ Created {len(group_journeys)} journeys for groups")

# ----------------------------
# PHASE 3: SELECT RAC GROUPS
# ----------------------------
print("\nPHASE 3: Selecting groups for RAC...")

# Sort groups by journey length (longer = better for RAC)
group_journey_lengths = [(i, group_journeys[i][1] - group_journeys[i][0], booking_groups[i]) 
                         for i in range(len(booking_groups))]
group_journey_lengths.sort(key=lambda x: -x[1])

rac_groups = set()
rac_passenger_count = 0

# Select groups until we reach RAC target
for idx, length, group_size in group_journey_lengths:
    if rac_passenger_count >= RAC_TARGET:
        break
    if rac_passenger_count + group_size <= RAC_TARGET + 10:  # Allow small overshoot
        rac_groups.add(idx)
        rac_passenger_count += group_size

print(f"✅ Selected {len(rac_groups)} groups ({rac_passenger_count} passengers) for RAC")

# ----------------------------
# PHASE 4: ALLOCATE BERTHS
# ----------------------------
print("\nPHASE 4: Allocating berths...")

passengers = []
irctc_counter = 1
rac_number = 1
seat_preferences = ["Lower Berth", "Middle Berth", "Upper Berth", "Side Lower", "Side Upper", "No Preference"]

def create_passenger_record(pnr, passenger_index, name, age, gender, mobile, email, 
                           board_idx, alight_idx, coach, berth, berth_type, 
                           pnr_status, rac_status, coach_class, is_leader, passenger_status):
    global irctc_counter
    
    pref_priority = calculate_preference_priority(age, gender)
    seat_pref = random.choice(seat_preferences)
    
    record = {
        "IRCTC_ID": gen_irctc_id(irctc_counter),
        "PNR_Number": pnr,
        "Passenger_Index": passenger_index,
        "Train_Number": TRAIN_NUMBER,
        "Train_Name": TRAIN_NAME,
        "Journey_Date": JOURNEY_DATE,
        "Name": name,
        "Age": age,
        "Gender": gender,
        "Mobile": mobile,
        "Email": email,
        "PNR_Status": pnr_status,
        "Class": coach_class,
        "Rac_status": rac_status,
        "Boarding_Station": stations[board_idx][0],
        "Deboarding_Station": stations[alight_idx][0],
        "Assigned_Coach": coach,
        "Assigned_berth": berth,
        "Berth_Type": berth_type,
        "Seat_Preference": seat_pref,
        "Preference_Priority": pref_priority,
        "Is_Group_Leader": is_leader,
        "Preference_Matched": (pnr_status == "CNF"),
        "Passenger_Status": passenger_status,
        "NO_show": False,
        "Boarded": False,
        "Deboarded": False
    }
    irctc_counter += 1
    return record

# Process RAC groups first
print("  Allocating RAC groups...")
for group_idx in rac_groups:
    group_size = booking_groups[group_idx]
    board_idx, alight_idx = group_journeys[group_idx]
    pnr = gen_pnr()
    
    # Generate shared contact for group leader
    leader_name = gen_name()
    mobile = gen_mobile()
    email = gen_email(leader_name)
    
    # First passenger is Online, rest are Offline
    passenger_status = "Online" if len(passengers) < 10 else "Offline"
    
    for i in range(group_size):
        # Try to find a berth for this passenger
        allocated = False
        
        # Try sleeper side lower berths
        for coach in s_coaches:
            for berth in sleeper_berths["Side Lower"]:
                result = allocator.add_rac(coach, berth, board_idx, alight_idx, f"{group_idx}_{i}")
                if result:
                    name = leader_name if i == 0 else gen_name()
                    age = random.randint(18, 77)
                    gender = random.choice(["Male", "Female"])
                    
                    record = create_passenger_record(
                        pnr=pnr,
                        passenger_index=i + 1,
                        name=name,
                        age=age,
                        gender=gender,
                        mobile=mobile,
                        email=email,
                        board_idx=board_idx,
                        alight_idx=alight_idx,
                        coach=coach,
                        berth=berth,
                        berth_type="Side Lower",
                        pnr_status="RAC",
                        rac_status=str(rac_number),
                        coach_class="Sleeper",
                        is_leader=(i == 0),
                        passenger_status=passenger_status if i == 0 else "Offline"
                    )
                    passengers.append(record)
                    rac_number += 1
                    allocated = True
                    break
            if allocated:
                break
        
        # Try AC side lower if sleeper failed
        if not allocated:
            for coach in a_coaches:
                for berth in ac_berths["Side Lower"]:
                    result = allocator.add_rac(coach, berth, board_idx, alight_idx, f"{group_idx}_{i}")
                    if result:
                        name = leader_name if i == 0 else gen_name()
                        age = random.randint(18, 77)
                        gender = random.choice(["Male", "Female"])
                        
                        record = create_passenger_record(
                            pnr=pnr,
                            passenger_index=i + 1,
                            name=name,
                            age=age,
                            gender=gender,
                            mobile=mobile,
                            email=email,
                            board_idx=board_idx,
                            alight_idx=alight_idx,
                            coach=coach,
                            berth=berth,
                            berth_type="Side Lower",
                            pnr_status="RAC",
                            rac_status=str(rac_number),
                            coach_class="AC_3_Tier",
                            is_leader=(i == 0),
                            passenger_status=passenger_status if i == 0 else "Offline"
                        )
                        passengers.append(record)
                        rac_number += 1
                        allocated = True
                        break
                if allocated:
                    break

# Process CNF groups
print("  Allocating CNF groups...")
cnf_groups = [i for i in range(len(booking_groups)) if i not in rac_groups]

for group_idx in cnf_groups:
    group_size = booking_groups[group_idx]
    board_idx, alight_idx = group_journeys[group_idx]
    pnr = gen_pnr()
    
    leader_name = gen_name()
    mobile = gen_mobile()
    email = gen_email(leader_name)
    
    for i in range(group_size):
        allocated = False
        prefer_sleeper = random.random() < 0.8
        
        berth_order = ["Lower", "Middle", "Upper", "Side Upper"]
        
        for coach_list, berth_map in [
            (s_coaches if prefer_sleeper else a_coaches, sleeper_berths if prefer_sleeper else ac_berths),
            (a_coaches if prefer_sleeper else s_coaches, ac_berths if prefer_sleeper else sleeper_berths)
        ]:
            for coach in coach_list:
                for berth_type in berth_order:
                    for berth in berth_map[berth_type]:
                        if allocator.add_cnf(coach, berth, board_idx, alight_idx, f"{group_idx}_{i}", berth_type):
                            name = leader_name if i == 0 else gen_name()
                            age = random.randint(18, 77)
                            gender = random.choice(["Male", "Female"])
                            coach_class = "Sleeper" if coach.startswith("S") else "AC_3_Tier"
                            
                            record = create_passenger_record(
                                pnr=pnr,
                                passenger_index=i + 1,
                                name=name,
                                age=age,
                                gender=gender,
                                mobile=mobile,
                                email=email,
                                board_idx=board_idx,
                                alight_idx=alight_idx,
                                coach=coach,
                                berth=berth,
                                berth_type=berth_type,
                                pnr_status="CNF",
                                rac_status="-",
                                coach_class=coach_class,
                                is_leader=(i == 0),
                                passenger_status="Offline"
                            )
                            passengers.append(record)
                            allocated = True
                            break
                    if allocated:
                        break
                if allocated:
                    break
            if allocated:
                break
    
    if len(passengers) % 300 == 0:
        print(f"    Progress: {len(passengers)}/{TOTAL_PASSENGERS}")

print(f"✅ Total passengers allocated: {len(passengers)}")

# ----------------------------
# PHASE 5: ANALYSIS
# ----------------------------
print("\nPHASE 5: Analysis...")

rac_count = sum(1 for p in passengers if p["PNR_Status"] == "RAC")
cnf_count = sum(1 for p in passengers if p["PNR_Status"] == "CNF")
online_count = sum(1 for p in passengers if p["Passenger_Status"] == "Online")
offline_count = sum(1 for p in passengers if p["Passenger_Status"] == "Offline")

# Group analysis
pnr_groups = defaultdict(list)
for p in passengers:
    pnr_groups[p["PNR_Number"]].append(p)

group_sizes = [len(v) for v in pnr_groups.values()]
group_distribution = {i: group_sizes.count(i) for i in range(1, 7)}

print("\n" + "="*80)
print("🎉 FINAL REPORT - MULTI-PASSENGER BOOKING")
print("="*80)
print(f"Total Passengers: {len(passengers)}")
print(f"Total Booking Groups (PNRs): {len(pnr_groups)}")
print(f"CNF Passengers: {cnf_count}")
print(f"RAC Passengers: {rac_count}")
print(f"Online: {online_count}, Offline: {offline_count}")
print(f"\n📊 Group Size Distribution:")
for size, count in group_distribution.items():
    passengers_in_size = size * count
    print(f"  {size}-passenger groups: {count} ({passengers_in_size} passengers)")

# Show sample multi-passenger bookings
print(f"\n📋 SAMPLE MULTI-PASSENGER BOOKINGS:")
shown = 0
for pnr, group in pnr_groups.items():
    if len(group) >= 3 and shown < 3:
        print(f"\n  PNR: {pnr} ({len(group)} passengers)")
        for p in group:
            leader = "👑" if p["Is_Group_Leader"] else "  "
            print(f"    {leader} {p['Passenger_Index']}. {p['Name']} | {p['Age']}y {p['Gender']} | {p['PNR_Status']} | {p['Assigned_Coach']}-{p['Assigned_berth']}")
        shown += 1

print("="*80)

# ----------------------------
# EXPORT
# ----------------------------
csv_file = "amaravati_multi_passenger.csv"
json_file = "amaravati_multi_passenger.json"

with open(csv_file, "w", newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=passengers[0].keys())
    writer.writeheader()
    writer.writerows(passengers)
print(f"✅ Exported: {csv_file}")

with open(json_file, "w", encoding='utf-8') as f:
    json.dump(passengers, f, indent=2, ensure_ascii=False)
print(f"✅ Exported: {json_file}")

# ----------------------------
# INSERT INTO DATABASES
# ----------------------------
for db_name, db in databases:
    try:
        coll = db['Phase_2']
        coll.delete_many({})
        
        # Create compound index for multi-passenger support
        coll.create_index([("PNR_Number", 1), ("Passenger_Index", 1)], unique=True)
        
        coll.insert_many(passengers)
        print(f"✅ [{db_name}] MongoDB: PassengersDB.Phase_2 ({len(passengers)} passengers)")
    except Exception as e:
        print(f"❌ [{db_name}] MongoDB Error: {e}")

print("\n🎉 Done! Multi-passenger booking data generation completed.")