# Project Structure


├── .dockerignore
├── .gitattributes
├── .github
│   └── workflows
│       ├── cd.yml
│       └── ci.yml
├── .gitignore
├── DEPLOYMENT.md
├── MERN_STACK_COMPLETE_LEARNING_GUIDE.md
├── PROJECT_STRUCTURE.md
├── QUICKSTART.md
├── README.md
├── SECURITY_TODO.md
├── WEBSOCKET_ROOMS_PLAN.md
├── backend
│   ├── .dockerignore
│   ├── .env
│   ├── .env.example
│   ├── Dockerfile
│   ├── __tests__
│   │   ├── controllers
│   │   │   ├── passengerController.test.js
│   │   │   └── tteController.test.js
│   │   ├── integration
│   │   │   ├── auth.test.js
│   │   │   └── reallocation-flow.test.js
│   │   ├── services
│   │   │   ├── OTPService.test.js
│   │   │   ├── ValidationService.test.js
│   │   │   └── reallocation
│   │   │       ├── RACQueueService.test.js
│   │   │       └── VacancyService.test.js
│   │   ├── setup.js
│   │   ├── smoke
│   │   │   ├── admin-portal.spec.js
│   │   │   ├── passenger-portal.spec.js
│   │   │   └── tte-portal.spec.js
│   │   └── utils
│   │       └── helpers.test.js
│   ├── config
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
│   ├── jest.config.js
│   ├── middleware
│   │   ├── auth.js
│   │   ├── csrf.js
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
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
│   │   ├── createIndexes.js
│   │   ├── createTestAccounts.js
│   │   └── resetAdmin.js
│   ├── server.js
│   ├── services
│   │   ├── CacheService.js
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
│   │   ├── RefreshTokenService.js
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
│   ├── tsconfig.json
│   ├── types
│   │   ├── global.d.ts
│   │   └── index.ts
│   ├── utils
│   │   ├── berthAllocator.js
│   │   ├── constants.js
│   │   ├── create-indexes.js
│   │   ├── envValidator.js
│   │   ├── error-handler.js
│   │   ├── helpers.js
│   │   ├── logger.js
│   │   ├── queryUtils.js
│   │   └── stationOrder.js
│   └── validation
│       └── schemas.ts
├── docker-compose.prod.yml
├── docker-compose.yml
├── dot_md_files
│   ├── ARCHITECTURE.md
│   ├── ELIGIBILITY_MATRIX_COMPLETE.md
│   ├── FUTURE_IMPROVEMENTS.md
│   └── REFACTORING_ROADMAP.md
├── frontend
│   ├── .dockerignore
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── Dockerfile
│   ├── README.md
│   ├── index.html
│   ├── nginx.conf
│   ├── package-lock.json
│   ├── package.json
│   ├── public
│   │   ├── favicon.ico
│   │   ├── manifest.json
│   │   ├── robots.txt
│   │   └── sw.js
│   ├── src
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── UserMenu.css
│   │   ├── components
│   │   │   ├── APIDocumentationLink.tsx
│   │   │   ├── FormInput.tsx
│   │   │   ├── PassengerList.tsx
│   │   │   ├── RACQueue.tsx
│   │   │   ├── StationProgress.tsx
│   │   │   ├── ToastContainer.tsx
│   │   │   ├── TrainVisualization.tsx
│   │   │   └── common
│   │   │       └── LoadingSpinner.tsx
│   │   ├── hooks
│   │   │   └── useTrainState.ts
│   │   ├── index.css
│   │   ├── main.tsx
│   │   ├── pages
│   │   │   ├── AddPassengerPage.tsx
│   │   │   ├── AllocationDiagnosticsPage.tsx
│   │   │   ├── CoachesPage.tsx
│   │   │   ├── ConfigPage.tsx
│   │   │   ├── HomePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── PassengersPage.tsx
│   │   │   ├── PhaseOnePage.tsx
│   │   │   ├── RACQueuePage.tsx
│   │   │   ├── ReallocationPage.tsx
│   │   │   └── VisualizationPage.tsx
│   │   ├── services
│   │   │   ├── api.ts
│   │   │   ├── apiWithErrorHandling.ts
│   │   │   ├── formValidation.ts
│   │   │   ├── pushNotificationService.ts
│   │   │   ├── toastNotification.ts
│   │   │   └── websocket.ts
│   │   ├── styles
│   │   │   ├── components
│   │   │   │   ├── APIDocumentationLink.css
│   │   │   │   ├── FormInput.css
│   │   │   │   ├── PassengerList.css
│   │   │   │   ├── RACQueue.css
│   │   │   │   ├── StationProgress.css
│   │   │   │   ├── ToastContainer.css
│   │   │   │   └── TrainVisualization.css
│   │   │   └── pages
│   │   │       ├── AddPassengerPage.css
│   │   │       ├── AllocationDiagnosticsPage.css
│   │   │       ├── CoachesPage.css
│   │   │       ├── ConfigPage.css
│   │   │       ├── HomePage.css
│   │   │       ├── LoginPage.css
│   │   │       ├── PassengersPage-status.css
│   │   │       ├── PassengersPage.css
│   │   │       ├── PhaseOnePage.css
│   │   │       ├── RACQueuePage.css
│   │   │       ├── ReallocationPage.css
│   │   │       └── VisualizationPage.css
│   │   ├── types
│   │   │   └── index.ts
│   │   └── vite-env.d.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.js
├── generate_tree.py
├── k8s
│   ├── backend
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   ├── secrets.yaml
│   │   └── service.yaml
│   ├── frontend
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── ingress.yaml
│   └── namespace.yaml
├── package-lock.json
├── package.json
├── passenger-portal
│   ├── .dockerignore
│   ├── .env.example
│   ├── .gitignore
│   ├── Dockerfile
│   ├── README.md
│   ├── eslint.config.js
│   ├── index.html
│   ├── nginx.conf
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
│   │   │   ├── BoardingPass.tsx
│   │   │   ├── JourneyTimeline.tsx
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
│   │   │   ├── JourneyVisualizationPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── PNRSearchPage.tsx
│   │   │   ├── UpgradeOffersPage.tsx
│   │   │   └── ViewTicketPage.tsx
│   │   ├── services
│   │   │   └── offerService.ts
│   │   ├── stores
│   │   ├── styles
│   │   │   ├── components
│   │   │   │   ├── BoardingPass.css
│   │   │   │   ├── JourneyTimeline.css
│   │   │   │   └── NotificationBell.css
│   │   │   └── pages
│   │   │       ├── JourneyVisualizationPage.css
│   │   │       ├── LoginPage.css
│   │   │       ├── PNRSearchPage.css
│   │   │       ├── UpgradeOffersPage.css
│   │   │       └── ViewTicketPage.css
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
└── tte-portal
    ├── .dockerignore
    ├── .env.example
    ├── .gitignore
    ├── Dockerfile
    ├── README.md
    ├── eslint.config.js
    ├── index.html
    ├── nginx.conf
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
    │   │   ├── JourneyTimeline.tsx
    │   │   ├── PassengerManagement.tsx
    │   │   └── TrainControls.tsx
    │   ├── hooks
    │   │   └── useTteSocket.ts
    │   ├── index.css
    │   ├── main.tsx
    │   ├── pages
    │   │   ├── BoardedPassengersPage.tsx
    │   │   ├── BoardingVerificationPage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   ├── LoginPage.tsx
    │   │   ├── OfflineUpgradesPage.tsx
    │   │   ├── PassengersPage.tsx
    │   │   ├── PendingReallocationsPage.tsx
    │   │   ├── UpgradeNotificationsPage.tsx
    │   │   └── VisualizationPage.tsx
    │   ├── services
    │   │   └── pushNotificationService.ts
    │   ├── styles
    │   │   ├── components
    │   │   │   └── JourneyTimeline.css
    │   │   └── pages
    │   │       ├── DashboardPage.css
    │   │       ├── LoginPage.css
    │   │       ├── OfflineUpgradesPage.css
    │   │       ├── PassengersPage.css
    │   │       ├── PendingReallocationsPage.css
    │   │       ├── UpgradeNotificationsPage.css
    │   │       └── VisualizationPage.css
    │   ├── types
    │   │   └── index.ts
    │   ├── utils
    │   │   └── pushManager.ts
    │   └── vite-env.d.ts
    ├── tsconfig.json
    ├── tsconfig.node.json
    └── vite.config.js

