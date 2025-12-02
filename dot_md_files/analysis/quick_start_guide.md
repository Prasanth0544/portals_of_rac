# Quick Start Guide - RAC Reallocation System
**Last Updated**: 2025-12-02  
**Version**: 3.0.0

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Running the System](#running-the-system)
6. [Testing the System](#testing-the-system)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
```bash
Node.js >= 18.0.0
npm >= 9.0.0
MongoDB >= 6.0
Git
```

### Check Versions
```powershell
node --version    # Should be v18+ or v20+
npm --version     # Should be v9+
mongod --version  # Should be 6.0+
```

---

## Installation

### 1. Clone Repository
```powershell
cd C:\Users\prasa\Desktop\RAC
# Repository already at: C:\Users\prasa\Desktop\RAC\zip_2
```

### 2. Install Backend Dependencies
```powershell
cd zip_2\backend
npm install
```

**Key Packages Installed**:
- express (4.18.2)
- mongodb (6.3.0)
- jsonwebtoken (9.0.2)
- bcrypt (6.0.0)
- nodemailer (7.0.11)
- twilio (5.10.6)
- web-push (3.6.7)
- ws (8.14.2)

### 3. Install Frontend/Admin Portal Dependencies
```powershell
cd ..\frontend
npm install
```

### 4. Install TTE Portal Dependencies
```powershell
cd ..\tte-portal
npm install
```

### 5. Install Passenger Portal Dependencies
```powershell
cd ..\passenger-portal
npm install
```

---

## Environment Configuration

### Backend Environment Variables

Create `.env` file in `backend/` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
RAC_DB_NAME=rac
PASSENGERS_DB_NAME=PassengersDB
STATIONS_COLLECTION=All_Stations_12715
PASSENGERS_COLLECTION=Passengers_12715

# JWT Configuration
JWT_SECRET=your-strong-secret-key-change-in-production
JWT_EXPIRY=24h

# Email Configuration (Nodemailer)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# Twilio Configuration (SMS)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Web Push Configuration (VAPID Keys)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@example.com

# CORS Configuration
FRONTEND_URL=http://localhost:3000
TTE_PORTAL_URL=http://localhost:5173
PASSENGER_PORTAL_URL=http://localhost:5174
```

### Generate VAPID Keys for Push Notifications

```powershell
cd backend
npx web-push generate-vapid-keys
```

Copy the output keys to your `.env` file.

---

## API Keys & External Services

### 1. Email Configuration (Gmail)

**Steps to get App Password**:
1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security → App Passwords
4. Generate new app password for "Mail"
5. Copy password to `EMAIL_PASSWORD` in `.env`

### 2. Twilio Configuration (SMS)

**Get Twilio Credentials**:
1. Sign up at [https://www.twilio.com](https://www.twilio.com)
2. Get free trial account
3. Navigate to Console Dashboard
4. Copy:
   - Account SID → `TWILIO_ACCOUNT_SID`
   - Auth Token → `TWILIO_AUTH_TOKEN`
5. Get a phone number → `TWILIO_PHONE_NUMBER`

### 3. Push Notifications (VAPID)

Already generated using `npx web-push generate-vapid-keys`

---

## Database Setup

### 1. Start MongoDB

```powershell
# Start MongoDB service (Windows)
net start MongoDB

# Or if using MongoDB installed locally without service:
mongod --dbpath C:\data\db
```

### 2. Database Structure

The system uses **2 databases**:

#### Database 1: `rac`
**Collections**:
- `users` - User authentication
- `pushSubscriptions` - Browser push subscriptions
- `inAppNotifications` - In-app notifications
- `Train_Details` - Train metadata

#### Database 2: `PassengersDB`
**Collections**:
- `All_Stations_12715` - Station schedule for train 12715
- `Passengers_12715` - Passenger data for train 12715

### 3. Import Sample Data (Optional)

If you have sample data files:

```powershell
# Import stations
mongoimport --db PassengersDB --collection All_Stations_12715 --file stations.json --jsonArray

# Import passengers
mongoimport --db PassengersDB --collection Passengers_12715 --file passengers.json --jsonArray

# Import train details
mongoimport --db rac --collection Train_Details --file train_details.json --jsonArray
```

### 4. Create Sample Train Details Document

Using MongoDB Compass or mongo shell:

```javascript
// Connect to: mongodb://localhost:27017
use rac

db.Train_Details.insertOne({
  Train_No: 12715,
  Train_Name: "Satavahana Express",
  Sleeper_Coaches_Count: 10,
  Three_TierAC_Coaches_Count: 5,
  Station_Collection_Name: "All_Stations_12715",
  Stations_Db: "PassengersDB",
  Passengers_Collection: "Passengers_12715",
  Passengers_Db: "PassengersDB"
})
```

---

## Running the System

### Method 1: Run Each Server Individually

#### Terminal 1: Backend Server
```powershell
cd backend
npm start

# Expected output:
# Server running on port 5000
# WebSocket server started
# MongoDB connected successfully
# Swagger docs: http://localhost:5000/api-docs
```

#### Terminal 2: Frontend/Admin Portal
```powershell
cd frontend
npm start

# Expected output:
# Webpack compiled successfully
# Running on: http://localhost:3000
```

#### Terminal 3: TTE Portal
```powershell
cd tte-portal
npm run dev

# Expected output:
# VITE ready
# Local: http://localhost:5173
```

#### Terminal 4: Passenger Portal
```powershell
cd passenger-portal
npm run dev

# Expected output:
# VITE ready
# Local: http://localhost:5174
```

### Method 2: Using Concurrently (Recommended)

Install concurrently globally:
```powershell
npm install -g concurrently
```

Create a root-level script (in `zip_2` directory):

**package.json**:
```json
{
  "name": "rac-system",
  "scripts": {
    "start:backend": "cd backend && npm start",
    "start:frontend": "cd frontend && npm start",
    "start:tte": "cd tte-portal && npm run dev",
    "start:passenger": "cd passenger-portal && npm run dev",
    "start:all": "concurrently \"npm:start:backend\" \"npm:start:frontend\" \"npm:start:tte\" \"npm:start:passenger\""
  }
}
```

Then run:
```powershell
npm run start:all
```

---

## Access Points

Once all servers are running:

| Application | URL | Default Credentials |
|-------------|-----|---------------------|
| **Backend API** | http://localhost:5000/api | N/A |
| **API Documentation** | http://localhost:5000/api-docs | N/A |
| **Frontend/Admin Portal** | http://localhost:3000 | admin/admin123 |
| **TTE Portal** | http://localhost:5173 | tte1/tte123 |
| **Passenger Portal** | http://localhost:5174 | Use IRCTC ID from DB |

---

## Testing the System

### 1. Initialize Train

**Via Frontend**:
1. Go to http://localhost:3000
2. Navigate to "Configuration"
3. Select Train Number: 12715
4. Set Journey Date
5. Click "Initialize Train"

**Via API (Postman)**:
```http
POST http://localhost:5000/api/config/setup
Content-Type: application/json

{
  "mongoUri": "mongodb://localhost:27017",
  "stationsDb": "PassengersDB",
  "stationsCollection": "All_Stations_12715",
  "passengersDb": "PassengersDB",
  "passengersCollection": "Passengers_12715",
  "trainNo": "12715",
  "journeyDate": "01-12-2025"
}
```

### 2. Start Journey

```http
POST http://localhost:5000/api/train/start-journey
```

### 3. Test No-Show & Reallocation

**TTE Portal** (http://localhost:5173):
1. Login as TTE
2. Go to "Boarding Verification"
3. Mark a passenger as NO_SHOW
4. Check "RAC Upgrades" tab for offers

**Passenger Portal** (http://localhost:5174):
1. Login with eligible RAC passenger PNR
2. Check "Upgrade Offers" page
3. Accept or decline offer

### 4. Test Push Notifications

**In Passenger Portal**:
1. Click "Enable Notifications"
2. Allow browser permission
3. Mark a passenger as NO_SHOW (from TTE portal)
4. Upgrade offer should appear as push notification

---

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**:
```powershell
# Start MongoDB service
net start MongoDB

# Or check if MongoDB is running
tasklist | findstr mongod
```

#### 2. Port Already in Use
```
Error: Port 5000 is already in use
```

**Solution**:
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or change port in backend/.env
PORT=5001
```

#### 3. CORS Errors in Browser
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution**:
- Check `FRONTEND_URL`, `TTE_PORTAL_URL`, `PASSENGER_PORTAL_URL` in backend `.env`
- Ensure CORS middleware in `server.js` includes your origin

#### 4. JWT Token Errors
```
Error: jwt malformed / jwt expired
```

**Solution**:
- Clear browser localStorage
- Login again
- Check `JWT_SECRET` is set in `.env`

#### 5. Push Notifications Not Working
```
Push subscription failed
```

**Solution**:
- Ensure VAPID keys are set in `.env`
- Use HTTPS in production (localhost works for testing)
- Check browser permissions
- Verify service worker is registered

#### 6. Frontend Build Errors
```
Module not found: Can't resolve '@mui/material'
```

**Solution**:
```powershell
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## Development Tips

### Using Swagger for API Testing
```
http://localhost:5000/api-docs
```
- View all endpoints
- Test requests directly
- See request/response schemas

### WebSocket Testing
```javascript
// In browser console
const ws = new WebSocket('ws://localhost:5000')
ws.onmessage = (e) => console.log('Message:', JSON.parse(e.data))
```

### MongoDB GUI Tools
- **MongoDB Compass**: https://www.mongodb.com/products/compass
- **Robo 3T**: https://robomongo.org/

### Browser DevTools
- **Network Tab**: Monitor API calls
- **Application Tab**: Check localStorage, service workers
- **Console**: View WebSocket messages

---

## Production Deployment

### Environment Changes
```env
NODE_ENV=production
PORT=443
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net

# Use real domain URLs
FRONTEND_URL=https://admin.yourdomain.com
TTE_PORTAL_URL=https://tte.yourdomain.com
PASSENGER_PORTAL_URL=https://passengers.yourdomain.com
```

### Build Frontend Apps
```powershell
# Frontend
cd frontend
npm run build

# TTE Portal
cd tte-portal
npm run build

# Passenger Portal
cd passenger-portal
npm run build
```

### Security Checklist
- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET
- [ ] Enable HTTPS
- [ ] Set up proper CORS
- [ ] Disable MongoDB remote access (if not needed)
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Set up logging monitoring

---

## Quick Command Reference

```powershell
# Start MongoDB
net start MongoDB

# Start Backend
cd backend && npm start

# Start TTE Portal
cd tte-portal && npm run dev

# Start Passenger Portal
cd passenger-portal && npm run dev

# Build for Production
npm run build

# Generate VAPID Keys
npx web-push generate-vapid-keys

# MongoDB Import
mongoimport --db <dbname> --collection <collection> --file <file.json>

# Check Running Ports
netstat -ano | findstr :5000
```

---

## Support & Resources

- **API Documentation**: http://localhost:5000/api-docs
- **Backend README**: `backend/README.md`
- **Analysis Docs**: See `*_analysis.md` files in project root

---

## Next Steps

After successfully running the system:

1. ✅ Explore API documentation
2. ✅ Test TTE workflows (boarding, no-show, upgrades)
3. ✅ Test Passenger workflows (login, view offers, accept/deny)
4. ✅ Test push notifications
5. ✅ Review action history and undo functionality
6. ✅ Customize configuration for your train data
7. ✅ Add your own passengers and test reallocations

---

**Happy Coding! 🚂**
