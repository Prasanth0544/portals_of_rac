# Project Structure

```
.
├── .gitattributes
├── .gitignore
├── MERN_LEARNING_GUIDE.md
├── PROJECT_STRUCTURE.md
├── QUICKSTART.md
├── README.md
├── backend
│   ├── .env
│   ├── .env.example
│   ├── __tests__
│   │   ├── controllers
│   │   │   ├── passengerController.test.js
│   │   │   └── tteController.test.js
│   │   ├── services
│   │   │   ├── OTPService.test.js
│   │   │   ├── ValidationService.test.js
│   │   │   └── reallocation
│   │   │       ├── RACQueueService.test.js
│   │   │       └── VacancyService.test.js
│   │   ├── setup.js
│   │   └── utils
│   │       └── helpers.test.js
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
│   │   ├── validate.ts
│   │   ├── validation-schemas.js
│   │   └── validation.js
│   ├── models
│   │   ├── Berth.js
│   │   ├── Passenger.ts
│   │   ├── SegmentMatrix.js
│   │   ├── TTEUser.ts
│   │   ├── TrainState.js
│   │   ├── UpgradeNotification.ts
│   │   └── index.ts
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
│   ├── tsconfig.json
│   ├── types
│   │   ├── global.d.ts
│   │   └── index.ts
│   ├── utils
│   │   ├── berthAllocator.js
│   │   ├── constants.js
│   │   ├── create-indexes.js
│   │   ├── error-handler.js
│   │   ├── helpers.js
│   │   └── stationOrder.js
│   └── validation
│       └── schemas.ts
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
│   ├── src
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── UserMenu.css
│   │   ├── components
│   │   │   ├── APIDocumentationLink.css
│   │   │   ├── APIDocumentationLink.tsx
│   │   │   ├── FormInput.css
│   │   │   ├── FormInput.tsx
│   │   │   ├── PassengerList.css
│   │   │   ├── PassengerList.tsx
│   │   │   ├── RACQueue.css
│   │   │   ├── RACQueue.tsx
│   │   │   ├── StationProgress.css
│   │   │   ├── StationProgress.tsx
│   │   │   ├── ToastContainer.css
│   │   │   ├── ToastContainer.tsx
│   │   │   ├── TrainVisualization.css
│   │   │   ├── TrainVisualization.tsx
│   │   │   └── common
│   │   │       └── LoadingSpinner.tsx
│   │   ├── hooks
│   │   │   └── useTrainState.ts
│   │   ├── index.css
│   │   ├── main.tsx
│   │   ├── pages
│   │   │   ├── AddPassengerPage.css
│   │   │   ├── AddPassengerPage.tsx
│   │   │   ├── AllocationDiagnosticsPage.css
│   │   │   ├── AllocationDiagnosticsPage.tsx
│   │   │   ├── CoachesPage.css
│   │   │   ├── CoachesPage.tsx
│   │   │   ├── ConfigPage.css
│   │   │   ├── ConfigPage.tsx
│   │   │   ├── HomePage.css
│   │   │   ├── HomePage.tsx
│   │   │   ├── LoginPage.css
│   │   │   ├── LoginPage.tsx
│   │   │   ├── PassengersPage-status.css
│   │   │   ├── PassengersPage.css
│   │   │   ├── PassengersPage.tsx
│   │   │   ├── PhaseOnePage.css
│   │   │   ├── PhaseOnePage.tsx
│   │   │   ├── RACQueuePage.css
│   │   │   ├── RACQueuePage.tsx
│   │   │   ├── ReallocationPage.css
│   │   │   ├── ReallocationPage.tsx
│   │   │   ├── VisualizationPage.css
│   │   │   └── VisualizationPage.tsx
│   │   ├── services
│   │   │   ├── api.ts
│   │   │   ├── apiWithErrorHandling.ts
│   │   │   ├── formValidation.ts
│   │   │   ├── pushNotificationService.ts
│   │   │   ├── toastNotification.ts
│   │   │   └── websocket.ts
│   │   ├── types
│   │   │   └── index.ts
│   │   └── vite-env.d.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
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
│   │   ├── App.tsx
│   │   ├── UserMenu.css
│   │   ├── api.ts
│   │   ├── assets
│   │   │   └── react.svg
│   │   ├── components
│   │   │   ├── BoardingPass.css
│   │   │   ├── BoardingPass.tsx
│   │   │   ├── JourneyTimeline.css
│   │   │   ├── JourneyTimeline.tsx
│   │   │   ├── NotificationBell.css
│   │   │   ├── NotificationBell.tsx
│   │   │   ├── NotificationSettings.tsx
│   │   │   └── OfferCard.tsx
│   │   ├── config
│   │   │   └── socketConfig.ts
│   │   ├── constants.ts
│   │   ├── hooks
│   │   │   ├── useOffers.ts
│   │   │   └── useSocket.ts
│   │   ├── index.css
│   │   ├── main.tsx
│   │   ├── pages
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── JourneyVisualizationPage.css
│   │   │   ├── JourneyVisualizationPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── PNRSearchPage.css
│   │   │   ├── PNRSearchPage.tsx
│   │   │   ├── UpgradeOffersPage.css
│   │   │   ├── UpgradeOffersPage.tsx
│   │   │   ├── ViewTicketPage.css
│   │   │   └── ViewTicketPage.tsx
│   │   ├── services
│   │   │   └── offerService.ts
│   │   ├── stores
│   │   ├── types
│   │   │   └── index.ts
│   │   ├── utils
│   │   │   ├── eligibility.ts
│   │   │   ├── formatters.ts
│   │   │   ├── helpers.ts
│   │   │   ├── idempotency.ts
│   │   │   ├── notifications.ts
│   │   │   └── pushManager.ts
│   │   └── vite-env.d.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
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
    │   ├── App.tsx
    │   ├── UserMenu.css
    │   ├── api.ts
    │   ├── assets
    │   │   └── react.svg
    │   ├── components
    │   │   ├── JourneyTimeline.css
    │   │   ├── JourneyTimeline.tsx
    │   │   ├── PassengerManagement.tsx
    │   │   └── TrainControls.tsx
    │   ├── hooks
    │   │   └── useTteSocket.ts
    │   ├── index.css
    │   ├── main.tsx
    │   ├── pages
    │   │   ├── ActionHistoryPage.css
    │   │   ├── ActionHistoryPage.tsx
    │   │   ├── BoardedPassengersPage.tsx
    │   │   ├── BoardingVerificationPage.tsx
    │   │   ├── DashboardPage.css
    │   │   ├── DashboardPage.tsx
    │   │   ├── LoginPage.tsx
    │   │   ├── OfflineUpgradesPage.css
    │   │   ├── OfflineUpgradesPage.tsx
    │   │   ├── PassengersPage.css
    │   │   ├── PassengersPage.tsx
    │   │   ├── PendingReallocationsPage.css
    │   │   ├── PendingReallocationsPage.tsx
    │   │   ├── UpgradeNotificationsPage.css
    │   │   ├── UpgradeNotificationsPage.tsx
    │   │   ├── VisualizationPage.css
    │   │   └── VisualizationPage.tsx
    │   ├── services
    │   │   └── pushNotificationService.ts
    │   ├── types
    │   │   └── index.ts
    │   ├── utils
    │   │   └── pushManager.ts
    │   └── vite-env.d.ts
    ├── tsconfig.json
    ├── tsconfig.node.json
    └── vite.config.js
```
