"""
Fill ALL possible gaps using datameet/railways dataset.
Datameet has: code, name, state, zone, address, lat, lng

Fills:
1. station_info.city (empty strings -> state/address from datameet)
2. station_zones - add zone data for stations missing from kodu
3. station_info lat/lng corrections if 0/missing
"""
import requests
import json
from pymongo import MongoClient

def download_datameet():
    url = "https://raw.githubusercontent.com/datameet/railways/master/stations.json"
    print("Downloading datameet stations.json...")
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    data = r.json()
    
    lookup = {}
    for feature in data["features"]:
        props = feature.get("properties", {})
        geo = feature.get("geometry")
        code = props.get("code", "").strip()
        if not code or "-" in code:
            continue
        
        entry = {
            "name": props.get("name", "").strip(),
            "state": props.get("state", "").strip() if props.get("state") else "",
            "zone": props.get("zone", "").strip() if props.get("zone") else "",
            "address": props.get("address", "").strip() if props.get("address") else "",
        }
        if geo and geo.get("coordinates"):
            entry["lng"] = geo["coordinates"][0]
            entry["lat"] = geo["coordinates"][1]
        
        # Skip entries where name equals code (no real name)
        if entry["name"] and entry["name"] != code:
            lookup[code] = entry
    
    return lookup


def main():
    client = MongoClient("mongodb://localhost:27017")
    db = client["RailwayData"]
    
    datameet = download_datameet()
    print(f"Datameet lookup: {len(datameet)} stations\n")

    # ============================================================
    # 1. FILL station_info.city (empty → state from datameet)
    # ============================================================
    print("=" * 50)
    print("1. FILLING station_info.city")
    print("=" * 50)
    
    si = db["station_info"]
    empty_city = list(si.find(
        {"$or": [{"city": ""}, {"city": None}, {"city": {"$exists": False}}]},
        {"station_code": 1}
    ))
    print(f"  Stations with empty city: {len(empty_city)}")
    
    city_filled = 0
    for doc in empty_city:
        code = doc["station_code"]
        if code in datameet and datameet[code]["state"]:
            # Use address if available (has city name), else use state
            addr = datameet[code]["address"]
            state = datameet[code]["state"]
            # Address often has format "CityName, State" — extract city
            city = addr.split(",")[0].strip() if addr and "," in addr else state
            
            si.update_one(
                {"station_code": code},
                {"$set": {"city": city}}
            )
            city_filled += 1
            if city_filled <= 10:
                print(f"    ✅ {code}: → city='{city}'")
    
    print(f"  Filled city for {city_filled} stations\n")

    # ============================================================
    # 2. FILL station_info — add missing lat/lng if 0
    # ============================================================
    print("=" * 50)
    print("2. FIXING station_info lat/lng (zeros)")
    print("=" * 50)
    
    zero_coords = list(si.find(
        {"$or": [
            {"lat": "0"}, {"lat": "0.0"}, {"lat": 0}, {"lat": ""},
            {"lng": "0"}, {"lng": "0.0"}, {"lng": 0}, {"lng": ""}
        ]},
        {"station_code": 1, "lat": 1, "lng": 1}
    ))
    print(f"  Stations with zero/empty lat/lng: {len(zero_coords)}")
    
    coords_filled = 0
    for doc in zero_coords:
        code = doc["station_code"]
        if code in datameet and "lat" in datameet[code]:
            si.update_one(
                {"station_code": code},
                {"$set": {
                    "lat": str(datameet[code]["lat"]),
                    "lng": str(datameet[code]["lng"])
                }}
            )
            coords_filled += 1
            if coords_filled <= 5:
                print(f"    ✅ {code}: ({datameet[code]['lat']}, {datameet[code]['lng']})")
    
    print(f"  Fixed coordinates for {coords_filled} stations\n")

    # ============================================================
    # 3. FILL station_zones — add zone for stations missing zone
    # ============================================================
    print("=" * 50)
    print("3. ENRICHING station_zones with datameet zone data")
    print("=" * 50)
    
    sz = db["station_zones"]
    # Check stations in station_info that are NOT in station_zones
    si_codes = set(doc["station_code"] for doc in si.find({}, {"station_code": 1}))
    sz_codes = set(doc["station_code"] for doc in sz.find({}, {"station_code": 1}))
    missing_in_zones = si_codes - sz_codes
    print(f"  Stations in station_info but NOT in station_zones: {len(missing_in_zones)}")
    
    zones_added = 0
    for code in missing_in_zones:
        if code in datameet and datameet[code]["zone"]:
            zone = datameet[code]["zone"]
            name = datameet[code]["name"]
            
            # Map zone abbreviation to full name
            zone_names = {
                "NR": "Northern Railway", "NER": "North Eastern Railway",
                "NWR": "North Western Railway", "NFR": "Northeast Frontier Railway",
                "ER": "Eastern Railway", "ECR": "East Central Railway",
                "ECoR": "East Coast Railway", "SR": "Southern Railway",
                "SER": "South Eastern Railway", "SECR": "South East Central Railway",
                "SWR": "South Western Railway", "SCR": "South Central Railway",
                "CR": "Central Railway", "WR": "Western Railway",
                "WCR": "West Central Railway", "NCR": "North Central Railway",
                "KR": "Konkan Railway", "MR": "Metro Railway",
            }
            zone_name = zone_names.get(zone, zone)
            
            sz.insert_one({
                "station_code": code,
                "station_name": name,
                "zone_id": "",
                "zone": zone,
                "zone_name": zone_name,
                "zone_mapping": "",
                "zone_mapping_name": zone_name
            })
            zones_added += 1
            if zones_added <= 10:
                print(f"    ✅ {code}: {name} → {zone}")
    
    print(f"  Added {zones_added} stations to station_zones\n")

    # ============================================================
    # 4. SUMMARY
    # ============================================================
    print("=" * 50)
    print("SUMMARY")
    print("=" * 50)
    print(f"  station_info.city filled:    {city_filled}")
    print(f"  station_info lat/lng fixed:  {coords_filled}")
    print(f"  station_zones entries added: {zones_added}")
    
    # Remaining gaps
    remaining_city = si.count_documents({"$or": [{"city": ""}, {"city": None}]})
    total_si = si.count_documents({})
    print(f"\n  station_info.city remaining empty: {remaining_city}/{total_si} ({remaining_city/total_si*100:.1f}%)")
    
    client.close()


if __name__ == "__main__":
    main()
