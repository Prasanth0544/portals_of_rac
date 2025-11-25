# RAC Reallocation Workflow

## Overview
Process of extracting RAC passengers from the boarded list and applying the eligibility matrix for upgrades.

---

## 🎯 Goal

Match **boarded RAC passengers** with **vacant berths** based on 11 strict eligibility rules.

---

## 📊 Data Flow

```
All Passengers (CNF + RAC + WL)
  ↓
Filter: boarded === true
  ↓
Boarded Passengers (CNF + RAC)
  ↓
Filter: pnrStatus === "RAC"
  ↓
Boarded RAC Passengers
  ↓
Apply 11 Eligibility Rules
  ↓
Eligible RAC Passengers
  ↓
Match with Vacant Berths
  ↓
Create Upgrade Offers
```

---

## 🔍 Step 1: Extract Boarded RAC Passengers

### **Source Data:**
```javascript
// All passengers are in:
trainState.coaches[].berths[].passengers[]
trainState.racQueue[]
```

### **Extraction Logic:**

```javascript
// backend/models/TrainState.js

getBoardedRACPassengers() {
  const allPassengers = this.getAllPassengers();
  
  return allPassengers.filter(p => {
    // Must be RAC status
    const isRAC = p.pnrStatus && p.pnrStatus.toUpperCase() === 'RAC';
    
    // Must be boarded
    const isBoarded = p.boarded === true;
    
    // Must be online (for real-time offers)
    const isOnline = p.passengerStatus && 
                     p.passengerStatus.toLowerCase() === 'online';
    
    // Not a no-show
    const notNoShow = !p.noShow;
    
    return isRAC && isBoarded && isOnline && notNoShow;
  });
}
```

**API Endpoint:**
```javascript
// GET /api/reallocation/boarded-rac

async getBoardedRAC(req, res) {
  const trainState = trainController.getGlobalTrainState();
  const boardedRAC = trainState.getBoardedRACPassengers();
  
  res.json({
    success: true,
    data: {
      total: boardedRAC.length,
      passengers: boardedRAC
    }
  });
}
```

---

## 🧩 Step 2: Find Vacant Berths

```javascript
// backend/services/ReallocationService.js

getVacantBerths(trainState) {
  const vacancies = [];
  
  trainState.coaches.forEach(coach => {
    coach.berths.forEach(berth => {
      // Find vacant segment ranges
      const ranges = this._getVacantSegmentRanges(berth, trainState.stations);
      
      ranges.forEach(range => {
        vacancies.push({
          berth: berth.fullBerthNo,
          coach: coach.coachNo,
          berthNo: berth.berthNo,
          type: berth.type,
          class: coach.class,
          vacantFrom: range.fromStation,
          vacantTo: range.toStation,
          fromIdx: range.fromIdx,
          toIdx: range.toIdx
        });
      });
    });
  });
  
  return vacancies;
}
```

---

## ✅ Step 3: Apply Eligibility Matrix

**For each vacant segment, check if a RAC passenger is eligible:**

```javascript
// backend/services/ReallocationService.js

getEligibilityMatrix(trainState) {
  const eligibilityMatrix = [];
  const boardedRAC = trainState.getBoardedRACPassengers();
  const vacancies = this.getVacantBerths(trainState);
  
  vacancies.forEach(vacancy => {
    const eligiblePassengers = [];
    
    boardedRAC.forEach(rac => {
      // Check 11 eligibility rules
      const result = this.isEligibleForSegment(
        rac,
        vacancy,
        trainState.currentStationIdx,
        trainState
      );
      
      if (result.eligible) {
        eligiblePassengers.push({
          ...rac,
          eligibilityReason: result.reason
        });
      }
    });
    
    // Sort by RAC priority (RAC 1 > RAC 2 > RAC 3)
    eligiblePassengers.sort((a, b) => {
      const getRACNum = (status) => {
        const match = status?.match(/RAC\s*(\d+)/i);
        return match ? parseInt(match[1]) : 999;
      };
      return getRACNum(a.racStatus) - getRACNum(b.racStatus);
    });
    
    if (eligiblePassengers.length > 0) {
      eligibilityMatrix.push({
        ...vacancy,
        eligiblePassengers: eligiblePassengers,
        topCandidate: eligiblePassengers[0] // Highest priority
      });
    }
  });
  
  return eligibilityMatrix;
}
```

---

## 📋 The 11 Eligibility Rules (Recap)

```javascript
isEligibleForSegment(racPassenger, vacantSegment, currentStationIdx, trainState) {
  // Rule 0: Must be RAC
  if (racPassenger.pnrStatus !== 'RAC') return { eligible: false };
  
  // Rule 1: Must be ONLINE
  if (racPassenger.passengerStatus !== 'online') return { eligible: false };
  
  // Rule 2: Must be BOARDED
  if (!racPassenger.boarded) return { eligible: false };
  
  // Rule 3: Full journey coverage
  const remainingFromIdx = Math.max(racPassenger.fromIdx, currentStationIdx);
  if (vacantSegment.fromIdx > remainingFromIdx || 
      vacantSegment.toIdx < racPassenger.toIdx) {
    return { eligible: false };
  }
  
  // Rule 4: Class match
  if (racPassenger.class !== vacantSegment.class) return { eligible: false };
  
  // Rule 5: Solo RAC constraint
  const isSharingOrWillShare = this.checkSharingStatus(
    racPassenger, trainState, currentStationIdx
  );
  if (!isSharingOrWillShare) return { eligible: false };
  
  // Rule 6: No conflicting CNF
  if (this.checkConflictingCNFPassenger(vacantSegment, currentStationIdx, trainState)) {
    return { eligible: false };
  }
  
  // Rule 7: Not already offered
  if (racPassenger.vacancyIdLastOffered === vacantSegment.id) {
    return { eligible: false };
  }
  
  // Rule 8: Not already accepted another
  if (racPassenger.offerStatus === 'accepted') return { eligible: false };
  
  // Rule 11: Minimum 70km journey
  const distance = this.calculateJourneyDistance(
    racPassenger.from, racPassenger.to, trainState
  );
  if (distance < 70) return { eligible: false };
  
  // Rule 10: Sufficient time remaining
  const segmentsRemaining = vacantSegment.toIdx - currentStationIdx;
  if (segmentsRemaining < 1) return { eligible: false };
  
  // All rules passed
  return { eligible: true, reason: 'All criteria met' };
}
```

---

## 🎯 Step 4: Display on Reallocation Page

### **Frontend (Admin/TTE Portal):**

**Component:** `ReallocationPage.jsx`

```javascript
// Fetch eligibility matrix
const [matrix, setMatrix] = useState([]);

useEffect(() => {
  fetchEligibilityMatrix();
}, []);

async function fetchEligibilityMatrix() {
  const res = await api.get('/reallocation/eligibility');
  setMatrix(res.data.data.eligibility);
}
```

**Display:**
```jsx
<div className="matrix-section">
  <h2>✅ Eligibility Matrix</h2>
  <p>Shows which RAC passengers can fill vacant berths</p>
  
  {matrix.length === 0 ? (
    <div>No eligible matches found</div>
  ) : (
    <div className="matrix-grid">
      {matrix.map((item, idx) => (
        <div key={idx} className="matrix-card">
          <h4>Berth: {item.berth}</h4>
          <p>Vacant: {item.vacantFrom} → {item.vacantTo}</p>
          <p>Top Candidate: {item.topCandidate.name}</p>
          <p>RAC: {item.topCandidate.racStatus}</p>
          <button onClick={() => applyUpgrade(item)}>
            Upgrade Now
          </button>
        </div>
      ))}
    </div>
  )}
</div>
```

---

## 🚀 Step 5: Apply Upgrade

```javascript
async function applyUpgrade(matrixItem) {
  const allocation = {
    pnr: matrixItem.topCandidate.pnr,
    coach: matrixItem.coach,
    berth: matrixItem.berthNo
  };
  
  const res = await api.post('/reallocation/apply', {
    allocations: [allocation]
  });
  
  if (res.data.success) {
    alert(`${matrixItem.topCandidate.name} upgraded!`);
    fetchEligibilityMatrix(); // Refresh
  }
}
```

---

## 🔄 Real-Time Updates

**WebSocket Integration:**

```javascript
// When passenger boards
wsManager.on('PASSENGER_BOARDED', () => {
  fetchEligibilityMatrix(); // Refresh matrix
});

// When vacancy created
wsManager.on('VACANCY_CREATED', () => {
  fetchEligibilityMatrix();
});

// When upgrade applied
wsManager.on('RAC_UPGRADED', () => {
  fetchEligibilityMatrix();
});
```

---

## 📊 Complete Data Flow Example

```
Train at Station: BZA (Index 5)

1. GET ALL PASSENGERS
   Total: 150 passengers
   
2. FILTER BOARDED
   Boarded: 120 passengers
   
3. FILTER RAC + ONLINE
   Boarded RAC (Online): 8 passengers
   
4. FIND VACANCIES
   Vacant berths: 12
   Vacant segments: 18
   
5. APPLY 11 RULES
   Eligible matches: 5
   
6. DISPLAY MATRIX
   ┌─────────────────────────────────┐
   │ S1-12: RAC 1 (John Doe)        │
   │ S2-8:  RAC 2 (Jane Smith)      │
   │ S3-15: RAC 3 (Bob Jones)       │
   │ ...                             │
   └─────────────────────────────────┘
   
7. APPLY UPGRADES
   S1-12 → John Doe (RAC → CNF)
   Database updated
   WebSocket notification sent
```

---

## 🎯 Benefits

1. ✅ **Fair:** RAC 1 always gets priority
2. ✅ **Smart:** Checks journey overlap, class, distance
3. ✅ **Real-time:** Updates instantly when passengers board
4. ✅ **Scalable:** Works with 100+ passengers
5. ✅ **Auditable:** All decisions logged with reasons

---

## 📋 Implementation Checklist

- [x] Extract boarded RAC logic (`getBoardedRACPassengers`)
- [x] Eligibility matrix logic (`getEligibilityMatrix`)
- [x] 11 eligibility rules implemented
- [ ] Reallocation page UI
- [ ] Apply upgrade functionality
- [ ] WebSocket real-time updates
- [ ] Action history for rollback
