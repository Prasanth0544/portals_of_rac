# Project Structure

```
.
├── .gitattributes
├── .gitignore
├── PROJECT_STRUCTURE.md
├── QUICK_START_GUIDE.md
├── README.md
├── VERIFICATION_REPORT.md
├── WEBSOCKET_MEMORY_LEAK_FIXES.md
├── backend
│   ├── .env
│   ├── add-passenger-emails.js
│   ├── config
│   │   ├── .env
│   │   ├── db.js
│   │   ├── swagger.js
│   │   └── websocket.js
│   ├── constants
│   │   └── reallocationConstants.js
│   ├── controllers
│   │   ├── authController.js
│   │   ├── configController.js
│   │   ├── passengerController.js
│   │   ├── reallocationController.js
│   │   ├── trainController.js
│   │   ├── tteController.js
│   │   └── visualizationController.js
│   ├── debug-reallocation.js
│   ├── middleware
│   │   ├── auth.js
│   │   ├── validate-request.js
│   │   ├── validation-schemas.js
│   │   └── validation.js
│   ├── models
│   │   ├── Berth.js
│   │   ├── SegmentMatrix.js
│   │   └── TrainState.js
│   ├── package-lock.json
│   ├── package.json
│   ├── routes
│   │   └── api.js
│   ├── scripts
│   │   ├── check-passengers.js
│   │   ├── createTestAccounts.js
│   │   └── resetAdmin.js
│   ├── server.js
│   ├── services
│   │   ├── DataService.js
│   │   ├── InAppNotificationService.js
│   │   ├── NotificationService.js
│   │   ├── PassengerService.js
│   │   ├── PushNotificationService.js
│   │   ├── PushSubscriptionService.js
│   │   ├── QueueService.js
│   │   ├── ReallocationService.js
│   │   ├── ReallocationService.js.bak
│   │   ├── SegmentService.js
│   │   ├── StationEventService.js
│   │   ├── UpgradeNotificationService.js
│   │   ├── ValidationService.js
│   │   ├── VisualizationService.js
│   │   ├── WebPushService.js
│   │   └── reallocation
│   │       ├── AllocationService.js
│   │       ├── EligibilityService.js
│   │       ├── NoShowService.js
│   │       ├── RACQueueService.js
│   │       ├── VacancyService.js
│   │       └── reallocationConstants.js
│   ├── test-email.js
│   └── utils
│       ├── berthAllocator.js
│       ├── constants.js
│       ├── create-indexes.js
│       ├── error-handler.js
│       ├── helpers.js
│       └── stationOrder.js
├── dot_md_files
│   ├── ELIGIBILITY_MATRIX_COMPLETE.md
│   ├── FUTURE_FEATURES_PWA_REDIS.md
│   ├── JWT_TOKEN_GUIDE.md
│   ├── Left_work.md
│   ├── RAC_REALLOCATION_WORKFLOW.md
│   └── flow.md
├── et --hard 330f300
├── frontend
│   ├── .env
│   ├── .gitignore
│   ├── README.md
│   ├── package-lock.json
│   ├── package.json
│   ├── public
│   │   ├── favicon.ico
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── robots.txt
│   ├── requirements.md
│   └── src
│       ├── App.css
│       ├── App.jsx
│       ├── UserMenu.css
│       ├── components
│       │   ├── APIDocumentationLink.css
│       │   ├── APIDocumentationLink.jsx
│       │   ├── FormInput.css
│       │   ├── FormInput.jsx
│       │   ├── PassengerList.css
│       │   ├── PassengerList.jsx
│       │   ├── RACQueue.css
│       │   ├── RACQueue.jsx
│       │   ├── StationProgress.css
│       │   ├── StationProgress.jsx
│       │   ├── ToastContainer.css
│       │   ├── ToastContainer.jsx
│       │   ├── TrainVisualization.css
│       │   └── TrainVisualization.jsx
│       ├── index.css
│       ├── index.js
│       ├── pages
│       │   ├── AddPassengerPage.css
│       │   ├── AddPassengerPage.jsx
│       │   ├── AllocationDiagnosticsPage.css
│       │   ├── AllocationDiagnosticsPage.jsx
│       │   ├── CoachesPage.css
│       │   ├── CoachesPage.jsx
│       │   ├── ConfigPage.css
│       │   ├── ConfigPage.jsx
│       │   ├── HomePage.css
│       │   ├── HomePage.jsx
│       │   ├── LoginPage.css
│       │   ├── LoginPage.jsx
│       │   ├── PassengersPage-status.css
│       │   ├── PassengersPage.css
│       │   ├── PassengersPage.jsx
│       │   ├── PhaseOnePage.css
│       │   ├── PhaseOnePage.jsx
│       │   ├── RACQueuePage.css
│       │   ├── RACQueuePage.jsx
│       │   ├── ReallocationPage.css
│       │   ├── ReallocationPage.jsx
│       │   ├── VisualizationPage.css
│       │   └── VisualizationPage.jsx
│       ├── reportWebVitals.js
│       └── services
│           ├── api.js
│           ├── apiWithErrorHandling.js
│           ├── formValidation.js
│           ├── toastNotification.js
│           └── websocket.js
├── generate_tree.py
├── package-lock.json
├── package.json
├── passenger-portal
│   ├── .gitignore
│   ├── README.md
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── public
│   │   ├── service-worker.js
│   │   ├── sw.js
│   │   └── vite.svg
│   ├── src
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── UserMenu.css
│   │   ├── api.js
│   │   ├── assets
│   │   │   └── react.svg
│   │   ├── components
│   │   │   ├── BoardingPass.css
│   │   │   ├── BoardingPass.jsx
│   │   │   ├── JourneyTimeline.css
│   │   │   ├── JourneyTimeline.jsx
│   │   │   ├── NotificationBell.css
│   │   │   ├── NotificationBell.jsx
│   │   │   ├── NotificationSettings.jsx
│   │   │   └── OfferCard.jsx
│   │   ├── config
│   │   │   └── socketConfig.js
│   │   ├── constants.js
│   │   ├── hooks
│   │   │   ├── useOffers.js
│   │   │   └── useSocket.js
│   │   ├── index.css
│   │   ├── main.jsx
│   │   ├── pages
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── UpgradeOffersPage.css
│   │   │   └── UpgradeOffersPage.jsx
│   │   ├── services
│   │   │   └── offerService.js
│   │   ├── stores
│   │   └── utils
│   │       ├── eligibility.js
│   │       ├── formatters.js
│   │       ├── helpers.js
│   │       ├── idempotency.js
│   │       ├── notifications.js
│   │       └── pushManager.js
│   └── vite.config.js
├── passengers_data.py
├── test.py
└── tte-portal
    ├── .gitignore
    ├── README.md
    ├── eslint.config.js
    ├── index.html
    ├── package-lock.json
    ├── package.json
    ├── public
    │   ├── sw.js
    │   └── vite.svg
    ├── src
    │   ├── App.css
    │   ├── App.jsx
    │   ├── UserMenu.css
    │   ├── api.js
    │   ├── assets
    │   │   └── react.svg
    │   ├── components
    │   │   ├── PassengerManagement.jsx
    │   │   └── TrainControls.jsx
    │   ├── hooks
    │   │   └── useTteSocket.js
    │   ├── index.css
    │   ├── main.jsx
    │   ├── pages
    │   │   ├── ActionHistoryPage.css
    │   │   ├── ActionHistoryPage.jsx
    │   │   ├── BoardedPassengersPage.jsx
    │   │   ├── BoardingVerificationPage.jsx
    │   │   ├── DashboardPage.css
    │   │   ├── DashboardPage.jsx
    │   │   ├── LoginPage.jsx
    │   │   ├── OfflineUpgradesPage.css
    │   │   ├── OfflineUpgradesPage.jsx
    │   │   ├── PassengersPage.css
    │   │   ├── PassengersPage.jsx
    │   │   ├── UpgradeNotificationsPage.css
    │   │   └── UpgradeNotificationsPage.jsx
    │   └── utils
    │       └── pushManager.js
    └── vite.config.js
```
