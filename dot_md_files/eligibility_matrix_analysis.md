# Eligibility Matrix Analysis - Complete Specification

## Overview
The **Eligibility Matrix** is the core decision-making engine that determines which RAC passengers can be upgraded to confirmed berths. This document serves as the definitive specification for the entire reallocation process.

---

## 1️⃣ TRIGGER POINTS

Eligibility evaluation runs when **ANY** of these events occur:

1. ✅ **Confirmed passenger deboards**
2. ✅ **Passenger cancels**
3. ✅ **Passenger marked as no-show** (`no_show = true`)
4. ✅ **Seat becomes free during station transition**
5. ✅ **Manual call from TTE Portal**
6. ✅ **System recomputes vacancy ranges**

---

## 2️⃣ STEP 1 — VACANCY DETECTION

### Input
```javascript
berth.segmentOccupancy = [PNR/null, PNR/null, ...]
```

### Algorithm: `_getVacantSegmentRanges(berth, stations)`
Finds all **continuous null ranges** in the segment occupancy array.

### Output
```javascript
{
  berthId: "S1-12",
  fromIdx: 2,
  toIdx: 5,
  fromStation: "BZA",
  toStation: "VSKP"
}
```

### Vacancy Merging
- Adjacent vacancy segments for the same berth are **merged into a single continuous range**.
- This prevents fragmentation and maximizes reallocation opportunities.

---

## 3️⃣ STEP 2 — CANDIDATE DISCOVERY (RAC Queue)

### ⚠️ CRITICAL CONSTRAINTS: RAC STATUS + ONLINE + BOARDED

The system **ONLY** checks passengers who meet **ALL THREE** criteria:

1. **`PNR_Status === "RAC"`** (Not CNF, Not WL)
2. **`Passenger_Status === "Online"`**
3. **`Boarded === true`**

### Why These Filters?
- **RAC Status**: Only RAC passengers can be upgraded to CNF (confirmed and waitlist passengers are excluded)
- **Online Status**: Only online passengers can receive real-time WebSocket upgrade offers
- **Boarded Status**: Only physically boarded passengers can be reallocated

### Code Implementation
```javascript
const eligibleCandidates = racQueue.filter(p => 
  p.pnrStatus && p.pnrStatus.toUpperCase() === 'RAC' &&
  p.passengerStatus && p.passengerStatus.toLowerCase() === 'online' &&
  p.boarded === true
);
```

### Process
For each vacancy, iterate through `eligibleCandidates` in deterministic order:
- **RAC 1** → **RAC 2** → **RAC 3** → ...

**Excluded Passengers**:
- ❌ CNF passengers (already confirmed)
- ❌ WL passengers (waitlisted)
- ❌ Offline RAC passengers (handled via TTE Portal)
- ❌ Not-yet-boarded RAC passengers

---

## 4️⃣ STEP 3 — ELIGIBILITY RULES (COMPLETE SET)

**ALL** of these rules must be `TRUE` for a passenger to be eligible:

### 🔹 Rule 0 — Passenger has RAC Status (PRIMARY CONSTRAINT)
```javascript
passenger.pnrStatus === "RAC"
```
- **Why**: Only RAC passengers are eligible for upgrade to CNF
- **Excluded**: CNF (already confirmed), WL (waitlisted)

---

### 🔹 Rule 1 — Passenger is ONLINE
```javascript
passenger.passengerStatus === "Online"
```
- **Why**: Only online passengers can receive real-time WebSocket offers.
- **Note**: Offline passengers are handled via TTE Portal (manual verification).

---

### 🔹 Rule 2 — Passenger is BOARDED
```javascript
passenger.noShow === false && passenger.boarded === true
```
- **Verification**: Backend verifies with actual boarding events.
- **Critical**: Passenger Portal **cannot** mark passengers as boarded (TTE authority only).

---

### 🔹 Rule 3 — Full Journey Coverage (CRITICAL)
```javascript
vacant.fromIdx <= max(passenger.fromIdx, currentStationIdx)
vacant.toIdx >= passenger.toIdx
```
- **Meaning**: The vacancy must **fully cover** the passenger's remaining journey.
- **No Partial Upgrades**: Cannot upgrade for 2 stations then force passenger back to RAC.

---

### 🔹 Rule 4 — Class Match
```javascript
passenger.class === berth.class
```
- **Strict Enforcement**: SL → SL, 3A → 3A (no cross-class upgrades).

---

### 🔹 Rule 5 — Solo RAC Constraint (Revised)
**RAC Sharing Logic**: RAC passengers share a Side Lower berth (2 passengers per berth).

**Constraint**: A passenger who is **alone** in their RAC berth is NOT eligible for upgrade.

**Reasoning**:
- If alone, they effectively have a full berth (no need to share → comfortable).
- Upgrades should prioritize passengers currently **sharing** or **will share soon**.

**Check**:
1. Is passenger **currently sharing** with another passenger?
2. If alone now, will **another passenger board** and share this berth later (journey overlap)?

**If NO to both** → ❌ Not eligible ("Already has full Side Lower - No co-passenger")

**Implementation**: `checkSharingStatus(racPassenger, trainState, currentStationIdx)`

---

### 🔹 Rule 6 — No Conflicting CNF Passenger Boarding Later
Before approving:
- Backend checks if **ANY** confirmed passenger is scheduled to board this berth during the vacancy.
- **If YES** → This vacancy **cannot** be used for RAC upgrade.

---

### 🔹 Rule 7 — Not Already Offered This Vacancy
```javascript
if (passenger.vacancyIdLastOffered === currentVacancyId) {
  skip; // Prevents re-offer in same cycle
}
```

---

### 🔹 Rule 8 — Not Already Accepted Another Offer
```javascript
if (passenger.offerStatus === "accepted") {
  skip; // Already upgraded elsewhere
}
```

---

### 🔹 Rule 9 — RAC Rank Priority
**Sorting Order**:
1. **Primary Key**: RAC number (RAC 1 > RAC 2 > RAC 3)
2. **Secondary**: Earliest booking timestamp (if same RAC number)
3. **Tertiary**: Travel length (optional)

---

### 🔹 Rule 10 — Time-Gap Constraint (Optional, Recommended)
Ignore offers if the vacancy appears **too close** to upcoming station:
- Example: `<1 minute` of travel time left.
- **Why**: Prevents chaotic last-moment moves.

---

### 🔹 Rule 11 — Minimum Journey Distance (70km)
**NEW CONSTRAINT**: Only passengers traveling **70km or more** are eligible for upgrade.

**Reasoning**:
- Short trips (< 70km ≈ 1-1.5 hours) are tolerable sitting.
- Long trips (≥ 70km ≈ 1.5+ hours) genuinely need sleeping berths.
- Prioritizes passengers with **real comfort needs**.

**Calculation**:
```javascript
journeyDistance = toStation.distance - fromStation.distance
if (journeyDistance < 70) → ❌ Not eligible
```

**Data Source**: Stations collection has cumulative `distance` field from train origin.

**Example**:
- Passenger A: 150km → 230km = **80km** ✅ Eligible
- Passenger B: 50km → 100km = **50km** ❌ Not Eligible ("Journey too short")

---

## Summary of Critical Constraints

### 🚨 **STRICT ELIGIBILITY REQUIREMENTS (11 Rules)**
**ONLY passengers matching ALL criteria are eligible:**
1. ✅ `PNR_Status === "RAC"`
2. ✅ `Passenger_Status === "Online"`  
3. ✅ `Boarded === true`
4. ✅ Full journey coverage (vacant segment must cover remaining journey)
5. ✅ Class match (SL → SL, 3A → 3A)
6. ✅ Solo RAC Constraint (must be sharing or will share berth)
7. ✅ No conflicting CNF passengers boarding later
8. ✅ Not already offered this vacancy
9. ✅ Not already accepted another offer
10. ✅ Sufficient time remaining (not too close to destination)
11. ✅ **Journey distance ≥ 70km** (NEW)

### ❌ **EXCLUDED FROM REALLOCATION:**
- CNF passengers (already confirmed)
- WL passengers (waitlist)
- Offline RAC passengers (handled via TTE Portal)
- Not-yet-boarded RAC passengers
- Solo RAC passengers (no current/future co-passenger)
- RAC passengers with journey < 70km (too short to justify upgrade)

---

## Implementation Status

📝 **Specification**: **COMPLETE**  
✅ **Implementation**: **COMPLETE** (Implemented in `ReallocationService.js`)

**Files Updated**:
- `backend/services/ReallocationService.js`
  - `getRACQueue()` - 3-way filter (RAC + Online + Boarded)
  - `isEligibleForSegment()` - 11 comprehensive rules
  - `checkSharingStatus()` - Validates Solo RAC Constraint
  - `calculateJourneyDistance()` - Computes distance from stations collection

**Latest Updates**:
- ✅ Rule 5 revised to **Solo RAC Constraint** (prevents upgrading passengers who are already alone)
- ✅ Rule 11 added: **70km minimum journey distance** (ensures upgrades prioritize long-distance passengers)
