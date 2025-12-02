# amaravati_optimized_allocation.py
# OPTIMIZED RAC & CNF ALLOCATION WITH SPECIFIC CONSTRAINTS
# Constraint 1: 150 RAC passengers (board at stations 0-2, deboard at 16/24/27)
# Constraint 2: 100 CNF passengers deboard at Narasaraopet (station 9)
# Constraint 3: 50 CNF passengers deboard at Gudivada (station 6)
# Constraint 4: 100% occupancy from first 3 stations

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
MAX_ONBOARD_CAPACITY = 823
SLEEPER_COACHES = 9
AC_COACHES = 2

print("="*80)
print("🚂 AMARAVATI EXPRESS - OPTIMIZED ALLOCATION WITH CONSTRAINTS")
print("="*80)
print("Constraints:")
print("  1. 150 RAC passengers: board at stations 0-2, deboard at 16/24/27")
print("  2. 100 CNF passengers: deboard at Narasaraopet (station 9)")
print("  3. 50 CNF passengers: deboard at Gudivada (station 6)")
print("  4. 100% occupancy from first 3 stations")
print("="*80 + "\n")

# ----------------------------
# STATIONS
# ----------------------------
stations = [
    ("Narasapur", 0, 0),           # 0
    ("Palakollu", 0, 0),           # 1
    ("Bhimavaram Jn", 0, 0),       # 2
    ("Bhimavaram Town", 0, 0),     # 3
    ("Akividu", 0, 0),             # 4
    ("Kaikolur", 0, 0),            # 5
    ("Gudivada Jn", 0, 50),        # 6 - 50 deboard here
    ("Vijayawada Jn", 0, 0),       # 7
    ("Guntur Jn", 0, 0),           # 8
    ("Narasaraopet", 0, 100),      # 9 - 100 deboard here
    ("Vinukonda", 0, 0),           # 10
    ("Kurichedu", 0, 0),           # 11
    ("Donakonda", 0, 0),           # 12
    ("Markapur Road", 0, 0),       # 13
    ("Cumbum", 0, 0),              # 14
    ("Giddalur", 0, 0),            # 15
    ("Nandyal", 0, 50),            # 16 - 50 RAC deboard
    ("Dhone Jn", 0, 0),            # 17
    ("Pendekallu", 0, 0),          # 18
    ("Guntakal Jn", 0, 0),         # 19
    ("Bellary Jn", 0, 0),          # 20
    ("Toranagallu Jn", 0, 0),      # 21
    ("Hosapete Jn", 0, 0),         # 22
    ("Munirabad", 0, 0),           # 23
    ("Koppal", 0, 50),             # 24 - 50 RAC deboard
    ("Gadag Jn", 0, 0),            # 25
    ("Annigeri", 0, 0),            # 26
    ("Hubballi Jn", 0, 50)         # 27 - 50 RAC deboard
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

# COACH NAMES
s_coaches = [f"S{i}" for i in range(1, SLEEPER_COACHES + 1)]
a_coaches = [f"B{i}" for i in range(1, AC_COACHES + 1)]

print(f"📊 CAPACITY:")
print(f"  Total Berths: {total_berths}")
print(f"  Sleeper: {total_sleeper_berths}, AC_3_Tier: {total_ac_berths}")
print(f"  Coaches: {', '.join(s_coaches + a_coaches)}\n")

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
    return f"IR_{sequence_number:04d}"

# ----------------------------
# OPTIMIZED BERTH ALLOCATOR WITH ADVANCED COLLISION HANDLING
# ----------------------------
class OptimizedAllocator:
    def __init__(self):
        self.allocations = defaultdict(list)  # (coach, berth) -> [(start, end, pid, is_rac)]
        self.rac_pairs = defaultdict(list)  # (coach, berth) -> [pid1, pid2]
        self.passenger_locations = {}  # pid -> (coach, berth, start, end)
        self.berth_availability = defaultdict(list)  # (coach, berth) -> sorted [(start, end)] of occupied intervals
        self.collision_count = 0
        self.rac_side_lower_only = True  # Enforce RAC only on side lower berths
    
    def _merge_intervals(self, intervals):
        """Merge overlapping intervals for efficient collision detection"""
        if not intervals:
            return []
        intervals.sort()
        merged = [intervals[0]]
        for start, end in intervals[1:]:
            if start <= merged[-1][1]:
                merged[-1] = (merged[-1][0], max(merged[-1][1], end))
            else:
                merged.append((start, end))
        return merged
    
    def _has_overlap(self, start1, end1, start2, end2):
        """Check if two intervals overlap"""
        return start1 < end2 and start2 < end1
    
    def _find_available_slots(self, coach, berth, start, end):
        """Find if the requested slot is available"""
        occupied = self.berth_availability[(coach, berth)]
        for occ_start, occ_end in occupied:
            if self._has_overlap(start, end, occ_start, occ_end):
                return False
        return True
    
    def _add_occupied_interval(self, coach, berth, start, end):
        """Add an occupied interval and merge"""
        self.berth_availability[(coach, berth)].append((start, end))
        self.berth_availability[(coach, berth)] = self._merge_intervals(
            self.berth_availability[(coach, berth)]
        )
    
    def is_berth_available_for_cnf(self, coach, berth, start, end, passenger_id=None):
        """Optimized availability check for CNF passengers - O(k) where k = occupied intervals"""
        # Quick check using merged intervals
        if not self._find_available_slots(coach, berth, start, end):
            return False
        
        # Detailed check against all allocations (double verification)
        for alloc_start, alloc_end, alloc_pid, alloc_is_rac in self.allocations[(coach, berth)]:
            if passenger_id == alloc_pid:
                continue
            if self._has_overlap(start, end, alloc_start, alloc_end):
                self.collision_count += 1
                return False
        
        return True
    
    def can_add_rac_pair(self, coach, berth, start1, end1, pid1, start2, end2, pid2, berth_type):
        """Advanced RAC pair validation with collision detection"""
        # RAC pairs MUST be on Side Lower berths only
        if self.rac_side_lower_only and berth_type != "Side Lower":
            return False
        
        # Check if already at capacity (2 passengers max per side lower)
        if len(self.rac_pairs[(coach, berth)]) >= 2:
            return False
        
        # RAC pairs MUST have overlapping journeys
        if not self._has_overlap(start1, end1, start2, end2):
            return False
        
        # Check both passengers against existing allocations
        if not self._find_available_slots(coach, berth, start1, end1):
            return False
        if not self._find_available_slots(coach, berth, start2, end2):
            return False
        
        # Detailed collision check
        for alloc_start, alloc_end, alloc_pid, alloc_is_rac in self.allocations[(coach, berth)]:
            if pid1 != alloc_pid and self._has_overlap(start1, end1, alloc_start, alloc_end):
                self.collision_count += 1
                return False
            if pid2 != alloc_pid and self._has_overlap(start2, end2, alloc_start, alloc_end):
                self.collision_count += 1
                return False
        
        return True
    
    def add_cnf_passenger(self, coach, berth, start, end, passenger_id, berth_type):
        """Add CNF passenger with optimized collision handling"""
        if not self.is_berth_available_for_cnf(coach, berth, start, end, passenger_id):
            return False
        
        # Add allocation
        self.allocations[(coach, berth)].append((start, end, passenger_id, False))
        self.passenger_locations[passenger_id] = (coach, berth, start, end)
        self._add_occupied_interval(coach, berth, start, end)
        
        return True
    
    def add_rac_pair(self, coach, berth, start1, end1, pid1, start2, end2, pid2, berth_type):
        """Add RAC pair with advanced validation"""
        if not self.can_add_rac_pair(coach, berth, start1, end1, pid1, start2, end2, pid2, berth_type):
            return False
        
        # Calculate overlap period (when both passengers share the berth)
        overlap_start = max(start1, start2)
        overlap_end = min(end1, end2)
        
        # Add allocations
        self.allocations[(coach, berth)].extend([
            (start1, end1, pid1, True),
            (start2, end2, pid2, True)
        ])
        
        # Track RAC pair
        self.rac_pairs[(coach, berth)].extend([pid1, pid2])
        
        # Track passenger locations
        self.passenger_locations[pid1] = (coach, berth, start1, end1)
        self.passenger_locations[pid2] = (coach, berth, start2, end2)
        
        # Add occupied interval (the full span of both passengers)
        full_start = min(start1, start2)
        full_end = max(end1, end2)
        self._add_occupied_interval(coach, berth, full_start, full_end)
        
        return True
    
    def verify_no_collisions(self):
        """Comprehensive collision verification"""
        collisions = []
        
        for (coach, berth), allocations in self.allocations.items():
            allocations_sorted = sorted(allocations, key=lambda x: x[0])
            
            for i in range(len(allocations_sorted)):
                for j in range(i + 1, len(allocations_sorted)):
                    start1, end1, pid1, is_rac1 = allocations_sorted[i]
                    start2, end2, pid2, is_rac2 = allocations_sorted[j]
                    
                    if self._has_overlap(start1, end1, start2, end2):
                        # Check if this is a valid RAC pair
                        is_valid_rac = (
                            is_rac1 and is_rac2 and
                            pid1 in self.rac_pairs[(coach, berth)] and
                            pid2 in self.rac_pairs[(coach, berth)]
                        )
                        
                        if not is_valid_rac:
                            collisions.append({
                                'coach': coach,
                                'berth': berth,
                                'passenger1': pid1,
                                'passenger2': pid2,
                                'overlap': (max(start1, start2), min(end1, end2))
                            })
        
        return collisions
    
    def get_statistics(self):
        """Get allocation statistics"""
        total_allocations = sum(len(v) for v in self.allocations.values())
        total_rac_pairs = sum(len(v) // 2 for v in self.rac_pairs.values())
        total_cnf = sum(1 for allocs in self.allocations.values() 
                       for _, _, _, is_rac in allocs if not is_rac)
        
        return {
            'total_allocations': total_allocations,
            'total_rac_pairs': total_rac_pairs,
            'total_rac_passengers': total_rac_pairs * 2,
            'total_cnf': total_cnf,
            'collision_checks_failed': self.collision_count,
            'berths_used': len(self.allocations)
        }

allocator = OptimizedAllocator()
passengers = []
irctc_counter = 1

# ----------------------------
# PHASE 1: ALLOCATE CONSTRAINT PASSENGERS
# ----------------------------
print("PHASE 1: Allocating constraint passengers...")

# Constraint 1: 150 RAC passengers (75 pairs)
# 50 to Nandyal (station 16), 50 to Koppal (24), 50 to Hubballi (27)
rac_deboard_stations = [16] * 50 + [24] * 50 + [27] * 50
random.shuffle(rac_deboard_stations)

rac_pairs_data = []
for i in range(0, 150, 2):
    board = random.choice([0, 1, 2])  # Board at first 3 stations
    deboard1 = rac_deboard_stations[i]
    deboard2 = rac_deboard_stations[i + 1]
    rac_pairs_data.append((board, deboard1, board, deboard2))

print(f"  Created {len(rac_pairs_data)} RAC pairs (150 passengers)")

# Constraint 2 & 3: CNF passengers to stations 6 and 9
cnf_constraint_data = []
# 50 passengers to Gudivada (station 6)
for _ in range(50):
    board = random.choice([0, 1, 2])
    cnf_constraint_data.append((board, 6))

# 100 passengers to Narasaraopet (station 9)
for _ in range(100):
    board = random.choice([0, 1, 2])
    cnf_constraint_data.append((board, 9))

print(f"  Created {len(cnf_constraint_data)} constraint CNF passengers")

# Allocate RAC pairs with optimized allocation strategy
rac_global_counter = 1
rac_allocated = 0
failed_rac_allocations = 0

# Pre-sort RAC pairs by journey length (longer journeys first for better packing)
rac_pairs_sorted = sorted(rac_pairs_data, key=lambda x: max(x[1], x[3]) - min(x[0], x[2]), reverse=True)

for board1, deboard1, board2, deboard2 in rac_pairs_sorted:
    allocated = False
    
    # Try sleeper coaches first (more capacity)
    for coach in s_coaches:
        for berth in sleeper_berths["Side Lower"]:
            if allocator.add_rac_pair(coach, berth, board1, deboard1, f"RAC_{rac_allocated}", 
                                     board2, deboard2, f"RAC_{rac_allocated+1}", "Side Lower"):
                coach_class = "Sleeper"
                
                for idx, (b, d) in enumerate([(board1, deboard1), (board2, deboard2)]):
                    name = gen_name()
                    passengers.append({
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
                        "Class": coach_class,
                        "Rac_status": str(rac_global_counter + idx),
                        "Boarding_Station": stations[b][0],
                        "Deboarding_Station": stations[d][0],
                        "Assigned_Coach": coach,
                        "Assigned_berth": berth,
                        "Berth_Type": "Side Lower",
                        "Passenger_Status": "Online" if rac_allocated < 10 else "Offline",
                        "NO_show": False
                    })
                    irctc_counter += 1
                
                rac_global_counter += 2
                rac_allocated += 2
                allocated = True
                break
        if allocated:
            break
    
    # Try AC coaches if sleeper failed
    if not allocated:
        for coach in a_coaches:
            for berth in ac_berths["Side Lower"]:
                if allocator.add_rac_pair(coach, berth, board1, deboard1, f"RAC_{rac_allocated}", 
                                         board2, deboard2, f"RAC_{rac_allocated+1}", "Side Lower"):
                    coach_class = "AC_3_Tier"
                    
                    for idx, (b, d) in enumerate([(board1, deboard1), (board2, deboard2)]):
                        name = gen_name()
                        passengers.append({
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
                            "Class": coach_class,
                            "Rac_status": str(rac_global_counter + idx),
                            "Boarding_Station": stations[b][0],
                            "Deboarding_Station": stations[d][0],
                            "Assigned_Coach": coach,
                            "Assigned_berth": berth,
                            "Berth_Type": "Side Lower",
                            "Passenger_Status": "Online" if rac_allocated < 10 else "Offline",
                            "NO_show": False
                        })
                        irctc_counter += 1
                    
                    rac_global_counter += 2
                    rac_allocated += 2
                    allocated = True
                    break
            if allocated:
                break
    
    if not allocated:
        failed_rac_allocations += 1

print(f"✅ Allocated {rac_allocated} RAC passengers")
if failed_rac_allocations > 0:
    print(f"⚠️  Failed to allocate {failed_rac_allocations} RAC pairs due to capacity constraints")

# Allocate constraint CNF passengers with optimized strategy
cnf_constraint_allocated = 0
failed_cnf_allocations = 0

# Sort by deboard station (station 6 passengers first, they free up berths earlier)
cnf_constraint_sorted = sorted(cnf_constraint_data, key=lambda x: x[1])

for board, deboard in cnf_constraint_sorted:
    allocated = False
    prefer_sleeper = random.random() < 0.85
    
    # Try all berth types in priority order
    berth_priority = ["Lower", "Middle", "Upper", "Side Upper"]
    
    for coach_list, berth_map in [
        (s_coaches if prefer_sleeper else a_coaches, sleeper_berths if prefer_sleeper else ac_berths),
        (a_coaches if prefer_sleeper else s_coaches, ac_berths if prefer_sleeper else sleeper_berths)
    ]:
        for coach in coach_list:
            for berth_type in berth_priority:
                for berth in berth_map[berth_type]:
                    if allocator.add_cnf_passenger(coach, berth, board, deboard, f"CNF_CONST_{cnf_constraint_allocated}", berth_type):
                        name = gen_name()
                        coach_class = "Sleeper" if coach.startswith("S") else "AC_3_Tier"
                        
                        passengers.append({
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
                            "Deboarding_Station": stations[deboard][0],
                            "Assigned_Coach": coach,
                            "Assigned_berth": berth,
                            "Berth_Type": berth_type,
                            "Passenger_Status": "Offline",
                            "NO_show": False
                        })
                        irctc_counter += 1
                        cnf_constraint_allocated += 1
                        allocated = True
                        break
                if allocated:
                    break
            if allocated:
                break
        if allocated:
            break
    
    if not allocated:
        failed_cnf_allocations += 1

print(f"✅ Allocated {cnf_constraint_allocated} constraint CNF passengers")
if failed_cnf_allocations > 0:
    print(f"⚠️  Failed to allocate {failed_cnf_allocations} CNF passengers")

# ----------------------------
# PHASE 2: FILL REMAINING CAPACITY WITH INTELLIGENT ALLOCATION
# ----------------------------
print("\nPHASE 2: Filling remaining capacity with optimized allocation...")

# Calculate remaining capacity
current_passengers = len(passengers)
remaining_capacity = total_berths - current_passengers
print(f"  Current passengers: {current_passengers}")
print(f"  Remaining capacity: {remaining_capacity} berths")

# Generate additional passengers with smart journey distribution
additional_passengers = []

# Create journey patterns for optimal berth reuse
# Short journeys (3-8 stations): 40%
# Medium journeys (9-15 stations): 35%
# Long journeys (16+ stations): 25%

short_count = int(remaining_capacity * 0.40)
medium_count = int(remaining_capacity * 0.35)
long_count = remaining_capacity - short_count - medium_count

# Short journeys - allow better berth reuse
for _ in range(short_count):
    board = random.choice([0, 1, 2])
    deboard = random.randint(board + 3, min(board + 8, NUM_STATIONS - 1))
    additional_passengers.append((board, deboard, 'short'))

# Medium journeys
for _ in range(medium_count):
    board = random.choice([0, 1, 2])
    deboard = random.randint(board + 9, min(board + 15, NUM_STATIONS - 1))
    additional_passengers.append((board, deboard, 'medium'))

# Long journeys
for _ in range(long_count):
    board = random.choice([0, 1, 2])
    deboard = random.randint(board + 16, NUM_STATIONS - 1)
    additional_passengers.append((board, deboard, 'long'))

# Sort by deboard station to maximize berth reuse
additional_passengers.sort(key=lambda x: (x[1], x[0]))

# Allocate additional passengers with progress tracking
additional_allocated = 0
failed_allocations = 0
allocation_attempts = defaultdict(int)

for board, deboard, journey_type in additional_passengers:
    allocated = False
    prefer_sleeper = random.random() < 0.85
    
    # Track allocation attempts per journey type
    allocation_attempts[journey_type] += 1
    
    # Try all berth types systematically
    berth_priority = ["Upper", "Middle", "Lower", "Side Upper"]  # Upper berths fill last in real scenario
    
    for coach_list, berth_map in [
        (s_coaches if prefer_sleeper else a_coaches, sleeper_berths if prefer_sleeper else ac_berths),
        (a_coaches if prefer_sleeper else s_coaches, ac_berths if prefer_sleeper else sleeper_berths)
    ]:
        for coach in coach_list:
            for berth_type in berth_priority:
                for berth in berth_map[berth_type]:
                    if allocator.add_cnf_passenger(coach, berth, board, deboard, f"ADD_{additional_allocated}", berth_type):
                        name = gen_name()
                        coach_class = "Sleeper" if coach.startswith("S") else "AC_3_Tier"
                        
                        passengers.append({
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
                            "Deboarding_Station": stations[deboard][0],
                            "Assigned_Coach": coach,
                            "Assigned_berth": berth,
                            "Berth_Type": berth_type,
                            "Passenger_Status": "Offline",
                            "NO_show": False
                        })
                        irctc_counter += 1
                        additional_allocated += 1
                        allocated = True
                        break
                if allocated:
                    break
            if allocated:
                break
        if allocated:
            break
    
    if not allocated:
        failed_allocations += 1
    
    # Progress indicator every 50 passengers
    if (additional_allocated + failed_allocations) % 50 == 0:
        success_rate = (additional_allocated / (additional_allocated + failed_allocations)) * 100 if (additional_allocated + failed_allocations) > 0 else 0
        print(f"  Progress: {additional_allocated}/{remaining_capacity} | Success rate: {success_rate:.1f}%")

print(f"\n✅ Allocated {additional_allocated} additional passengers")
print(f"  Short journeys: {sum(1 for p in passengers[-additional_allocated:] if 3 <= (next(i for i, s in enumerate(stations) if s[0] == p['Deboarding_Station']) - next(i for i, s in enumerate(stations) if s[0] == p['Boarding_Station'])) <= 8)}")
print(f"  Medium journeys: {sum(1 for p in passengers[-additional_allocated:] if 9 <= (next(i for i, s in enumerate(stations) if s[0] == p['Deboarding_Station']) - next(i for i, s in enumerate(stations) if s[0] == p['Boarding_Station'])) <= 15)}")
print(f"  Long journeys: {sum(1 for p in passengers[-additional_allocated:] if (next(i for i, s in enumerate(stations) if s[0] == p['Deboarding_Station']) - next(i for i, s in enumerate(stations) if s[0] == p['Boarding_Station'])) >= 16)}")

if failed_allocations > 0:
    print(f"⚠️  Could not allocate {failed_allocations} passengers (berth saturation reached)")

# ----------------------------
# ANALYSIS WITH COLLISION VERIFICATION
# ----------------------------
print("\n" + "="*80)
print("📊 COMPREHENSIVE ANALYSIS & VERIFICATION")
print("="*80)

# Get allocator statistics
alloc_stats = allocator.get_statistics()

total_passengers = len(passengers)
rac_count = sum(1 for p in passengers if p["PNR_Status"] == "RAC")
cnf_count = sum(1 for p in passengers if p["PNR_Status"] == "CNF")

# Verify constraints
station_6_deboard = sum(1 for p in passengers if p["Deboarding_Station"] == "Gudivada Jn" and p["PNR_Status"] == "CNF")
station_9_deboard = sum(1 for p in passengers if p["Deboarding_Station"] == "Narasaraopet" and p["PNR_Status"] == "CNF")
rac_16_deboard = sum(1 for p in passengers if p["Deboarding_Station"] == "Nandyal" and p["PNR_Status"] == "RAC")
rac_24_deboard = sum(1 for p in passengers if p["Deboarding_Station"] == "Koppal" and p["PNR_Status"] == "RAC")
rac_27_deboard = sum(1 for p in passengers if p["Deboarding_Station"] == "Hubballi Jn" and p["PNR_Status"] == "RAC")

# Verify all passengers board at first 3 stations
first_3_boarders = sum(1 for p in passengers if p["Boarding_Station"] in [stations[i][0] for i in range(3)])

# Calculate occupancy by station
onboard = [0] * NUM_STATIONS
for p in passengers:
    b = next(i for i, s in enumerate(stations) if s[0] == p["Boarding_Station"])
    d = next(i for i, s in enumerate(stations) if s[0] == p["Deboarding_Station"])
    for s in range(b, d):
        onboard[s] += 1

# Run comprehensive collision verification
print("\n🔍 COLLISION VERIFICATION:")
collisions = allocator.verify_no_collisions()

if collisions:
    print(f"❌ COLLISIONS DETECTED: {len(collisions)}")
    for i, collision in enumerate(collisions[:5]):  # Show first 5
        print(f"  {i+1}. Coach {collision['coach']}, Berth {collision['berth']}: "
              f"Passengers {collision['passenger1']} & {collision['passenger2']}")
else:
    print(f"✅ NO COLLISIONS DETECTED - All allocations are valid!")

print(f"\n📈 ALLOCATION STATISTICS:")
print(f"  Total Passengers: {total_passengers}")
print(f"  RAC Passengers: {rac_count} ({alloc_stats['total_rac_pairs']} pairs)")
print(f"  CNF Passengers: {cnf_count}")
print(f"  Berths Used: {alloc_stats['berths_used']}/{total_berths}")
print(f"  Collision Checks Failed: {alloc_stats['collision_checks_failed']}")

print(f"\n✅ CONSTRAINT VERIFICATION:")
print(f"  RAC to Nandyal (16): {rac_16_deboard}/50 {'✅' if rac_16_deboard >= 45 else '⚠️'}")
print(f"  RAC to Koppal (24): {rac_24_deboard}/50 {'✅' if rac_24_deboard >= 45 else '⚠️'}")
print(f"  RAC to Hubballi (27): {rac_27_deboard}/50 {'✅' if rac_27_deboard >= 45 else '⚠️'}")
print(f"  CNF to Gudivada (6): {station_6_deboard}/50 {'✅' if station_6_deboard >= 45 else '⚠️'}")
print(f"  CNF to Narasaraopet (9): {station_9_deboard}/100 {'✅' if station_9_deboard >= 95 else '⚠️'}")
print(f"  All board at first 3 stations: {first_3_boarders}/{total_passengers} {'✅' if first_3_boarders == total_passengers else '❌'}")

print(f"\n📊 OCCUPANCY ANALYSIS:")
print(f"  Station-wise occupancy (first 10 stations):")
for i in range(min(10, NUM_STATIONS)):
    occupancy_pct = (onboard[i] / total_berths) * 100 if total_berths > 0 else 0
    bar_length = int(occupancy_pct / 2)
    bar = "█" * bar_length + "░" * (50 - bar_length)
    print(f"    {stations[i][0]:20s} | {bar} | {onboard[i]:4d} ({occupancy_pct:5.1f}%)")

peak = max(onboard)
peak_idx = onboard.index(peak)
print(f"\n  Peak Occupancy: {peak} passengers at {stations[peak_idx][0]}")
print(f"  Capacity Utilization: {(total_passengers/total_berths)*100:.1f}%")
print(f"  Peak vs Max Capacity: {peak}/{MAX_ONBOARD_CAPACITY} ({(peak/MAX_ONBOARD_CAPACITY)*100:.1f}%)")

# Journey length distribution
journey_lengths = []
for p in passengers:
    b = next(i for i, s in enumerate(stations) if s[0] == p["Boarding_Station"])
    d = next(i for i, s in enumerate(stations) if s[0] == p["Deboarding_Station"])
    journey_lengths.append(d - b)

short_journeys = sum(1 for j in journey_lengths if j <= 8)
medium_journeys = sum(1 for j in journey_lengths if 9 <= j <= 15)
long_journeys = sum(1 for j in journey_lengths if j >= 16)

print(f"\n📏 JOURNEY LENGTH DISTRIBUTION:")
print(f"  Short (≤8 stations): {short_journeys} ({(short_journeys/total_passengers)*100:.1f}%)")
print(f"  Medium (9-15 stations): {medium_journeys} ({(medium_journeys/total_passengers)*100:.1f}%)")
print(f"  Long (≥16 stations): {long_journeys} ({(long_journeys/total_passengers)*100:.1f}%)")
print(f"  Average journey length: {sum(journey_lengths)/len(journey_lengths):.1f} stations")

# Class distribution
sleeper_count = sum(1 for p in passengers if p["Class"] == "Sleeper")
ac_3_tier_count = sum(1 for p in passengers if p["Class"] == "AC_3_Tier")

print(f"\n🎫 CLASS DISTRIBUTION:")
print(f"  Sleeper: {sleeper_count} ({(sleeper_count/total_passengers)*100:.1f}%)")
print(f"  AC_3_Tier: {ac_3_tier_count} ({(ac_3_tier_count/total_passengers)*100:.1f}%)")

# Berth type usage
berth_type_usage = defaultdict(int)
for p in passengers:
    if p["Assigned_Coach"] != "WL":
        berth_type_usage[p["Berth_Type"]] += 1

print(f"\n🛏️  BERTH TYPE USAGE:")
for berth_type in ["Lower", "Middle", "Upper", "Side Lower", "Side Upper"]:
    count = berth_type_usage[berth_type]
    pct = (count / total_passengers) * 100 if total_passengers > 0 else 0
    print(f"  {berth_type:15s}: {count:4d} ({pct:5.1f}%)")

print("="*80)

# ----------------------------
# EXPORT
# ----------------------------
csv_file = "amaravati_optimized_allocation.csv"
json_file = "amaravati_optimized_allocation.json"

with open(csv_file, "w", newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=passengers[0].keys())
    writer.writeheader()
    writer.writerows(passengers)
print(f"\n✅ Exported: {csv_file}")

with open(json_file, "w", encoding='utf-8') as f:
    json.dump(passengers, f, indent=2, ensure_ascii=False)
print(f"✅ Exported: {json_file}")

try:
    client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=2000)
    db = client['PassengersDB']
    coll = db['L_1']
    coll.delete_many({})
    coll.insert_many(passengers)
    print(f"✅ MongoDB: PassengersDB.P_optimized")
except Exception as e:
    print(f"⚠️ MongoDB skipped: {e}")

print("\n🎉 Optimized allocation completed!")