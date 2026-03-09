"""
Scrape running days for all trains from erail.in
and add 'running_days' field to train_info collection in RailwayData

Source: erail.in/rail/getTrains.aspx (public Indian Railways enquiry)
Format: ~ delimited response, field[13] = running days (Sun-Sat, 1=runs)

Features:
  - Batch processing with rate limiting (0.3s between requests)
  - Resume capability (saves progress to JSON file)
  - Updates train_info with: running_days, running_days_text, src_station,
    dest_station, departure, arrival, duration, distance_km, train_category,
    gauge, zone_from_erail, data_source
"""

import requests
import time
import json
import os
from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"
COLLECTION = "train_info"
PROGRESS_FILE = r"C:\Users\prasa\Desktop\RAC\zip_2\Railway_data\scrape_progress.json"

ERAIL_URL = "https://erail.in/rail/getTrains.aspx"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
DELAY = 0.3  # seconds between requests
BATCH_SIZE = 100  # save progress every N trains


def parse_erail_response(text, train_no):
    """Parse erail.in ~ delimited response."""
    text = text.strip()
    if not text:
        return None

    records = text.split("^")
    for rec in records:
        fields = rec.split("~")
        if len(fields) < 40:
            continue
        if fields[0] != train_no:
            continue

        running_days_raw = fields[13] if len(fields) > 13 else ""
        running_days_alt = fields[29] if len(fields) > 29 else ""
        running = running_days_raw or running_days_alt

        if not running or len(running) != 7:
            continue

        # Build readable text
        days_text = []
        for i, ch in enumerate(running):
            if ch == "1":
                days_text.append(DAYS[i])

        if len(days_text) == 7:
            days_label = "Daily"
        elif len(days_text) == 0:
            days_label = "Not Running"
        else:
            days_label = ", ".join(days_text)

        result = {
            "running_days": running,              # "1111111"
            "running_days_text": days_label,       # "Daily" or "Mon, Wed, Fri"
        }

        # Extra fields if available
        if len(fields) > 2 and fields[2]:
            result["src_station_name"] = fields[2]
        if len(fields) > 3 and fields[3]:
            result["src_station_code"] = fields[3]
        if len(fields) > 4 and fields[4]:
            result["dest_station_name"] = fields[4]
        if len(fields) > 5 and fields[5]:
            result["dest_station_code"] = fields[5]
        if len(fields) > 10 and fields[10]:
            result["departure_time"] = fields[10]
        if len(fields) > 11 and fields[11]:
            result["arrival_time"] = fields[11]
        if len(fields) > 12 and fields[12]:
            result["duration"] = fields[12]
        if len(fields) > 28 and fields[28]:
            try:
                result["total_stops"] = int(fields[28])
            except:
                pass
        if len(fields) > 32 and fields[32]:
            result["train_category"] = fields[32]
        if len(fields) > 39 and fields[39]:
            try:
                result["distance_km"] = int(fields[39])
            except:
                pass
        if len(fields) > 53 and fields[53]:
            result["zone_erail"] = fields[53]
        if len(fields) > 55 and fields[55]:
            result["gauge"] = fields[55]

        result["data_source"] = "erail.in"

        return result

    return None


def load_progress():
    """Load scraped train numbers from progress file."""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r") as f:
            return json.load(f)
    return {"completed": [], "failed": [], "not_found": []}


def save_progress(progress):
    """Save progress to file."""
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f)


def main():
    print("🚂 Running Days Scraper (erail.in)")
    print("=" * 60)

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    col = db[COLLECTION]

    # Get all train numbers
    all_trains = [doc["train_no"] for doc in col.find({}, {"train_no": 1})]
    print(f"   Total trains in DB: {len(all_trains)}")

    # Load progress
    progress = load_progress()
    done = set(progress["completed"])
    remaining = [t for t in all_trains if t not in done]
    print(f"   Already scraped: {len(done)}")
    print(f"   Remaining: {len(remaining)}")

    if not remaining:
        print("   ✅ All trains already scraped!")
        client.close()
        return

    success = 0
    failed = 0
    not_found = 0
    batch_count = 0

    print(f"\n   Starting scrape ({len(remaining)} trains, ~{len(remaining)*DELAY/60:.0f} min estimated)...")
    print(f"   Rate: {DELAY}s delay between requests")
    print(f"   Progress saves every {BATCH_SIZE} trains")
    print()

    for i, train_no in enumerate(remaining):
        try:
            params = {
                "TrainNo": train_no,
                "DataSource": "0",
                "Language": "0",
                "Cache": "true"
            }
            r = requests.get(ERAIL_URL, params=params, headers=HEADERS, timeout=15)

            if r.status_code == 200 and r.text.strip():
                data = parse_erail_response(r.text, train_no)
                if data:
                    col.update_one(
                        {"train_no": train_no},
                        {"$set": data}
                    )
                    success += 1
                    progress["completed"].append(train_no)
                else:
                    not_found += 1
                    progress["not_found"].append(train_no)
            else:
                failed += 1
                progress["failed"].append(train_no)

        except Exception as e:
            failed += 1
            progress["failed"].append(train_no)
            if "429" in str(e) or "Too Many" in str(e):
                print(f"   ⚠️  Rate limited! Waiting 30s...")
                time.sleep(30)

        batch_count += 1

        # Progress log
        if batch_count % 50 == 0:
            total_done = len(done) + success + not_found + failed
            pct = total_done / len(all_trains) * 100
            print(f"   [{pct:5.1f}%] {total_done}/{len(all_trains)} | ✅ {success} | ❌ {failed} | 🔍 {not_found} | train: {train_no}")

        # Save progress
        if batch_count % BATCH_SIZE == 0:
            save_progress(progress)

        time.sleep(DELAY)

    # Final save
    save_progress(progress)

    # Summary
    total_with_days = col.count_documents({"running_days": {"$exists": True}})

    print(f"\n{'='*60}")
    print(f"✅ COMPLETE!")
    print(f"   Scraped: {success} trains")
    print(f"   Not found on erail: {not_found}")
    print(f"   Failed: {failed}")
    print(f"   Total with running_days field: {total_with_days}/{len(all_trains)}")
    print(f"   Source: erail.in")

    # Show sample
    print(f"\n📋 Sample enriched documents:")
    for doc in col.find({"running_days": {"$exists": True}}).limit(5):
        print(f"   {doc['train_no']} | {doc.get('train_name','')[:30]:30} | days={doc.get('running_days','')} ({doc.get('running_days_text','')})")

    client.close()
    print("\n✅ Done!")


if __name__ == "__main__":
    main()
