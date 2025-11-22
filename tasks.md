1️⃣ PASSENGER PORTAL — FINAL FOLDER STRUCTURE

(Used only by ONLINE passengers with IRCTC login.)
(Offline passengers are handled by TTE only.)


passenger-portal/
└── src/
    ├── api.js                     # All network calls (PNR, offers, accept/deny)
    ├── auth.js                    # IRCTC login session & token handling
    ├── main.jsx                   # App entry + socket connection setup
    ├── App.jsx                    # Routing for passenger pages
    ├── constants.js               # Status names, event names
    
    ├── config/
    │   ├── socketConfig.js        # WebSocket config (URL, reconnect)
    │   └── env.example.js         # Example environment variables
    
    ├── hooks/
    │   ├── useOffers.js           # State management for upgrade offers
    │   ├── useSocket.js           # Real-time connection for offers
    │   ├── useAuth.js             # Logged-in state handling
    │   ├── useRetryQueue.js       # Retry failed accept/deny operations
    │   └── useOnboardCheck.js     # Shows upgrade UI only if passenger is boarded
    
    ├── components/
    │   ├── OfferSocketProvider.jsx
    │   ├── OfferCard.jsx
    │   ├── OfferModal.jsx
    │   ├── NotificationCard.jsx
    │   ├── LoadingSpinner.jsx
    │   ├── ErrorBanner.jsx
    │   ├── EmptyState.jsx
    │   └── ConfirmationDialog.jsx
    
    ├── pages/
    │   ├── LoginPage.jsx
    │   ├── PNRCheckPage.jsx
    │   ├── Dashboard.jsx
    │   ├── UpgradeNotificationsPage.jsx
    │   ├── OfferHistoryPage.jsx
    │   └── SettingsPage.jsx
    
    ├── services/
    │   ├── offerService.js        # Logic for storing, merging, retrying offers
    │   ├── authService.js         # Login, logout, profile fetching
    │   ├── retryQueueService.js   # Queues offline accept/deny ops
    │   └── offlineSyncService.js  # Sync offline actions when online
    
    ├── stores/
    │   ├── offerStore.js          # Global state: offers
    │   └── userStore.js           # Logged-in passenger info & status
    
    ├── utils/
    │   ├── helpers.js
    │   ├── formatters.js
    │   ├── idempotency.js
    │   └── eligibility.js         # Client-side check for displaying eligibility
    
    ├── workers/
    │   ├── sw.js                  # Service worker for offline actions
    │   └── backgroundSync.js      # Flush queued accept/deny
    
    └── assets/
        └── images/




2️⃣ TTE PORTAL — FINAL FOLDER STRUCTURE

(Handles BOTH online & offline passengers.)
(Has final authority for upgrades, boarded checks, and no_shows.)


tte-portal/
└── src/
    ├── api.js                       # All TTE network operations
    ├── main.jsx                     # App entry + socket manager
    ├── App.jsx                      # Routes for TTE panels
    ├── constants.js
    
    ├── config/
    │   └── socketConfig.js
    
    ├── hooks/
    │   ├── useTteSocket.js          # Real-time boarding/deboarding/vacancy events
    │   ├── useTrainState.js         # Manifest of boarded/deboarded passengers
    │   ├── useBulkActions.js        # Batch accept, batch boarding etc.
    │   └── useOfflineSync.js        # Sync offline actions later
    
    ├── components/
    │   ├── Dashboard.jsx
    │   ├── VacancyCard.jsx
    │   ├── CandidateList.jsx
    │   ├── OfflineUpgradeVerification.jsx
    │   ├── PassengerManagement.jsx
    │   ├── TrainControls.jsx
    │   ├── BatchAcceptToolbar.jsx
    │   ├── AuditLogPanel.jsx
    │   ├── NotificationBanner.jsx
    │   └── LoadingSpinner.jsx
    
    ├── pages/
    │   ├── TteHomePage.jsx
    │   ├── VacancyReviewPage.jsx
    │   ├── PassengerToolsPage.jsx
    │   └── TrainJourneyPage.jsx
    
    ├── services/
    │   ├── tteService.js
    │   ├── vacancyService.js
    │   ├── consentService.js
    │   ├── auditService.js
    │   └── offlineStoreService.js
    
    ├── stores/
    │   ├── vacancyStore.js
    │   └── passengerStore.js
    
    ├── utils/
    │   ├── helpers.js
    │   ├── eligibility.js
    │   └── idempotency.js
    
    ├── workers/
    │   ├── tteSyncWorker.js
    │   └── cacheManager.js
    
    └── assets/
        └── icons/



3️⃣ VACANCY → OFFER → ACCEPT → ALLOCATION LOGIC

(This is the heart of the RAC Relocation Engine.)

STEP 1 — VACANCY CREATED

A berth becomes vacant when:

cancellation

no_show

confirmed passenger deboards

Backend creates vacancy:

vacancy = { berthId, vacStart, vacEnd }


Backend merges adjacent/overlapping vacancy segments.


STEP 2 — CANDIDATE DISCOVERY

Backend finds RAC passengers who:

boarded == true (on train)

Their full journey lies inside the vacancy segment

PNR_Status = RAC

co_passenger also not cancelled/no_show

Sorted by fixed order:
RAC1 → RAC2 → RAC3 → …

STEP 3 — OFFER GENERATION

For each candidate:

If online_status = online → send real-time offer to Passenger Portal

If online_status = offline → add as TTE pending upgrade

Offers have TTL (e.g., 60 sec)

Frontend (Passenger Portal) will not show an offer unless backend says:

boarded == true

STEP 4 — ACCEPT / DENY

Two paths:

A) Online Passenger

They click Accept/Deny →
POST /portal/upgrade-response

Backend checks:

vacancy still exists

passenger boarded

co-passenger boarded

eligibility still valid

If valid → mark consent = accepted
Then TTE must confirm.

B) Offline Passenger

TTE reviews their candidate card:

Accept = confirm upgrade

Deny = skip

STEP 5 — TTE FINAL VERIFICATION

TTE checks:

passenger accepted

all eligibility conditions remain valid

co-passenger verified

TTE presses “Approve Upgrade”.

This triggers final allocation.

STEP 6 — ALLOCATION (ATOMIC)

Backend in single DB transaction:

Upgrade passenger: PNR_Status = CNF, RAC_status = "-"

Upgrade co-passenger: PNR_Status = CNF, RAC_status = "-"

Assign full berth

Mark vacancy allocated

Emit notifications

Write audit logs

4️⃣ HOW PORTALS CONNECT TO BACKEND (COMMUNICATION FLOW)
PASSENGER PORTAL → BACKEND

PNR check

Login (IRCTC)

Fetch offers

Accept or Deny

Retry offline actions

Get boarding status before displaying offers

BACKEND → PASSENGER PORTAL

WebSocket push:

new upgrade offer

allocation result

Email/SMS

Updated boarding/no_show status

TTE PORTAL → BACKEND

Mark boarded

Mark no_show

Validate upgrade

Approve allocation

Batch actions

Station movement (MoveNextStation)

BACKEND → TTE PORTAL

new vacancies

new candidates

online passenger accept requests

updated train state

audit logs

5️⃣ HOW BOARDING STATUS IS LINKED TO BACKEND
Backend = single source of truth

Frontend must always retrieve:

GET /portal/boarding-status?pnr=X

Backend returns:

{ boarded: true/false, last_update, station, online_status }


If boarded = false →
Passenger Portal must hide upgrade actions.

Only backend modifies boarded:

by train movement

by TTE marking passenger

automatic event processor

Frontend cannot change it.

6️⃣ END-TO-END SYSTEM FLOW (COMBINED)

Here is your final, integrated train reallocation lifecycle:

Vacancy Created
        ↓
Candidate List (Boarded RAC only)
        ↓
Offer → (Online Passenger)
Offer → (Offline Passenger → TTE)
        ↓
Response (Accept / Deny / Expire)
        ↓
TTE Verification (Final Decision)
        ↓
Allocation (Atomic → Both CNF)
        ↓
Notifications (Passenger + TTE)
        ↓
Audit Logged (Permanent)


EVERY step uses backend DB as the final authority.

🟦 Final Summary Block (Paste This in Your Word Doc)

Passenger Portal = for online, boarded passengers only

TTE Portal = for all passengers (online + offline)

Boarding status is backend-only, not controlled by frontend

Upgrade offers only sent to boarded RAC passengers

Vacancy is merged and scanned by backend

Acceptance must be verified by TTE

Allocation is atomic & updates both RAC passengers

All actions logged in audit logs
