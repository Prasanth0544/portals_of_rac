"""
Seed ticket_classes collection into RailwayData MongoDB
Reads: classes_gid.txt (11 base ticket classes)
Also includes all 55 coach codes found in coach_positions.txt

Two sub-collections in one:
  - Ticket classes (bookable by passengers)
  - Coach codes (all coach types found in train formations)
"""

from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"
COLLECTION = "ticket_classes"

DATA_FILE = r"C:\Users\prasa\Documents\RailWayData\base\assets\train_info\classes_gid.txt"

# All 55 coach codes found in coach_positions.txt
# Format: code -> (full_name, category, is_bookable)
COACH_CODES = {
    # === Engine & Power ===
    "L":     ("Locomotive (Engine)",               "Engine",       False),
    "EOG":   ("End on Generation (Power Car)",     "Power",        False),
    "LPR":   ("Luggage cum Power Car",             "Power",        False),
    "EV":    ("Electric Van",                      "Power",        False),

    # === Guard / Luggage ===
    "SLR":   ("Seating cum Luggage Rake",          "Guard",        False),
    "SLRD":  ("SLR with Disabled Compartment",     "Guard",        False),
    "SRD":   ("Second class Rake Disabled",        "Guard",        False),
    "LDS":   ("Luggage cum Disabled Sitting",      "Guard",        False),
    "LR":    ("Luggage Rake",                      "Guard",        False),
    "RMS":   ("Railway Mail Service",              "Mail",         False),

    # === AC First Class (1A) ===
    "HA":    ("AC First Class (1A)",               "1A",           True),
    "HAE":   ("AC First Class Economy",            "1A",           True),

    # === First Class (FC) ===
    "H":     ("First Class (FC)",                  "FC",           True),
    "HB":    ("First Class Berth",                 "FC",           True),
    "HE":    ("First Class Economy",               "FC",           True),

    # === AC 2-Tier (2A) ===
    "A":     ("AC 2-Tier (2A)",                    "2A",           True),
    "AB":    ("AC 2-Tier cum 3-Tier",              "2A/3A",        True),
    "AE":    ("AC 2-Tier Economy",                 "2A",           True),
    "AV":    ("AC 2-Tier Vistadome",               "2A",           True),

    # === AC 3-Tier (3A) ===
    "B":     ("AC 3-Tier (3A)",                    "3A",           True),
    "BE":    ("AC 3-Tier Economy (3E)",            "3E",           True),
    "BV":    ("AC 3-Tier Vistadome",               "3A",           True),

    # === AC 3-Economy (3E) ===
    "M":     ("AC 3-Economy (3E)",                 "3E",           True),
    "ME":    ("AC 3-Economy Enhanced",             "3E",           True),

    # === Sleeper (SL) ===
    "S":     ("Sleeper (SL)",                      "SL",           True),
    "SE":    ("Sleeper Economy",                   "SL",           True),
    "SL":    ("Sleeper Variant",                   "SL",           True),
    "SLD":   ("Sleeper Disabled",                  "SL",           True),
    "SV":    ("Sleeper Vistadome",                 "SL",           True),

    # === Chair Car (CC) ===
    "C":     ("Chair Car (CC)",                    "CC",           True),
    "CE":    ("Chair Car Economy",                 "CC",           True),

    # === Executive Chair Car (EC) ===
    "E":     ("Executive Chair Car (EC)",          "EC",           True),
    "EX":    ("Executive Class",                   "EC",           True),

    # === Vistadome / AC Chair ===
    "D":     ("AC Chair Car / Vistadome",          "Vistadome",    True),
    "DE":    ("Vistadome Economy",                 "Vistadome",    True),
    "DL":    ("Driving Luggage Van",               "Vistadome",    False),
    "DLE":   ("Driving Luggage Economy",           "Vistadome",    False),
    "DS":    ("Driving Second",                    "Vistadome",    False),
    "DV":    ("Driving Vistadome",                 "Vistadome",    True),

    # === General / Unreserved ===
    "G":     ("General (Antyodaya/Special)",       "General",      True),
    "GD":    ("Guard Van (DEMU/MEMU)",             "General",      False),
    "GE":    ("General Economy",                   "General",      True),
    "GEN":   ("General Seat",                      "General",      True),
    "GN":    ("General Unreserved",                "General",      True),
    "GS":    ("General Second",                    "General",      True),
    "GSR":   ("General Sitting Reserved",          "General",      True),
    "UR":    ("Unreserved",                        "General",      True),

    # === Economy / Special ===
    "J":     ("Janata (Economy)",                  "Economy",      True),
    "K":     ("Kitchen / Pantry Variant",          "Pantry",       False),
    "F":     ("First (Special Variant)",           "Special",      True),
    "FC":    ("First Class Coach",                 "Special",      True),
    "OCV":   ("Officers Coach Van",                "Special",      False),
    "PC":    ("Pantry Car",                        "Pantry",       False),
    "VP":    ("VIP / VVIP Coach",                  "Special",      False),
    "HCP":   ("Handicapped Coach",                 "Accessible",   False),
}


def main():
    print("🎫 Ticket Classes & Coach Codes Seeder")
    print("=" * 50)

    # Read base ticket classes from file
    with open(DATA_FILE, "r") as f:
        base_classes = [line.strip() for line in f if line.strip()]
    print(f"   📖 Base ticket classes from file: {len(base_classes)}")

    docs = []

    # 1. Add all 55 coach codes
    for code, (name, category, bookable) in COACH_CODES.items():
        is_base = code in base_classes
        docs.append({
            "code": code,
            "name": name,
            "category": category,
            "is_bookable": bookable,
            "is_base_class": is_base,
            "type": "ticket_class" if is_base else "coach_code",
        })

    # 2. Add any base classes not already in COACH_CODES
    for i, code in enumerate(base_classes):
        if code not in COACH_CODES:
            docs.append({
                "code": code,
                "name": code,
                "category": "Unknown",
                "is_bookable": True,
                "is_base_class": True,
                "type": "ticket_class",
            })

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    db[COLLECTION].drop()
    db[COLLECTION].insert_many(docs)
    db[COLLECTION].create_index("code")
    db[COLLECTION].create_index("category")

    bookable = [d for d in docs if d["is_bookable"]]
    non_bookable = [d for d in docs if not d["is_bookable"]]
    base = [d for d in docs if d["is_base_class"]]

    print(f"\n✅ {COLLECTION}: {len(docs)} documents inserted into {DB_NAME}")
    print(f"   🎫 Bookable classes: {len(bookable)}")
    print(f"   🔧 Non-bookable (infra): {len(non_bookable)}")
    print(f"   ⭐ Base ticket classes: {len(base)}")

    # Print by category
    categories = {}
    for d in docs:
        categories.setdefault(d["category"], []).append(d)

    print("\n📋 By Category:")
    for cat, items in sorted(categories.items()):
        codes = ", ".join(d["code"] for d in items)
        print(f"   {cat:12} ({len(items):2}): {codes}")

    print("\n📋 Sample documents:")
    for d in docs[:5]:
        print(f"   {d['code']:5} | {d['name']:35} | {d['category']:10} | bookable={d['is_bookable']}")

    client.close()
    print(f"\n✅ Done!")


if __name__ == "__main__":
    main()
