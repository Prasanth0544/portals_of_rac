"""
Fill station_zones.station_name using datameet/railways station dataset.
Source: https://github.com/datameet/railways (stations.json - GeoJSON)

Also marks prefixed codes (XX-, YY-, etc) as operational codes.
"""
import requests
import json
from pymongo import MongoClient

GEOJSON_URL = "https://raw.githubusercontent.com/nicholasgasior/indian-railway-stations/master/stations.json"
DATAMEET_URL = "https://raw.githubusercontent.com/nicholasgasior/indian-railway-stations/master/stations.json"

def download_datameet():
    """Download station data from datameet GeoJSON."""
    url = "https://raw.githubusercontent.com/datameet/railways/master/stations.json"
    print(f"Downloading from {url}...")
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    data = r.json()
    
    lookup = {}
    for feature in data["features"]:
        props = feature.get("properties", {})
        code = props.get("code", "").strip()
        name = props.get("name", "").strip()
        # Skip entries where name equals code (no real name found in dataset)
        if code and name and name != code:
            lookup[code] = name
    return lookup


def main():
    client = MongoClient("mongodb://localhost:27017")
    db = client["RailwayData"]
    station_zones = db["station_zones"]

    # Download station dataset
    lookup = download_datameet()
    print(f"Station lookup built: {len(lookup)} stations from datameet")

    # Get missing station codes
    missing = list(station_zones.find(
        {"$or": [{"station_name": ""}, {"station_name": None}]},
        {"station_code": 1}
    ))
    codes = sorted(set(doc["station_code"] for doc in missing))
    print(f"station_zones missing names: {len(codes)}\n")

    filled = 0
    operational = 0
    not_found = []

    for code in codes:
        # Prefixed/operational codes
        if "-" in code:
            station_zones.update_many(
                {"station_code": code, "$or": [{"station_name": ""}, {"station_name": None}]},
                {"$set": {"station_name": f"[Operational] {code}"}}
            )
            operational += 1
            continue

        # Look up in datameet
        if code in lookup:
            station_zones.update_many(
                {"station_code": code, "$or": [{"station_name": ""}, {"station_name": None}]},
                {"$set": {"station_name": lookup[code]}}
            )
            filled += 1
            if filled <= 20:
                print(f"  ✅ {code}: {lookup[code]}")
        else:
            not_found.append(code)

    print(f"\n{'='*50}")
    print(f"Done!")
    print(f"  Filled from datameet: {filled}")
    print(f"  Marked operational: {operational}")
    print(f"  Still not found: {len(not_found)}")

    if not_found:
        print(f"\nNot found ({len(not_found)}): {not_found[:15]}...")

    # Final stats
    total_empty = station_zones.count_documents(
        {"$or": [{"station_name": ""}, {"station_name": None}]}
    )
    total = station_zones.count_documents({})
    print(f"\nstation_zones: {total_empty}/{total} still missing ({total_empty/total*100:.1f}%)")

    client.close()


if __name__ == "__main__":
    main()
