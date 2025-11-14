# Dynamic Configuration Guide - RAC Reallocation System v3.0

## 🎯 Overview

The RAC Reallocation System now features a **fully dynamic configuration system** that allows you to specify database names, collection names, train details, and journey information at runtime through an interactive command-line interface.

---

## 🚀 Quick Start

### Step 1: Start the Backend

```bash
cd backend
npm start
```

### Step 2: Interactive Configuration

The system will prompt you for the following information:

#### **Database Configuration**

1. **MongoDB URI** (optional - press Enter for default)
   - Default: `mongodb://localhost:27017`
   - Example: `mongodb://localhost:27017` or `mongodb://user:pass@host:port`

2. **Stations Database Name**
   - Example: `rac`, `railway_db`, `train_data`
   - The system will validate the database exists

3. **Stations Collection Name**
   - Example: `17225`, `train_stations`, `route_data`
   - The system will check if collection exists or offer to create it

4. **Passengers Database Name**
   - You can use the same database as stations or a different one
   - Example: `rac`, `passenger_db`

5. **Passengers Collection Name**
   - Example: `train_17225_passengers`, `passengers`, `bookings`

#### **Train Configuration**

6. **Train Number**
   - Example: `17225`, `12345`, `22222`

7. **Train Name**
   - Example: `Amaravathi Express`, `Rajdhani Express`, `Shatabdi Express`

8. **Journey Date**
   - Format: `YYYY-MM-DD`
   - Example: `2025-11-15`, `2025-12-01`

---

## 📊 Configuration Example

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║       🚂 RAC REALLOCATION SYSTEM - CONFIGURATION 🚂       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

Welcome! Let's configure your RAC Reallocation System.

═══════════════════════════════════════════════════════════════
  STEP 1: DATABASE CONFIGURATION
═══════════════════════════════════════════════════════════════

MongoDB URI (press Enter for default: mongodb://localhost:27017): 
✅ Using MongoDB URI: mongodb://localhost:27017

───────────────────────────────────────────────────────────────
  Stations Database Configuration
───────────────────────────────────────────────────────────────
Enter Stations Database Name (e.g., "rac"): rac
✅ Stations Database: rac

Enter Stations Collection Name (e.g., "17225"): 17225
✅ Stations Collection: 17225

───────────────────────────────────────────────────────────────
  Passengers Database Configuration
───────────────────────────────────────────────────────────────
Use same database for passengers? (yes/no): yes
✅ Passengers Database: rac (same as stations)

Enter Passengers Collection Name (e.g., "train_17225_passengers"): train_17225_passengers
✅ Passengers Collection: train_17225_passengers

═══════════════════════════════════════════════════════════════
  STEP 2: TRAIN CONFIGURATION
═══════════════════════════════════════════════════════════════

Enter Train Number (e.g., "17225"): 17225
✅ Train Number: 17225

Enter Train Name (e.g., "Amaravathi Express"): Amaravathi Express
✅ Train Name: Amaravathi Express

Enter Journey Date (YYYY-MM-DD, e.g., "2025-11-15"): 2025-11-15
✅ Journey Date: 2025-11-15

═══════════════════════════════════════════════════════════════
  CONFIGURATION SUMMARY
═══════════════════════════════════════════════════════════════

📡 MongoDB URI: mongodb://localhost:27017

📊 Stations:
   Database: rac
   Collection: 17225

👥 Passengers:
   Database: rac
   Collection: train_17225_passengers

🚂 Train:
   Number: 17225
   Name: Amaravathi Express
   Date: 2025-11-15

═══════════════════════════════════════════════════════════════

Is this configuration correct? (yes/no): yes

✅ Configuration complete!
🚀 Starting server...
```

---

## 🔧 How It Works

### 1. **Entry Point: index.js**

The new `index.js` file is the main entry point that:
- Prompts for configuration
- Validates database connections
- Checks collection existence
- Stores configuration in `global.RAC_CONFIG`
- Starts the server with the configuration

### 2. **Dynamic Database Connection: db.js**

The updated `db.js` now:
- Accepts configuration from `global.RAC_CONFIG`
- Connects to any database/collection combination
- Supports switching between different trains
- Provides configuration getter methods

### 3. **Flexible Data Loading: DataService.js**

The `DataService.js` now:
- Uses global configuration for collection names
- Falls back to defaults if config not available
- Supports any collection naming convention

### 4. **Configuration-Aware Controllers**

All controllers now:
- Read from `global.RAC_CONFIG`
- Use configured train details
- Support dynamic initialization

---

## 📁 Database Structure Flexibility

### **Option 1: Single Database, Multiple Collections**
```
Database: rac
├── Collection: 17225 (stations)
├── Collection: train_17225_passengers
├── Collection: 17226 (stations)
└── Collection: train_17226_passengers
```

### **Option 2: Separate Databases**
```
Database: stations_db
└── Collection: 17225

Database: passengers_db
└── Collection: train_17225_passengers
```

### **Option 3: Custom Naming**
```
Database: railway_data
├── Collection: route_17225
└── Collection: bookings_17225
```

---

## 🎨 Frontend Integration

The frontend automatically receives the train configuration from the backend API. No changes needed in frontend code!

When the frontend calls `/api/train/initialize`, it receives:
```json
{
  "success": true,
  "data": {
    "trainNo": "17225",
    "trainName": "Amaravathi Express",
    "journeyDate": "2025-11-15",
    "totalStations": 25,
    "totalPassengers": 1395,
    ...
  }
}
```

---

## 🔄 Switching Trains

### **Method 1: Restart with New Configuration**
1. Stop the server (Ctrl+C)
2. Run `npm start` again
3. Enter new configuration

### **Method 2: Use Environment Variables**
Create a `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017
STATIONS_DB=rac
PASSENGERS_DB=rac
STATIONS_COLLECTION=17226
PASSENGERS_COLLECTION=train_17226_passengers
DEFAULT_TRAIN_NO=17226
```

Then skip the interactive prompts by setting these variables.

---

## 🛠️ Advanced Configuration

### **Using Different MongoDB Instances**

You can connect stations and passengers to different MongoDB instances:

```
MongoDB URI: mongodb://server1:27017
Stations Database: rac_stations
Stations Collection: 17225

MongoDB URI: mongodb://server2:27017
Passengers Database: rac_passengers
Passengers Collection: bookings_17225
```

### **Custom Collection Naming Conventions**

The system supports any naming convention:
- `17225` (train number only)
- `train_17225_stations`
- `route_amaravathi_express`
- `stations_2025_11_15`
- Any custom name you prefer!

---

## ✅ Validation Features

The system validates:
- ✅ MongoDB connection is successful
- ✅ Database exists or can be created
- ✅ Collection exists (offers to create if missing)
- ✅ Train number is not empty
- ✅ Train name is not empty
- ✅ Journey date is in correct format (YYYY-MM-DD)

---

## 🚨 Error Handling

### **Database Connection Failed**
```
❌ Error connecting to database "rac": MongoServerError: ...
Try again? (yes/no):
```

### **Collection Not Found**
```
⚠️  Warning: Collection "17225" not found in database "rac"
Do you want to create it? (yes/no):
```

### **Invalid Date Format**
```
❌ Invalid date format! Use YYYY-MM-DD
Enter Journey Date (YYYY-MM-DD, e.g., "2025-11-15"):
```

---

## 📝 Configuration Storage

The configuration is stored in:
1. **Runtime:** `global.RAC_CONFIG` object
2. **Database Connection:** `db.config` object
3. **Available via API:** `db.getConfig()` method

---

## 🎯 Benefits of Dynamic Configuration

1. ✅ **No Code Changes** - Configure without editing code
2. ✅ **Multi-Train Support** - Easily switch between trains
3. ✅ **Flexible Naming** - Use any database/collection names
4. ✅ **Validation** - Ensures configuration is correct before starting
5. ✅ **User-Friendly** - Interactive prompts guide you through setup
6. ✅ **Production Ready** - Supports environment variables for automation

---

## 🔐 Security Considerations

### **MongoDB Authentication**

If your MongoDB requires authentication:
```
MongoDB URI: mongodb://username:password@localhost:27017
```

### **Environment Variables for Production**

For production, use environment variables instead of interactive prompts:
```bash
export MONGODB_URI="mongodb://user:pass@host:port"
export STATIONS_DB="rac"
export PASSENGERS_DB="rac"
export STATIONS_COLLECTION="17225"
export PASSENGERS_COLLECTION="train_17225_passengers"
npm start
```

---

## 📚 API Endpoints

All existing API endpoints work with the new dynamic configuration:

- `POST /api/train/initialize` - Uses configured train details
- `GET /api/train/state` - Returns current train state
- `POST /api/train/start-journey` - Starts journey with configured data
- All other endpoints remain unchanged

---

## 🎓 Migration from Old System

### **Old System (v2.0)**
- Hardcoded database names in `db.js`
- Fixed collection naming pattern
- Required code changes for different trains

### **New System (v3.0)**
- Interactive configuration on startup
- Any database/collection names
- No code changes needed

### **Migration Steps**
1. Update to latest code
2. Run `npm start`
3. Enter your existing database/collection names
4. System works exactly as before!

---

## 🐛 Troubleshooting

### **Issue: Configuration prompts not showing**
- Ensure you're running `npm start` (not `node server.js`)
- Check that `index.js` is the main entry point in `package.json`

### **Issue: Database connection fails**
- Verify MongoDB is running: `mongosh`
- Check MongoDB URI is correct
- Ensure database/collection names are spelled correctly

### **Issue: No data loaded**
- Verify collection names match your MongoDB collections
- Check train number and journey date match your data
- Ensure data exists in the specified collections

---

## 📞 Support

For issues or questions:
1. Check this guide
2. Review `PROJECT_STRUCTURE_ANALYSIS.md`
3. Check `TRAIN_CONFIGURATION.md` for data structure
4. Review `IMPROVEMENTS.md` for recent changes

---

**System Version:** 3.0.0  
**Last Updated:** November 9, 2025  
**Status:** ✅ Production Ready with Dynamic Configuration
