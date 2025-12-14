# amaravati_rac_pairs.py
# CORRECT RAC LOGIC: RAC = 2 passengers sharing ONE Side Lower berth
# CORRECT CNF LOGIC: Single passenger per berth, no overlaps allowed
# COLLISION-FREE BERTH ALLOCATION: No overlapping journeys on same berth

import random
import csv
import json
from collections import defaultdict
from pymongo import MongoClient

# ----------------------------
# DETERMINISTIC SEED
# ----------------------------
SEED = 20251116
random.seed(SEED)

# ----------------------------
# CONFIG
# ----------------------------
TRAIN_NUMBER = "17225"
TRAIN_NAME = "Amaravati Express"
JOURNEY_DATE = "15-11-2025"
TOTAL_PASSENGERS = 1500
RAC_TARGET = 136  # EVEN NUMBER: 68 berths × 2 passengers = 136 RAC
CNF_TARGET = TOTAL_PASSENGERS - RAC_TARGET  # 1364 CNF
MAX_ONBOARD_CAPACITY = 823
SLEEPER_COACHES = 9
AC_COACHES = 2

print("="*80)
print("🚂 AMARAVATI EXPRESS - CORRECT ALLOCATION LOGIC")
print("="*80)
print(f"RAC Logic: 2 passengers share 1 Side Lower berth = BOTH become RAC")
print(f"CNF Logic: 1 passenger per berth, no journey overlaps")
print(f"Target: {TOTAL_PASSENGERS} passengers ({CNF_TARGET} CNF + {RAC_TARGET} RAC)")
print("="*80 + "\n")

# ----------------------------
# STATIONS (CORRECTED NAMES)
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

# Calculate total berth capacity
total_sleeper_berths = sum(len(v) for v in sleeper_berths.values()) * SLEEPER_COACHES
total_ac_berths = sum(len(v) for v in ac_berths.values()) * AC_COACHES
total_berths = total_sleeper_berths + total_ac_berths

print(f"📊 CAPACITY ANALYSIS:")
print(f"  Total Sleeper Berths: {total_sleeper_berths}")
print(f"  Total AC_3_Tier Berths: {total_ac_berths}")
print(f"  Total Berths Available: {total_berths}")
print(f"  Passengers to Allocate: {TOTAL_PASSENGERS}")
print(f"  Capacity Utilization: {(TOTAL_PASSENGERS/total_berths)*100:.1f}%")
print()

# ----------------------------
# COACH NAMES (B1, B2 for AC_3_Tier coaches)
# ----------------------------
s_coaches = [f"S{i}" for i in range(1, SLEEPER_COACHES + 1)]
a_coaches = [f"B{i}" for i in range(1, AC_COACHES + 1)]

print(f"🚇 COACH CONFIGURATION:")
print(f"  Sleeper Coaches: {', '.join(s_coaches)}")
print(f"  AC_3_Tier Coaches: {', '.join(a_coaches)}")
print()

# ----------------------------
# NAME GENERATOR (150K+ unique)
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
used_pnrs = set()

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

def gen_pnr():
    p = str(1000000001 + len(used_pnrs))
    used_pnrs.add(p)
    return p

def gen_irctc_id(sequence_number):
    """Generate IRCTC_ID in format IR_0001 to IR_1500"""
    return f"IR_{sequence_number:04d}"

# ----------------------------
# CORRECT BERTH ALLOCATOR
# ----------------------------
class CorrectAllocator:
    def __init__(self):
        # Track ALL berth allocations: (coach, berth) → [(start, end, passenger_id, is_rac)]
        self.allocations = defaultdict(list)
        # Track RAC pairs specifically: (coach, berth) → [passenger_ids]
        self.rac_pairs = defaultdict(list)
    
    def is_berth_available_for_cnf(self, coach, berth, start, end, passenger_id=None):
        """Check if berth is available for CNF passenger - NO overlaps allowed"""
        for alloc_start, alloc_end, alloc_pid, alloc_is_rac in self.allocations[(coach, berth)]:
            # Skip checking against self
            if passenger_id == alloc_pid:
                continue
                
            # STRICT CHECK for CNF: No overlap allowed at all
            if start < alloc_end and end > alloc_start:
                return False  # Collision detected
        return True
    
    def can_add_rac_pair(self, coach, berth, start1, end1, pid1, start2, end2, pid2):
        """Check if two passengers can share this side lower berth as RAC pair"""
        # Check if berth already has max RAC passengers (2)
        if len(self.rac_pairs[(coach, berth)]) >= 2:
            return False
        
        # For RAC pairs, they MUST have overlapping journeys to share
        if end1 <= start2 or start1 >= end2:
            return False  # No overlap = can't share as RAC pair
        
        # Check if both passengers can be accommodated without collisions with existing passengers
        for alloc_start, alloc_end, alloc_pid, alloc_is_rac in self.allocations[(coach, berth)]:
            # Check passenger1 against existing
            if pid1 != alloc_pid and start1 < alloc_end and end1 > alloc_start:
                return False
            # Check passenger2 against existing  
            if pid2 != alloc_pid and start2 < alloc_end and end2 > alloc_start:
                return False
        
        return True
    
    def add_cnf_passenger(self, coach, berth, start, end, passenger_id, berth_type):
        """Add CNF passenger with exclusive berth access"""
        if not self.is_berth_available_for_cnf(coach, berth, start, end, passenger_id):
            return False
        
        self.allocations[(coach, berth)].append((start, end, passenger_id, False))
        return True
    
    def add_rac_pair(self, coach, berth, start1, end1, pid1, start2, end2, pid2):
        """Add two RAC passengers sharing one side lower berth"""
        if not self.can_add_rac_pair(coach, berth, start1, end1, pid1, start2, end2, pid2):
            return False
        
        # Add both passengers to allocations
        self.allocations[(coach, berth)].extend([
            (start1, end1, pid1, True),
            (start2, end2, pid2, True)
        ])
        
        # Track as RAC pair
        self.rac_pairs[(coach, berth)].extend([pid1, pid2])
        
        return len(self.rac_pairs[(coach, berth)])

allocator = CorrectAllocator()

# ----------------------------
# BUILD JOURNEY PAIRS
# ----------------------------
print("PHASE 1: Building journey pairs...")

boarding_pool = []
alighting_pool = []
for idx, (name, b_cnt, a_cnt) in enumerate(stations):
    boarding_pool.extend([idx] * b_cnt)
    alighting_pool.extend([idx] * a_cnt)

random.shuffle(boarding_pool)
random.shuffle(alighting_pool)

# Pair journeys with peak bias
pairs = []
alight_used = [0] * NUM_STATIONS
alight_quota = [s[2] for s in stations]

for board_idx in boarding_pool:
    possible = []
    weights = []
    for alight_idx in range(board_idx + 1, NUM_STATIONS):
        if alight_used[alight_idx] < alight_quota[alight_idx]:
            weight = 10 if (board_idx <= 7 and alight_idx >= 9) else 1
            possible.append(alight_idx)
            weights.append(weight)
    
    if possible:
        alight_idx = random.choices(possible, weights=weights, k=1)[0]
    else:
        alight_idx = min(board_idx + 1, NUM_STATIONS - 1)
    
    pairs.append((board_idx, alight_idx))
    alight_used[alight_idx] += 1

print(f"✅ Created {len(pairs)} journeys\n")

# ----------------------------
# PHASE 2: CREATE RAC PAIRS (CORRECT LOGIC)
# ----------------------------
print("PHASE 2: Creating RAC pairs (2 passengers share 1 Side Lower berth)...")

# 5 Mandatory RAC journeys
mandatory_rac_journeys = [
    (0, 16),   # Narasapur → Nandyal
    (2, 20),   # Bhimavaram Jn → Bellary Jn
    (2, 20),   # Bhimavaram Jn → Bellary Jn
    (6, 27),   # Gudivada Jn → Hubballi Jn
    (6, 27)    # Gudivada Jn → Hubballi Jn
]

# Apply mandatory journeys to first 5 passengers
for i in range(5):
    pairs[i] = mandatory_rac_journeys[i]

# Select RAC candidates based on journey length (prefer longer journeys)
journey_lengths = [(i, pairs[i][1] - pairs[i][0]) for i in range(len(pairs))]
journey_lengths.sort(key=lambda x: -x[1])  # Longest journeys first

rac_passenger_indices = set()

# Add mandatory passengers first
for i in range(5):
    rac_passenger_indices.add(i)

# Add more candidates to reach RAC target (need even number)
remaining_needed = RAC_TARGET - len(rac_passenger_indices)
for idx, length in journey_lengths:
    if len(rac_passenger_indices) >= RAC_TARGET:
        break
    if idx not in rac_passenger_indices:
        rac_passenger_indices.add(idx)

# Ensure even number for pairing
if len(rac_passenger_indices) % 2 != 0:
    rac_passenger_indices.remove(max(rac_passenger_indices))

print(f"✅ Selected {len(rac_passenger_indices)} passengers for RAC pairing\n")

# ----------------------------
# PHASE 3: CORRECT BERTH ALLOCATION
# ----------------------------
print("PHASE 3: Correct berth allocation...")

passengers = []
irctc_counter = 1  # Counter for IRCTC_ID generation

def allocate_rac_pairs():
    """Allocate RAC passengers in pairs to side lower berths"""
    global irctc_counter
    rac_list = sorted(list(rac_passenger_indices))
    rac_pairs = []
    
    # Group into pairs
    for i in range(0, len(rac_list), 2):
        if i + 1 < len(rac_list):
            rac_pairs.append((rac_list[i], rac_list[i+1]))
    
    successful_pairs = 0
    rac_global_counter = 1
    
    for passenger1, passenger2 in rac_pairs:
        board1, alight1 = pairs[passenger1]
        board2, alight2 = pairs[passenger2]
        
        allocated = False
        
        # Try sleeper side lower berths first
        for coach in s_coaches:
            for berth in sleeper_berths["Side Lower"]:
                result = allocator.add_rac_pair(coach, berth, board1, alight1, passenger1, board2, alight2, passenger2)
                if result:
                    # Create passenger records for both
                    for passenger_idx, rac_num_offset in [(passenger1, 0), (passenger2, 1)]:
                        board, alight = pairs[passenger_idx]
                        name = gen_name()
                        passenger_status = "Online" if passenger_idx < 5 else "Offline"
                        
                        passenger_data = {
                            "IRCTC_ID": gen_irctc_id(irctc_counter),
                            "PNR_Number": gen_pnr(),
                            "Train_Number": TRAIN_NUMBER,
                            "Train_Name": TRAIN_NAME,
                            "Journey_Date": JOURNEY_DATE,
                            "Name": name,
                            "Age": random.randint(18, 77),
                            "Gender": random.choice(["Male", "Female"]),
                            "Mobile": gen_mobile(),
                            "Email": gen_email(name),
                            "PNR_Status": "RAC",
                            "Class": "Sleeper",
                            "Rac_status": str(rac_global_counter + rac_num_offset),
                            "Boarding_Station": stations[board][0],
                            "Deboarding_Station": stations[alight][0],
                            "Assigned_Coach": coach,
                            "Assigned_berth": berth,
                            "Berth_Type": "Side Lower",
                            "Passenger_Status": passenger_status,
                            "NO_show": False
                        }
                        passengers.append(passenger_data)
                        irctc_counter += 1
                    
                    rac_global_counter += 2
                    successful_pairs += 1
                    allocated = True
                    break
            if allocated:
                break
        
        # Try AC_3_Tier (B1, B2) side lower berths if sleeper failed
        if not allocated:
            for coach in a_coaches:
                for berth in ac_berths["Side Lower"]:
                    result = allocator.add_rac_pair(coach, berth, board1, alight1, passenger1, board2, alight2, passenger2)
                    if result:
                        for passenger_idx, rac_num_offset in [(passenger1, 0), (passenger2, 1)]:
                            board, alight = pairs[passenger_idx]
                            name = gen_name()
                            passenger_status = "Online" if passenger_idx < 5 else "Offline"
                            
                            passenger_data = {
                                "IRCTC_ID": gen_irctc_id(irctc_counter),
                                "PNR_Number": gen_pnr(),
                                "Train_Number": TRAIN_NUMBER,
                                "Train_Name": TRAIN_NAME,
                                "Journey_Date": JOURNEY_DATE,
                                "Name": name,
                                "Age": random.randint(18, 77),
                                "Gender": random.choice(["Male", "Female"]),
                                "Mobile": gen_mobile(),
                                "Email": gen_email(name),
                                "PNR_Status": "RAC",
                                "Class": "AC_3_Tier",
                                "Rac_status": str(rac_global_counter + rac_num_offset),
                                "Boarding_Station": stations[board][0],
                                "Deboarding_Station": stations[alight][0],
                                "Assigned_Coach": coach,
                                "Assigned_berth": berth,
                                "Berth_Type": "Side Lower",
                                "Passenger_Status": passenger_status,
                                "NO_show": False
                            }
                            passengers.append(passenger_data)
                            irctc_counter += 1
                        
                        rac_global_counter += 2
                        successful_pairs += 1
                        allocated = True
                        break
                if allocated:
                    break
    
    return successful_pairs

def allocate_cnf_passengers():
    """Allocate CNF passengers to available berths - NO overlaps allowed"""
    global irctc_counter
    cnf_indices = [i for i in range(len(pairs)) if i not in rac_passenger_indices]
    allocated_cnf = 0
    
    for idx in cnf_indices:
        board, alight = pairs[idx]
        prefer_sleeper = random.random() < 0.8
        
        allocated = False
        
        # Try different berth types and coaches
        for coach_list, berth_map in [
            (s_coaches if prefer_sleeper else a_coaches, sleeper_berths if prefer_sleeper else ac_berths),
            (a_coaches if prefer_sleeper else s_coaches, ac_berths if prefer_sleeper else sleeper_berths)
        ]:
            for coach in coach_list:
                # Try all berth types except Side Lower (reserved for RAC)
                for berth_type in ["Lower", "Middle", "Upper", "Side Upper"]:
                    for berth in berth_map[berth_type]:
                        if allocator.add_cnf_passenger(coach, berth, board, alight, idx, berth_type):
                            name = gen_name()
                            coach_class = "Sleeper" if coach.startswith("S") else "AC_3_Tier"
                            
                            passenger_data = {
                                "IRCTC_ID": gen_irctc_id(irctc_counter),
                                "PNR_Number": gen_pnr(),
                                "Train_Number": TRAIN_NUMBER,
                                "Train_Name": TRAIN_NAME,
                                "Journey_Date": JOURNEY_DATE,
                                "Name": name,
                                "Age": random.randint(18, 77),
                                "Gender": random.choice(["Male", "Female"]),
                                "Mobile": gen_mobile(),
                                "Email": gen_email(name),
                                "PNR_Status": "CNF",
                                "Class": coach_class,
                                "Rac_status": "-",
                                "Boarding_Station": stations[board][0],
                                "Deboarding_Station": stations[alight][0],
                                "Assigned_Coach": coach,
                                "Assigned_berth": berth,
                                "Berth_Type": berth_type,
                                "Passenger_Status": "Offline",
                                "NO_show": False
                            }
                            passengers.append(passenger_data)
                            irctc_counter += 1
                            allocated_cnf += 1
                            allocated = True
                            break
                    if allocated:
                        break
                if allocated:
                    break
            if allocated:
                break
        
        if not allocated:
            # Create WL passenger
            name = gen_name()
            passenger_data = {
                "IRCTC_ID": gen_irctc_id(irctc_counter),
                "PNR_Number": gen_pnr(),
                "Train_Number": TRAIN_NUMBER,
                "Train_Name": TRAIN_NAME,
                "Journey_Date": JOURNEY_DATE,
                "Name": name,
                "Age": random.randint(18, 77),
                "Gender": random.choice(["Male", "Female"]),
                "Mobile": gen_mobile(),
                "Email": gen_email(name),
                "PNR_Status": "WL",
                "Class": "Sleeper",
                "Rac_status": str(random.randint(1, 50)),
                "Boarding_Station": stations[board][0],
                "Deboarding_Station": stations[alight][0],
                "Assigned_Coach": "WL",
                "Assigned_berth": 0,
                "Berth_Type": "WL",
                "Passenger_Status": "Offline",
                "NO_show": False
            }
            passengers.append(passenger_data)
            irctc_counter += 1
        
        if len(passengers) % 200 == 0:
            print(f"  Progress: {len(passengers)}/{TOTAL_PASSENGERS}")
    
    return allocated_cnf

# Execute allocation
print("🔗 Allocating RAC pairs...")
rac_pairs_allocated = allocate_rac_pairs()
print(f"✅ Allocated {rac_pairs_allocated} RAC pairs ({rac_pairs_allocated * 2} passengers)")

print("🛌 Allocating CNF passengers...")
cnf_allocated = allocate_cnf_passengers()
print(f"✅ Allocated {cnf_allocated} CNF passengers")

total_allocated = len(passengers)
wl_count = total_allocated - (rac_pairs_allocated * 2) - cnf_allocated

print(f"\n📊 ALLOCATION SUMMARY:")
print(f"  Total Passengers: {total_allocated}/{TOTAL_PASSENGERS}")
print(f"  RAC Passengers: {rac_pairs_allocated * 2}")
print(f"  CNF Passengers: {cnf_allocated}")
print(f"  WL Passengers: {wl_count}")

# ----------------------------
# VERIFICATION
# ----------------------------
print("🔍 Verifying allocation correctness...")

def verify_allocation():
    """Verify both RAC and CNF allocations are correct"""
    collision_detected = False
    collision_count = 0
    valid_rac_pairs = 0
    invalid_rac_pairs = 0
    
    # Group passengers by coach and berth
    berth_allocations = defaultdict(list)
    for p in passengers:
        if p["Assigned_Coach"] == "WL":  # Skip waiting list
            continue
        key = (p["Assigned_Coach"], p["Assigned_berth"])
        board = next(i for i, s in enumerate(stations) if s[0] == p["Boarding_Station"])
        alight = next(i for i, s in enumerate(stations) if s[0] == p["Deboarding_Station"])
        berth_allocations[key].append((board, alight, p["Name"], p["PNR_Status"], p["Rac_status"]))
    
    # Check each berth for correctness
    for key, allocations in berth_allocations.items():
        allocations.sort(key=lambda x: x[0])  # Sort by boarding station
        
        for i in range(len(allocations)):
            for j in range(i + 1, len(allocations)):
                board1, alight1, name1, status1, rac1 = allocations[i]
                board2, alight2, name2, status2, rac2 = allocations[j]
                
                # Check for overlap
                has_overlap = not (alight1 <= board2 or board1 >= alight2)
                
                if has_overlap:
                    # This is either a valid RAC pair or an invalid collision
                    is_rac_pair = (status1 == "RAC" and status2 == "RAC" and 
                                  key[0] in s_coaches + a_coaches and 
                                  key[1] in sleeper_berths["Side Lower"] + ac_berths["Side Lower"])
                    
                    if is_rac_pair:
                        valid_rac_pairs += 1
                        # print(f"🔄 VALID RAC PAIR: {name1}(RAC {rac1}) & {name1}(RAC {rac2}) in {key[0]}-{key[1]}")
                    else:
                        collision_count += 1
                        if collision_count <= 5:
                            print(f"❌ COLLISION: {name1}({status1}) & {name2}({status2}) in {key[0]}-{key[1]}")
                        collision_detected = True
                else:
                    # No overlap - this is correct for CNF or sequential RAC
                    if status1 == "RAC" and status2 == "RAC":
                        invalid_rac_pairs += 1
                        if invalid_rac_pairs <= 5:
                            print(f"⚠️  RAC WITHOUT OVERLAP: {name1} & {name2} in {key[0]}-{key[1]}")
    
    return collision_detected, collision_count, valid_rac_pairs, invalid_rac_pairs

collision_detected, collision_count, valid_rac_pairs, invalid_rac_pairs = verify_allocation()

print(f"✅ Generated {len(passengers)} passengers\n")

# ----------------------------
# ANALYSIS
# ----------------------------
print("PHASE 4: Final Analysis...")

rac_count = sum(1 for p in passengers if p["PNR_Status"] == "RAC")
cnf_count = sum(1 for p in passengers if p["PNR_Status"] == "CNF")
wl_count = sum(1 for p in passengers if p["PNR_Status"] == "WL")
online_count = sum(1 for p in passengers if p["Passenger_Status"] == "Online")
offline_count = sum(1 for p in passengers if p["Passenger_Status"] == "Offline")

# Count AC_3_Tier vs Sleeper passengers
sleeper_count = sum(1 for p in passengers if p["Class"] == "Sleeper")
ac_3_tier_count = sum(1 for p in passengers if p["Class"] == "AC_3_Tier")

# Peak calculation
onboard = [0] * NUM_STATIONS
for p in passengers:
    if p["Assigned_Coach"] != "WL":  # Only count allocated passengers
        b = next(i for i, s in enumerate(stations) if s[0] == p["Boarding_Station"])
        a = next(i for i, s in enumerate(stations) if s[0] == p["Deboarding_Station"])
        for s in range(b, a):
            onboard[s] += 1

peak = max(onboard)
peak_idx = onboard.index(peak)

# RAC pair verification
rac_passengers = [p for p in passengers if p["PNR_Status"] == "RAC"]
rac_berths_used = defaultdict(list)
for p in rac_passengers:
    key = (p["Assigned_Coach"], p["Assigned_berth"])
    rac_berths_used[key].append(p)

pairs_count = sum(1 for k, v in rac_berths_used.items() if len(v) == 2)
singles_count = sum(1 for k, v in rac_berths_used.items() if len(v) == 1)

print("\n" + "="*80)
print("🎉 FINAL REPORT - CORRECT ALLOCATION")
print("="*80)
print(f"Total Passengers: {len(passengers)}")
print(f"CNF Passengers: {cnf_count}")
print(f"RAC Passengers: {rac_count}")
print(f"WL Passengers: {wl_count}")
print(f"RAC Berths with 2 passengers (pairs): {pairs_count}")
print(f"RAC Berths with 1 passenger (should be 0): {singles_count}")
print(f"Valid RAC Pairs (with overlap): {valid_rac_pairs}")
print(f"Collision-Free: {'✅ YES' if not collision_detected else '❌ NO'}")
print(f"Collisions Found: {collision_count}")
print(f"Peak Onboard: {peak} at {stations[peak_idx][0]}")
print(f"Capacity: {'✅ WITHIN' if peak <= MAX_ONBOARD_CAPACITY else '❌ EXCEEDS'} ({peak}/{MAX_ONBOARD_CAPACITY})")
print(f"Passenger Status - Online: {online_count}, Offline: {offline_count}")
print(f"Class Distribution - Sleeper: {sleeper_count}, AC_3_Tier: {ac_3_tier_count}")

# Show IRCTC_ID range
if passengers:
    first_irctc = passengers[0]["IRCTC_ID"]
    last_irctc = passengers[-1]["IRCTC_ID"]
    print(f"IRCTC_ID Range: {first_irctc} to {last_irctc}")

# Show RAC pairs
print(f"\n📋 SAMPLE RAC PAIRS (first 5):")
shown = 0
for key, plist in rac_berths_used.items():
    if len(plist) == 2 and shown < 5:
        p1, p2 = plist
        board1 = next(i for i, s in enumerate(stations) if s[0] == p1["Boarding_Station"])
        alight1 = next(i for i, s in enumerate(stations) if s[0] == p1["Deboarding_Station"])
        board2 = next(i for i, s in enumerate(stations) if s[0] == p2["Boarding_Station"])
        alight2 = next(i for i, s in enumerate(stations) if s[0] == p2["Deboarding_Station"])
        
        overlap_start = max(board1, board2)
        overlap_end = min(alight1, alight2)
        overlap_stations = overlap_end - overlap_start
        
        print(f"  Berth {key[0]}-{key[1]} (Side Lower):")
        print(f"    {p1['IRCTC_ID']} - RAC {p1['Rac_status']}: {p1['Boarding_Station']} → {p1['Deboarding_Station']}")
        print(f"    {p2['IRCTC_ID']} - RAC {p2['Rac_status']}: {p2['Boarding_Station']} → {p2['Deboarding_Station']}")
        print(f"    Overlap: {overlap_stations} stations ({stations[overlap_start][0]} to {stations[overlap_end][0]})")
        shown += 1

# Show Online passengers
print(f"\n✅ ONLINE PASSENGERS (Mandatory RAC):")
online_passengers = [p for p in passengers if p["Passenger_Status"] == "Online"]
for i, p in enumerate(online_passengers[:10]):
    status = f"RAC {p['Rac_status']}" if p['Rac_status'] != "-" else "CNF"
    print(f"  {i+1}. {p['IRCTC_ID']} - {p['Name']} | {p['Boarding_Station']} → {p['Deboarding_Station']} | {status} | Class: {p['Class']}")

print("="*80)

# ----------------------------
# EXPORT
# ----------------------------
csv_file = "amaravati_correct_allocation.csv"
json_file = "amaravati_correct_allocation.json"

with open(csv_file, "w", newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=passengers[0].keys())
    writer.writeheader()
    writer.writerows(passengers)
print(f"✅ Exported: {csv_file}")

with open(json_file, "w", encoding='utf-8') as f:
    json.dump(passengers, f, indent=2, ensure_ascii=False)
print(f"✅ Exported: {json_file}")

try:
    client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=2000)
    db = client['PassengersDB']
    coll = db['P_1']
    coll.delete_many({})
    coll.insert_many(passengers)
    print(f"✅ MongoDB: PassengersDB.P_1")
except Exception as e:
    print(f"⚠️ MongoDB skipped: {e}")

print("\n🎉 Done! Correct allocation completed successfully.")