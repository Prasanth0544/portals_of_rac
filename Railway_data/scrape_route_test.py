"""
Scrape train route (all stopping stations) from erail.in
Extracts the route table: #, Code, Station Name, Zone, Division,
Arrival, Departure, Halt, Platform, Distance, Day, Remark

Test with train 17225 first.
"""

import requests
from bs4 import BeautifulSoup
import json
import re

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://erail.in/",
}


def scrape_train_route(train_no):
    """Scrape route table from erail.in/train/{train_no}"""
    url = f"https://erail.in/train/{train_no}"
    print(f"Fetching: {url}")
    
    resp = requests.get(url, headers=HEADERS, timeout=15)
    if resp.status_code != 200:
        print(f"  ❌ HTTP {resp.status_code}")
        return None
    
    soup = BeautifulSoup(resp.text, 'html.parser')
    
    # The route table has rows with station data
    # Look for table rows with station codes
    stops = []
    
    # Find all table rows
    rows = soup.find_all('tr')
    
    for row in rows:
        cells = row.find_all('td')
        if len(cells) < 8:
            continue
        
        # Extract text from each cell
        cell_texts = [c.get_text(strip=True) for c in cells]
        
        # Check if first cell is a number (sequence #)
        try:
            seq = int(cell_texts[0])
        except (ValueError, IndexError):
            continue
        
        # Parse the row: #, Code, Name, Zone, Div, Arr, Dep, Halt, PF, Dist, Day, Remark
        stop = {
            "seq": seq,
            "station_code": cell_texts[1] if len(cell_texts) > 1 else "",
            "station_name": cell_texts[2] if len(cell_texts) > 2 else "",
            "zone": cell_texts[3] if len(cell_texts) > 3 else "",
            "division": cell_texts[4] if len(cell_texts) > 4 else "",
            "arrival": cell_texts[5] if len(cell_texts) > 5 else "",
            "departure": cell_texts[6] if len(cell_texts) > 6 else "",
            "halt_min": cell_texts[7] if len(cell_texts) > 7 else "",
            "platform": cell_texts[8] if len(cell_texts) > 8 else "",
            "distance_km": cell_texts[9] if len(cell_texts) > 9 else "",
            "day": cell_texts[10] if len(cell_texts) > 10 else "",
        }
        
        # Clean up
        stop["station_code"] = stop["station_code"].strip()
        if stop["station_code"] and len(stop["station_code"]) <= 6:
            stops.append(stop)
    
    if not stops:
        # Try alternative: look for divs with class containing route data
        print("  No table rows found, trying div-based parsing...")
        # erail sometimes uses divs instead of tables
        divs = soup.find_all('div', class_=re.compile('rte|stn|sch', re.I))
        print(f"  Found {len(divs)} route-related divs")
        
        # Also save raw HTML for manual inspection
        with open('/tmp/erail_17225.html', 'w', encoding='utf-8') as f:
            f.write(resp.text)
        print("  Saved raw HTML to /tmp/erail_17225.html")
    
    return stops


def format_route(train_no, stops):
    """Pretty print the route."""
    print(f"\n{'='*80}")
    print(f"  Train {train_no} — {len(stops)} stops")
    print(f"{'='*80}")
    print(f"  {'#':>3}  {'Code':<6} {'Station Name':<25} {'Zone':<5} {'Arr':>6} {'Dep':>6} {'Halt':>5} {'PF':>3} {'Dist':>5} {'Day':>3}")
    print(f"  {'-'*3}  {'-'*6} {'-'*25} {'-'*5} {'-'*6} {'-'*6} {'-'*5} {'-'*3} {'-'*5} {'-'*3}")
    
    for s in stops:
        print(f"  {s['seq']:>3}  {s['station_code']:<6} {s['station_name']:<25} {s['zone']:<5} {s['arrival']:>6} {s['departure']:>6} {s['halt_min']:>5} {s['platform']:>3} {s['distance_km']:>5} {s['day']:>3}")
    
    # Summary
    codes = [s['station_code'] for s in stops]
    print(f"\n  Route: {' → '.join(codes)}")
    print(f"  Total stops: {len(stops)}")
    if stops:
        print(f"  Total distance: {stops[-1].get('distance_km', '?')} km")


if __name__ == "__main__":
    train_no = "17225"
    stops = scrape_train_route(train_no)
    
    if stops:
        format_route(train_no, stops)
        
        # Save to JSON
        result = {
            "train_number": train_no,
            "total_stops": len(stops),
            "stops": stops,
            "stop_codes": [s["station_code"] for s in stops]
        }
        with open('/tmp/route_17225.json', 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\n  ✅ Saved to /tmp/route_17225.json")
    else:
        print("  ❌ No route data found")
        print("  Check /tmp/erail_17225.html for raw HTML")
