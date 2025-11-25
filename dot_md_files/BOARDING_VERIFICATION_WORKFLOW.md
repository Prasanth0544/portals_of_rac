# Boarding Verification Workflow

## Overview
TTE-managed passenger boarding verification system using an in-memory Map for staging and confirmation.

---

## 🎯 Use Case

**Problem:** 
When the train arrives at a station, passengers are auto-marked as boarded. However, some may not actually show up.

**Solution:**
TTEs verify actual boarding and mark no-shows through a dedicated workflow.

---

## 📊 Data Structure: Boarding Verification Queue

```javascript
// Location: backend/models/TrainState.js

class TrainState {
  constructor() {
    this.boardingVerificationQueue = new Map(); // PNR → VerificationData
  }
}
```

### **Map Structure:**
```javascript
Map {
  "1234567890" => {
    pnr: "1234567890",
    name: "John Doe",
    pnrStatus: "RAC",
    racStatus: "RAC 1",
    from: "BZA",
    to: "VSKP",
    verificationStatus: "PENDING", // PENDING | VERIFIED | NO_SHOW
    timestamp: "2024-01-15T10:30:00Z"
  },
  "0987654321" => {
    pnr: "0987654321",
    name: "Jane Smith",
    pnrStatus: "CNF",
    racStatus: "-",
    from: "BZA",
    to: "VSKP",
    verificationStatus: "PENDING",
    timestamp: "2024-01-15T10:30:00Z"
  }
}
```

**Why Map?**
- ✅ O(1) lookup by PNR
- ✅ Easy to check if passenger is in queue
- ✅ Simple to add/remove entries
- ✅ Can iterate in insertion order

---

## 🔄 Workflow Steps

### **Step 1: Train Arrives at Station**

```javascript
// backend/services/StationEventService.js

async processStationArrival(trainState) {
  // Current logic (already exists)
  const boarded = this.boardPassengers(trainState);
  
  // NEW: Populate verification queue
  trainState.prepareForBoardingVerification();
}
```

### **Step 2: Populate Verification Queue**

```javascript
// backend/models/TrainState.js

prepareForBoardingVerification() {
  const currentIdx = this.currentStationIdx;
  
  // Clear previous queue
  this.boardingVerificationQueue.clear();
  
  // Find all passengers scheduled to board at current station
  const scheduled = this.getAllPassengers().filter(
    p => p.fromIdx === currentIdx && !p.boarded && !p.noShow
  );
  
  // Add to queue
  scheduled.forEach(p => {
    this.boardingVerificationQueue.set(p.pnr, {
      pnr: p.pnr,
      name: p.name,
      pnrStatus: p.pnrStatus,
      racStatus: p.racStatus,
      from: p.from,
      to: p.to,
      coach: p.coach,
      berth: p.berth,
      verificationStatus: 'PENDING',
      timestamp: new Date()
    });
  });
  
  console.log(`📋 ${scheduled.length} passengers pending verification`);
  
  // WebSocket broadcast to TTE Portal
  wsManager.broadcastTTE('BOARDING_QUEUE_READY', {
    count: scheduled.length,
    passengers: Array.from(this.boardingVerificationQueue.values())
  });
}
```

### **Step 3: TTE Views Boarding List**

**Frontend (TTE Portal):**
```
GET /api/tte/boarding-queue
  ↓
Returns all passengers in verification queue
  ↓
TTE Portal displays list:

┌──────────────────────────────────────────┐
│  Boarding Verification - BZA            │
│  3 passengers pending                   │
├──────────────────────────────────────────┤
│  [✅ Confirm All Boarded]                │
├──────────────────────────────────────────┤
│  ☐ John Doe (RAC 1)       [NO_SHOW]     │
│  ☐ Jane Smith (CNF)       [NO_SHOW]     │
│  ☐ Bob Jones (RAC 2)      [NO_SHOW]     │
└──────────────────────────────────────────┘
```

**Backend API:**
```javascript
// backend/controllers/tteController.js

getBoardingQueue(req, res) {
  const trainState = trainController.getGlobalTrainState();
  
  const queue = Array.from(
    trainState.boardingVerificationQueue.values()
  );
  
  res.json({
    success: true,
    data: {
      station: trainState.getCurrentStation().name,
      total: queue.length,
      pending: queue.filter(p => p.verificationStatus === 'PENDING').length,
      passengers: queue
    }
  });
}
```

---

## ✅ Action 1: Confirm All Boarded

**TTE clicks "Confirm All Boarded" button**

```javascript
// backend/models/TrainState.js

async confirmAllBoarded() {
  const passengers = Array.from(this.boardingVerificationQueue.keys());
  
  console.log(`✅ Confirming ${passengers.length} passengers boarded`);
  
  for (const pnr of passengers) {
    const p = this.findPassenger(pnr).passenger;
    p.boarded = true;
    
    // Update database
    await db.getPassengersCollection().updateOne(
      { PNR_Number: pnr },
      { $set: { Boarded: true } }
    );
  }
  
  // Clear queue
  this.boardingVerificationQueue.clear();
  
  // Update stats
  this.updateStats();
  
  // Log event
  this.logEvent('BOARDING_CONFIRMED', `All ${passengers.length} passengers confirmed`, {
    count: passengers.length,
    station: this.getCurrentStation().name
  });
  
  // WebSocket notification
  wsManager.broadcastTTE('BOARDING_CONFIRMED', {
    count: passengers.length
  });
  
  return { success: true, count: passengers.length };
}
```

**API Endpoint:**
```javascript
// POST /api/tte/confirm-all-boarded

async confirmAllBoarded(req, res) {
  const trainState = trainController.getGlobalTrainState();
  const result = await trainState.confirmAllBoarded();
  
  res.json({
    success: true,
    message: `${result.count} passengers confirmed boarded`
  });
}
```

---

## ❌ Action 2: Mark Individual NO_SHOW

**TTE clicks [NO_SHOW] button for specific passenger**

```javascript
// backend/models/TrainState.js

async markNoShowFromQueue(pnr) {
  // Verify passenger is in queue
  if (!this.boardingVerificationQueue.has(pnr)) {
    throw new Error(`PNR ${pnr} not in verification queue`);
  }
  
  // Update queue status
  this.boardingVerificationQueue.get(pnr).verificationStatus = 'NO_SHOW';
  
  // Update actual passenger object
  const result = this.findPassenger(pnr);
  if (result) {
    const { passenger } = result;
    passenger.noShow = true;
    passenger.boarded = false;
    
    // Update database
    await db.getPassengersCollection().updateOne(
      { PNR_Number: pnr },
      { $set: { NO_show: true, Boarded: false } }
    );
  }
  
  // Remove from queue
  this.boardingVerificationQueue.delete(pnr);
  
  // Log event
  this.logEvent('NO_SHOW_MARKED', `Passenger marked NO_SHOW`, {
    pnr: pnr,
    station: this.getCurrentStation().name
  });
  
  console.log(`❌ ${pnr} marked NO_SHOW`);
  
  return { success: true, pnr: pnr };
}
```

**API Endpoint:**
```javascript
// POST /api/tte/mark-no-show

async markNoShow(req, res) {
  const { pnr } = req.body;
  const trainState = trainController.getGlobalTrainState();
  
  const result = await trainState.markNoShowFromQueue(pnr);
  
  // WebSocket notification to passenger
  wsManager.notifyPassenger(pnr, {
    type: 'NO_SHOW_MARKED',
    message: 'You were marked as NO_SHOW by TTE'
  });
  
  res.json({
    success: true,
    message: `Passenger ${pnr} marked as NO_SHOW`
  });
}
```

---

## ⏱️ Auto-Timeout Feature

**If TTE forgets to verify after 5 minutes:**

```javascript
// backend/models/TrainState.js

scheduleAutoConfirmation() {
  setTimeout(() => {
    if (this.boardingVerificationQueue.size > 0) {
      console.warn('⚠️ Auto-confirming boarding (TTE timeout)');
      this.confirmAllBoarded();
    }
  }, 5 * 60 * 1000); // 5 minutes
}
```

Call this in `prepareForBoardingVerification()`.

---

## 📊 Statistics Tracking

```javascript
getVerificationStats() {
  const queue = Array.from(this.boardingVerificationQueue.values());
  
  return {
    total: queue.length,
    pending: queue.filter(p => p.verificationStatus === 'PENDING').length,
    verified: queue.filter(p => p.verificationStatus === 'VERIFIED').length,
    noShow: queue.filter(p => p.verificationStatus === 'NO_SHOW').length
  };
}
```

---

## 🎯 Benefits of This Approach

1. ✅ **Clear Separation:** Verification queue is separate from actual passenger data
2. ✅ **Easy Rollback:** Can cancel entire queue without affecting DB
3. ✅ **Progress Tracking:** TTE can see "3 of 10 verified"
4. ✅ **Audit Trail:** Timestamps track when passengers were added to queue
5. ✅ **Performance:** Map provides O(1) operations

---

## 📋 Implementation Checklist

### **Backend**
- [ ] Add `boardingVerificationQueue` to TrainState
- [ ] Implement `prepareForBoardingVerification()`
- [ ] Implement `confirmAllBoarded()`
- [ ] Implement `markNoShowFromQueue()`
- [ ] Add timeout mechanism
- [ ] Create TTE API endpoints

### **TTE Portal Frontend**
- [ ] Create Boarding Verification page
- [ ] Display passenger list with checkboxes
- [ ] Add "Confirm All Boarded" button
- [ ] Add individual "NO_SHOW" buttons
- [ ] Show real-time progress stats
- [ ] WebSocket integration for live updates
