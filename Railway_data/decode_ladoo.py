"""
LADOO DECODER v3 - Fully working decoder, saves to MongoDB.
Binary format confirmed: train 16317 → 16318 boundary verified.
GID fix: SQLite returns GIDs as strings, not ints.
"""
import struct
import sqlite3
import os
from pymongo import MongoClient

BASE = r"C:\Users\prasa\Documents\RailWayData\base\assets"
DB = os.path.join(BASE, "databases", "whereismytrain.db")
LADOO = os.path.join(BASE, "t", "ladoo")

# ---- Load station GID mapping (keys must be int!) ----
print("Loading station GID mapping...")
conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.execute("SELECT gid, station_code FROM station_info")
gid_map = {}
for gid, code in cur.fetchall():
    gid_map[int(gid)] = code  # FIX: cast to int!
conn.close()
print(f"Loaded {len(gid_map)} stations (GID range: {min(gid_map.keys())}-{max(gid_map.keys())})")

# ---- Load ladoo binary ----
print(f"Loading ladoo ({os.path.getsize(LADOO):,} bytes)...")
with open(LADOO, 'rb') as f:
    data = f.read()

# ---- Parse all records ----
def decode_date(raw):
    raw = raw & 0xFFFF
    if raw == 0:
        return None
    yr = raw & 127
    mo = (raw >> 7) & 15
    dy = (raw >> 11) & 31
    if mo > 0 and dy > 0:
        return f"{2000+yr:04d}-{mo:02d}-{dy:02d}"
    return None

pos = 0
trains = []
errors = 0

while pos < len(data) - 16:
    try:
        p0 = pos
        
        # HEADER (14 bytes)
        train_no = struct.unpack_from('>i', data, pos)[0]; pos += 4
        
        # Skip invalid train numbers immediately
        if train_no < 0 or train_no > 99999:
            pos = p0 + 1
            errors += 1
            if errors > 1000: break
            continue
        start_date_raw = struct.unpack_from('>H', data, pos)[0]; pos += 2
        end_date_raw = struct.unpack_from('>H', data, pos)[0]; pos += 2
        class_flags = data[pos]; pos += 1
        packed = struct.unpack_from('>I', data, pos)[0]; pos += 4
        variant_ref = packed >> 11
        depart_minutes = packed & 2047
        conn_count = data[pos]; pos += 1
        
        # CONNECTIONS
        connections = []
        for _ in range(conn_count):
            ct = struct.unpack_from('>i', data, pos)[0]; pos += 4
            cf = struct.unpack_from('>h', data, pos)[0]; pos += 2
            cto = struct.unpack_from('>h', data, pos)[0]; pos += 2
            connections.append({
                'train': f"{ct:05d}",
                'from': gid_map.get(cf, f"GID:{cf}"),
                'to': gid_map.get(cto, f"GID:{cto}")
            })
        
        # STATION COUNT
        stn_count = struct.unpack_from('>h', data, pos)[0]; pos += 2
        
        # Sanity check
        if stn_count < 0 or stn_count > 500 or pos + stn_count * 14 > len(data):
            pos = p0 + 1
            errors += 1
            if errors > 1000:
                break
            continue
        
        # STATIONS (14 bytes each)
        stops = []
        cum_time = depart_minutes
        cum_distance = 0.0
        for si in range(stn_count):
            sgid = struct.unpack_from('>h', data, pos)[0]; pos += 2
            tp = struct.unpack_from('>H', data, pos)[0]; pos += 2
            dp = struct.unpack_from('>H', data, pos)[0]; pos += 2
            hp = struct.unpack_from('>H', data, pos)[0]; pos += 2
            s4 = struct.unpack_from('>h', data, pos)[0]; pos += 2
            s5 = struct.unpack_from('>h', data, pos)[0]; pos += 2
            coach_byte = data[pos]; pos += 1
            plat_char = chr(data[pos]) if 32 <= data[pos] < 127 else ''; pos += 1
            
            time_delta = tp >> 1
            halt_flag = tp & 1
            segment_km = round(dp / 100.0)  # round to nearest int like erail.in
            cum_distance += segment_km
            halt_mins = hp >> 1
            
            cum_time = (cum_time + time_delta) % 1440
            arr_str = f"{cum_time // 60:02d}:{cum_time % 60:02d}"
            dep_time = (cum_time + halt_mins) % 1440
            dep_str = f"{dep_time // 60:02d}:{dep_time % 60:02d}"
            
            station_code = gid_map.get(sgid, f"GID:{sgid}")
            
            platform = ""
            if plat_char and plat_char != '!':
                platform = f"{coach_byte}{plat_char}".strip()
            
            is_stop = segment_km > 0 or si == 0  # first station is always a stop
            
            stop = {
                'station_code': station_code,
                'gid': sgid,
                'arrival': arr_str if si > 0 else "First",
                'departure': dep_str if si < stn_count - 1 else "Last",
                'halt_minutes': halt_mins,
                'distance_km': round(cum_distance, 1),
                'day': 1,  # placeholder, refine later
                'is_stopping': is_stop,
            }
            if platform:
                stop['platform'] = platform
            
            stops.append(stop)
        
        # Build train document
        stopping_stations = [s for s in stops if s['is_stopping']]
        
        train_str = f"{train_no:05d}"
        start_date = decode_date(start_date_raw)
        end_date = decode_date(end_date_raw)
        
        doc = {
            'train_number': train_str,
            'source_station': stopping_stations[0]['station_code'] if stopping_stations else '',
            'dest_station': stopping_stations[-1]['station_code'] if stopping_stations else '',
            'departure_time': f"{depart_minutes // 60:02d}:{depart_minutes % 60:02d}",
            'total_stops': len(stopping_stations),
            'total_points': stn_count,
            'start_date': start_date,
            'end_date': end_date,
            'variant_ref': variant_ref if variant_ref > 0 else None,
            'class_flags': class_flags,
            'source': 'erail_apk_ladoo',
            'stops': stopping_stations,
            'all_points': stops,  # includes GPS waypoints
        }
        
        if connections:
            doc['connections'] = connections
        
        # total distance = cumulative sum of all segment distances
        doc['total_distance_km'] = round(cum_distance, 1)
        
        trains.append(doc)
        errors = 0
        
        if len(trains) % 500 == 0:
            print(f"  Decoded {len(trains)} trains (at offset {pos:,}/{len(data):,})...")
        
    except Exception as e:
        pos = p0 + 1
        errors += 1
        if errors > 1000:
            print(f"Too many consecutive errors at offset {pos}")
            break

print(f"\nDecoded {len(trains)} trains total")

# ---- Verify first few trains ----
print(f"\nFirst 5 trains:")
for t in trains[:5]:
    print(f"  {t['train_number']}: {t['source_station']} -> {t['dest_station']} | {t['total_stops']} stops | {t['departure_time']} | {t['total_distance_km']:.0f}km")

# ---- Save to MongoDB ----
print(f"\nSaving to MongoDB: RailwayData.train_route_decoded...")
client = MongoClient('mongodb://localhost:27017/')
db = client['RailwayData']
collection = db['train_route_decoded']

# Drop existing data and insert fresh
collection.drop()
if trains:
    # Filter out any remaining invalid records
    valid_trains = [t for t in trains if t['train_number'].lstrip('0').isdigit() and int(t['train_number']) > 0]
    print(f"Valid trains: {len(valid_trains)} (filtered {len(trains)-len(valid_trains)} invalid)")
    collection.insert_many(valid_trains)
    collection.create_index('train_number')  # not unique - variants may share numbers

print(f"Saved {len(valid_trains)} trains to RailwayData.train_route_decoded")
print("Done!")
