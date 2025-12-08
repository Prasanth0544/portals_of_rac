# Project Structure

```
.
├── .gitattributes
├── .gitignore
├── ARCHITECTURE.md
├── MERN_LEARNING_GUIDE.md
├── PROJECT_STRUCTURE.md
├── QUICKSTART.md
├── README.md
├── backend
│   ├── .env
│   ├── .env.example
│   ├── add-passenger-emails.js
│   ├── config
│   │   ├── .env
│   │   ├── db.js
│   │   ├── swagger.js
│   │   └── websocket.js
│   ├── constants
│   │   └── reallocationConstants.js
│   ├── controllers
│   │   ├── StationWiseApprovalController.js
│   │   ├── authController.js
│   │   ├── configController.js
│   │   ├── otpController.js
│   │   ├── passengerController.js
│   │   ├── reallocationController.js
│   │   ├── trainController.js
│   │   ├── tteController.js
│   │   └── visualizationController.js
│   ├── debug-reallocation.js
│   ├── jest.config.js
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
│   │   ├── cleanupDuplicateReallocations.js
│   │   ├── createTestAccounts.js
│   │   └── resetAdmin.js
│   ├── server.js
│   ├── services
│   │   ├── CurrentStationReallocationService.js
│   │   ├── DataService.js
│   │   ├── InAppNotificationService.js
│   │   ├── NotificationService.js
│   │   ├── OTPService.js
│   │   ├── PassengerService.js
│   │   ├── PushNotificationService.js
│   │   ├── PushSubscriptionService.js
│   │   ├── QueueService.js
│   │   ├── RACHashMapService.js
│   │   ├── ReallocationService.js
│   │   ├── SegmentService.js
│   │   ├── StationEventService.js
│   │   ├── StationWiseApprovalService.js
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
│   ├── tests
│   │   ├── noshow-rac-queue.test.js
│   │   └── reallocation.test.js
│   └── utils
│       ├── berthAllocator.js
│       ├── constants.js
│       ├── create-indexes.js
│       ├── error-handler.js
│       ├── helpers.js
│       └── stationOrder.js
├── dot_md_files
│   ├── ELIGIBILITY_MATRIX_COMPLETE.md
│   ├── Limitations_to_improve.md
│   └── REFACTORING_ROADMAP.md
├── frontend
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── README.md
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── public
│   │   ├── favicon.ico
│   │   ├── index.html
│   │   ├── manifest.json
│   │   ├── robots.txt
│   │   └── sw.js
│   ├── requirements.md
│   ├── src
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── UserMenu.css
│   │   ├── components
│   │   │   ├── APIDocumentationLink.css
│   │   │   ├── APIDocumentationLink.jsx
│   │   │   ├── FormInput.css
│   │   │   ├── FormInput.jsx
│   │   │   ├── PassengerList.css
│   │   │   ├── PassengerList.jsx
│   │   │   ├── RACQueue.css
│   │   │   ├── RACQueue.jsx
│   │   │   ├── StationProgress.css
│   │   │   ├── StationProgress.jsx
│   │   │   ├── ToastContainer.css
│   │   │   ├── ToastContainer.jsx
│   │   │   ├── TrainVisualization.css
│   │   │   └── TrainVisualization.jsx
│   │   ├── index.css
│   │   ├── index.js
│   │   ├── main.jsx
│   │   ├── pages
│   │   │   ├── AddPassengerPage.css
│   │   │   ├── AddPassengerPage.jsx
│   │   │   ├── AllocationDiagnosticsPage.css
│   │   │   ├── AllocationDiagnosticsPage.jsx
│   │   │   ├── CoachesPage.css
│   │   │   ├── CoachesPage.jsx
│   │   │   ├── ConfigPage.css
│   │   │   ├── ConfigPage.jsx
│   │   │   ├── HomePage.css
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.css
│   │   │   ├── LoginPage.jsx
│   │   │   ├── PassengersPage-status.css
│   │   │   ├── PassengersPage.css
│   │   │   ├── PassengersPage.jsx
│   │   │   ├── PhaseOnePage.css
│   │   │   ├── PhaseOnePage.jsx
│   │   │   ├── RACQueuePage.css
│   │   │   ├── RACQueuePage.jsx
│   │   │   ├── ReallocationPage.css
│   │   │   ├── ReallocationPage.jsx
│   │   │   ├── VisualizationPage.css
│   │   │   └── VisualizationPage.jsx
│   │   ├── reportWebVitals.js
│   │   └── services
│   │       ├── api.js
│   │       ├── apiWithErrorHandling.js
│   │       ├── formValidation.js
│   │       ├── pushNotificationService.js
│   │       ├── toastNotification.js
│   │       └── websocket.js
│   └── vite.config.js
├── generate_tree.py
├── package-lock.json
├── package.json
├── passenger-portal
│   ├── .env.example
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
│   │   │   ├── JourneyVisualizationPage.css
│   │   │   ├── JourneyVisualizationPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── PNRSearchPage.css
│   │   │   ├── PNRSearchPage.jsx
│   │   │   ├── UpgradeOffersPage.css
│   │   │   ├── UpgradeOffersPage.jsx
│   │   │   ├── ViewTicketPage.css
│   │   │   └── ViewTicketPage.jsx
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
├── quick_check.js
├── test.py
├── test_api.js
├── test_eligibility.js
└── tte-portal
    ├── .env.example
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
    │   │   ├── JourneyTimeline.css
    │   │   ├── JourneyTimeline.jsx
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
    │   │   ├── PendingReallocationsPage.css
    │   │   ├── PendingReallocationsPage.jsx
    │   │   ├── UpgradeNotificationsPage.css
    │   │   ├── UpgradeNotificationsPage.jsx
    │   │   ├── VisualizationPage.css
    │   │   └── VisualizationPage.jsx
    │   ├── services
    │   │   ├── api.js
    │   │   └── pushNotificationService.js
    │   └── utils
    │       └── pushManager.js
    └── vite.config.js
```
