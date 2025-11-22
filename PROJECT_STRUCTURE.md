# Project Structure

```
.
├── .gitattributes
├── .gitignore
├── PROJECT_STRUCTURE.md
├── README.md
├── backend
│   ├── .env
│   ├── config
│   │   ├── .env
│   │   ├── db.js
│   │   └── websocket.js
│   ├── controllers
│   │   ├── configController.js
│   │   ├── passengerController.js
│   │   ├── reallocationController.js
│   │   ├── trainController.js
│   │   ├── tteController.js
│   │   └── visualizationController.js
│   ├── middleware
│   │   └── validation.js
│   ├── models
│   │   ├── Berth.js
│   │   ├── SegmentMatrix.js
│   │   └── TrainState.js
│   ├── package-lock.json
│   ├── package.json
│   ├── routes
│   │   └── api.js
│   ├── server.js
│   ├── services
│   │   ├── DataService.js
│   │   ├── QueueService.js
│   │   ├── ReallocationService.js
│   │   ├── SegmentService.js
│   │   ├── StationEventService.js
│   │   ├── UpgradeNotificationService.js
│   │   ├── ValidationService.js
│   │   └── VisualizationService.js
│   └── utils
│       ├── berthAllocator.js
│       ├── constants.js
│       ├── helpers.js
│       └── stationOrder.js
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
│   └── src
│       ├── App.css
│       ├── App.jsx
│       ├── components
│       │   ├── PassengerList.css
│       │   ├── PassengerList.jsx
│       │   ├── RACQueue.css
│       │   ├── RACQueue.jsx
│       │   ├── StationProgress.css
│       │   ├── StationProgress.jsx
│       │   ├── TrainVisualization.css
│       │   └── TrainVisualization.jsx
│       ├── index.css
│       ├── index.js
│       ├── pages
│       │   ├── AddPassengerPage.css
│       │   ├── AddPassengerPage.jsx
│       │   ├── CoachesPage.css
│       │   ├── CoachesPage.jsx
│       │   ├── ConfigPage.css
│       │   ├── ConfigPage.jsx
│       │   ├── HomePage.css
│       │   ├── HomePage.jsx
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
│           └── websocket.js
├── generate_tree.py
├── passenger-portal
│   ├── .gitignore
│   ├── README.md
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── public
│   │   └── vite.svg
│   ├── src
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── assets
│   │   │   └── react.svg
│   │   ├── components
│   │   ├── index.css
│   │   ├── main.jsx
│   │   └── pages
│   │       ├── PNRCheckPage.jsx
│   │       └── UpgradeNotificationsPage.jsx
│   └── vite.config.js
├── structure.txt
└── tte-portal
    ├── .gitignore
    ├── README.md
    ├── eslint.config.js
    ├── index.html
    ├── package-lock.json
    ├── package.json
    ├── public
    │   └── vite.svg
    ├── src
    │   ├── App.css
    │   ├── App.jsx
    │   ├── api.js
    │   ├── assets
    │   │   └── react.svg
    │   ├── components
    │   │   ├── Dashboard.jsx
    │   │   ├── OfflineUpgradeVerification.jsx
    │   │   ├── PassengerManagement.jsx
    │   │   └── TrainControls.jsx
    │   ├── index.css
    │   └── main.jsx
    └── vite.config.js
```
