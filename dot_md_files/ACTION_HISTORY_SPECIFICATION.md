# Action History & Undo Specification

## Overview
Undo/rollback system for TTE actions to fix accidental mistakes.

---

## 🎯 Purpose

Allow TTEs to undo recent actions like:
- Marking passenger as NO_SHOW (by mistake)
- Confirming boarding (wrong passenger)
- Applying upgrade (incorrect allocation)

---

## 📊 Data Structure: Action History Stack

```javascript
// backend/models/TrainState.js

class TrainState {
  constructor() {
    this.actionHistory = []; // Stack of recent actions
    this.MAX_HISTORY_SIZE = 10; // Keep last 10 actions
  }
}
```

### **Action Object Structure:**
```javascript
{
  actionId: "uuid-1234-5678",
  action: "MARK_NO_SHOW", // or "CONFIRM_BOARDING", "APPLY_UPGRADE"
  timestamp: "2024-01-15T10:35:22Z",
  performedBy: "TTE001",
  station: "BZA",
  target: {
    pnr: "1234567890",
    name: "John Doe"
  },
  previousState: {
    boarded: false,
    noShow: false
  },
  newState: {
    boarded: false,
    noShow: true
  },
  canUndo: true, // False if train moved to next station
  undoneAt: null // Timestamp if undone
}
```

---

## 🔄 Recording Actions

```javascript
// backend/models/TrainState.js

recordAction(actionType, targetPNR, previousState, newState, performedBy) {
  const action = {
    actionId: generateUUID(),
    action: actionType,
    timestamp: new Date(),
    performedBy: performedBy,
    station: this.getCurrentStation().name,
    target: {
      pnr: targetPNR,
      name: this.findPassenger(targetPNR)?.passenger?.name || 'Unknown'
    },
    previousState: previousState,
    newState: newState,
    canUndo: true,
    undoneAt: null
  };
  
  // Add to stack
  this.actionHistory.push(action);
  
  // Limit stack size
  if (this.actionHistory.length > this.MAX_HISTORY_SIZE) {
    this.actionHistory.shift(); // Remove oldest
  }
  
  console.log(`📝 Recorded action: ${actionType} for ${targetPNR}`);
  
  return action;
}
```

---

## ↩️ Undo Mechanism

```javascript
// backend/models/TrainState.js

async undoLastAction() {
  if (this.actionHistory.length === 0) {
    throw new Error('No actions to undo');
  }
  
  // Get last action
  const lastAction = this.actionHistory[this.actionHistory.length - 1];
  
  // Check if can undo
  if (!lastAction.canUndo) {
    throw new Error('This action can no longer be undone (train moved)');
  }
  
  if (lastAction.undoneAt) {
    throw new Error('Action already undone');
  }
  
  // Execute undo based on action type
  switch (lastAction.action) {
    case 'MARK_NO_SHOW':
      await this._undoNoShow(lastAction);
      break;
      
    case 'CONFIRM_BOARDING':
      await this._undoBoarding(lastAction);
      break;
      
    case 'APPLY_UPGRADE':
      await this._undoUpgrade(lastAction);
      break;
      
    default:
      throw new Error(`Unknown action type: ${lastAction.action}`);
  }
  
  // Mark as undone
  lastAction.undoneAt = new Date();
  lastAction.canUndo = false;
  
  // Log event
  this.logEvent('ACTION_UNDONE', `Undone ${lastAction.action}`, lastAction);
  
  return {
    success: true,
    action: lastAction
  };
}
```

---

## 🔧 Specific Undo Implementations

### **1. Undo NO_SHOW**

```javascript
async _undoNoShow(action) {
  const passenger = this.findPassenger(action.target.pnr)?.passenger;
  
  if (!passenger) {
    throw new Error(`Passenger ${action.target.pnr} not found`);
  }
  
  // Restore previous state
  passenger.noShow = action.previousState.noShow;
  passenger.boarded = action.previousState.boarded;
  
  // Update database
  await db.getPassengersCollection().updateOne(
    { PNR_Number: action.target.pnr },
    { 
      $set: { 
        NO_show: action.previousState.noShow,
        Boarded: action.previousState.boarded
      } 
    }
  );
  
  console.log(`↩️ Undone NO_SHOW for ${action.target.pnr}`);
}
```

### **2. Undo Boarding Confirmation**

```javascript
async _undoBoarding(action) {
  const passenger = this.findPassenger(action.target.pnr)?.passenger;
  
  if (!passenger) {
    throw new Error(`Passenger ${action.target.pnr} not found`);
  }
  
  // Restore to not boarded
  passenger.boarded = false;
  
  // Update database
  await db.getPassengersCollection().updateOne(
    { PNR_Number: action.target.pnr },
    { $set: { Boarded: false } }
  );
  
  // Add back to verification queue
  this.boardingVerificationQueue.set(action.target.pnr, {
    pnr: action.target.pnr,
    name: passenger.name,
    verificationStatus: 'PENDING'
  });
  
  console.log(`↩️ Undone boarding for ${action.target.pnr}`);
}
```

### **3. Undo Upgrade**

```javascript
async _undoUpgrade(action) {
  // This is complex - need to:
  // 1. Move passenger back to RAC berth
  // 2. Restore PNR_Status to RAC
  // 3. Add back to RAC queue
  // 4. Clear the berth they were upgraded to
  
  // TBD: Implement based on upgrade logic
}
```

---

## 🚫 Preventing Undo After Station Change

```javascript
// When train moves to next station, disable undo for old actions
onStationChange() {
  this.actionHistory.forEach(action => {
    if (action.station !== this.getCurrentStation().name) {
      action.canUndo = false; // Can't undo actions from previous stations
    }
  });
}
```

---

## 🎨 TTE Portal UI

### **Action History Page**

```jsx
function ActionHistoryPage() {
  const [history, setHistory] = useState([]);
  
  useEffect(() => {
    fetchHistory();
  }, []);
  
  async function fetchHistory() {
    const res = await api.get('/tte/action-history');
    setHistory(res.data.data);
  }
  
  async function undoAction(actionId) {
    if (!confirm('Are you sure you want to undo this action?')) return;
    
    const res = await api.post('/tte/undo', { actionId });
    
    if (res.data.success) {
      alert('Action undone successfully');
      fetchHistory();
    }
  }
  
  return (
    <div className="action-history-page">
      <h1>📜 Action History</h1>
      <p>Last 10 actions (last 30 minutes)</p>
      
      {history.length === 0 ? (
        <div>No recent actions</div>
      ) : (
        <div className="history-list">
          {history.map(action => (
            <div key={action.actionId} className="history-item">
              <div className="action-time">
                {new Date(action.timestamp).toLocaleTimeString()}
              </div>
              <div className="action-details">
                <strong>{action.action}</strong>
                <p>{action.target.name} ({action.target.pnr})</p>
                <p>At: {action.station}</p>
              </div>
              {action.canUndo && !action.undoneAt ? (
                <button 
                  onClick={() => undoAction(action.actionId)}
                  className="undo-btn"
                >
                  ↩️ UNDO
                </button>
              ) : (
                <span className="cannot-undo">
                  {action.undoneAt ? '✓ Undone' : '✗ Cannot Undo'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🔒 Security Considerations

1. **Time Limit:** Only allow undo within 30 minutes
2. **Station Limit:** Can't undo actions from previous stations
3. **Role Check:** Only TTE who performed action can undo (optional)
4. **Audit:** All undo actions are logged separately

```javascript
// Enhanced security check
async undoAction(actionId, currentUser) {
  const action = this.actionHistory.find(a => a.actionId === actionId);
  
  // Time limit: 30 minutes
  const timeDiff = Date.now() - new Date(action.timestamp).getTime();
  if (timeDiff > 30 * 60 * 1000) {
    throw new Error('Action is too old to undo (> 30 minutes)');
  }
  
  // Station check
  if (action.station !== this.getCurrentStation().name) {
    throw new Error('Cannot undo actions from previous stations');
  }
  
  // Role check (optional)
  if (action.performedBy !== currentUser.employeeId) {
    throw new Error('Can only undo your own actions');
  }
  
  // Proceed with undo...
}
```

---

## 📋 Implementation Checklist

- [ ] Add `actionHistory` array to TrainState
- [ ] Implement `recordAction()` method
- [ ] Implement `undoLastAction()` method
- [ ] Implement specific undo handlers
- [ ] Add station change hook to disable old actions
- [ ] Create Action History page UI
- [ ] Add security checks (time, station, role)
- [ ] Add undo API endpoints
- [ ] Test undo for all action types

---

## 🎯 API Endpoints

```javascript
// GET /api/tte/action-history
// Returns last 10 actions

// POST /api/tte/undo
// Body: { actionId: "uuid-1234" }
// Undoes the specified action
```
