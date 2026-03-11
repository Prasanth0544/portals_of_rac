"""
Scrape train route (all stopping stations) from erail.in
Uses Selenium because erail loads route tables via JavaScript.

Usage:
  python scrape_train_routes.py                    # Test with 17225
  python scrape_train_routes.py 12727              # Single train
  python scrape_train_routes.py --all              # All trains (12,813)
  python scrape_train_routes.py --batch 100        # First 100 trains
  python scrape_train_routes.py --workers 8        # All trains with 8 threads

Output: Saves to RailwayData.train_routes collection in MongoDB

Threading: 5 parallel Chrome instances by default (~5x speedup)
  12,813 trains x 4 sec/train / 5 workers = ~2.8 hours
"""

import time
import json
import sys
import os
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import UnexpectedAlertPresentException, NoAlertPresentException, TimeoutException, WebDriverException
from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "RailwayData"
COLLECTION = "train_routes"
PROGRESS_FILE = os.path.join(os.path.dirname(__file__), "route_scrape_progress.json")

WORKERS = 5          # parallel Chrome instances
DELAY = 0.5          # seconds between requests per thread
SAVE_EVERY = 20      # save progress every N completions

# Thread-safe locks
progress_lock = threading.Lock()
print_lock = threading.Lock()
stats = {"success": 0, "fail": 0, "total": 0}


def safe_print(*args, **kwargs):
    with print_lock:
        print(*args, **kwargs, flush=True)


def create_driver():
    """Create headless Chrome driver."""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-extensions")
    options.add_argument("--blink-settings=imagesEnabled=false")  # skip loading images
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
    options.page_load_strategy = 'eager'  # don't wait for images/ads to finish
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(60)  # 60s timeout for slow pages
    driver.implicitly_wait(3)
    return driver


def dismiss_alert(driver):
    """Dismiss any JavaScript alert that may be open."""
    try:
        alert = driver.switch_to.alert
        alert.dismiss()
        time.sleep(0.3)
    except NoAlertPresentException:
        pass
    except Exception:
        pass


JS_EXTRACT_ROUTE = """
var rows = document.querySelectorAll('tr');
var stops = [];
for (var i = 0; i < rows.length; i++) {
    var cells = rows[i].querySelectorAll('td');
    if (cells.length < 8) continue;
    var seq = cells[0].innerText.trim();
    if (!/^\\d+$/.test(seq)) continue;
    var stop = {
        seq: parseInt(seq),
        station_code: cells[1] ? cells[1].innerText.trim() : '',
        station_name: cells[2] ? cells[2].innerText.trim() : '',
        zone: cells[3] ? cells[3].innerText.trim() : '',
        division: cells[4] ? cells[4].innerText.trim() : '',
        arrival: cells[5] ? cells[5].innerText.trim() : '',
        departure: cells[6] ? cells[6].innerText.trim() : '',
        halt_min: cells[7] ? cells[7].innerText.trim() : ''
    };
    if (cells.length > 8) stop.platform = cells[8].innerText.trim();
    if (cells.length > 9) stop.distance_km = cells[9].innerText.trim();
    if (cells.length > 10) stop.day = cells[10].innerText.trim();
    if (stop.station_code && stop.station_code.length <= 6) {
        stops.push(stop);
    }
}
return JSON.stringify(stops);
"""

# JavaScript to find and use the CORRECT train search input (not PNR)
# Actual IDs from erail.in HTML:
#   txtTrain_no  - train search input (ID has underscore!)
#   txtPNR       - PNR input (avoid this!)
#   Find Train   - is an <a> tag, NOT a button
JS_SEARCH_TRAIN = """
function searchTrain(trainNo) {
    // The train input ID is txtTrain_no (with underscore, NOT txtTrainNo)
    var input = document.getElementById('txtTrain_no');
    
    if (!input) {
        // Fallback: find by placeholder
        var allInputs = document.querySelectorAll('input[type="text"]');
        for (var i = 0; i < allInputs.length; i++) {
            var ph = (allInputs[i].placeholder || '').toLowerCase();
            var id = (allInputs[i].id || '').toLowerCase();
            if (ph.indexOf('train') >= 0 && id.indexOf('pnr') === -1) {
                input = allInputs[i];
                break;
            }
        }
    }
    
    if (!input) return 'INPUT_NOT_FOUND';
    
    // Clear and set value
    input.value = '';
    input.focus();
    input.value = trainNo;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Set CmdID=1 (required by erail.in for train search)
    if (typeof CmdID !== 'undefined') CmdID = 1;
    
    // "Find Train" is an <a> tag, not a button
    var links = document.querySelectorAll('a');
    for (var j = 0; j < links.length; j++) {
        var text = (links[j].innerText || '').trim().toLowerCase();
        if (text.indexOf('find train') >= 0 || text === 'find train') {
            links[j].click();
            return 'OK';
        }
    }
    
    // Fallback: try calling ShowTrainRoute directly (erail JS function)
    if (typeof ShowTrainRoute === 'function') {
        ShowTrainRoute();
        return 'OK_DIRECT';
    }
    
    // Fallback: press Enter on input
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', keyCode: 13, bubbles: true}));
    return 'ENTER_PRESSED';
}
return searchTrain(arguments[0]);
"""


def scrape_route(driver, train_no):
    """Scrape route table for a single train by searching on erail."""
    try:
        dismiss_alert(driver)
        driver.get("https://erail.in/")
        time.sleep(2)
        dismiss_alert(driver)
    except (UnexpectedAlertPresentException, TimeoutException, WebDriverException):
        dismiss_alert(driver)
        # Even on timeout, DOM may be partially loaded — try to continue
        time.sleep(1)

    dismiss_alert(driver)

    # Use JavaScript to find correct input and search
    try:
        result = driver.execute_script(JS_SEARCH_TRAIN, train_no)
        if result == 'INPUT_NOT_FOUND':
            return None
    except UnexpectedAlertPresentException:
        dismiss_alert(driver)
        try:
            result = driver.execute_script(JS_SEARCH_TRAIN, train_no)
        except:
            return None
    except Exception:
        return None

    # Poll for route table to load                           (up to 10 seconds instead of fixed 4s wait)
    stops = []
    for attempt in range(10):
        time.sleep(1)
        dismiss_alert(driver)
        try:
            result = driver.execute_script(JS_EXTRACT_ROUTE)
            stops = json.loads(result)
            if stops:
                break  # Got data, stop polling
        except UnexpectedAlertPresentException:
            dismiss_alert(driver)
        except Exception:
            pass

    return stops if stops else None


def save_to_mongodb(train_no, stops, db):
    """Save route data to MongoDB."""
    for s in stops:
        try:
            s["distance_km"] = int(s.get("distance_km", "0"))
        except (ValueError, TypeError):
            pass
        try:
            s["day"] = int(s.get("day", "1"))
        except (ValueError, TypeError):
            s["day"] = 1

    doc = {
        "train_number": train_no,
        "total_stops": len(stops),
        "stops": stops,
        "stop_codes": [s["station_code"] for s in stops],
        "source_station": stops[0]["station_code"] if stops else "",
        "dest_station": stops[-1]["station_code"] if stops else "",
        "total_distance_km": stops[-1].get("distance_km", 0) if stops else 0,
        "source": "erail.in",
        "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    db[COLLECTION].update_one(
        {"train_number": train_no},
        {"$set": doc},
        upsert=True,
    )
    return doc


def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r") as f:
            return json.load(f)
    return {"completed": [], "failed": []}


def save_progress(progress):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f)


def get_all_train_numbers(db):
    trains = db["train_info"].find({}, {"train_number": 1, "_id": 0})
    return [t["train_number"] for t in trains]


# ─── Single train (no threading) ────────────────────────────────

def scrape_single(train_no):
    """Scrape and display route for a single train."""
    print(f"\n🚂 Scraping route for train {train_no}...")

    driver = create_driver()
    try:
        stops = scrape_route(driver, train_no)

        if not stops:
            print(f"  ❌ No route data found for {train_no}")
            with open("/tmp/erail_debug.html", "w", encoding="utf-8") as f:
                f.write(driver.page_source)
            print(f"  📄 Page source saved to /tmp/erail_debug.html")
            return None

        # Print formatted table
        print(
            f"\n  {'#':>3}  {'Code':<6} {'Station Name':<25} {'Zone':<5} "
            f"{'Arr':>6} {'Dep':>6} {'Halt':>5} {'Dist':>5} {'Day':>3}"
        )
        print(f"  {'-'*3}  {'-'*6} {'-'*25} {'-'*5} {'-'*6} {'-'*6} {'-'*5} {'-'*5} {'-'*3}")
        for s in stops:
            dist = s.get("distance_km", "")
            day = s.get("day", "")
            print(
                f"  {s['seq']:>3}  {s['station_code']:<6} {s['station_name']:<25} "
                f"{s['zone']:<5} {s['arrival']:>6} {s['departure']:>6} "
                f"{s['halt_min']:>5} {str(dist):>5} {str(day):>3}"
            )

        print(f"\n  Route: {' → '.join(s['station_code'] for s in stops)}")
        print(f"  Total stops: {len(stops)}")

        # Save to MongoDB
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        save_to_mongodb(train_no, stops, db)
        print(f"  ✅ Saved to RailwayData.train_routes")

        # Also save JSON
        output_file = os.path.join(os.path.dirname(__file__), f"route_{train_no}.json")
        with open(output_file, "w") as f:
            json.dump(
                {
                    "train_number": train_no,
                    "total_stops": len(stops),
                    "stops": stops,
                    "stop_codes": [s["station_code"] for s in stops],
                },
                f,
                indent=2,
                default=str,
            )
        print(f"  ✅ Saved to {output_file}")
        client.close()
        return stops

    finally:
        driver.quit()


# ─── Worker function for threading ──────────────────────────────

def worker_scrape(train_list, worker_id, progress, db):
    """One worker thread: creates its own Chrome driver, scrapes its assigned trains."""
    driver = create_driver()
    local_success = 0
    local_fail = 0
    consecutive_fails = 0

    try:
        for i, train_no in enumerate(train_list):
            try:
                stops = scrape_route(driver, train_no)

                if stops:
                    save_to_mongodb(train_no, stops, db)
                    with progress_lock:
                        progress["completed"].append(train_no)
                        stats["success"] += 1
                    local_success += 1
                    consecutive_fails = 0
                    safe_print(
                        f"  [W{worker_id}] {train_no} ✅ {len(stops)} stops "
                        f"({stats['success']}/{stats['total']})"
                    )
                else:
                    with progress_lock:
                        progress["failed"].append(train_no)
                        stats["fail"] += 1
                    local_fail += 1
                    consecutive_fails += 1
                    safe_print(f"  [W{worker_id}] {train_no} ❌ no data")

                # Save progress periodically
                done = stats["success"] + stats["fail"]
                if done % SAVE_EVERY == 0:
                    with progress_lock:
                        save_progress(progress)
                    safe_print(
                        f"  💾 Progress: {stats['success']} done, "
                        f"{stats['fail']} failed, "
                        f"{stats['total'] - done} remaining"
                    )

                # If too many consecutive fails, recreate driver
                if consecutive_fails >= 5:
                    safe_print(f"  [W{worker_id}] ♻️ Recreating driver after {consecutive_fails} fails")
                    try:
                        driver.quit()
                    except:
                        pass
                    driver = create_driver()
                    consecutive_fails = 0
                    time.sleep(2)

                time.sleep(DELAY)

            except Exception as e:
                err_msg = str(e).split('\n')[0][:80]
                safe_print(f"  [W{worker_id}] {train_no} ❌ Error: {err_msg}")
                with progress_lock:
                    progress["failed"].append(train_no)
                    stats["fail"] += 1
                consecutive_fails += 1

                # Recreate driver if crashed
                try:
                    driver.quit()
                except:
                    pass
                driver = create_driver()
                time.sleep(2)

    finally:
        try:
            driver.quit()
        except:
            pass

    return local_success, local_fail


# ─── Batch scraping with threading ──────────────────────────────

def scrape_batch(limit=None, workers=WORKERS):
    """Scrape routes for all trains using parallel Chrome workers."""
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    all_trains = get_all_train_numbers(db)
    progress = load_progress()
    completed = set(progress["completed"])

    pending = [t for t in all_trains if t not in completed]
    if limit:
        pending = pending[:limit]

    stats["total"] = len(pending)
    stats["success"] = 0
    stats["fail"] = 0

    print(f"📋 Total trains in DB: {len(all_trains)}")
    print(f"✅ Already completed: {len(completed)}")
    print(f"🔄 Pending this run: {len(pending)}")
    print(f"🧵 Workers: {workers}")
    print(f"⏱  Estimated time: {len(pending) * 4 / workers / 60:.1f} minutes")
    print()

    if not pending:
        print("Nothing to do!")
        client.close()
        return

    # Split work across workers
    chunks = [[] for _ in range(workers)]
    for i, train_no in enumerate(pending):
        chunks[i % workers].append(train_no)

    start_time = time.time()

    # Launch worker threads
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = []
        for wid, chunk in enumerate(chunks):
            if chunk:
                f = executor.submit(worker_scrape, chunk, wid, progress, db)
                futures.append(f)

        # Wait for all workers
        for f in as_completed(futures):
            try:
                f.result()
            except Exception as e:
                safe_print(f"  ❌ Worker crashed: {e}")

    # Final save
    with progress_lock:
        save_progress(progress)

    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"📊 DONE in {elapsed/60:.1f} minutes")
    print(f"   ✅ Success: {stats['success']}")
    print(f"   ❌ Failed:  {stats['fail']}")
    print(f"   ⏱  Avg: {elapsed/max(stats['success']+stats['fail'],1):.1f}s per train")
    print(f"{'='*60}")

    client.close()


# ─── Main ───────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) == 1:
        # Default: test with 17225
        scrape_single("17225")

    elif sys.argv[1] == "--all":
        workers = WORKERS
        if "--workers" in sys.argv:
            idx = sys.argv.index("--workers")
            workers = int(sys.argv[idx + 1])
        scrape_batch(workers=workers)

    elif sys.argv[1] == "--batch":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 100
        workers = WORKERS
        if "--workers" in sys.argv:
            idx = sys.argv.index("--workers")
            workers = int(sys.argv[idx + 1])
        scrape_batch(limit=limit, workers=workers)

    elif sys.argv[1] == "--workers":
        workers = int(sys.argv[2]) if len(sys.argv) > 2 else WORKERS
        scrape_batch(workers=workers)

    else:
        # Single train number
        scrape_single(sys.argv[1])
