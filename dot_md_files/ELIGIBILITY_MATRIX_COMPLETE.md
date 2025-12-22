# RAC Eligibility Matrix - Complete Guide

**Last Updated**: December 23, 2025  
**Status**: ✅ Implementation Complete & Verified

---

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [The 11 Eligibility Rules](#the-11-eligibility-rules)
4. [Implementation Details](#implementation-details)
5. [Testing & Troubleshooting](#testing--troubleshooting)

---

## Overview

The **Eligibility Matrix** is the core decision-making engine that determines which RAC passengers can be upgraded to confirmed berths. This system implements **11 strict eligibility rules** to ensure fair, efficient, and safe berth reallocation.

### Key Features
- ✅ Real-time vacancy detection
- ✅ Automated eligibility checking with 11 rules
- ✅ Priority-based allocation (RAC 1 > RAC 2 > RAC 3)
- ✅ Journey distance validation (≥70km)
- ✅ Online passenger WebSocket notifications
- ✅ Offline passenger TTE queue management

---

## System Architecture

### Trigger Points

Eligibility evaluation runs when **ANY** of these events occur:

1. ✅ **Confirmed passenger deboards**
2. ✅ **Passenger cancels booking**
3. ✅ **Passenger marked as no-show** (`no_show = true`)
4. ✅ **Seat becomes free during station transition**
5. ✅ **Manual call from TTE Portal**
6. ✅ **System recomputes vacancy ranges**

### Process Flow

```mermaid
graph TD
    A[Vacancy Created] --> B[Detect Vacant Segments]
    B --> C[Get RAC Queue]
    C --> D{Filter: RAC + Online + Boarded}
    D --> E[Apply 11 Eligibility Rules]
    E --> F{Eligible?}
    F -->|Yes| G[Sort by RAC Priority]
    F -->|No| H[Skip]
    G --> I[Generate Eligibility Matrix]
    I --> J[Send to Frontend]
```

### Service Architecture

| Service | Responsibility |
|---------|---------------|
| **ReallocationService.js** | Main orchestrator, generates eligibility matrix |
| **EligibilityService.js** | Applies all 11 eligibility rules |
| **VacancyService.js** | Detects vacant berth segments |
| **RACQueueService.js** | Manages RAC passenger queue |
| **AllocationService.js** | Executes berth upgrades |

---

## The 11 Eligibility Rules

### Rule 0: RAC Status (PRIMARY CONSTRAINT)
```javascript
passenger.pnrStatus === "RAC"
```
- **Purpose**: Only RAC passengers eligible for upgrade
- **Excluded**: CNF (already confirmed), WL (waitlisted)

### Rule 1: Online Status
```javascript
passenger.passengerStatus === "Online"
```
- **Purpose**: Only online passengers receive real-time WebSocket offers
- **Note**: Offline passengers handled via TTE Portal

### Rule 2: Boarded Status
```javascript
passenger.noShow === false && passenger.boarded === true
```
- **Purpose**: Only physically boarded passengers can be reallocated
- **Authority**: Only TTE can mark passengers as boarded

### Rule 3: Full Journey Coverage
```javascript
vacant.fromIdx <= max(passenger.fromIdx, currentStationIdx)
vacant.toIdx >= passenger.toIdx
```
- **Purpose**: Vacancy must fully cover passenger's remaining journey
- **No Partial Upgrades**: Cannot upgrade for 2 stations then force back to RAC

### Rule 4: Class Match
```javascript
passenger.class === berth.class
```
- **Purpose**: Strict class matching (SL → SL, 3A → 3A)
- **No Cross-class**: Prevents SL passenger getting 3A berth

### Rule 5: Solo RAC Constraint
**Logic**: RAC passengers share Side Lower berths (2 per berth)

**Constraint**: Passenger **alone** in berth is NOT eligible

**Reasoning**:
- If alone → Full berth (comfortable, no need to upgrade)
- Upgrades prioritize passengers **currently sharing** or **will share soon**

**Implementation**:
```javascript
checkSharingStatus(racPassenger, trainState, currentStationIdx)
```
1. Is passenger currently sharing?
2. If alone, will another passenger board later?
3. If NO to both → ❌ Not eligible

### Rule 6: No Conflicting CNF Passenger
**Check**: Any confirmed passenger scheduled to board this berth during vacancy?

**If YES** → Vacancy cannot be used for RAC upgrade

**Implementation**:
```javascript
checkConflictingCNFPassenger(vacantSegment, currentStationIdx, trainState)
```

### Rule 7: Not Already Offered This Vacancy
```javascript
passenger.vacancyIdLastOffered !== currentVacancyId
```
- **Purpose**: Prevents re-offering same vacancy in one cycle

### Rule 8: Not Already Accepted Another Offer
```javascript
passenger.offerStatus !== "accepted"
```
- **Purpose**: Passenger already upgraded elsewhere

### Rule 9: RAC Rank Priority
**Sorting Order**:
1. **Primary**: RAC number (RAC 1 > RAC 2 > RAC 3)
2. **Secondary**: Earliest booking timestamp
3. **Tertiary**: Travel length (optional)

**Implementation**:
```javascript
eligibleRAC.sort((a, b) => {
  const getRACNumber = (status) => {
    const match = status?.match(/RAC\s*(\d+)/i);
    return match ? parseInt(match[1]) : 999;
  };
  return getRACNumber(a.racStatus) - getRACNumber(b.racStatus);
});
```

### Rule 10: Time-Gap Constraint
```javascript
segmentsRemaining = vacantSegment.toIdx - currentStationIdx
if (segmentsRemaining < 1) → Not eligible
```
- **Purpose**: Prevents chaotic last-moment moves
- **Threshold**: Must have ≥1 segment remaining

### Rule 11: Minimum Journey Distance (70km)
```javascript
journeyDistance = toStation.distance - fromStation.distance
if (journeyDistance < 70) → Not eligible
```
- **Purpose**: Prioritize long-distance passengers with real comfort needs
- **Reasoning**: Short trips (<70km ≈ 1-1.5 hours) are tolerable sitting
- **Data Source**: Stations collection cumulative `distance` field

**Example**:
- Passenger A: 150km → 230km = **80km** ✅ Eligible
- Passenger B: 50km → 100km = **50km** ❌ Not Eligible

---

## Implementation Details

### Files Updated

#### Backend Services
- [`ReallocationService.js`](file:///c:/Users/prasa/Desktop/RAC/zip_2/backend/services/ReallocationService.js)
  - `getEligibilityMatrix()` - Generates matrix (lines 67-158)
  - `_getVacantSegmentRanges()` - Finds vacant segments (lines 165-200)

- [`EligibilityService.js`](file:///c:/Users/prasa/Desktop/RAC/zip_2/backend/services/reallocation/EligibilityService.js)
  - `isEligibleForSegment()` - Applies 11 rules (lines 15-85)
  - `checkSharingStatus()` - Solo RAC validation (lines 91-104)
  - `checkConflictingCNFPassenger()` - CNF conflict check (lines 134-154)
  - `calculateJourneyDistance()` - Distance calculation (lines 159-174)

#### Constants
- [`reallocationConstants.js`](file:///c:/Users/prasa/Desktop/RAC/zip_2/backend/services/reallocation/reallocationConstants.js)
  - `MIN_JOURNEY_DISTANCE: 70` (line 11)
  - All 11 eligibility rule descriptions (lines 116-128)

#### Frontend
- [`ReallocationPage.jsx`](file:///c:/Users/prasa/Desktop/RAC/zip_2/frontend/src/pages/ReallocationPage.jsx)
  - Displays eligibility matrix
  - Auto-refreshes every 10 seconds
  - Shows "Send Offer" button for eligible matches

---

## Testing & Troubleshooting

### Why "No Eligible Matches Found"?

This message means the logic is working **correctly** but data doesn't meet criteria:

#### Common Reasons

1. **No Vacant Berths**
   - All CNF passengers still on train
   - No deboarding/cancellations/no-shows yet

2. **No RAC Passengers in System**
   - Database has no RAC passengers
   - Check: Admin Portal → Filter by Status = "RAC"

3. **RAC Passengers Not Boarded**
   - `boarded = false` → Not eligible
   - Only TTE can mark as boarded

4. **RAC Passengers Not Online**
   - `Passenger_Status !== "Online"` → Not eligible
   - Offline passengers go to TTE queue

5. **Journey Too Short (<70km)**
   - Rule 11 filters out short trips
   - Check station distances

6. **Solo RAC Constraint**
   - Passenger alone on berth → Not eligible
   - Already has full berth, no upgrade needed

7. **Class Mismatch**
   - Vacant berth SL but RAC passenger AC_3
   - Strict class matching enforced

8. **Journey Coverage Issue**
   - Vacant segment doesn't cover full journey
   - Example: Berth vacant Stn 2→4, passenger Stn 1→5

### Test Scenario: Create Valid Match

**Setup RAC Passenger:**
```javascript
{
  PNR_Status: "RAC",
  Passenger_Status: "Online",
  Boarded: true,
  Class: "SL",
  From: "HYB" (Station 0),
  To: "VSKP" (Station 4),
  Journey_Distance: 150km (>70km)
}
```

**Create Vacant Berth:**
- Mark CNF passenger (SL class) as NO_SHOW
- Frees berth from Station 1→4

**Expected Result:**
- ✅ Eligibility Matrix shows 1 match
- ✅ RAC passenger eligible for vacant berth

### Debug API Calls

**Check Train State:**
```bash
GET http://localhost:5000/api/train/state
```

**Check Eligibility Matrix:**
```bash
GET http://localhost:5000/api/reallocation/eligibility-matrix
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "eligibility": [
      {
        "berth": "S1-12",
        "coach": "S1",
        "vacantFrom": "HYB",
        "vacantTo": "VSKP",
        "topEligible": {
          "pnr": "1234567890",
          "name": "John Doe",
          "racStatus": "RAC 1"
        }
      }
    ],
    "summary": {
      "totalVacantBerths": 5,
      "vacanciesWithEligible": 1,
      "totalBoardedRAC": 3
    }
  }
}
```

### Minimum Test Data Requirements

For **1 successful match**, you need:

1. **RAC Passenger:**
   - ✅ `boarded = true`
   - ✅ `Passenger_Status = "Online"`
   - ✅ `PNR_Status = "RAC"`
   - ✅ Journey ≥ 70km
   - ✅ Sharing berth OR will share

2. **Vacant Berth:**
   - ✅ Same class as RAC passenger
   - ✅ Covers RAC passenger's journey
   - ✅ No conflicting CNF boarding later

---

## Summary

### ✅ Implementation Status

**Specification**: COMPLETE  
**Backend Implementation**: COMPLETE  
**Frontend Integration**: COMPLETE  
**Testing**: READY

### 🚨 Critical Constraints (11 Rules)

**ONLY passengers matching ALL criteria are eligible:**

1. ✅ `PNR_Status === "RAC"`
2. ✅ `Passenger_Status === "Online"`  
3. ✅ `Boarded === true`
4. ✅ Full journey coverage
5. ✅ Class match
6. ✅ Sharing or will share berth
7. ✅ No conflicting CNF passengers
8. ✅ Not already offered this vacancy
9. ✅ Not already accepted another offer
10. ✅ Sufficient time remaining
11. ✅ **Journey distance ≥ 70km**

### ❌ Excluded from Reallocation

- CNF passengers (already confirmed)
- WL passengers (waitlist)
- Offline RAC passengers (TTE Portal)
- Not-yet-boarded RAC passengers
- Solo RAC passengers (no co-passenger)
- RAC passengers with journey <70km

---

## Additional Resources

- [RAC Reallocation Workflow](./RAC_REALLOCATION_WORKFLOW.md)
- [System Flow Diagrams](./flow.md)
- [JWT Authentication Guide](./JWT_TOKEN_GUIDE.md)
- [Future Features & PWA](./FUTURE_FEATURES_PWA_REDIS.md)

---

**Document Status**: ✅ Production-Ready  
**Last Verified**: December 23, 2025
