# 🔐 RAC Admin Portal

The **Admin Portal** for the RAC Reallocation System. Built with **Vite + React 19** and **Material-UI**.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Opens at: **http://localhost:3000**

---

## 📋 Features

| Feature | Description |
|---------|-------------|
| **Train Initialization** | Load train data from MongoDB with dynamic configuration |
| **Journey Control** | Start journey, advance stations, reset train state |
| **Dashboard** | Real-time statistics (passengers, RAC queue, vacant berths) |
| **Coach Visualization** | Interactive 9-coach × 72-berth layout with color coding |
| **Passenger Management** | Search, filter, view all 648+ passengers |
| **No-Show Handling** | Mark passengers as no-show with reason selection |
| **RAC Queue** | View prioritized waiting list (RAC 1 → RAC 2 → ...) |
| **Reallocation** | Eligibility matrix and manual allocation controls |
| **Segment Visualization** | Occupancy matrix by journey segment |
| **Station-Wise Phases** | Dynamic reallocation phase controls |
| **Station Matching** | Current station RAC-berth matching with TTE approval |
| **State Persistence** | **IndexedDB Integration** auto-restores session state on refresh |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Vite 6.4** | Build tool and dev server |
| **React 19** | UI framework |
| **Material-UI 7** | Component library |
| **Axios** | HTTP client with interceptors |
| **WebSocket** | Real-time updates |
| **React Router** | Navigation |

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── CoachVisualization/  # Coach layout rendering
│   │   ├── PassengerTable/      # Passenger data grid
│   │   └── StatsCards/          # Dashboard stat cards
│   ├── pages/              # 23 page components
│   │   ├── Dashboard.jsx
│   │   ├── CoachView.jsx
│   │   ├── PassengerSearch.jsx
│   │   ├── RACQueue.jsx
│   │   ├── SegmentMatrix.jsx
│   │   ├── StationMatching.jsx
│   │   └── ...
│   ├── services/           # API and WebSocket services
│   │   ├── api.js          # Axios instance with config
│   │   └── websocket.js    # WebSocket connection
│   ├── App.jsx             # Main router
│   └── main.jsx            # Entry point
├── public/                 # Static assets
├── vite.config.js          # Vite configuration (port 3000)
└── package.json
```

---

## 📖 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## 🔧 Configuration

Create `.env` file (optional - has defaults):

```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
```

---

## 📊 Pages Overview

| Page | Description |
|------|-------------|
| **Dashboard** | Train stats, journey progress, quick actions |
| **Coach View** | Visual 72-berth layout per coach |
| **All Passengers** | Full passenger list with filters |
| **Passenger Search** | Search by PNR, name, coach |
| **RAC Queue** | RAC passengers sorted by priority |
| **Vacant Berths** | Currently vacant berths |
| **Segment Matrix** | Occupancy by segment visualization |
| **Station Matching** | Current station RAC-berth matching |
| **Pending Approvals** | TTE approval queue |
| **Event Logs** | Station arrival/departure events |

---

## 🔄 Workflow

### Train Initialization Flow

1. **Select Train** → Choose from available trains in MongoDB
2. **Initialize** → Load stations, passengers, coaches
3. **Start Journey** → Begin from first station
4. **Navigate Stations** → Board passengers, process deboarding
5. **Handle No-Shows** → Mark and generate vacant berths
6. **Match RAC** → Send eligible reallocations to TTE

### 💾 State Persistence
The Admin Portal uses **IndexedDB** (`StateStore.ts`) to persist session state:
- **Saves:** `currentPage`, `journeyStarted`
- **Restores:** Automatically on page refresh
- **Syncs:** Verifies with backend on load to ensure Single Source of Truth
- **Expires:** Auto-clears after 24 hours

---

## 🎨 UI Components

| Component | Purpose |
|-----------|---------|
| `CoachVisualization` | Interactive berth layout with tooltips |
| `PassengerTable` | Data grid with sorting, filtering, pagination |
| `StatsCards` | Dashboard KPI cards |
| `StationProgress` | Journey progress indicator |
| `SegmentOccupancyMatrix` | Visual segment-based occupancy |

---

## 🔗 Related

- [Root Documentation](../README.md)
- [QUICKSTART.md](../QUICKSTART.md)
- [Backend API](../backend/README.md)
- [TTE Portal](../tte-portal/README.md)
- [Passenger Portal](../passenger-portal/README.md)

---

**Last Updated:** 2025-12-23
