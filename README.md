# RAC Reallocation System v3.0

## 🎯 Overview
A **fully dynamic** MERN stack application for managing Railway RAC (Reservation Against Cancellation) seat reallocation with real-time updates via WebSocket.

### ✨ New in v3.0: Dynamic Configuration
- 🎨 **Interactive Setup** - Configure databases and collections at startup
- 🔄 **Multi-Train Support** - Switch between different trains easily
- 📊 **Flexible Naming** - Use any database/collection naming convention
- ✅ **Validation** - Automatic validation of MongoDB connections
- 🚀 **Production Ready** - Environment variable support

---

## 🚀 Quick Start

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Start Backend (Interactive Configuration)

```bash
cd backend
npm start
```

Follow the interactive prompts to configure:
- MongoDB URI
- Database names (stations & passengers)
- Collection names
- Train number, name, and journey date

### 3. Start Frontend

```bash
cd frontend
npm start
```

Frontend opens at **http://localhost:3000**

---

## 🎨 Features

### **Core Functionality**
- ✅ Dynamic berth allocation (9 coaches × 72 berths)
- ✅ Segment-based occupancy tracking
- ✅ Automatic RAC passenger upgrades
- ✅ Real-time WebSocket updates
- ✅ No-show passenger handling
- ✅ Station-by-station journey simulation

### **User Interface**
- 🏠 **Dashboard** - Real-time statistics and controls
- 🚃 **Coaches View** - Visual berth layout with status
- 👥 **Passenger Management** - Search, filter, add passengers
- 🎯 **RAC Queue** - Waiting list with priority
- 🔄 **Reallocation** - Manual and automatic allocation
- 📊 **Visualizations** - Segment matrices and graphs

### **Dynamic Configuration**
- 🎨 Interactive setup wizard
- 📊 Any database/collection names
- 🔄 Multi-train support
- ✅ Connection validation
- 🚀 Environment variable support

---

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - Get started in 5 minutes
- **[DYNAMIC_CONFIGURATION_GUIDE.md](DYNAMIC_CONFIGURATION_GUIDE.md)** - Complete configuration guide
- **[PROJECT_STRUCTURE_ANALYSIS.md](PROJECT_STRUCTURE_ANALYSIS.md)** - Architecture and code structure
- **[TRAIN_CONFIGURATION.md](TRAIN_CONFIGURATION.md)** - Data structure requirements
- **[IMPROVEMENTS.md](IMPROVEMENTS.md)** - Recent changes and fixes

---

## 🗄️ Database Structure

### **Stations Collection**
```json
{
  "SNO": 1,
  "Station_Code": "NS",
  "Station_Name": "Narasapur",
  "Arrival_Time": "00:00",
  "Departure_Time": "18:00",
  "Distance": 0,
  "Day": 1,
  "Halt_Duration": 0,
  "Railway_Zone": "SCR",
  "Division": "BZA",
  "Platform_Number": "-",
  "Remarks": "-"
}
```

### **Passengers Collection**
```json
{
  "pnr": "1234567890",
  "name": "John Doe",
  "age": 30,
  "gender": "M",
  "from": "NS",
  "to": "HBD",
  "class": "SL",
  "pnr_status": "CNF",
  "coach": "S1",
  "seat_no": 15,
  "train_no": "17225",
  "train_name": "Amaravathi Express",
  "journey_date": "2025-11-15",
  "quota": "GN",
  "no_show": false
}
```

---

## 🔧 Technology Stack

### **Backend**
- Node.js + Express.js
- MongoDB (with dynamic collections)
- WebSocket (ws library)
- RESTful API

### **Frontend**
- React 18
- Axios (HTTP client)
- WebSocket client
- CSS3 (responsive design)

---

## 🌐 API Endpoints

### **Train Management**
- `POST /api/train/initialize` - Initialize train with data
- `POST /api/train/start-journey` - Start journey
- `GET /api/train/state` - Get complete train state
- `POST /api/train/next-station` - Move to next station
- `POST /api/train/reset` - Reset train

### **Passenger Management**
- `POST /api/passenger/add` - Add new passenger
- `POST /api/passenger/no-show` - Mark as no-show
- `GET /api/passenger/search/:pnr` - Search by PNR
- `GET /api/passengers/all` - Get all passengers

### **Reallocation**
- `GET /api/reallocation/eligibility` - Get eligible RAC passengers
- `POST /api/reallocation/apply` - Apply reallocation
- `GET /api/train/rac-queue` - Get RAC queue
- `GET /api/train/vacant-berths` - Get vacant berths

### **Visualization**
- `GET /api/visualization/segment-matrix` - Occupancy matrix
- `GET /api/visualization/heatmap` - Occupancy heatmap
- `GET /api/visualization/berth-timeline/:coach/:berth` - Berth history

---

## 🔄 WebSocket Events

- `TRAIN_UPDATE` - Train state changes
- `STATION_ARRIVAL` - Train arrives at station
- `RAC_REALLOCATION` - RAC passengers upgraded
- `NO_SHOW` - Passenger marked as no-show
- `STATS_UPDATE` - Statistics updated

---

## 🎯 System Requirements

- **Node.js:** v14.0.0 or higher
- **MongoDB:** v4.0 or higher
- **RAM:** 2GB minimum
- **Browser:** Modern browser with WebSocket support

---

## 📝 Environment Variables (Optional)

Create `.env` file in backend folder:

```env
MONGODB_URI=mongodb://localhost:27017
STATIONS_DB=rac
PASSENGERS_DB=rac
STATIONS_COLLECTION=17225
PASSENGERS_COLLECTION=train_17225_passengers
DEFAULT_TRAIN_NO=17225
PORT=5000
```

---

## 🐛 Troubleshooting

### **Backend Issues**
- Ensure MongoDB is running
- Check database/collection names are correct
- Verify Node.js version

### **Frontend Issues**
- Ensure backend is running on port 5000
- Clear browser cache
- Check WebSocket connection

### **Data Issues**
- Verify train number matches MongoDB data
- Check journey date format (YYYY-MM-DD)
- Ensure station codes match in both collections

---

## 📊 Project Statistics

- **Backend Files:** 25+ files
- **Frontend Files:** 16+ files
- **Total Berths:** 648 (9 coaches × 72 berths)
- **Real-time Updates:** WebSocket
- **API Endpoints:** 20+
- **Version:** 3.0.0

---

## 🎓 Key Algorithms

### **Segment-based Occupancy**
Tracks berth availability for each journey segment, enabling accurate reallocation.

### **RAC Reallocation**
Automatically upgrades RAC passengers when berths become vacant due to deboarding or no-shows.

### **No-Show Detection**
Identifies passengers who didn't board at their origin station and frees their berths.

---

## 🚀 Production Deployment

1. Set environment variables
2. Build frontend: `npm run build`
3. Use process manager (PM2) for backend
4. Configure reverse proxy (Nginx)
5. Enable HTTPS
6. Set up MongoDB replica set

---

## 📄 License

ISC

---

## 👥 Contributing

Contributions welcome! Please read the documentation before submitting PRs.

---

## 🎉 Status

**✅ PRODUCTION READY** - Fully dynamic configuration system with comprehensive validation and error handling.

---

**Version:** 3.0.0  
**Last Updated:** November 9, 2025  
**Architecture:** MERN Stack with Dynamic Configuration
