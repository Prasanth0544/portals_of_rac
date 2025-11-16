# Field Mapping Reference - MongoDB Schema Update

## Overview
This document maps the OLD field names to the NEW field names based on the updated MongoDB schema for the passengers collection.

---

## Field Mapping Table

| Old Field Name    | New Field Name        | Data Type | Example Value              | Notes                          |
|-------------------|-----------------------|-----------|----------------------------|--------------------------------|
| `pnr`             | `PNR_Number`          | String    | "1000000001"               | 10-digit PNR number            |
| `train_no`        | `Train_Number`        | String    | "17225"                    | Train number                   |
| `train_name`      | `Train_Name`          | String    | "Amaravati Express"        | Train name                     |
| `journey_date`    | `Journey_Date`        | String    | "15-11-2025"               | Date format: DD-MM-YYYY        |
| `name`            | `Name`                | String    | "Aarav Kumar Sharma"       | Full passenger name            |
| `age`             | `Age`                 | Integer   | 35                         | Passenger age                  |
| `gender`          | `Gender`              | String    | "Male"                     | "Male", "Female", "Other"      |
| (NEW)             | `Mobile`              | String    | "9876543210"               | 10-digit mobile number         |
| (NEW)             | `Email`               | String    | "aarav@gmail.com"          | Email address                  |
| `pnr_status`      | `PNR_Status`          | String    | "CNF"                      | "CNF", "RAC", "WL"             |
| `class`           | `Class`               | String    | "Sleeper"                  | "Sleeper", "3-TierAC", etc.    |
| (NEW)             | `Rac_status`          | String    | "RAC 1"                    | RAC queue position or "-"      |
| `from`            | `Boarding_Station`    | String    | "Narasapur"                | Boarding station name          |
| `to`              | `Deboarding_Station`  | String    | "Hubballi Jn"              | Destination station name       |
| `coach`           | `Assigned_Coach`      | String    | "S1"                       | Coach number (S1-S9, A1, etc.) |
| `seat_no`         | `Assigned_berth`      | Integer   | 15                         | Berth number (1-72)            |
| (NEW)             | `Berth_Type`          | String    | "Lower Berth"              | Berth type classification      |
| `no_show`         | `NO_show`             | Boolean   | false                      | No-show flag                   |

---

## Field Details

### 1. PNR_Number (was: pnr)
- **Type**: String
- **Format**: 10-digit number
- **Example**: "1000000001"
- **Validation**: Must be unique, exactly 10 digits
- **Usage**: Primary identifier for passenger

### 2. Train_Number (was: train_no)
- **Type**: String
- **Example**: "17225"
- **Usage**: Links to train schedule

### 3. Train_Name (was: train_name)
- **Type**: String
- **Example**: "Amaravati Express"
- **Usage**: Display name of train

### 4. Journey_Date (was: journey_date)
- **Type**: String
- **Format**: "DD-MM-YYYY"
- **Example**: "15-11-2025"
- **Note**: Date format changed from ISO to DD-MM-YYYY

### 5. Name (was: name)
- **Type**: String
- **Example**: "Aarav Kumar Sharma"
- **Usage**: Full passenger name

### 6. Age (was: age)
- **Type**: Integer (Number)
- **Range**: 1-120
- **Example**: 35

### 7. Gender (was: gender)
- **Type**: String
- **Values**: "Male", "Female", "Other"
- **Note**: Changed from "M", "F", "O" to full words

### 8. Mobile (NEW FIELD)
- **Type**: String
- **Format**: 10-digit number
- **Example**: "9876543210"
- **Validation**: Optional, 10 digits if provided

### 9. Email (NEW FIELD)
- **Type**: String
- **Example**: "aarav.kumar.sharma12@gmail.com"
- **Validation**: Optional, valid email format if provided

### 10. PNR_Status (was: pnr_status)
- **Type**: String
- **Values**: "CNF" (Confirmed), "RAC", "WL" (Waiting List)
- **Example**: "CNF"
- **Usage**: Overall booking status

### 11. Class (was: class)
- **Type**: String
- **Values**: "Sleeper", "3-TierAC", "2-TierAC", "1-TierAC"
- **Example**: "Sleeper"
- **Note**: Changed from "SL", "3A" to full names

### 12. Rac_status (NEW FIELD)
- **Type**: String
- **Values**: "RAC 1", "RAC 2", ..., "RAC 99", or "-"
- **Example**: "RAC 1" or "-"
- **Usage**: RAC queue position (only for RAC passengers)
- **Note**: Separate from PNR_Status

### 13. Boarding_Station (was: from)
- **Type**: String
- **Example**: "Narasapur"
- **Usage**: Station where passenger boards

### 14. Deboarding_Station (was: to)
- **Type**: String
- **Example**: "Hubballi Jn"
- **Usage**: Station where passenger deboards

### 15. Assigned_Coach (was: coach)
- **Type**: String
- **Example**: "S1", "S2", ..., "S9", "A1", "B1"
- **Usage**: Coach assignment

### 16. Assigned_berth (was: seat_no)
- **Type**: Integer (Number)
- **Range**: 1-72 (for Sleeper), 1-64 (for 3AC)
- **Example**: 15
- **Note**: Changed from String to Integer

### 17. Berth_Type (NEW FIELD)
- **Type**: String
- **Values**: 
  - "Lower Berth"
  - "Middle Berth"
  - "Upper Berth"
  - "Side Lower"
  - "Side Upper"
- **Example**: "Lower Berth"
- **Usage**: Type of berth allocated

### 18. NO_show (was: no_show)
- **Type**: Boolean
- **Values**: true or false
- **Default**: false
- **Usage**: Indicates if passenger didn't board

---

## Code Update Guidelines

### Backend (Node.js/Express)

#### When Reading from MongoDB:
```javascript
// OLD
const passengers = await passengersCollection.find({
  train_no: trainNo,
  journey_date: journeyDate
}).toArray();

// NEW
const passengers = await passengersCollection.find({
  Train_Number: trainNo,
  Journey_Date: journeyDate
}).toArray();
```

#### When Accessing Passenger Fields:
```javascript
// OLD
passenger.pnr
passenger.name
passenger.age
passenger.gender
passenger.from
passenger.to
passenger.coach
passenger.seat_no
passenger.pnr_status
passenger.class
passenger.no_show

// NEW
passenger.PNR_Number
passenger.Name
passenger.Age
passenger.Gender
passenger.Boarding_Station
passenger.Deboarding_Station
passenger.Assigned_Coach
passenger.Assigned_berth
passenger.PNR_Status
passenger.Class
passenger.NO_show
passenger.Mobile          // New field
passenger.Email           // New field
passenger.Rac_status      // New field
passenger.Berth_Type      // New field
```

#### When Creating Passenger Objects:
```javascript
// OLD
const passengerData = {
  pnr: "1234567890",
  name: "John Doe",
  age: 30,
  gender: "M",
  from: "NS",
  to: "HBD",
  class: "SL",
  pnr_status: "CNF",
  coach: "S1",
  seat_no: 15,
  no_show: false
};

// NEW
const passengerData = {
  PNR_Number: "1234567890",
  Train_Number: "17225",
  Train_Name: "Amaravati Express",
  Journey_Date: "15-11-2025",
  Name: "John Doe",
  Age: 30,
  Gender: "Male",
  Mobile: "9876543210",
  Email: "john@example.com",
  PNR_Status: "CNF",
  Class: "Sleeper",
  Rac_status: "-",
  Boarding_Station: "NS",
  Deboarding_Station: "HBD",
  Assigned_Coach: "S1",
  Assigned_berth: 15,
  Berth_Type: "Lower Berth",
  NO_show: false
};
```

### Frontend (React)

#### Form Field Names:
```javascript
// OLD
<input name="pnr" />
<input name="name" />
<input name="age" />
<select name="gender">
  <option value="M">Male</option>
</select>
<input name="from" />
<input name="to" />
<select name="class">
  <option value="SL">Sleeper</option>
</select>
<input name="coach" />
<input name="seat_no" />

// NEW (Frontend still uses lowercase for forms, backend maps to DB fields)
<input name="pnr" />           // Maps to PNR_Number
<input name="name" />          // Maps to Name
<input name="age" />           // Maps to Age
<select name="gender">         // Maps to Gender
  <option value="Male">Male</option>
</select>
<input name="mobile" />        // Maps to Mobile (NEW)
<input name="email" />         // Maps to Email (NEW)
<input name="from" />          // Maps to Boarding_Station
<input name="to" />            // Maps to Deboarding_Station
<select name="class">          // Maps to Class
  <option value="Sleeper">Sleeper</option>
</select>
<input name="coach" />         // Maps to Assigned_Coach
<input name="seat_no" />       // Maps to Assigned_berth
<select name="rac_status">     // Maps to Rac_status (NEW)
  <option value="-">-</option>
</select>
<select name="berth_type">     // Maps to Berth_Type (NEW)
  <option value="Lower Berth">Lower Berth</option>
</select>
```

---

## Files Updated

### Backend Files:
1. ✅ `backend/services/DataService.js` - Load passengers, allocate passengers, build RAC queue
2. ✅ `backend/services/ReallocationService.js` - Mark no-show, RAC queue operations
3. ✅ `backend/controllers/passengerController.js` - Add passenger, get passengers
4. ⚠️ `backend/controllers/trainController.js` - May need updates
5. ⚠️ `backend/services/StationEventService.js` - May need updates
6. ⚠️ `backend/models/Berth.js` - Passenger object structure
7. ⚠️ `backend/models/TrainState.js` - Passenger object structure

### Frontend Files:
1. ✅ `frontend/src/pages/AddPassengerPage.jsx` - Add passenger form
2. ⚠️ `frontend/src/pages/PassengersPage.jsx` - Display passengers
3. ⚠️ `frontend/src/pages/RACQueuePage.jsx` - Display RAC queue
4. ⚠️ `frontend/src/pages/ReallocationPage.jsx` - Reallocation interface
5. ⚠️ `frontend/src/components/PassengerList.jsx` - Passenger display

---

## Testing Checklist

- [ ] Load passengers from MongoDB with new field names
- [ ] Display passenger information correctly
- [ ] Add new passenger with all new fields
- [ ] Mark passenger as no-show
- [ ] RAC queue displays correctly
- [ ] RAC reallocation works
- [ ] Station arrival processing works
- [ ] Passenger boarding/deboarding works
- [ ] Search passenger by PNR
- [ ] Filter passengers by status

---

## Important Notes

1. **Database Migration**: Existing data needs to be migrated to new schema
2. **Field Name Case**: MongoDB fields use PascalCase now (e.g., `PNR_Number`)
3. **New Fields**: Mobile, Email, Rac_status, Berth_Type are new additions
4. **Data Types**: `Assigned_berth` is now Integer (was String)
5. **Gender Values**: Now "Male"/"Female" (was "M"/"F")
6. **Class Values**: Now "Sleeper"/"3-TierAC" (was "SL"/"3A")
7. **Rac_status**: Separate field from PNR_Status for RAC passengers

---

## Quick Reference

**When you see this in old code:**
```javascript
passenger.pnr → passenger.PNR_Number
passenger.name → passenger.Name
passenger.from → passenger.Boarding_Station
passenger.to → passenger.Deboarding_Station
passenger.coach → passenger.Assigned_Coach
passenger.seat_no → passenger.Assigned_berth
passenger.no_show → passenger.NO_show
```

**Always remember:**
- MongoDB field names are now PascalCase with underscores
- New fields: Mobile, Email, Rac_status, Berth_Type
- Gender and Class values are now full words
- Assigned_berth is now a Number, not a String