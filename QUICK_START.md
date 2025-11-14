# Quick Start Guide - RAC Reallocation System v3.0

## 🚀 Getting Started in 5 Minutes

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running on localhost:27017 or remote server)
- Your train data in MongoDB collections

---

## Step 1: Install Dependencies

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

---

## Step 2: Prepare Your Data

Ensure you have two MongoDB collections:

### **Stations Collection**
Example document structure:
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
Example document structure:
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

## Step 3: Start the Backend

```bash
cd backend
npm start
```

You'll see an interactive configuration wizard:

```
╔════════════════════════════════════════════════════════════╗
║       🚂 RAC REALLOCATION SYSTEM - CONFIGURATION 🚂       ║
╚════════════════════════════════════════════════════════════╝
```

### Answer the Prompts:

1. **MongoDB URI**: Press Enter for `mongodb://localhost:27017` or enter your URI
2. **Stations Database**: Enter your database name (e.g., `rac`)
3. **Stations Collection**: Enter your collection name (e.g., `17225`)
4. **Passengers Database**: Same as stations or different
5. **Passengers Collection**: Enter collection name (e.g., `train_17225_passengers`)
6. **Train Number**: Enter train number (e.g., `17225`)
7. **Train Name**: Enter train name (e.g., `Amaravathi Express`)
8. **Journey Date**: Enter date in YYYY-MM-DD format (e.g., `2025-11-15`)

### Confirm Configuration:
```
Is this configuration correct? (yes/no): yes
```

The server will start on **http://localhost:5000**

---

## Step 4: Start the Frontend

Open a new terminal:

```bash
cd frontend
npm start
```

The frontend will open at **http://localhost:3000**

---

## Step 5: Use the System

### **Home Page**
- View train statistics
- Start journey
- Move to next station
- Mark passengers as no-show

### **Available Pages**
- 🏠 **Home** - Dashboard and controls
- 🚃 **Coaches** - Visual berth layout
- 👥 **Passengers** - All passenger list
- 🎯 **RAC Queue** - Waiting list
- ➕ **Add Passenger** - Add new bookings
- 🔄 **Reallocation** - Manual RAC allocation
- 📊 **Visualization** - Segment matrices and graphs

---

## 🎯 Example Configuration

### **Scenario 1: Default Setup**
```
Stations Database: rac
Stations Collection: 17225
Passengers Database: rac
Passengers Collection: train_17225_passengers
Train Number: 17225
Train Name: Amaravathi Express
Journey Date: 2025-11-15
```

### **Scenario 2: Custom Names**
```
Stations Database: railway_db
Stations Collection: route_data_17225
Passengers Database: booking_db
Passengers Collection: passengers_17225_nov
Train Number: 17225
Train Name: Amaravathi Express
Journey Date: 2025-11-15
```

### **Scenario 3: Different Train**
```
Stations Database: rac
Stations Collection: 12345
Passengers Database: rac
Passengers Collection: train_12345_passengers
Train Number: 12345
Train Name: Rajdhani Express
Journey Date: 2025-12-01
```

---

## 🔧 Environment Variables (Optional)

Instead of interactive prompts, create a `.env` file in the backend folder:

```env
MONGODB_URI=mongodb://localhost:27017
STATIONS_DB=rac
PASSENGERS_DB=rac
STATIONS_COLLECTION=17225
PASSENGERS_COLLECTION=train_17225_passengers
DEFAULT_TRAIN_NO=17225
PORT=5000
```

Then run:
```bash
npm start
```

The system will use these values automatically.

---

## 📝 Common Commands

### **Backend**
```bash
npm start          # Start with interactive config
npm run dev        # Start with nodemon (auto-restart)
npm run server     # Start server directly (requires config)
```

### **Frontend**
```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
```

---

## 🐛 Troubleshooting

### **Backend won't start**
- Check MongoDB is running: `mongosh`
- Verify database/collection names exist
- Check Node.js version: `node --version` (should be v14+)

### **Frontend can't connect**
- Ensure backend is running on port 5000
- Check CORS is enabled in backend
- Verify WebSocket connection

### **No data showing**
- Verify train number matches data in MongoDB
- Check journey date matches passenger records
- Ensure station codes in passengers match stations collection

### **Configuration errors**
- Restart and re-enter configuration
- Check spelling of database/collection names
- Verify MongoDB connection string

---

## 📚 Next Steps

1. ✅ Read `DYNAMIC_CONFIGURATION_GUIDE.md` for detailed configuration options
2. ✅ Check `PROJECT_STRUCTURE_ANALYSIS.md` to understand the architecture
3. ✅ Review `TRAIN_CONFIGURATION.md` for data structure requirements
4. ✅ See `IMPROVEMENTS.md` for recent changes and fixes

---

## 🎉 You're Ready!

Your RAC Reallocation System is now running with dynamic configuration!

- **Backend:** http://localhost:5000
- **Frontend:** http://localhost:3000
- **WebSocket:** ws://localhost:5000

Start your journey and watch the real-time RAC reallocation in action! 🚂✨
