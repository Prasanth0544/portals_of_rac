# Quick Field Reference Card

## 🎯 At-a-Glance Field Mapping

### MongoDB → Internal Code

| MongoDB Field (DB) | Internal Object (Code) | Type | Example |
|--------------------|------------------------|------|---------|
| `PNR_Number` | `pnr` | String | "1000000001" |
| `Name` | `name` | String | "John Doe" |
| `Age` | `age` | Number | 30 |
| `Gender` | `gender` | String | "Male" |
| `Mobile` | `mobile` | String | "9876543210" |
| `Email` | `email` | String | "john@email.com" |
| `Boarding_Station` | `from` | String | "NS" (code) |
| `Deboarding_Station` | `to` | String | "HBD" (code) |
| `Assigned_Coach` | `coach` | String | "S1" |
| `Assigned_berth` | `seatNo` | Number | 15 |
| `PNR_Status` | `pnrStatus` | String | "CNF" |
| `Class` | `class` | String | "Sleeper" |
| `Rac_status` | `racStatus` | String | "RAC 1" or "-" |
| `Berth_Type` | `berthType` | String | "Lower Berth" |
| `NO_show` | `noShow` | Boolean | false |
| `Train_Number` | `trainNo` | String | "17225" |
| `Train_Name` | `trainName` | String | "Amaravati Express" |
| `Journey_Date` | `journeyDate` | String | "15-11-2025" |

---

## 📝 Common Code Patterns

### Reading from MongoDB
```javascript
// Query passengers
const passengers = await collection.find({
  Train_Number: trainNo,
  Journey_Date: journeyDate
}).toArray();

// Access fields
passengers.forEach(p => {
  const pnr = p.PNR_Number;
  const name = p.Name;
  const from = p.Boarding_Station;
  const to = p.Deboarding_Station;
  const coach = p.Assigned_Coach;
  const berth = p.Assigned_berth; // Number
  const mobile = p.Mobile;
  const email = p.Email;
});
```

### Writing to MongoDB
```javascript
// Insert new passenger
await collection.insertOne({
  PNR_Number: "1234567890",
  Train_Number: trainNo,
  Train_Name: trainName,
  Journey_Date: "15-11-2025",
  Name: "John Doe",
  Age: 30,
  Gender: "Male", // NOT "M"
  Mobile: "9876543210",
  Email: "john@email.com",
  PNR_Status: "CNF",
  Class: "Sleeper", // NOT "SL"
  Rac_status: "-",
  Boarding_Station: "NS",
  Deboarding_Station: "HBD",
  Assigned_Coach: "S1",
  Assigned_berth: 15, // Number, NOT "15"
  Berth_Type: "Lower Berth",
  NO_show: false
});

// Update no-show
await collection.updateOne(
  { PNR_Number: pnr },
  { $set: { NO_show: true } }
);
```

### Converting to Internal Format
```javascript
// When loading from MongoDB to TrainState
berth.addPassenger({
  pnr: p.PNR_Number,
  name: p.Name,
  age: p.Age,
  gender: p.Gender,
  mobile: p.Mobile,
  email: p.Email,
  from: fromStation.code, // Use station code
  fromIdx: fromStation.idx,
  to: toStation.code,
  toIdx: toStation.idx,
  pnrStatus: p.PNR_Status,
  class: p.Class,
  racStatus: p.Rac_status,
  berthType: p.Berth_Type,
  noShow: p.NO_show,
  boarded: false
});
```

---

## 🔍 Value Mappings

### Gender Values
| Old | New |
|-----|-----|
| `"M"` | `"Male"` |
| `"F"` | `"Female"` |
| `"O"` | `"Other"` |

### Class Values
| Old | New |
|-----|-----|
| `"SL"` | `"Sleeper"` |
| `"3A"` | `"3-TierAC"` |
| `"2A"` | `"2-TierAC"` |
| `"1A"` | `"1-TierAC"` |

### Berth Type Values
- `"Lower Berth"`
- `"Middle Berth"`
- `"Upper Berth"`
- `"Side Lower"`
- `"Side Upper"`

### RAC Status Values
- `"-"` (not RAC)
- `"RAC 1"`, `"RAC 2"`, ... `"RAC 99"`

---

## ⚡ Quick Copy-Paste

### MongoDB Query Template
```javascript
await passengersCollection.find({
  Train_Number: "17225",
  Journey_Date: "15-11-2025"
}).toArray();
```

### Passenger Document Template
```javascript
{
  PNR_Number: "1234567890",
  Train_Number: "17225",
  Train_Name: "Amaravati Express",
  Journey_Date: "15-11-2025",
  Name: "John Doe",
  Age: 30,
  Gender: "Male",
  Mobile: "9876543210",
  Email: "john@email.com",
  PNR_Status: "CNF",
  Class: "Sleeper",
  Rac_status: "-",
  Boarding_Station: "Narasapur",
  Deboarding_Station: "Hubballi Jn",
  Assigned_Coach: "S1",
  Assigned_berth: 15,
  Berth_Type: "Lower Berth",
  NO_show: false
}
```

---

## ⚠️ Common Mistakes to Avoid

❌ **DON'T:**
```javascript
// Wrong field names
p.pnr              // Use p.PNR_Number
p.name             // Use p.Name
p.from             // Use p.Boarding_Station
p.seat_no          // Use p.Assigned_berth

// Wrong values
Gender: "M"        // Use "Male"
Class: "SL"        // Use "Sleeper"
Assigned_berth: "15" // Use 15 (number)
```

✅ **DO:**
```javascript
// Correct field names
p.PNR_Number
p.Name
p.Boarding_Station
p.Assigned_berth

// Correct values
Gender: "Male"
Class: "Sleeper"
Assigned_berth: 15
```

---

## 🎨 Frontend Form Fields

```jsx
{/* Use lowercase in forms, convert in backend */}
<input name="pnr" />          {/* → PNR_Number */}
<input name="name" />         {/* → Name */}
<input name="mobile" />       {/* → Mobile */}
<input name="email" />        {/* → Email */}
<input name="from" />         {/* → Boarding_Station */}
<input name="to" />           {/* → Deboarding_Station */}
<input name="coach" />        {/* → Assigned_Coach */}
<input name="seat_no" />      {/* → Assigned_berth */}

<select name="gender">        {/* → Gender */}
  <option value="Male">Male</option>
</select>

<select name="class">         {/* → Class */}
  <option value="Sleeper">Sleeper</option>
</select>

<select name="rac_status">    {/* → Rac_status */}
  <option value="-">-</option>
  <option value="RAC 1">RAC 1</option>
</select>
```

---

## 📌 Remember

1. **MongoDB uses PascalCase**: `PNR_Number`, `Train_Name`
2. **Internal objects use camelCase**: `pnr`, `trainName`
3. **Station fields store CODES not full names**: "NS" not "Narasapur"
4. **Assigned_berth is a NUMBER**: `15` not `"15"`
5. **Gender uses full words**: "Male" not "M"
6. **Class uses full words**: "Sleeper" not "SL"
7. **Rac_status is separate from PNR_Status**
8. **New fields are required**: Mobile, Email, Berth_Type

---

## 🔗 Related Files

- `FIELD_MAPPING_REFERENCE.md` - Complete reference
- `FIELD_MAPPING_UPDATE_SUMMARY.md` - All changes made
- `backend/services/DataService.js` - Passenger loading
- `backend/controllers/passengerController.js` - Add passenger
- `frontend/src/pages/AddPassengerPage.jsx` - Passenger form