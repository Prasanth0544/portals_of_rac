# MongoDB Schema & Field Name Reference

> **Why this document exists:** The codebase has had recurring bugs caused by using wrong MongoDB field names (e.g., `Train_Number` instead of `Train_No`). This is the single source of truth for all field names, collection names, and the mapping between frontend ↔ backend ↔ MongoDB.

---

## ⚠️ Common Pitfalls

| ❌ Wrong | ✅ Correct | Context |
|----------|-----------|---------|
| `Train_Number` | `Train_No` | When querying `Trains_Details` collection |
| `Stations_Collection_Name` | `Station_Collection_Name` | Field in `Trains_Details` (⚠️ may have trailing space in DB!) |
| `train.totalCoaches` | `train.Sleeper_Coaches_Count + train.Three_TierAC_Coaches_Count` | Coach counts in `Trains_Details` |
| `train.sleeperCoachesCount` | `train.Sleeper_Coaches_Count` | Sleeper count in `Trains_Details` |
| `train.threeTierACCoachesCount` | `train.Three_TierAC_Coaches_Count` | 3AC count in `Trains_Details` |

> [!CAUTION]
> `Station_Collection_Name` may have a **trailing space** in some MongoDB documents (`"Station_Collection_Name "`). Always use the robust lookup pattern:
> ```js
> const stationKey = Object.keys(doc).find(k => k.trim() === 'Station_Collection_Name');
> const value = stationKey ? doc[stationKey] : null;
> ```

---

## 1. Databases

| Database | Default Name | Env Variable | Purpose |
|----------|-------------|--------------|---------|
| Main/RAC DB | `rac` | `MONGO_URI` | Auth, train details, notifications |
| Stations DB | `rac` | `STATIONS_DB` | Station data per train |
| Passengers DB | `PassengersDB` | `PASSENGERS_DB` | Passenger records per train |
| Train Details DB | `rac` | `TRAIN_DETAILS_DB` | Where `Trains_Details` collection lives |

---

## 2. Global Collections (in RAC DB)

Defined in [`backend/config/collections.js`](file:///c:/Users/prasa/Desktop/RAC/zip_2/backend/config/collections.js)

| Collection | Default Name | Env Variable | Purpose |
|------------|-------------|--------------|---------|
| `TRAINS_DETAILS` | `Trains_Details` | `TRAIN_DETAILS_COLLECTION` | Master train registry |
| `TTE_USERS` | `tte_users` | `TTE_USERS_COLLECTION` | TTE accounts |
| `PASSENGER_ACCOUNTS` | `passenger_accounts` | `PASSENGER_ACCOUNTS_COLLECTION` | Passenger login accounts |
| `REFRESH_TOKENS` | `refresh_tokens` | `REFRESH_TOKENS_COLLECTION` | JWT refresh tokens |
| `PUSH_SUBSCRIPTIONS` | `push_subscriptions` | `PUSH_SUBSCRIPTIONS_COLLECTION` | Web push subscriptions |
| `IN_APP_NOTIFICATIONS` | `in_app_notifications` | `IN_APP_NOTIFICATIONS_COLLECTION` | In-app notification queue |
| `UPGRADE_NOTIFICATIONS` | `upgrade_notifications` | `UPGRADE_NOTIFICATIONS_COLLECTION` | RAC upgrade offers |
| `STATION_REALLOCATIONS` | `station_reallocations` | `STATION_REALLOCATIONS_COLLECTION` | Station-wise reallocation records |
| `OTP_STORE` | `otp_store` | `OTP_STORE_COLLECTION` | OTP codes for verification |
| `UPGRADE_DENIAL_LOG` | `upgrade_denial_log` | `UPGRADE_DENIAL_LOG_COLLECTION` | Denied upgrade audit trail |

---

## 3. Per-Train Collections

Each train has its own stations and passengers collections. The names are stored in the `Trains_Details` document for that train.

| Data | Collection Name Source | Example |
|------|----------------------|---------|
| Stations | `Station_Collection_Name` field in `Trains_Details` | `stations_17225` |
| Passengers | `Passengers_Collection_Name` field in `Trains_Details` | `17225_passengers` |

---

## 4. `Trains_Details` Collection Schema

This is the **most error-prone** collection. Pay close attention to field names.

```
Database: rac (default)
Collection: Trains_Details
```

| MongoDB Field | Type | Example | Notes |
|---------------|------|---------|-------|
| `Train_No` | `Number` | `17225` | ⚠️ **NOT** `Train_Number`. Stored as number, query with `$in: [str, Number(str)]` |
| `Train_Name` | `String` | `"Bhimavaram Express"` | |
| `Station_Collection_Name` | `String` | `"stations_17225"` | ⚠️ May have trailing space in key name! |
| `Passengers_Collection_Name` | `String` | `"17225_passengers"` | |
| `Sleeper_Coaches_Count` | `Number` | `6` | ⚠️ **NOT** `sleeperCoachesCount` |
| `Three_TierAC_Coaches_Count` | `Number` | `3` | ⚠️ **NOT** `threeTierACCoachesCount` |
| `status` | `String` | `"RUNNING"` / `"READY"` / `"NOT_INIT"` | Added by backend at runtime |
| `currentStation` | `String` | `"Bhimavaram Town"` | Updated during journey |
| `currentStationIdx` | `Number` | `4` | 0-indexed station position |
| `totalStations` | `Number` | `12` | Total station count |
| `journeyDate` | `String` | `"24-02-2026"` | |
| `stationsDb` | `String` | `"rac"` | Which DB has the stations collection |
| `passengersDb` | `String` | `"rac"` | Which DB has the passengers collection |

### Query Pattern for Trains_Details

Always handle both string and numeric `Train_No`:

```js
// ✅ CORRECT — handles both types
const train = await col.findOne({
  Train_No: { $in: [trainNo, Number(trainNo)] }
});

// ❌ WRONG — will miss if stored as number
const train = await col.findOne({ Train_No: trainNo });

// ❌ WRONG — wrong field name entirely
const train = await col.findOne({ Train_Number: trainNo });
```

### Accessing with db helper

```js
// ✅ BEST — uses centralized helper
const db = require('../config/db');
const col = db.getTrainDetailsCollection();

// ⚠️ ALSO WORKS but less clean
const racDb = await db.getDb();
const col = racDb.collection(COLLECTIONS.TRAINS_DETAILS);
```

---

## 5. Passenger Collection Schema

Each train has its own passengers collection (e.g., `17225_passengers`).

```
Database: PassengersDB (default) or rac
Collection: <from Passengers_Collection_Name>
```

| MongoDB Field | Type | Example | Notes |
|---------------|------|---------|-------|
| `PNR_Number` | `String` | `"1000000001"` | Unique passenger identifier |
| `Train_Number` | `String/Number` | `"17225"` | ✅ Passengers DO use `Train_Number` (different from `Trains_Details`!) |
| `Train_Name` | `String` | `"Bhimavaram Express"` | |
| `Journey_Date` | `String` | `"19-12-2024"` | Format: `DD-MM-YYYY` |
| `Name` | `String` | `"John Doe"` | Passenger name |
| `Age` | `Number` | `30` | |
| `Gender` | `String` | `"M"` / `"F"` | |
| `Boarding_Station` | `String` | `"HYB"` | Station code |
| `Deboarding_Station` | `String` | `"BZA"` | Station code |
| `Assigned_Coach` | `String` | `"S1"` | Coach assignment |
| `Assigned_berth` | `String` | `"15"` | Berth number |
| `Berth_Type` | `String` | `"LB"` / `"MB"` / `"UB"` / `"SL"` / `"SU"` | Lower/Middle/Upper/Side Lower/Side Upper |
| `PNR_Status` | `String` | `"CNF"` / `"RAC"` / `"WL"` | Booking status |
| `Current_Status` | `String` | `"CNF"` / `"RAC"` / `"WL"` / `"CAN"` | Live status |
| `Booking_Status` | `String` | `"CNF"` / `"RAC"` / `"WL"` | Original booking status |
| `Boarding_Status` | `String` | `"Boarded"` / `"Not Boarded"` | |
| `Class` | `String` | `"SL"` / `"3A"` | Booking class |
| `Email` | `String` | `"john@example.com"` | For notifications |
| `IRCTC_ID` | `String` | `"user123"` | IRCTC login ID |
| `Phone` | `String` | `"9876543210"` | Phone number |

> [!IMPORTANT]
> **`Train_Number` in passengers vs `Train_No` in Trains_Details** — This is the single biggest source of confusion!
> - `Passengers collection` → uses `Train_Number`
> - `Trains_Details collection` → uses `Train_No`
> These are DIFFERENT field names in DIFFERENT collections!

---

## 6. Stations Collection Schema

Each train has its own stations collection (e.g., `stations_17225`).

```
Database: rac (default)
Collection: <from Station_Collection_Name>
```

| MongoDB Field | Type | Example |
|---------------|------|---------|
| `Station_Code` | `String` | `"HYB"` |
| `Station_Name` | `String` | `"Hyderabad"` |
| `Arrival_Time` | `String` | `"08:30"` |
| `Departure_Time` | `String` | `"08:35"` |
| `Distance` | `Number` | `0` |
| `Day` | `Number` | `1` |
| `Serial_No` | `Number` | `1` |

---

## 7. `tte_users` Collection Schema

| MongoDB Field | Type | Example |
|---------------|------|---------|
| `employeeId` | `String` | `"TTE001"` |
| `name` | `String` | `"Ravi Kumar"` |
| `password` | `String` | (bcrypt hash) |
| `role` | `String` | `"TTE"` |
| `trainAssigned` | `String` | `"17225"` |
| `email` | `String` | `"ravi@irctc.com"` |
| `phone` | `String` | `"9876543210"` |

---

## 8. Frontend ↔ Backend API Field Mapping

The frontend uses **camelCase**, the backend converts to/from **MongoDB snake_case**.

### `/api/trains` (GET) — List all trains

| Frontend Field | MongoDB Source |
|---------------|---------------|
| `trainNo` | `d.Train_No` |
| `trainName` | `d.Train_Name` |
| `status` | `d.status` |
| `sleeperCoachesCount` | `d.Sleeper_Coaches_Count` |
| `threeTierACCoachesCount` | `d.Three_TierAC_Coaches_Count` |
| `stationsCollection` | `d.Station_Collection_Name` (with trim!) |
| `passengersCollection` | `d.Passengers_Collection_Name` |

### `/api/trains/:trainNo/config` (GET) — Train config

| Frontend Field | MongoDB Source |
|---------------|---------------|
| `trainNo` | `String(train.Train_No)` |
| `trainName` | `train.Train_Name` |
| `stationsCollection` | `Station_Collection_Name` (with trim lookup) |
| `passengersCollection` | `train.Passengers_Collection_Name` |
| `sleeperCoachesCount` | `train.Sleeper_Coaches_Count` |
| `threeTierACCoachesCount` | `train.Three_TierAC_Coaches_Count` |

### `/api/admin/train-overview` (GET) — Overview stats

| Frontend Field | MongoDB Source |
|---------------|---------------|
| `trainNo` | `String(train.Train_No)` |
| `trainName` | `train.Train_Name` |
| `ttes.count` | TTE count from `tte_users` |
| `passengers.total` | Passenger count from in-memory state or passengers collection |
| `passengers.notifications.pushEnabled` | From `push_subscriptions` |
| `passengers.notifications.emailEnabled` | From passengers with `Email` field |

---

## 9. API Routes Reference

### Routes defined in [`api.js`](file:///c:/Users/prasa/Desktop/RAC/zip_2/backend/routes/api.js)

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET | `/trains` | `trainController.list` | List all registered trains |
| GET | `/trains/:trainNo/config` | inline | Get train config from Trains_Details |
| PUT | `/trains/:trainNo/config` | inline | Update train config |
| GET | `/admin/train-overview` | `trainController.getTrainOverview` | Overview stats per train |
| POST | `/train/initialize` | `trainController.initializeTrain` | Initialize train engine |
| POST | `/train/start-journey` | `trainController.startJourney` | Start train journey |
| GET | `/train/state` | `trainController.getTrainState` | Get full train state |
| POST | `/train/next-station` | `trainController.moveToNextStation` | Advance to next station |
| POST | `/train/reset` | `trainController.resetTrain` | Reset train |
| GET | `/train/stats` | `trainController.getTrainStats` | Get statistics |
| GET | `/train/engine-status` | `trainController.getEngineStatus` | Engine running status |
| GET | `/train/allocation-errors` | `trainController.getAllocationErrors` | Allocation diagnostics |
| POST | `/config/setup` | `configController.setup` | Dynamic config setup |
| GET | `/config/current` | inline | Get current config |

---

## 10. Quick Debug Checklist

When you get a "not found" or field access error:

1. **Check the collection** — Are you querying `Trains_Details` or a passenger collection?
2. **Check the field name** — Is it `Train_No` (Trains_Details) or `Train_Number` (passengers)?
3. **Check the type** — Is `Train_No` stored as number `17225` or string `"17225"`? Use `$in: [str, Number(str)]`
4. **Check for trailing spaces** — `Station_Collection_Name` may have a trailing space in the key
5. **Check the DB** — Stations are in `rac` DB, passengers might be in `PassengersDB`
6. **Check the accessor** — Use `db.getTrainDetailsCollection()` for `Trains_Details`
