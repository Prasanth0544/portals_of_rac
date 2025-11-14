# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
# 🚂 RAC Reallocation System - Frontend

React-based frontend for the Dynamic RAC Reallocation System for Train 17225 (Amaravathi Express).

## 📋 Features

- **Multi-Page Architecture**: Separate pages for different functionalities
- **Journey Progress Tracking**: Visual station-by-station progress (3-per-row grid)
- **Real-Time Statistics**: Live passenger counts, RAC queue, vacant berths
- **RAC Queue Management**: View and manage RAC passengers by priority
- **Coach Visualization**: Interactive berth-level occupancy view
- **Passenger List**: Tabular format with filters (CNF, RAC, Boarded, No-Show)
- **Reallocation System**: Apply RAC-to-CNF upgrades with eligibility matrix
- **Segment Visualization**: Visual representation of segment-based occupancy
- **No-Show Handling**: Mark passengers as no-show with MongoDB sync

## 🛠️ Tech Stack

- **React 18.2.0**: UI framework
- **Axios**: HTTP client for API calls
- **CSS3**: Styling with responsive design

## 📁 Project Structure
```
frontend/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── pages/
│   │   ├── HomePage.jsx & .css
│   │   ├── RACQueuePage.jsx & .css
│   │   ├── CoachesPage.jsx & .css
│   │   ├── PassengersPage.jsx & .css (TABULAR FORMAT)
│   │   ├── ReallocationPage.jsx & .css
│   │   └── VisualizationPage.jsx & .css
│   ├── services/
│   │   └── api.js (All API calls)
│   ├── App.jsx (Main router)
│   ├── App.css
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Backend server running on http://localhost:5000

### Installation Steps

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure API endpoint (optional):**
Create `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. **Start development server:**
```bash
npm start
```

Frontend will open at: **http://localhost:3000**

## 📖 Page Guide

### 1. **Home Page**
- Journey progress with 3-per-row station grid
- Gray (not started) → Blue (current) → Green (completed)
- Statistics cards (clickable)
- Simulation controls (Start Journey, Next Station, Reset)
- No-Show marking with PNR input
- Quick action navigation buttons

### 2. **RAC Queue Page**
- Sorted list of RAC passengers (RAC 1, RAC 2, ...)
- Journey details (From → To)
- Age, Gender, Class, PNR
- Priority position

### 3. **Coaches Page**
- 9 Sleeper coaches (S1-S9)
- 72 berths per coach
- Color-coded: Green (vacant), Blue (occupied), Orange (shared)
- Click berth → Modal with passenger details
- Vacant berth count per coach

### 4. **Passengers Page** (TABULAR FORMAT)
- **Compact table** with all passenger details
- **Columns**: No., PNR, Name, Age, Gender, Status, Class, From, To, Berth, Boarded
- **Filters**: CNF, RAC→CNF, RAC, Boarded, No-Show, Upcoming, Missed
- **Search**: By PNR
- **Statistics cards**: Clickable filters
- **Row highlighting**: No-show rows highlighted in red

### 5. **Reallocation Page**
- RAC Queue list
- Vacant Berths list
- **Eligibility Matrix**: Shows which RAC passengers are eligible for vacant berths
- Apply reallocation button
- Success/failure feedback

### 6. **Visualization Page**
- Segment-based occupancy matrix
- Berth × Segment grid
- Color-coded cells (Blue = Occupied, Green = Vacant)
- "Show All" buttons for segments and berths
- Hover for details
- Explanation of segment logic

## 🎨 Design Features

### Compact & Professional Design
- **Reduced button sizes**: 8-12px padding
- **Compact table rows**: 8px vertical padding
- **Smaller fonts**: 11-14px for better density
- **Efficient spacing**: Minimal whitespace
- **Responsive grid**: 3-per-row stations (desktop), 2-per-row (tablet), 1-per-row (mobile)

### Color Scheme
- **Primary**: #667eea (Purple-blue gradient)
- **Success**: #4caf50 (Green)
- **Warning**: #ff9800 (Orange - RAC)
- **Danger**: #f44336 (Red - No-show)
- **Info**: #2196f3 (Blue - Occupied)

## 🔌 API Integration

All API calls are handled through `src/services/api.js`:
```javascript
// Train APIs
initializeTrain(trainNo, journeyDate)
startJourney()
getTrainState()
moveToNextStation()
resetTrain()
getTrainStats()

// Reallocation APIs
markPassengerNoShow(pnr)
getRACQueue()
getVacantBerths()
searchPassenger(pnr)
getEligibilityMatrix()
applyReallocation(allocations)

// Passenger APIs
getAllPassengers()
getPassengersByStatus(status)
getPassengerCounts()

// Visualization APIs
getSegmentMatrix()
getGraphData()
getHeatmap()
getBerthTimeline(coach, berth)
getVacancyMatrix()
```

## 📊 Key Functionality

### Journey Progress
- Visual representation of train's journey
- Station-wise color coding
- Current position indicator with pulse animation
- "Start Journey" button (appears only initially)

### Statistics Dashboard
- Total Passengers (clickable → Passengers Page)
- Confirmed (CNF)
- Currently Onboard
- RAC Queue (clickable → RAC Queue Page)
- Vacant Berths
- Total Deboarded

### No-Show Handling
1. Enter 10-digit PNR
2. Click "Mark No-Show"
3. Backend updates MongoDB (`no_show: true`)
4. Berth segments cleared
5. Statistics updated

### RAC Reallocation
1. View eligibility matrix
2. See vacant berths and eligible RAC passengers
3. Click "Apply Reallocation"
4. System allocates RAC to vacant berths
5. RAC status changes to CNF
6. Statistics updated

### Passenger Filtering (ALL WORKING)
- **All**: Show all passengers
- **CNF**: Confirmed passengers only
- **RAC→CNF**: RAC passengers upgraded to CNF
- **RAC**: Current RAC passengers
- **Boarded**: Passengers who have boarded
- **No-Show**: Passengers marked as no-show
- **Upcoming**: Passengers boarding at future stations
- **Missed**: Passengers who missed boarding

## 🐛 Troubleshooting

### Issue: API calls failing
**Solution**: Ensure backend is running on http://localhost:5000

### Issue: CORS errors
**Solution**: Backend already has CORS enabled in server.js

### Issue: Page not updating after action
**Solution**: Check browser console for errors. Most pages call `loadTrainState()` after actions.

### Issue: Filters not working
**Solution**: All filters are now fixed and working correctly. Clear browser cache if issues persist.

## 📱 Responsive Design

- **Desktop** (>768px): 3 stations per row, full table view
- **Tablet** (481-768px): 2 stations per row, scrollable table
- **Mobile** (<480px): 1 station per row, compact table

## 🔒 Data Source

- All passenger data comes from **your MongoDB database**
- Collections: `rac.17225` (stations), `rac.train_17225_passengers` (passengers)
- No AI-generated data - 100% real database data

## 🎯 Future Enhancements

- WebSocket for real-time updates
- Export passenger list to CSV/Excel
- Print boarding charts
- Mobile app (React Native)
- PWA support
- Dark mode

## 📄 License

This project is part of the RAC Reallocation System.

## 👨‍💻 Development

To modify the frontend:

1. Make changes in `src/` directory
2. React hot-reload will update automatically
3. Build for production: `npm run build`
4. Deploy `build/` folder to hosting service

## 🌐 Environment Variables

Optional `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

If not provided, defaults to `http://localhost:5000/api`

## ✅ All Features Working

- ✅ Journey progress (3-per-row, color-coded)
- ✅ Statistics dashboard
- ✅ Start journey button
- ✅ Next station processing
- ✅ Reset train
- ✅ Mark no-show (MongoDB update)
- ✅ RAC queue display
- ✅ Coach visualization
- ✅ **Passenger list (TABULAR FORMAT - COMPACT)**
- ✅ **All filters working** (CNF, RAC, RAC→CNF, Boarded, No-Show, Upcoming, Missed)
- ✅ PNR search
- ✅ Reallocation with eligibility matrix
- ✅ Segment visualization
- ✅ Multi-page navigation
- ✅ Responsive design

---

**Built with ❤️ for Indian Railways - Train 17225 Amaravathi Express**