# TTE Portal Analysis - RAC Reallocation System
**Version**: 1.0.0  
**Framework**: React 19.2.0 + Vite  
**UI Library**: Material-UI v7.3.5  
**Purpose**: TTE (Traveling Ticket Examiner) Operations Portal

---

## Overview

The TTE Portal is a modern React application built with Vite, designed specifically for train staff to manage passenger boarding, handle no-shows, process upgrades, and monitor journey progress in real-time.

### Technology Stack
```json
{
  "framework": "React 19.2.0",
  "buildTool": "Vite 7.2.4",
  "ui": "@mui/material 7.3.5",
  "icons": "@mui/icons-material 7.3.5",
  "http": "axios 1.13.2",
  "routing": "react-router-dom 7.9.6",
  "charts": "recharts 3.4.1"
}
```

### Key Features
- ✅ **Boarding Verification** - Queue-based passenger boarding confirmation
- ✅ **No-Show Management** - Mark and revert no-show passengers
- ✅ **Offline Upgrades** - Handle upgrades for non-connected passengers
- ✅ **Action History** - Comprehensive undo functionality
- ✅ **Real-time Updates** - Live statistics and passenger status
- ✅ **Upgrade Tracking** - Monitor sent upgrade offers
- ✅ **Service Worker** - Offline support for critical operations

---

## Project Structure
```
tte-portal/
├── src/
│   ├── pages/              # 13 pages
│   │   ├── DashboardPage.jsx
│   │   ├── PassengersPage.jsx (25KB - largest file)
│   │   ├── BoardingVerificationPage.jsx
│   │   ├── ActionHistoryPage.jsx
│   │   ├── OfflineUpgradesPage.jsx
│   │   ├── UpgradeNotificationsPage.jsx
│   │   ├── BoardedPassengersPage.jsx
│   │   └── LoginPage.jsx
│   ├── components/         # 2 components
│   │   ├── PassengerManagement.jsx
│   │   └── TrainControls.jsx
│   ├── api.js             # Axios API client
│   ├── App.jsx            # Main app with routing
│   └── main.jsx           # Entry point
├── public/
│   ├── sw.js              # Service Worker
│   └── manifest.json      # PWA manifest
└── package.json
```

---

## Pages (13 Total)

### 1. **DashboardPage.jsx** (12,251 bytes)
**Purpose**: Main TTE dashboard with statistics and quick actions

**Statistics Displayed**:
```javascript
{
  totalPassengers: Number,
  cnfPassengers: Number,
  racPassengers: Number,
  boardedCount: Number,
  notBoardedCount: Number,
  noShowCount: Number,
  vacantBerths: Number,
  currentStation: String,
  nextStation: String
}
```

**Quick Actions**:
- 🚂 Train Controls (Start Journey, Next Station)
- 👥 View All Passengers
- ✅ Boarding Verification
- 📊 View Statistics
- 📜 Action History

**Features**:
- Real-time data fetching (10-second intervals)
- Visual stat cards with Material-UI
- Journey progress indicator
- Navigation to all major features

---

### 2. **PassengersPage.jsx** (25,145 bytes) ⭐ **LARGEST FILE**
**Purpose**: Comprehensive passenger management interface

**Key Features**:

#### Passenger List with Filters
- **All Passengers** - Complete list
- **CNF** - Confirmed passengers
- **RAC** - RAC queue passengers
- **Boarded** - Currently onboard
- **Not Boarded** - Awaiting boarding
- **No-Show** - Marked as no-show

#### Vacant Berths Table
Displays:
- Coach-Berth number
- Berth type (Lower, Middle, Upper, Side Lower, Side Upper)
- Class (SL, 3A)
- Vacant segment (From → To stations)

#### Actions
```javascript
// Manual Status Updates
markBoarded(pnr)
markDeboarded(pnr)
markNoShow(pnr)

// Filters & Search
filterByStatus(status)
searchByPNR(query)
```

**Columns Displayed**:
- Serial Number
- PNR
- Name
- Age
- Gender
- Coach-Berth
- Berth Type
- Status (CNF/RAC)
- RAC Queue Number
- Class
- From → To Stations
- Boarded Status
- No-Show Status
- Actions

**Technical Details**:
- Pagination (20 passengers per page)
- Real-time updates via API polling
- Material-UI table with responsive design
- Complex state management (filters, search, loading)

---

### 3. **BoardingVerificationPage.jsx** (12,438 bytes)
**Purpose**: Queue-based passenger boarding confirmation

**Workflow**:
1. Display passengers scheduled to board at current station
2. TTE verifies each passenger
3. Confirm All or Mark Individual No-Show
4. Process automatic RAC upgrades for no-shows

**Queue Display**:
```javascript
{
  pnr: String,
  name: String,
  age: Number,
  from: String,
  to: String,
  coach: String,
  berth: String,
  status: 'CNF' | 'RAC',
  verified: Boolean
}
```

**Actions**:
- ✅ **Confirm All Boarded** - Bulk boarding confirmation
- ❌ **Mark No-Show** - Individual no-show marking
- 🔄 Refresh queue

**Features**:
- Visual queue with checkboxes
- Bulk actions
- Real-time status updates
- Automatic RAC reallocation on no-show

---

### 4. **ActionHistoryPage.jsx** (13,078 bytes)
**Purpose**: Track and undo TTE actions

**Action Types Tracked**:
```javascript
{
  NO_SHOW_MARKED: 'Passenger marked as NO_SHOW',
  NO_SHOW_REVERTED: 'NO_SHOW status reverted',
  BOARDING_CONFIRMED: 'Passenger marked as boarded',
  DEBOARDING_CONFIRMED: 'Passenger marked as deboarded',
  RAC_UPGRADED: 'RAC passenger upgraded to CNF',
  MANUAL_STATUS_CHANGE: 'Manual passenger status update'
}
```

**Information Displayed**:
- Timestamp
- Action type
- Target passenger (PNR, Name)
- Previous state
- New state
- Performed by (TTE ID)
- Can Undo? (Yes/No)

**Undo Functionality**:
```javascript
undoAction(actionId)
  -> Reverts the action
  -> Restores previous state
  -> Checks for conflicts
  -> Updates history
```

**Constraints**:
- ⚠️ Cannot undo actions from previous stations
- ⚠️ Cannot undo if berth has been reallocated
- ⚠️ Limited to last 10 actions

---

### 5. **OfflineUpgradesPage.jsx** (6,765 bytes)
**Purpose**: Manage upgrades for passengers not connected to the portal

**Use Case**: 
When a berth becomes vacant but the eligible RAC passenger is offline (not using the passenger portal), the upgrade is added to this queue for manual TTE confirmation.

**Queue Display**:
```javascript
{
  pnr: String,
  name: String,
  currentStatus: 'RAC',
  racNumber: String,
  offeredBerth: String,
  berthType: String,
  coach: String,
  createdAt: Date,
  status: 'pending' | 'confirmed' | 'rejected'
}
```

**Actions**:
- ✅ **Confirm Upgrade** - Manually confirm the upgrade
- ❌ **Reject Upgrade** - Reject and offer to next eligible passenger

**Workflow**:
1. System creates upgrade offer for offline passenger
2. Added to offline upgrades queue
3. TTE verifies passenger eligibility in-person
4. TTE confirms or rejects via this page
5. System processes the upgrade

---

### 6. **UpgradeNotificationsPage.jsx** (7,521 bytes)
**Purpose**: Track upgrade offers sent to online passengers

**Displays Sent Offers**:
```javascript
{
  pnr: String,
  passengerName: String,
  offeredBerth: String,
  berthType: String,
  sentAt: Date,
  expiresAt: Date,
  status: 'pending' | 'accepted' | 'denied' | 'expired',
  respondedAt: Date
}
```

**Statistics**:
- Total Sent
- Pending
- Accepted
- Denied / Expired

**Purpose**: 
Allows TTE to monitor which upgrade offers have been sent to passengers via the Passenger Portal and track their acceptance/rejection status.

---

### 7. **BoardedPassengersPage.jsx** (13,170 bytes)
**Purpose**: View only currently boarded passengers

**Filters**:
- Currently onboard passengers
- Filters by current station position
- Shows journey segments

**Use Case**: Quick view of active passengers on the train at current moment.

---

### 8. **LoginPage.jsx** (5,013 bytes)
**Purpose**: TTE authentication

**Login Form**:
- IRCTC ID
- Password
- Role verification (TTE/ADMIN only)

**Features**:
- JWT token storage
- Auto-redirect on successful login
- Error handling
- Modern Material-UI design

---

### 9-13. **Other Pages** (Stats, Reports, Settings)
Additional pages for extended TTE functionality.

---

## Components (2 Total)

### 1. **PassengerManagement.jsx** (9,739 bytes)
**Purpose**: Reusable passenger management component

**Features**:
- Passenger list display
- Status update actions
- Filter controls
- Search functionality

**Props**:
```javascript
{
  passengers: Array,
  onStatusChange: Function,
  onRefresh: Function,
  filters: Object
}
```

---

### 2. **TrainControls.jsx** (8,293 bytes)
**Purpose**: Train journey control panel

**Features**:
- Start Journey button
- Move to Next Station
- Current station display
- Journey progress bar
- Station list with completion status

**Display**:
```javascript
{
  currentStation: String,
  nextStation: String,
  progress: Number,  // Percentage
  stations: Array,
  journeyStarted: Boolean,
  journeyComplete: Boolean
}
```

**Actions**:
```javascript
startJourney()           // Begin the journey
moveToNextStation()      // Progress to next station
```

---

## API Integration

### API Client (`api.js` - 3,929 bytes)

**Base Configuration**:
```javascript
axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})
```

**TTE-Specific Endpoints**:
```javascript
// Authentication
login(credentials)
logout()

// Train State
getTrainState()
moveNextStation()

// Passengers
getTTEPassengers(filters)
getBoardedPassengers()
getRACPassengers()
manualMarkBoarded(pnr)
manualMarkDeboarded(pnr)

// No-Show
markNoShow(pnr)
revertNoShow(pnr)

// Boarding Verification
getBoardingQueue()
confirmAllBoarded()

// Upgrades
confirmUpgrade(data)
getOfflineUpgrades()
confirmOfflineUpgrade(upgradeId)
rejectOfflineUpgrade(upgradeId)
getSentOffers()

// Action History
getActionHistory()
undoAction(actionId)

// Statistics
getStatistics()
```

---

## Key Workflows

### Workflow 1: Station Arrival & Boarding Verification
```
1. Train arrives at station
2. TTE navigates to Boarding Verification page
3. System shows passengers scheduled to board
4. TTE verifies each passenger physically
5. Options:
   a) Confirm All Boarded → All marked as boarded
   b) Mark Individual No-Show → Passenger marked, berth freed
6. System automatically:
   - Creates vacant berth entry
   - Checks for eligible RAC passengers
   - Sends upgrade offers (online) or adds to offline queue
```

### Workflow 2: Offline Upgrade Confirmation
```
1. Berth becomes vacant (no-show)
2. System identifies eligible offline RAC passenger
3. Adds to Offline Upgrades queue
4. TTE navigates to Offline Upgrades page
5. TTE physically verifies passenger eligibility
6. TTE confirms upgrade
7. System:
   - Upgrades RAC → CNF
   - Allocates berth
   - Updates passenger status
   - Records action in history
```

### Workflow 3: Action Undo
```
1. TTE realizes mistake (e.g., wrong passenger marked as no-show)
2. Navigates to Action History page
3. Finds the erroneous action
4. Clicks "Undo" button
5. System checks:
   - Action is from current station (not previous)
   - No berth collision (berth not reallocated)
6. If valid:
   - Reverts the action
   - Restores previous state
   - Logs undo action
7. If invalid:
   - Shows error message
   - Explains why undo is not possible
```

### Workflow 4: Manual Passenger Status Update
```
1. TTE navigates to Passengers page
2. Searches for specific passenger (by PNR)
3. Views current status
4. Clicks status action button:
   - Mark Boarded
   - Mark Deboarded  
   - Mark No-Show
5. System updates status immediately
6. Records action in history
7. Triggers any necessary reallocations
```

---

## Real-time Features

### Auto-Refresh
- Dashboard: 10-second intervals
- Passenger lists: On-demand refresh button
- Statistics: Real-time via API polling

### WebSocket Integration
Although the TTE portal primarily uses HTTP polling, it's designed to receive WebSocket events for:
- Train state updates
- Passenger status changes
- No-show alerts
- Upgrade confirmations

---

## Service Worker Support

**File**: `public/sw.js`

**Features**:
- Offline support for critical pages
- Cache API responses
- Enable offline operation during poor connectivity

**Cached Resources**:
- Static assets (CSS, JS, images)
- Critical API responses
- Dashboard data

---

## Security & Authentication

### JWT Token Management
```javascript
localStorage.setItem('tte_token', token)
localStorage.setItem('tte_user', JSON.stringify(user))
```

### Role-Based Access
```javascript
// Only TTE and ADMIN roles allowed
if (user.role !== 'TTE' && user.role !== 'ADMIN') {
  redirect('/login')
}
```

### Protected Routes
All TTE pages require:
1. Valid JWT token
2. TTE or ADMIN role
3. Active session

---

## Design System

### Material-UI Theme
```javascript
{
  palette: {
    primary: { main: '#1976d2' },
    success: { main: '#2e7d32' },
    error: { main: '#d32f2f' },
    warning: { main: '#ed6c02' }
  }
}
```

### Common Patterns
- Cards for grouping information
- Tables for passenger lists
- Buttons with loading states
- Confirmation dialogs
- Toast notifications for feedback

---

## Performance Considerations

### Optimization Techniques
1. **Pagination** - 20 passengers per page
2. **Lazy Loading** - Code splitting for pages
3. **Memoization** - React.memo for components
4. **Debouncing** - Search input debouncing
5. **Optimistic Updates** - Immediate UI feedback

### Large File Warning
⚠️ `PassengersPage.jsx` (25KB) - Consider breaking into smaller components:
- PassengerListTable
- VacantBerthsTable
- FilterControls
- SearchBar

---

## Testing Recommendations

### Critical Paths to Test
1. ✅ Boarding verification workflow
2. ✅ No-show marking and revert
3. ✅ Offline upgrade confirmation
4. ✅ Action undo functionality
5. ✅ Manual status updates
6. ✅ Authentication and authorization

### Edge Cases
- Multiple no-shows at same station
- Rapid status changes
- Undo after berth reallocation
- Simultaneous TTE actions

---

## Summary

The TTE Portal is a **modern, well-designed application** specifically tailored for train staff operations. It provides:

✅ **Comprehensive Features** - All necessary TTE operations in one place  
✅ **Real-time Updates** - Live data for accurate decision-making  
✅ **Undo Support** - Safety net for correcting mistakes  
✅ **Offline Capability** - Service worker for poor connectivity  
✅ **Modern Tech Stack** - React 19 + Vite + Material-UI  
✅ **Role-Based Security** - Proper authentication and authorization

**Grade**: A- (Excellent implementation with room for component optimization)

**Recommendations**:
1. Split `PassengersPage.jsx` into smaller components
2. Add unit tests for critical workflows
3. Implement WebSocket real-time updates (currently HTTP polling)
4. Add error boundary components
5. Consider adding offline queue for actions during no connectivity
