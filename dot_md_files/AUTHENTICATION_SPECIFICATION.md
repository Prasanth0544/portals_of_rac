# Authentication Specification

## Overview
Three-portal authentication system with role-based access control (RBAC).

---

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Admin Portal │     │  TTE Portal  │     │Pass. Portal  │
│   :3000      │     │    :3001     │     │    :3002     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┴────────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │   Backend API     │
                  │   :5000           │
                  └───────────────────┘
```

---

## 🔐 Login Flows

### **1. Admin Login**

**Credentials:**
- Username: `admin`
- Password: Hash-based (bcrypt)

**Endpoint:** `POST /api/admin/login`

**Request:**
```json
{
  "username": "admin",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "ADMIN"
  }
}
```

**Permissions:**
- ✅ Configure train system
- ✅ View all data
- ✅ Manage TTE accounts
- ✅ Override any action

---

### **2. TTE Login**

**Credentials:**
- Employee ID: `TTE001`, `TTE002`, etc.
- Password: Hash-based

**Endpoint:** `POST /api/tte/login`

**Request:**
```json
{
  "employeeId": "TTE001",
  "password": "ttePassword"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "employeeId": "TTE001",
    "name": "Ramesh Kumar",
    "role": "TTE",
    "trainAssigned": 17225
  }
}
```

**Permissions:**
- ✅ Mark passengers boarded/NO_SHOW
- ✅ View boarding verification queue
- ✅ Access action history
- ✅ View station-level statistics
- ❌ Cannot configure system

---

### **3. Passenger Login**

**Credentials:**
- IRCTC ID: Email or phone
- PNR Number: 10-digit code

**Endpoint:** `POST /api/passenger/login`

**Request:**
```json
{
  "irctcId": "john.doe@gmail.com",
  "pnr": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "pnr": "1234567890",
    "name": "John Doe",
    "role": "PASSENGER",
    "trainNo": 17225,
    "pnrStatus": "RAC"
  }
}
```

**Permissions:**
- ✅ View OWN ticket details
- ✅ Receive upgrade offers
- ✅ Accept/reject offers
- ✅ Self-check-in (optional)
- ❌ Cannot view other passengers

---

## 🛡️ JWT Token Structure

```json
{
  "userId": "1234567890",
  "role": "PASSENGER",
  "trainNo": 17225,
  "iat": 1700000000,
  "exp": 1700086400
}
```

**Token Expiry:**
- Admin: 24 hours
- TTE: 12 hours (shift duration)
- Passenger: 48 hours (journey duration)

---

## 🔒 Authentication Middleware

```javascript
// backend/middleware/auth.js

function requireAdminAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
}

function requireTTEAuth(req, res, next) {
  // Similar to admin, check role === 'TTE'
}

function requirePassengerAuth(req, res, next) {
  // Similar, check role === 'PASSENGER'
  // Additional check: can only access own PNR
}
```

---

## 📋 Implementation Checklist

### **Backend**
- [ ] Install `jsonwebtoken` and `bcrypt`
- [ ] Create `authController.js` with login methods
- [ ] Create `auth.js` middleware
- [ ] Hash admin/TTE passwords in DB
- [ ] Add token verification to all protected routes

### **Frontend (All Portals)**
- [ ] Create login page UI
- [ ] Store JWT in `localStorage`
- [ ] Add token to all API request headers
- [ ] Handle 401 (redirect to login)
- [ ] Handle 403 (show "Access Denied")

### **Database**
```javascript
// New collection: Users
{
  userId: "TTE001",
  role: "TTE",
  passwordHash: "$2b$10$...",
  name: "Ramesh Kumar",
  trainAssigned: 17225
}
```

---

## 🚨 Security Best Practices

1. **Never store passwords in plain text** - Always use bcrypt
2. **HTTPS only in production** - Prevent token interception
3. **Short token expiry** - Reduce hijacking risk
4. **Refresh token mechanism** (Optional for v2.0)
5. **Rate limiting on login endpoints** - Prevent brute force

---

## 📊 Flow Diagram

```
User enters credentials
  ↓
Frontend validates format
  ↓
POST /api/{role}/login
  ↓
Backend checks DB
  ↓
Password matches?
  ├─ NO → Return 401
  └─ YES → Generate JWT
        ↓
        Return token + user info
        ↓
Frontend stores token
  ↓
All future requests include:
  Headers: { Authorization: "Bearer TOKEN" }
```

---

## 🎯 Next Steps

After authentication is complete:
1. Implement TTE boarding verification
2. Add passenger self-check-in (optional)
3. Create admin user management panel
