# 🚀 Next Steps: Phase 2 - Core Features

## ✅ **Phase 1 Complete: Authentication**

All authentication work is done:
- ✅ Backend: authController.js, auth.js middleware, API routes
- ✅ Frontend: LoginPage for all 3 portals
- ✅ Database: tte_users, passenger_accounts collections
- ✅ Test accounts created with bcrypt passwords

---

## 📍 **Phase 2: Core Features (Week 2)**

### **Step 3: TTE Boarding Verification** (3-4 days) ⏰ **NEXT**

**Why This?** Critical for accurate passenger tracking before RAC reallocation can happen.

#### **3.1 Backend Implementation**

**Files to Update:**
```
backend/
├── models/
│   └── TrainState.js           # UPDATE - Add boarding verification methods
├── controllers/
│   └── tteController.js        # NEW - TTE-specific operations
└── routes/
    └── api.js                  # UPDATE - Add TTE routes
```

**New Methods to Add to TrainState.js:**
```javascript
// Prepare boarding verification queue when train starts
prepareForBoardingVerification() {
  // Get all passengers scheduled to board at current station
  // Add to boardingVerificationQueue Map
}

// Confirm all passengers boarded (bulk action)
confirmAllBoarded() {
  // Mark all in queue as boarded
  // Clear the queue
  // Trigger RAC reallocation
}

// Mark individual passenger as NO_SHOW
markNoShowFromQueue(pnr) {
  // Find passenger in queue
  // Mark as NO_SHOW
  // Remove from queue
  // Create vacancy
}
```

**API Endpoints to Add:**
```javascript
// backend/routes/api.js

// Get boarding verification queue
GET /api/tte/boarding-queue

// Confirm all passengers boarded
POST /api/tte/confirm-all-boarded

// Mark individual no-show
POST /api/tte/mark-no-show
  Body: { pnr: "1880000706" }
```

**Reference Document:** `dot_md_files/BOARDING_VERIFICATION_WORKFLOW.md`

---

#### **3.2 Frontend Implementation (TTE Portal)**

**File to Create:**
```
tte-portal/src/pages/
└── BoardingVerificationPage.jsx    # NEW
```

**Features to Build:**
1. **Display Boarding Queue**
   - Show passengers scheduled to board at current station
   - Display: Name, PNR, Seat, Status

2. **Bulk Action Button**
   - "Confirm All Boarded" button
   - Updates all passengers in queue

3. **Individual No-Show Marking**
   - Each passenger has "Mark NO_SHOW" button
   - Confirmation dialog before marking

4. **Real-time Updates**
   - WebSocket connection to receive updates
   - Auto-refresh when station changes

**UI Mockup:**
```
┌──────────────────────────────────────────┐
│  Boarding Verification - Station XYZ    │
│                                          │
│  Passengers to Board: 5                  │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ PNR        Name         Seat  ✓/✗ │ │
│  ├────────────────────────────────────┤ │
│  │ 1880001  John Doe      S1-23  [NO]│ │
│  │ 1880002  Jane Smith    S1-45  [NO]│ │
│  │ 1880003  Bob Wilson    R1-7   [NO]│ │
│  └────────────────────────────────────┘ │
│                                          │
│  [ Confirm All Boarded ]                 │
└──────────────────────────────────────────┘
```

**Integration with App.jsx:**
```javascript
// tte-portal/src/App.jsx
import BoardingVerificationPage from './pages/BoardingVerificationPage';

// Add to Tabs
<Tab label="Boarding Verification" />

// Add to content
{currentTab === 3 && <BoardingVerificationPage />}
```

---

### **Step 4: RAC Reallocation Display** (2-3 days)

**Why This?** Show the eligibility matrix visually and allow upgrades.

#### **4.1 Update Admin Portal Reallocation Page**

**File to Update:**
```
frontend/src/pages/
└── ReallocationPage.jsx        # UPDATE
```

**What to Add:**
1. **Fetch Boarded RAC Passengers**
   ```javascript
   GET /api/train/rac-queue
   // Returns only BOARDED RAC passengers
   ```

2. **Display Eligibility Matrix**
   - Show vacant berths
   - Show top candidate for each vacancy
   - Display eligibility score

3. **Apply Upgrade Button**
   ```javascript
   POST /api/reallocation/apply
   Body: {
     pnr: "1880000706",
     vacantBerth: { coach: "S1", berth: 23 }
   }
   ```

**UI Enhancement:**
```
Current Reallocation Page shows:
- Eligibility Matrix (already exists)

Add:
- "Apply Upgrade" button for each recommendation
- Confirmation dialog
- Success/error toast notifications
```

**Reference Document:** `dot_md_files/RAC_REALLOCATION_WORKFLOW.md`

---

## 🎯 **Immediate Action Plan**

### **Day 1-2: Backend Boarding Verification**
```bash
# 1. Update TrainState.js
# Add boardingVerificationQueue property
# Add prepareForBoardingVerification() method
# Add confirmAllBoarded() method
# Add markNoShowFromQueue() method

# 2. Create tteController.js (optional)
touch backend/controllers/tteController.js

# 3. Add routes to api.js
# GET /api/tte/boarding-queue
# POST /api/tte/confirm-all-boarded
# POST /api/tte/mark-no-show

# 4. Test with Postman
```

### **Day 3-4: TTE Portal Boarding Page**
```bash
# 1. Create BoardingVerificationPage.jsx
cd tte-portal/src/pages
touch BoardingVerificationPage.jsx

# 2. Implement UI components
# - Passenger list
# - Confirm All button
# - Individual No-Show buttons

# 3. Add to App.jsx navigation
# 4. Test with real data
```

### **Day 5-7: RAC Reallocation Display**
```bash
# 1. Update ReallocationPage.jsx
cd frontend/src/pages
# Edit ReallocationPage.jsx

# 2. Add "Apply Upgrade" functionality
# 3. Add toast notifications
# 4. Test reallocation flow
```

---

## ✅ **Phase 2 Completion Checklist**

Before moving to Phase 3, ensure:

- [ ] TTE can view boarding queue at current station
- [ ] TTE can confirm all passengers boarded
- [ ] TTE can mark individual passengers as NO_SHOW
- [ ] NO_SHOW creates vacancy in system
- [ ] Admin can see updated RAC queue (only boarded)
- [ ] Admin can view eligibility matrix
- [ ] Admin can apply RAC upgrades
- [ ] WebSocket pushes real-time updates to all portals

---

## 📚 **Reference Documents**

1. **BOARDING_VERIFICATION_WORKFLOW.md** - TTE boarding process
2. **RAC_REALLOCATION_WORKFLOW.md** - Reallocation algorithm
3. **WEBSOCKET_EVENTS.md** - Real-time event structure
4. **eligibility_matrix_analysis.md** - Matrix calculation logic

---

## 🔧 **Technical Notes**

**Backend Architecture:**
```
POST /api/train/start-journey
  ↓
TrainState.prepareForBoardingVerification()
  ↓
TTE Portal shows boarding queue
  ↓
TTE clicks "Confirm All Boarded"
  ↓
POST /api/tte/confirm-all-boarded
  ↓
TrainState.markPassengersBoarded()
  ↓
ReallocationService.processStation()
  ↓
WebSocket broadcast: STATION_ARRIVAL event
  ↓
Frontend updates automatically
```

**State Flow:**
```
Passenger State Transitions:
RAC → BOARDED (via TTE confirmation)
RAC → NO_SHOW (via TTE marking)
BOARDED + RAC → CNF (via reallocation)
```

---

## 🚀 **Ready to Start?**

**First Command:**
```bash
# Open TrainState.js
code backend/models/TrainState.js
```

**First Task:**
Add `boardingVerificationQueue` property to constructor:
```javascript
constructor() {
  // ... existing code ...
  this.boardingVerificationQueue = new Map(); // ADD THIS
}
```

**First Specification to Read:**
```
dot_md_files/BOARDING_VERIFICATION_WORKFLOW.md
```

---

## 💡 **After Phase 2**

**Phase 3: UX Polish** (Week 3)
- react-hot-toast for notifications
- Loading states
- QR code boarding pass (Passenger Portal)
- Journey timeline tracker
- Error boundaries

**Phase 4: Testing & Deployment** (Week 4)
- Unit tests
- Integration tests
- Performance optimization
- Production deployment

---

**Shall I help you implement Step 3 (TTE Boarding Verification) now?** 🎯
