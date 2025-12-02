# RAC System - Quick Reference Guide
**Version**: 3.0.0 | **Updated**: December 2, 2025

---

## 📁 FILE STRUCTURE REFERENCE

```
zip_2/
├── backend/                           # Node.js Express Server (Port 5000)
│   ├── server.js                      # Main entry point + HTTP/WebSocket
│   ├── package.json                   # Dependencies
│   ├── .env                           # Configuration (NOT in git)
│   ├── config/
│   │   ├── db.js                      # MongoDB connection manager
│   │   ├── websocket.js               # WebSocket server setup
│   │   └── swagger.js                 # API documentation
│   ├── controllers/ (7 files)
│   │   ├── authController.js          # Login/registration
│   │   ├── tteController.js           # TTE operations (LARGEST - 1230 lines)
│   │   ├── passengerController.js     # Passenger operations (1117 lines)
│   │   ├── reallocationController.js  # RAC logic
│   │   ├── trainController.js         # Train lifecycle
│   │   ├── visualizationController.js # Data viz
│   │   └── configController.js        # Runtime config
│   ├── services/ (15+ files)
│   │   ├── DataService.js             # Data loading
│   │   ├── ReallocationService.js     # Main orchestrator
│   │   ├── PassengerService.js        # Passenger ops
│   │   ├── NotificationService.js     # Multi-channel notifications
│   │   ├── WebPushService.js          # Browser push
│   │   ├── InAppNotificationService.js # In-app notifications
│   │   ├── UpgradeNotificationService.js # Offer tracking
│   │   ├── reallocation/              # 6 specialized services
│   │   │   ├── EligibilityService.js  # Two-stage eligibility (11 rules)
│   │   │   ├── AllocationService.js   # Berth allocation
│   │   │   ├── RACQueueService.js     # RAC management
│   │   │   ├── VacancyService.js      # Vacant berth detection
│   │   │   ├── NoShowService.js       # No-show handling
│   │   │   └── reallocationConstants.js # Rules definition
│   │   └── [Other services]           # QueueService, SegmentService, etc.
│   ├── models/ (3 files)
│   │   ├── TrainState.js              # Main state model (1025 lines, 31KB)
│   │   ├── Berth.js                   # Individual berth model
│   │   └── SegmentMatrix.js           # Segment tracking
│   ├── routes/
│   │   └── api.js                     # All 50+ endpoint definitions
│   ├── middleware/ (4 files)
│   │   ├── auth.js                    # JWT authentication
│   │   ├── validation.js              # Request validation
│   │   ├── validate-request.js        # Joi validator
│   │   └── validation-schemas.js      # Joi schemas
│   ├── utils/ (6 files)
│   │   ├── error-handler.js           # Global error handling
│   │   ├── helpers.js                 # Utility functions
│   │   ├── constants.js               # System constants
│   │   ├── create-indexes.js          # MongoDB index creation
│   │   ├── stationOrder.js            # Station matching
│   │   └── berthAllocator.js          # Berth allocation logic
│   └── scripts/                       # Utility scripts
│       ├── createTestAccounts.js
│       ├── resetAdmin.js
│       └── check-passengers.js
│
├── frontend/                          # Admin Portal (React + CRA, Port 3000)
│   ├── public/                        # Static assets
│   ├── src/
│   │   ├── pages/ (11 pages)
│   │   │   ├── HomePage.jsx           # Dashboard
│   │   │   ├── PassengersPage.jsx     # Passenger management
│   │   │   ├── ReallocationPage.jsx   # Eligibility matrix
│   │   │   ├── ConfigPage.jsx         # Configuration
│   │   │   ├── RACQueuePage.jsx       # RAC queue display
│   │   │   ├── CoachesPage.jsx        # Coach layout
│   │   │   ├── VisualizationPage.jsx  # Analytics
│   │   │   ├── AddPassengerPage.jsx   # Add passenger
│   │   │   ├── AllocationDiagnosticsPage.jsx
│   │   │   ├── LoginPage.jsx          # Authentication
│   │   │   └── PhaseOnePage.jsx
│   │   ├── components/ (7 components)
│   │   │   ├── PassengerList.jsx
│   │   │   ├── StationProgress.jsx
│   │   │   ├── RACQueue.jsx
│   │   │   ├── TrainVisualization.jsx
│   │   │   ├── FormInput.jsx
│   │   │   ├── ToastContainer.jsx
│   │   │   └── APIDocumentationLink.jsx
│   │   ├── services/ (5 files)
│   │   │   ├── apiWithErrorHandling.js # API client
│   │   │   ├── websocket.js           # WebSocket client
│   │   │   ├── formValidation.js      # Form validation
│   │   │   ├── toastNotification.js   # Notifications
│   │   │   └── api.js                 # Basic API client
│   │   └── App.jsx, index.js
│   └── package.json
│
├── tte-portal/                        # TTE Portal (React + Vite, Port 5173)
│   ├── src/
│   │   ├── pages/ (13 pages)
│   │   │   ├── DashboardPage.jsx      # TTE dashboard
│   │   │   ├── PassengersPage.jsx     # Passenger management (LARGEST - 25KB)
│   │   │   ├── BoardingVerificationPage.jsx
│   │   │   ├── ActionHistoryPage.jsx  # Action history + undo
│   │   │   ├── OfflineUpgradesPage.jsx # Offline upgrades queue
│   │   │   ├── UpgradeNotificationsPage.jsx # Sent offers
│   │   │   ├── BoardedPassengersPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── [6 more pages]
│   │   ├── components/ (2 main)
│   │   │   ├── PassengerManagement.jsx
│   │   │   └── TrainControls.jsx
│   │   ├── api.js                     # API client
│   │   └── App.jsx, main.jsx
│   └── package.json
│
├── passenger-portal/                  # Passenger Portal (React + Vite, Port 5174)
│   ├── src/
│   │   ├── pages/ (4 pages)
│   │   │   ├── DashboardPage.jsx      # Main dashboard (13.7KB)
│   │   │   ├── UpgradeOffersPage.jsx  # Upgrade management
│   │   │   ├── LoginPage.jsx
│   │   │   └── [1 more page]
│   │   ├── components/ (8 components)
│   │   │   ├── BoardingPass.jsx       # QR code pass
│   │   │   ├── JourneyTimeline.jsx    # Visual timeline
│   │   │   ├── NotificationBell.jsx   # Notification center
│   │   │   ├── NotificationSettings.jsx
│   │   │   ├── OfferCard.jsx          # Upgrade offer (LARGEST - 14.9KB)
│   │   │   └── [3 more components]
│   │   ├── utils/ (6 utilities)
│   │   │   ├── pushManager.js         # Push setup
│   │   │   └── formatters.js
│   │   ├── api.js
│   │   └── App.jsx, main.jsx
│   └── package.json
│
├── dot_md_files/                      # Documentation
│   ├── analysis/
│   │   ├── backend_analysis.md        # Backend detailed analysis
│   │   ├── frontend_analysis.md       # Frontend detailed analysis
│   │   ├── passenger_portal_analysis.md
│   │   ├── tte_portal_analysis.md
│   │   ├── system_communication_flow.md
│   │   └── quick_start_guide.md
│   ├── [Other documentation files]
│   │   ├── JWT_TOKEN_GUIDE.md
│   │   ├── RAC_REALLOCATION_WORKFLOW.md
│   │   └── [More guides]
│
├── node_modules/                      # Backend dependencies
├── README.md                          # Main project README
├── VERIFICATION_REPORT.md             # Test report
├── WEBSOCKET_MEMORY_LEAK_FIXES.md     # Known issues
│
└── [NEW - Analysis Documents]
    ├── IMPROVEMENTS_ROADMAP.md        # ← NEW: Full improvement plan
    ├── QUICK_ACTIONS.md               # ← NEW: 6 immediate actions
    └── ANALYSIS_SUMMARY.md            # ← NEW: This summary
```

---

## 🔗 IMPORTANT FILE RELATIONSHIPS

### Core Business Logic Flow
```
API Request
    ↓
Router (routes/api.js)
    ↓
Controller (controllers/*.js)
    ↓
Service Layer (services/*.js)
    ↓
TrainState Model (models/TrainState.js) [In-Memory]
    ↓
MongoDB (if needed for persistence)
    ↓
Response + WebSocket Broadcast
```

### Key Integrations
```
Backend (5000)
├── HTTP ←→ Frontend/Admin (3000)
├── HTTP ←→ TTE Portal (5173)
├── HTTP ←→ Passenger Portal (5174)
├── WebSocket ←→ All Portals
└── SMTP/Twilio ←→ External Services
```

### Database Interaction
```
Backend
├── MongoDB: rac DB
│   ├── users
│   ├── pushSubscriptions
│   ├── inAppNotifications
│   └── Train_Details
└── MongoDB: PassengersDB
    ├── All_Stations_12715
    └── Passengers_12715
```

---

## 🎯 KEY ENDPOINTS REFERENCE

### Train Management
```
POST   /api/config/setup                 # Configure & initialize
POST   /api/train/start-journey          # Begin journey
GET    /api/train/state                  # Get current state
POST   /api/train/next-station           # Move to next station
GET    /api/train/stats                  # Get statistics
```

### TTE Operations (50+ endpoints)
```
GET    /api/tte/passengers               # All passengers
POST   /api/tte/mark-no-show            # Mark NO_SHOW
POST   /api/tte/confirm-upgrade         # Confirm upgrade
GET    /api/tte/action-history          # Get action history
POST   /api/tte/undo-action             # Undo action
```

### Passenger Operations
```
GET    /api/passenger/pnr/:pnr          # Get PNR details
GET    /api/passenger/upgrade-notifications/:pnr
POST   /api/passenger/accept-upgrade    # Accept offer
POST   /api/passenger/deny-upgrade      # Decline offer
```

### Reallocation Core
```
GET    /api/train/rac-queue             # RAC passengers
GET    /api/train/vacant-berths         # Vacant segments
GET    /api/reallocation/eligibility    # Eligibility matrix
GET    /api/reallocation/stage1         # Stage 1 eligible
POST   /api/reallocation/apply          # Apply upgrade
```

---

## 🔑 KEY COMPONENTS & THEIR PURPOSES

### Backend Models
| Model | Purpose | Key Method |
|-------|---------|-----------|
| **TrainState** | Main state machine | `startJourney()`, `markNoShow()`, `undoAction()` |
| **Berth** | Individual berth tracking | `isAvailableForSegment()`, `addPassenger()` |
| **SegmentMatrix** | Segment occupancy | `getSegmentStatus()` |

### Backend Services
| Service | Purpose | Key Method |
|---------|---------|-----------|
| **DataService** | Load data from MongoDB | `loadTrainData()` |
| **ReallocationService** | Orchestrate reallocation | `processVacancyForUpgrade()` |
| **EligibilityService** | Check 11 eligibility rules | `checkStage1Eligibility()` |
| **NotificationService** | Send multi-channel alerts | `sendUpgradeOffer()` |

### Frontend Components
| Component | Portal | Purpose |
|-----------|--------|---------|
| **PassengersPage** | TTE | Manage passengers (25KB - largest) |
| **OfferCard** | Passenger | Display upgrade offer |
| **JourneyTimeline** | Passenger | Show journey progress |
| **BoardingPass** | Passenger | Generate QR code pass |

---

## 📊 METRICS QUICK REFERENCE

### Code Size
| File | Size | Purpose |
|------|------|---------|
| TrainState.js | 31KB | Core state model |
| tteController.js | 30KB | TTE endpoints |
| passengerController.js | 20KB | Passenger endpoints |
| PassengersPage.jsx (TTE) | 25KB | Largest React file |
| OfferCard.jsx | 15KB | Upgrade offer display |

### Endpoints
- **Total**: 50+ REST endpoints
- **Auth**: 5 endpoints
- **TTE**: 15 endpoints
- **Passenger**: 13 endpoints
- **Train**: 7 endpoints
- **Reallocation**: 6 endpoints
- **Visualization**: 6 endpoints

### WebSocket Events
- TRAIN_UPDATE
- STATION_ARRIVAL
- RAC_REALLOCATION
- NO_SHOW
- STATS_UPDATE
- UPGRADE_OFFER

---

## 🛠️ COMMON TASKS

### Add New API Endpoint
1. Create route in `routes/api.js`
2. Add controller method in `controllers/*.js`
3. Add service logic in `services/*.js`
4. Add validation schema in `middleware/validation-schemas.js`
5. Update Swagger docs in `config/swagger.js`

### Handle No-Show & Reallocation
1. `tteController.markNoShow()`
2. `TrainState.markNoShow()`
3. `ReallocationService.processVacancyForUpgrade()`
4. `EligibilityService.getStage1Eligible()`
5. Send upgrade offer or add to offline queue

### Add New Eligibility Rule
1. Create rule in `constants/reallocationConstants.js`
2. Add check in `EligibilityService.js`
3. Test with stage 1 or stage 2
4. Update documentation

---

## 🔍 DEBUGGING CHECKLIST

### Backend Issues
- [ ] Check `.env` file has all required variables
- [ ] Verify MongoDB is running (`net start MongoDB`)
- [ ] Check port 5000 isn't in use (`netstat -ano | findstr :5000`)
- [ ] Review error logs in console
- [ ] Check `network` tab in DevTools for API errors

### Frontend Issues
- [ ] Clear browser cache (`Ctrl+Shift+Del`)
- [ ] Check console for errors
- [ ] Verify backend is running on port 5000
- [ ] Check localStorage for token issues
- [ ] Review network requests in DevTools

### WebSocket Issues
- [ ] Check WebSocket connection in browser console
- [ ] Verify backend WebSocket initialized
- [ ] Check firewall rules
- [ ] Monitor active connections: `wsManager.getClientCount()`

---

## 📈 PERFORMANCE TIPS

### Database
- Use indexes on frequently queried fields
- Implement pagination for large datasets
- Cache frequently accessed data
- Close unused connections

### Frontend
- Lazy load components
- Code split large pages
- Memoize expensive components
- Implement virtual scrolling for large lists

### Backend
- Use connection pooling
- Implement caching layer (Redis)
- Optimize query performance
- Monitor memory usage

---

## 🔐 SECURITY CHECKLIST

- [ ] JWT_SECRET set in `.env`
- [ ] Input validation on all POST/PUT routes
- [ ] CORS properly configured
- [ ] No sensitive data in error messages
- [ ] Rate limiting enabled
- [ ] HTTPS in production
- [ ] Password bcrypt hashing
- [ ] No SQL/NoSQL injection vulnerabilities
- [ ] WebSocket authentication required
- [ ] Push notifications use VAPID keys

---

## 🚀 QUICK COMMANDS

```bash
# Start backend
cd backend && npm start

# Start portals
cd tte-portal && npm run dev
cd passenger-portal && npm run dev

# Check ports in use
netstat -ano | findstr :5000

# Find console logs
grep -r "console\.log" backend/

# Generate VAPID keys
npx web-push generate-vapid-keys

# Import test data
mongoimport --db PassengersDB --collection Passengers_12715 --file data.json

# View API docs
http://localhost:5000/api-docs
```

---

## 📞 COMMON ISSUES & FIXES

| Issue | Solution |
|-------|----------|
| Port 5000 in use | `taskkill /PID <PID> /F` |
| MongoDB not connecting | `net start MongoDB` |
| CORS error | Update allowed origins in `server.js` |
| JWT expired | Clear localStorage and login again |
| Push not working | Ensure VAPID keys set in `.env` |
| Console logs everywhere | Need: See QUICK_ACTIONS.md |

---

## 📚 DOCUMENTATION INDEX

### For Understanding
1. Start: `README.md`
2. Setup: `dot_md_files/analysis/quick_start_guide.md`
3. Architecture: `dot_md_files/analysis/system_communication_flow.md`
4. Details: `dot_md_files/analysis/*_analysis.md`

### For Improvements
1. Overview: `ANALYSIS_SUMMARY.md`
2. Roadmap: `IMPROVEMENTS_ROADMAP.md`
3. Quick Fixes: `QUICK_ACTIONS.md`

---

**Last Updated**: December 2, 2025  
**Status**: Ready for Development  
**Next Step**: Start with QUICK_ACTIONS.md

