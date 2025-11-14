# Train Configuration Guide

## How to Change Train Data (Different Train Number & Route)

The RAC Reallocation System is now **fully dynamic** and can handle any train data. Follow these steps to configure a different train:

---

## 📋 Prerequisites

You need to prepare two MongoDB collections:

### 1. **Stations Collection** (in `rac` database)
- **Collection Name**: `{train_number}` (e.g., `17226`, `12345`)
- **Structure**:
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

### 2. **Passengers Collection** (in `rac` database)
- **Collection Name**: `train_{train_number}_passengers` (e.g., `train_17226_passengers`)
- **Structure**:
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
  "train_no": "17226",
  "train_name": "Your Train Name",
  "journey_date": "2025-11-15",
  "quota": "GN",
  "no_show": false
}
```

---

## 🔧 Configuration Steps

### Step 1: Prepare MongoDB Collections

1. Create a new collection in `rac` database with your train number (e.g., `17226`)
2. Import station data with proper structure (SNO, Station_Code, Station_Name, etc.)
3. Create passenger collection: `train_{train_number}_passengers`
4. Import passenger data

### Step 2: Update Environment Variables (Optional)

Edit `.env` file in the backend folder:

```env
# Default train to load on server start
DEFAULT_TRAIN_NO=17226

# MongoDB URIs (if different)
MONGODB_STATIONS_URI=mongodb://localhost:27017/rac
MONGODB_PASSENGERS_URI=mongodb://localhost:27017/rac
```

### Step 3: Initialize Train via API

When starting the frontend, the system will call the initialize API. You can also manually initialize:

```bash
POST http://localhost:5000/api/train/initialize
Content-Type: application/json

{
  "trainNo": "17226",
  "journeyDate": "2025-11-15"
}
```

---

## 🎯 How the System Works Dynamically

### Backend Components

1. **db.js** - Dynamically switches collections based on train number
   - `db.connect(trainNo)` - Initial connection
   - `db.switchTrain(trainNo)` - Switch to different train

2. **TrainState.js** - Accepts train number and name in constructor
   ```javascript
   new TrainState(trainNo, trainName)
   ```

3. **DataService.js** - Loads data dynamically
   - Switches database collections
   - Fetches train name from database or mapping
   - Loads stations and passengers for specified train

4. **trainController.js** - Handles train initialization
   - Accepts `trainNo` and `journeyDate` in request body
   - Defaults to "17225" if not provided

### Frontend Components

All frontend components receive train data via props:
- `trainData.trainNo` - Current train number
- `trainData.trainName` - Current train name
- `trainData.stations` - Station list for this train
- `trainData.journeyDate` - Journey date

Components automatically adapt to any train data structure.

---

## 📝 Example: Adding Train 17226

### 1. MongoDB Setup

```javascript
// In MongoDB Compass or mongosh

// Create stations collection
use rac
db.createCollection("17226")

// Insert stations
db["17226"].insertMany([
  {
    "SNO": 1,
    "Station_Code": "HBD",
    "Station_Name": "Hubballi Junction",
    "Arrival_Time": "00:00",
    "Departure_Time": "20:00",
    "Distance": 0,
    "Day": 1,
    "Halt_Duration": 0,
    "Railway_Zone": "SWR",
    "Division": "HBD",
    "Platform_Number": "1",
    "Remarks": "Junction"
  },
  {
    "SNO": 2,
    "Station_Code": "UBL",
    "Station_Name": "Hubli",
    "Arrival_Time": "20:15",
    "Departure_Time": "20:20",
    "Distance": 8,
    "Day": 1,
    "Halt_Duration": 5,
    "Railway_Zone": "SWR",
    "Division": "HBD",
    "Platform_Number": "2",
    "Remarks": "-"
  }
  // ... more stations
])

// Create passengers collection
db.createCollection("train_17226_passengers")

// Insert passengers
db.train_17226_passengers.insertMany([
  {
    "pnr": "9876543210",
    "name": "Jane Smith",
    "age": 28,
    "gender": "F",
    "from": "HBD",
    "to": "UBL",
    "class": "SL",
    "pnr_status": "CNF",
    "coach": "S1",
    "seat_no": 10,
    "train_no": "17226",
    "train_name": "Amaravathi Express",
    "journey_date": "2025-11-15",
    "quota": "GN",
    "no_show": false
  }
  // ... more passengers
])
```

### 2. Update Train Name Mapping (Optional)

Edit `backend/services/DataService.js`:

```javascript
async getTrainName(trainNo) {
  const trainNames = {
    '17225': 'Amaravathi Express',
    '17226': 'Amaravathi Express (Return)',
    '12345': 'Your New Train Name',
    // Add more mappings
  };
  // ...
}
```

### 3. Initialize in Frontend

The system will automatically use the train number from the API response. No frontend changes needed!

---

## 🔄 Switching Between Trains

### Method 1: Restart Backend with Different Default

```env
DEFAULT_TRAIN_NO=17226
```

Then restart: `npm start`

### Method 2: Initialize Different Train via API

```bash
POST /api/train/initialize
{
  "trainNo": "17226",
  "journeyDate": "2025-11-16"
}
```

### Method 3: Reset and Reinitialize

1. Click "Reset Train" in frontend
2. System will reinitialize with current train
3. Or modify the initialization call to use different train number

---

## ✅ Verification Checklist

- [ ] MongoDB collections created with correct names
- [ ] Station data imported with proper structure (SNo, Code, Stn_Name, etc.)
- [ ] Passenger data imported with correct train_no and journey_date
- [ ] Backend server started successfully
- [ ] Frontend can initialize train
- [ ] Train name displays correctly
- [ ] Stations list loads properly
- [ ] Passengers allocated to berths
- [ ] RAC queue populated correctly

---

## 🐛 Troubleshooting

### Issue: "No stations found"
- Check collection name matches train number exactly
- Verify stations have SNO field starting from 1

### Issue: "No passengers found"
- Check collection name: `train_{trainNo}_passengers`
- Verify train_no and journey_date match in passenger documents

### Issue: "Failed to allocate passengers"
- Ensure station codes in passenger data match station collection
- Check coach and seat_no are valid (S1-S9, seats 1-72)

### Issue: Train name shows as "Train 12345"
- Add train name mapping in DataService.js
- Or add Train_Name field in station documents

---

## 📊 Database Structure Reference

### Stations Collection Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| SNO | Number | Yes | Station sequence number (1, 2, 3...) |
| Station_Code | String | Yes | Station code (e.g., "NS", "HBD") |
| Station_Name | String | Yes | Full station name |
| Arrival_Time | String | Yes | Arrival time (HH:MM format) |
| Departure_Time | String | Yes | Departure time (HH:MM format) |
| Distance | Number | Yes | Distance from origin (km) |
| Day | Number | Yes | Day of journey (1, 2, 3...) |
| Halt_Duration | Number | Yes | Halt duration (minutes) |
| Railway_Zone | String | Yes | Railway zone (e.g., "SCR", "WR") |
| Division | String | Yes | Railway division (e.g., "BZA", "RTM") |
| Platform_Number | String | No | Platform number (e.g., "1", "2", "-") |
| Remarks | String | No | Additional remarks (e.g., "-", "Junction") |

### Passengers Collection Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| pnr | String | Yes | 10-digit PNR number |
| name | String | Yes | Passenger name |
| age | Number | Yes | Passenger age |
| gender | String | Yes | M/F/T |
| from | String | Yes | Boarding station code |
| to | String | Yes | Destination station code |
| class | String | Yes | SL/2A/3A/etc. |
| pnr_status | String | Yes | CNF/RAC 1/WL 10/etc. |
| coach | String | Yes | Coach number (S1-S9) |
| seat_no | Number | Yes | Seat number (1-72) |
| train_no | String | Yes | Train number |
| train_name | String | Yes | Train name |
| journey_date | String | Yes | YYYY-MM-DD format |
| quota | String | No | GN/TQ/PT/etc. |
| no_show | Boolean | No | Default: false |

---

## 🎉 Summary

The system is now **100% dynamic** and can handle:
- ✅ Any train number
- ✅ Any route/stations
- ✅ Any number of passengers
- ✅ Different journey dates
- ✅ Multiple trains in same database

Just prepare your MongoDB collections and initialize!
