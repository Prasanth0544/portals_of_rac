# 🚀 RAC Reallocation System - Quick Start Guide

> **Complete setup guide for running the RAC Reallocation System after downloading from GitHub**

---

## 📋 Table of Contents

- [Prerequisites](#-prerequisites)
- [Project Overview](#-project-overview)
- [Installation Commands](#-installation-commands)
- [Environment Configuration](#-environment-configuration)
- [Starting the Application](#-starting-the-application)
- [API Reference](#-api-reference)
- [Server Logic Overview](#-server-logic-overview)
- [Database Schema](#-database-schema)
- [Troubleshooting](#-troubleshooting)

---

## ✅ Prerequisites

Before running this project, ensure you have the following installed:

| Tool | Version | Download Link |
|------|---------|---------------|
| **Node.js** | v14.0.0 or higher | [nodejs.org](https://nodejs.org/) |
| **MongoDB** | v4.0 or higher | [mongodb.com](https://www.mongodb.com/try/download/community) |
| **npm** | v6.0.0 or higher | Comes with Node.js |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

### Verify Installation
```bash
node --version    # Should show v14.x.x or higher
npm --version     # Should show 6.x.x or higher
mongod --version  # Should show 4.x.x or higher
```

---

## 📁 Project Overview

```
RAC-Reallocation-System/
├── backend/              # Express.js REST API + WebSocket Server
├── frontend/             # React Admin Portal (Port 3000)
├── passenger-portal/     # Vite React Passenger Portal (Port 5173)
├── tte-portal/          # Vite React TTE Portal (Port 5174)
└── package.json         # Root package (minimal)
```

### Component Summary

| Component | Tech Stack | Port | Start Command | Purpose |
|-----------|------------|------|---------------|--------|
| **Backend** | Node.js, Express, MongoDB, WebSocket | 5000 | `npm start` | REST API & Real-time updates |
| **Admin Frontend** | **Vite, React 19**, Material-UI | 3000 | `npm run dev` | Admin dashboard & controls |
| **Passenger Portal** | Vite, React 19, Material-UI | 5173 | `npm run dev` | Passenger PNR check & upgrades |
| **TTE Portal** | Vite, React 19, Material-UI, Recharts | 5174 | `npm run dev` | TTE operations & management |

> **Note:** All frontends now use **Vite** as the build tool and **`npm run dev`** to start.

---

## 📥 Installation Commands

### Step 1: Clone/Extract the Project
```bash
# If cloning from GitHub
git clone <repository-url>
cd RAC-Reallocation-System

# If downloaded as ZIP, extract and navigate to folder
cd path/to/extracted/folder
```

### Step 2: Install All Dependencies

Run these commands in order:

```bash
# Install Backend Dependencies
cd backend
npm install

# Install Admin Frontend Dependencies
cd ../frontend
npm install

# Install Passenger Portal Dependencies
cd ../passenger-portal
npm install

# Install TTE Portal Dependencies
cd ../tte-portal
npm install

# Return to root
cd ..
```

### Quick Install Script (Copy-Paste All at Once)
```powershell
# PowerShell (Windows)
cd backend; npm install; cd ..\frontend; npm install; cd ..\passenger-portal; npm install; cd ..\tte-portal; npm install; cd ..
```

```bash
# Bash (Linux/Mac)
cd backend && npm install && cd ../frontend && npm install && cd ../passenger-portal && npm install && cd ../tte-portal && npm install && cd ..
```

---

## 🔐 First-Time Setup (IMPORTANT!)

> **⚠️ You must run these commands ONCE after downloading the project to create login accounts and set up notifications.**

### Step 1: Create Test User Accounts

The system uses **bcrypt password hashing**. You need to create user accounts in MongoDB:

```bash
cd backend
node scripts/createTestAccounts.js
```

This creates:

| Account Type | Username | Password | Description |
|--------------|----------|----------|-------------|
| **Admin** | `ADMIN_01` | `Prasanth@123` | Full admin access |
| **TTE** | `TTE_01` | `Prasanth@123` | TTE portal access |
| **Passenger** | `IR_0001` | `Prasanth@123` | Passenger portal login |

### Step 2: Generate VAPID Keys (For Push Notifications)

Push notifications require unique VAPID keys. Generate your own:

```bash
cd backend
npx web-push generate-vapid-keys
```

**Output example:**
```
=======================================

Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U

Private Key:
UUxI4O8-FbRouAf7-7PVTv1qCIqAThH7t6lFQCRVnDY

=======================================
```

**Copy these keys to `backend/.env`:**
```env
VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_EMAIL=mailto:your-email@example.com
```

### Step 3: Reset Admin Password (If Needed)

If you forget the admin password or need to reset it:

```bash
cd backend
node scripts/resetAdmin.js
```

---

### 📋 Complete First-Time Setup Commands

**PowerShell (Windows) - Copy & Paste All:**
```powershell
# 1. Install dependencies
cd backend; npm install
cd ..\frontend; npm install
cd ..\passenger-portal; npm install
cd ..\tte-portal; npm install
cd ..

# 2. Copy environment template
copy backend\.env.example backend\.env

# 3. Create test user accounts (requires MongoDB running)
cd backend
node scripts/createTestAccounts.js
cd ..

Write-Host "✅ Setup complete! Start MongoDB and run the servers."
```

**Bash (Linux/Mac):**
```bash
# 1. Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd passenger-portal && npm install && cd ..
cd tte-portal && npm install && cd ..

# 2. Copy environment template
cp backend/.env.example backend/.env

# 3. Create test user accounts (requires MongoDB running)
cd backend
node scripts/createTestAccounts.js
cd ..

echo "✅ Setup complete! Start MongoDB and run the servers."
```

---

## 🚀 Running the Application

> **Important:** Make sure MongoDB is running before starting any servers!

### Start All Servers (4 terminals)

Open **4 separate terminals** and run:

```bash
# Terminal 1: Backend (Port 5000)
cd backend
npm start

# Terminal 2: Admin Frontend (Port 3000)
cd frontend
npm run dev

# Terminal 3: Passenger Portal (Port 5173)
cd passenger-portal
npm run dev

# Terminal 4: TTE Portal (Port 5174)
cd tte-portal
npm run dev
```

### Quick Start Commands (Copy & Paste)

**PowerShell (Windows) - Start All:**
```powershell
# Run each in a new terminal window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd passenger-portal; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd tte-portal; npm run dev"
```

### Access URLs

| Portal | URL | Login |
|--------|-----|-------|
| **Admin Portal** | http://localhost:3000 | `ADMIN_01` / `Prasanth@123` |
| **TTE Portal** | http://localhost:5174 | `TTE_01` / `Prasanth@123` |
| **Passenger Portal** | http://localhost:5173 | `IR_0001` / `Prasanth@123` |
| **Backend API** | http://localhost:5000/api | - |
| **API Docs (Swagger)** | http://localhost:5000/api-docs | - |

---

### 📦 Notification Dependencies Explained

The backend uses these packages for notifications:

| Package | Purpose | Required Config |
|---------|---------|-----------------|
| **web-push** | Browser push notifications | VAPID keys in `.env` |
| **nodemailer** | Email notifications | SMTP settings in `.env` (optional) |
| **twilio** | SMS notifications | Twilio API keys in `.env` (optional) |
| **bcrypt** | Password hashing | No config needed |
| **jsonwebtoken** | JWT auth tokens | `JWT_SECRET` in `.env` |

> **Note**: Email and SMS notifications are **optional**. The system works without them - push notifications and in-app notifications will still function.

---

### 📧 Gmail App Password Setup (For Email Notifications)

> **⚠️ Important**: Gmail requires **2-Factor Authentication (2FA)** enabled to use App Passwords. Regular Gmail passwords will NOT work with nodemailer.

#### Step 1: Enable 2-Factor Authentication

1. Go to **[Google Account Security](https://myaccount.google.com/security)**
2. Click on **"2-Step Verification"**
3. Follow the setup process (you'll need your phone)
4. Complete the 2FA setup

#### Step 2: Generate App Password

1. After enabling 2FA, go to **[App Passwords](https://myaccount.google.com/apppasswords)**
2. You may need to sign in again
3. At the bottom, select:
   - **App:** Select "Mail"
   - **Device:** Select "Windows Computer" (or your device)
4. Click **"Generate"**
5. Copy the **16-character password** shown (like: `abcd efgh ijkl mnop`)

> ⚠️ **Save this password!** You won't be able to see it again.

#### Step 3: Add to `.env` File

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
```

> **Note**: Remove spaces from the generated password when adding to `.env`

#### Quick Links:
- 🔒 [Enable 2FA](https://myaccount.google.com/signinoptions/two-step-verification)
- 🔑 [Generate App Password](https://myaccount.google.com/apppasswords)

#### Troubleshooting Gmail:
| Error | Solution |
|-------|----------|
| "Invalid credentials" | Make sure you're using App Password, not regular password |
| "Less secure app access" | This option is deprecated - use App Passwords instead |
| "Authentication failed" | Verify 2FA is enabled and regenerate App Password |

---

## ⚙️ Environment Configuration

> **🎉 Good News**: The frontend portals (admin, passenger, TTE) have **hardcoded defaults** and work without `.env` files for local development!

### Do I Need `.env` Files?

| Component | Required? | Why |
|-----------|-----------|-----|
| **backend/** | ⚠️ **Recommended** | MongoDB connection, JWT secret, push notifications |
| **frontend/** | ❌ No | Has default: `http://localhost:5000/api` |
| **passenger-portal/** | ❌ No | Has default: `http://localhost:5000/api` |
| **tte-portal/** | ❌ No | Has default: `http://localhost:5000/api` |

### Quick Start (Minimal Setup)

For basic local development, you only need the backend `.env`:

```powershell
# Copy the backend example file
copy backend\.env.example backend\.env

# That's it! All frontends will work with defaults.
```

---

> **Want to customize?** Below are complete `.env` templates for all components.

---

### 📁 File 1: Backend Environment

**Path:** `backend/.env`

```
📦 RAC-Reallocation-System
└── 📂 backend
    └── 📄 .env  ← CREATE THIS FILE
```

**Complete Content for `backend/.env`:**

```env
# ══════════════════════════════════════════════════════════════
# BACKEND ENVIRONMENT CONFIGURATION
# Location: backend/.env
# ══════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────
# MongoDB Configuration (REQUIRED)
# ─────────────────────────────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017

# ─────────────────────────────────────────────────────────────
# Database Names (REQUIRED)
# ─────────────────────────────────────────────────────────────
STATIONS_DB=rac
PASSENGERS_DB=rac
TRAIN_DETAILS_DB=rac

# ─────────────────────────────────────────────────────────────
# Collection Names (Update with your train number)
# ─────────────────────────────────────────────────────────────
STATIONS_COLLECTION=17225
PASSENGERS_COLLECTION=17225_passengers
TRAIN_DETAILS_COLLECTION=Trains_Details

# ─────────────────────────────────────────────────────────────
# Train Configuration
# ─────────────────────────────────────────────────────────────
DEFAULT_TRAIN_NO=17225

# ─────────────────────────────────────────────────────────────
# Server Configuration
# ─────────────────────────────────────────────────────────────
PORT=5000
NODE_ENV=development

# ─────────────────────────────────────────────────────────────
# JWT Authentication (REQUIRED - Change in Production!)
# ─────────────────────────────────────────────────────────────
JWT_SECRET=rac-reallocation-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h

# ─────────────────────────────────────────────────────────────
# Email Configuration (OPTIONAL - for email notifications)
# ─────────────────────────────────────────────────────────────
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=RAC System <your-email@gmail.com>

# ─────────────────────────────────────────────────────────────
# Twilio SMS Configuration (OPTIONAL - for SMS notifications)
# ─────────────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# ─────────────────────────────────────────────────────────────
# Web Push VAPID Keys (REQUIRED for push notifications)
# Generate with: npx web-push generate-vapid-keys
# ─────────────────────────────────────────────────────────────
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
VAPID_PRIVATE_KEY=UUxI4O8-FbRouAf7-7PVTv1qCIqAThH7t6lFQCRVnDY
VAPID_EMAIL=mailto:admin@example.com

# ─────────────────────────────────────────────────────────────
# CORS Configuration
# ─────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174
```

---

### 📁 File 2: Admin Frontend Environment

**Path:** `frontend/.env`

```
📦 RAC-Reallocation-System
└── 📂 frontend
    └── 📄 .env  ← CREATE THIS FILE
```

**Complete Content for `frontend/.env`:**

```env
# ══════════════════════════════════════════════════════════════
# ADMIN FRONTEND ENVIRONMENT CONFIGURATION
# Location: frontend/.env
# ══════════════════════════════════════════════════════════════

# Backend API URL
REACT_APP_API_URL=http://localhost:5000/api

# WebSocket URL
REACT_APP_WS_URL=ws://localhost:5000

# Application Title
REACT_APP_TITLE=RAC Admin Portal

# Environment
REACT_APP_ENV=development
```

---

### 📁 File 3: Passenger Portal Environment

**Path:** `passenger-portal/.env`

```
📦 RAC-Reallocation-System
└── 📂 passenger-portal
    └── 📄 .env  ← CREATE THIS FILE
```

**Complete Content for `passenger-portal/.env`:**

```env
# ══════════════════════════════════════════════════════════════
# PASSENGER PORTAL ENVIRONMENT CONFIGURATION
# Location: passenger-portal/.env
# ══════════════════════════════════════════════════════════════

# Backend API URL (Vite uses VITE_ prefix)
VITE_API_URL=http://localhost:5000/api

# WebSocket URL
VITE_WS_URL=ws://localhost:5000

# Application Title
VITE_APP_TITLE=Passenger Portal

# Environment
VITE_ENV=development
```

---

### 📁 File 4: TTE Portal Environment

**Path:** `tte-portal/.env`

```
📦 RAC-Reallocation-System
└── 📂 tte-portal
    └── 📄 .env  ← CREATE THIS FILE
```

**Complete Content for `tte-portal/.env`:**

```env
# ══════════════════════════════════════════════════════════════
# TTE PORTAL ENVIRONMENT CONFIGURATION
# Location: tte-portal/.env
# ══════════════════════════════════════════════════════════════

# Backend API URL (Vite uses VITE_ prefix)
VITE_API_URL=http://localhost:5000/api

# WebSocket URL
VITE_WS_URL=ws://localhost:5000

# Application Title
VITE_APP_TITLE=TTE Portal

# Environment
VITE_ENV=development
```

---

### 📋 Quick Commands to Create All `.env` Files

**PowerShell (Windows):**
```powershell
# Create backend/.env
@"
MONGODB_URI=mongodb://localhost:27017
STATIONS_DB=rac
PASSENGERS_DB=rac
TRAIN_DETAILS_DB=rac
STATIONS_COLLECTION=17225
PASSENGERS_COLLECTION=17225_passengers
TRAIN_DETAILS_COLLECTION=Trains_Details
DEFAULT_TRAIN_NO=17225
PORT=5000
NODE_ENV=development
JWT_SECRET=rac-reallocation-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
VAPID_PRIVATE_KEY=UUxI4O8-FbRouAf7-7PVTv1qCIqAThH7t6lFQCRVnDY
VAPID_EMAIL=mailto:admin@example.com
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174
"@ | Out-File -FilePath backend\.env -Encoding UTF8

# Create frontend/.env
@"
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
REACT_APP_TITLE=RAC Admin Portal
REACT_APP_ENV=development
"@ | Out-File -FilePath frontend\.env -Encoding UTF8

# Create passenger-portal/.env
@"
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
VITE_APP_TITLE=Passenger Portal
VITE_ENV=development
"@ | Out-File -FilePath passenger-portal\.env -Encoding UTF8

# Create tte-portal/.env
@"
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
VITE_APP_TITLE=TTE Portal
VITE_ENV=development
"@ | Out-File -FilePath tte-portal\.env -Encoding UTF8

Write-Host "✅ All .env files created successfully!"
```

**Bash (Linux/Mac):**
```bash
# Create backend/.env
cat > backend/.env << 'EOF'
MONGODB_URI=mongodb://localhost:27017
STATIONS_DB=rac
PASSENGERS_DB=rac
TRAIN_DETAILS_DB=rac
STATIONS_COLLECTION=17225
PASSENGERS_COLLECTION=17225_passengers
TRAIN_DETAILS_COLLECTION=Trains_Details
DEFAULT_TRAIN_NO=17225
PORT=5000
NODE_ENV=development
JWT_SECRET=rac-reallocation-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
VAPID_PRIVATE_KEY=UUxI4O8-FbRouAf7-7PVTv1qCIqAThH7t6lFQCRVnDY
VAPID_EMAIL=mailto:admin@example.com
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174
EOF

# Create frontend/.env
cat > frontend/.env << 'EOF'
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
REACT_APP_TITLE=RAC Admin Portal
REACT_APP_ENV=development
EOF

# Create passenger-portal/.env
cat > passenger-portal/.env << 'EOF'
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
VITE_APP_TITLE=Passenger Portal
VITE_ENV=development
EOF

# Create tte-portal/.env
cat > tte-portal/.env << 'EOF'
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
VITE_APP_TITLE=TTE Portal
VITE_ENV=development
EOF

echo "✅ All .env files created successfully!"
```

---

### 📍 Summary: All `.env` File Locations

| File Path | Required | Purpose |
|-----------|----------|---------|
| `backend/.env` | **Yes** | MongoDB, JWT, Push notifications config |
| `frontend/.env` | Optional | API URL override for Admin portal |
| `passenger-portal/.env` | Optional | API URL override for Passenger portal |
| `tte-portal/.env` | Optional | API URL override for TTE portal |

> **Note**: The frontend `.env` files are optional because the apps have default API URLs configured in their source code. However, creating them is recommended for easier configuration changes.

---

### ⚡ Quick Setup: Copy Example Files

The project includes `.env.example` template files. Copy them to create your `.env` files:

**PowerShell (Windows):**
```powershell
# Run from project root folder
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
copy passenger-portal\.env.example passenger-portal\.env
copy tte-portal\.env.example tte-portal\.env

Write-Host "✅ All .env files created! Edit them as needed."
```

**Bash (Linux/Mac):**
```bash
# Run from project root folder
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp passenger-portal/.env.example passenger-portal/.env
cp tte-portal/.env.example tte-portal/.env

echo "✅ All .env files created! Edit them as needed."
```

---

## 🏃 Starting the Application

### Start MongoDB First
```bash
# Windows
mongod

# Mac/Linux
sudo systemctl start mongod
# or
mongod --dbpath /path/to/data/db
```

### Start All Servers (4 Terminals Required)

#### Terminal 1: Backend Server
```bash
cd backend
npm start        # Production mode
# or
npm run dev      # Development mode with auto-reload
```
> Backend runs on: **http://localhost:5000**

#### Terminal 2: Admin Frontend
```bash
cd frontend
npm start
```
> Admin Portal runs on: **http://localhost:3000**

#### Terminal 3: Passenger Portal
```bash
cd passenger-portal
npm run dev
```
> Passenger Portal runs on: **http://localhost:5173**

#### Terminal 4: TTE Portal
```bash
cd tte-portal
npm run dev
```
> TTE Portal runs on: **http://localhost:5174**

### Quick Start Script (All in One)
```powershell
# PowerShell - Run each in a new terminal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd passenger-portal; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd tte-portal; npm run dev"
```

---

## 📦 Dependencies Reference

### Backend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.18.2 | Web framework |
| `mongodb` | ^6.3.0 | MongoDB driver |
| `ws` | ^8.14.2 | WebSocket server |
| `jsonwebtoken` | ^9.0.2 | JWT authentication |
| `bcrypt` | ^6.0.0 | Password hashing |
| `cors` | ^2.8.5 | Cross-origin requests |
| `dotenv` | ^16.3.1 | Environment variables |
| `joi` | ^17.11.0 | Request validation |
| `nodemailer` | ^7.0.11 | Email notifications |
| `web-push` | ^3.6.7 | Browser push notifications |
| `twilio` | ^5.10.6 | SMS notifications |
| `swagger-ui-express` | ^5.0.0 | API documentation |
| `swagger-jsdoc` | ^6.2.8 | Swagger spec generator |
| `nodemon` | ^3.0.2 | Development auto-reload |

### Admin Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.2.0 | UI framework |
| `react-dom` | ^18.2.0 | DOM rendering |
| `react-router-dom` | ^7.9.5 | Client-side routing |
| `axios` | ^1.13.2 | HTTP client |
| `@mui/material` | ^7.3.5 | Material UI components |
| `@mui/icons-material` | ^7.3.5 | Material icons |
| `@emotion/react` | ^11.14.0 | CSS-in-JS |
| `@emotion/styled` | ^11.14.1 | Styled components |
| `react-hot-toast` | ^2.6.0 | Toast notifications |
| `react-scripts` | 5.0.1 | Create React App scripts |

### Passenger Portal Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.0 | UI framework |
| `react-dom` | ^19.2.0 | DOM rendering |
| `react-router-dom` | ^7.9.6 | Client-side routing |
| `axios` | ^1.13.2 | HTTP client |
| `@mui/material` | ^7.3.5 | Material UI components |
| `@mui/icons-material` | ^7.3.5 | Material icons |
| `qrcode.react` | ^4.2.0 | QR code generation |
| `vite` | ^7.2.4 | Build tool |
| `@vitejs/plugin-react` | ^5.1.1 | Vite React plugin |

### TTE Portal Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.0 | UI framework |
| `react-dom` | ^19.2.0 | DOM rendering |
| `react-router-dom` | ^7.9.6 | Client-side routing |
| `axios` | ^1.13.2 | HTTP client |
| `@mui/material` | ^7.3.5 | Material UI components |
| `@mui/icons-material` | ^7.3.5 | Material icons |
| `recharts` | ^3.4.1 | Charts and graphs |
| `vite` | ^7.2.4 | Build tool |

---

## 🔌 API Reference

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/staff/login` | Admin/TTE login |
| POST | `/auth/passenger/login` | Passenger login (PNR + IRCTC ID) |
| GET | `/auth/verify` | Verify JWT token |
| POST | `/auth/logout` | Logout |

### Train Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trains` | List available trains |
| POST | `/train/initialize` | Initialize train with data |
| POST | `/train/start-journey` | Start train journey |
| GET | `/train/state` | Get complete train state |
| POST | `/train/next-station` | Move to next station |
| POST | `/train/reset` | Reset train state |
| GET | `/train/stats` | Get train statistics |
| GET | `/train/rac-queue` | Get RAC queue |
| GET | `/train/vacant-berths` | Get vacant berths |

### Passenger Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/passengers/all` | Get all passengers |
| GET | `/passengers/status/:status` | Filter by status (CNF/RAC/WL) |
| GET | `/passengers/counts` | Get passenger counts |
| POST | `/passengers/add` | Add new passenger |
| GET | `/passenger/search/:pnr` | Search by PNR |
| GET | `/passenger/pnr/:pnr` | Get PNR details |
| POST | `/passenger/no-show` | Mark as no-show |
| POST | `/passenger/self-cancel` | Self-cancel ticket |
| POST | `/passenger/revert-no-show` | Revert no-show status |

### Reallocation System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reallocation/eligibility` | Get eligibility matrix |
| POST | `/reallocation/apply` | Apply reallocation |
| GET | `/reallocation/pending` | Get pending reallocations |
| POST | `/reallocation/approve-batch` | Approve batch reallocations |
| POST | `/reallocation/reject/:id` | Reject reallocation |
| GET | `/reallocation/approved` | Get approved reallocations |
| GET | `/reallocation/current-station-matching` | Get matching data |

### TTE Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tte/passengers` | Get all passengers (filtered) |
| GET | `/tte/boarded-passengers` | Get boarded passengers |
| POST | `/tte/mark-no-show` | Mark passenger no-show |
| POST | `/tte/revert-no-show` | Revert no-show |
| POST | `/tte/mark-boarded` | Mark passenger boarded |
| GET | `/tte/statistics` | Get journey statistics |
| GET | `/tte/upgraded-passengers` | Get upgraded passengers |
| GET | `/tte/action-history` | Get action history |

### Visualization

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/visualization/segment-matrix` | Occupancy matrix |
| GET | `/visualization/heatmap` | Occupancy heatmap |
| GET | `/visualization/graph` | Graph data |
| GET | `/visualization/berth-timeline/:coach/:berth` | Berth timeline |

### Push Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/push/vapid-public-key` | Get VAPID public key |
| POST | `/passenger/push-subscribe` | Subscribe to push |
| POST | `/passenger/push-unsubscribe` | Unsubscribe from push |

### 📖 Swagger API Documentation

The backend includes **Swagger UI** for interactive API documentation.

**Access URL:** [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

> **No API key required** - Swagger UI is open access for viewing documentation.

#### Using Swagger to Test Authenticated Endpoints:

1. **Login first** using `/api/auth/staff/login` or `/api/auth/passenger/login`
2. Copy the JWT token from the response
3. Click the **"Authorize"** button (🔓) in Swagger UI
4. Enter: `Bearer <your-jwt-token>`
5. Now you can test all authenticated endpoints

#### Example:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🧠 Server Logic Overview

### Backend Architecture

```
backend/
├── server.js                 # Main entry point (Express + WebSocket)
├── config/
│   ├── db.js                 # MongoDB connection management
│   ├── websocket.js          # WebSocket server configuration
│   └── swagger.js            # API documentation setup
├── controllers/              # Request handlers
│   ├── trainController.js    # Train state management
│   ├── passengerController.js # Passenger operations
│   ├── reallocationController.js # RAC reallocation
│   ├── tteController.js      # TTE operations
│   ├── authController.js     # Authentication
│   └── visualizationController.js # Data visualization
├── services/                 # Business logic
│   ├── ReallocationService.js # RAC upgrade logic
│   ├── StationEventService.js # Station arrival/departure
│   ├── NotificationService.js # Email/SMS/Push
│   ├── CurrentStationReallocationService.js # Station-wise matching
│   └── reallocation/
│       ├── EligibilityService.js  # 11 eligibility rules
│       ├── AllocationService.js   # Berth allocation
│       ├── VacancyService.js      # Vacant berth detection
│       └── RACQueueService.js     # RAC queue management
├── middleware/               # Request processing
│   ├── auth.js               # JWT authentication
│   └── validation.js         # Request validation
├── models/                   # Data structures
│   ├── TrainState.js         # In-memory train state
│   ├── Berth.js              # Berth model
│   └── SegmentMatrix.js      # Segment occupancy
├── routes/
│   └── api.js                # All API route definitions
└── utils/                    # Helper functions
    ├── berthAllocator.js     # Berth allocation logic
    └── helpers.js            # Utility functions
```

### Core Logic Flow

```mermaid
graph TD
    A[Train Initialize] --> B[Load Passengers from MongoDB]
    B --> C[Create Berth Grid 9 Coaches × 72 Berths]
    C --> D[Allocate CNF Passengers]
    D --> E[Create RAC Queue]
    E --> F[Start Journey]
    F --> G[Move to Station]
    G --> H[Board Passengers at From Station]
    G --> I[Deboard Passengers at To Station]
    G --> J[Detect Vacant Berths]
    J --> K[Calculate Eligibility Matrix]
    K --> L[Offer Upgrades to RAC]
    L --> M{Passenger Accepts?}
    M -->|Yes| N[Apply Reallocation]
    M -->|No| O[Offer to Next RAC]
    N --> P[Update Database]
    G --> Q[Next Station]
    Q --> G
```

### Key Services Explained

#### 1. TrainState (In-Memory State)
- Maintains complete train state in memory
- Tracks all 648 berths (9 coaches × 72 berths each)
- Manages RAC queue with priority ordering
- Tracks segment-wise occupancy for each berth

#### 2. ReallocationService
- Calculates which RAC passengers can upgrade
- Implements 11 eligibility rules:
  1. Must be RAC status
  2. Must be boarded
  3. Must be marked online (using app)
  4. Journey must overlap with vacant berth
  5. No gender conflicts (sharing constraints)
  6. Class compatibility
  7. Not already upgraded
  8. Not marked as no-show
  9. Berth must be genuinely vacant
  10. Station-wise timing checks
  11. No double-booking conflicts

#### 3. StationEventService
- Handles station arrival/departure events
- Manages boarding and deboarding
- Triggers vacancy detection at each station
- Broadcasts WebSocket events

#### 4. NotificationService
- Email notifications via Nodemailer
- SMS notifications via Twilio
- Browser push notifications via Web Push
- In-app notification storage

### WebSocket Events

| Event | Description | Payload |
|-------|-------------|---------|
| `TRAIN_UPDATE` | Train state changed | Full state object |
| `STATION_ARRIVAL` | Train arrived at station | Station details |
| `RAC_REALLOCATION` | RAC upgrade completed | Upgrade details |
| `NO_SHOW` | Passenger marked no-show | PNR, passenger info |
| `STATS_UPDATE` | Statistics updated | Stats object |

---

## 🗄️ Database Schema

### MongoDB Collections

#### `Trains_Details` Collection
```json
{
  "Train_Number": "17225",
  "Train_Name": "Amaravathi Express",
  "Stations_DB": "rac",
  "Stations_Collection": "17225",
  "Passengers_DB": "rac",
  "Passengers_Collection": "17225_passengers"
}
```

#### Stations Collection (e.g., `17225`)
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
  "Division": "BZA"
}
```

#### Passengers Collection (e.g., `17225_passengers`)
```json
{
  "PNR_Number": "1234567890",
  "Passenger_Name": "John Doe",
  "Age": 30,
  "Gender": "Male",
  "Boarding_Station": "NS",
  "Deboarding_Station": "HBD",
  "PNR_Status": "CNF",
  "Rac_status": "-",
  "Assigned_Coach": "S1",
  "Assigned_berth": 15,
  "Berth_Type": "LB",
  "Mobile_Number": "9876543210",
  "Email": "john@example.com",
  "IRCTC_ID": "john123",
  "Boarded": false,
  "No_Show": false,
  "Online_Status": false
}
```

#### `tte_users` Collection (Authentication)
```json
{
  "username": "tte1",
  "password": "$2b$10$...",  // bcrypt hash
  "name": "TTE User",
  "role": "TTE",
  "train_no": "17225"
}
```

#### `admin_users` Collection
```json
{
  "username": "admin",
  "password": "$2b$10$...",  // bcrypt hash
  "name": "Admin User",
  "role": "ADMIN"
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service
# Windows
net start MongoDB

# Linux
sudo systemctl start mongod
```

#### 2. Port Already in Use
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (Windows)
taskkill /PID <process-id> /F

# Linux/Mac
lsof -i :5000
kill -9 <PID>
```

#### 3. Node Modules Issues
```bash
# Clear and reinstall
cd backend
rm -rf node_modules package-lock.json
npm install
```

#### 4. CORS Errors
- Check `ALLOWED_ORIGINS` in `.env` includes all frontend URLs
- Ensure backend is running before starting frontends

#### 5. WebSocket Connection Failed
- Verify backend is running on port 5000
- Check browser console for connection errors
- Ensure no firewall blocking WebSocket connections

### Logs & Debugging

```bash
# Run backend with debug output
cd backend
NODE_ENV=development npm run dev

# Check MongoDB logs
# Windows: C:\Program Files\MongoDB\Server\X.0\log\
# Linux: /var/log/mongodb/mongod.log
```

---

## 📞 Support

- **Documentation**: See `docs/` folder for detailed guides
- **API Docs**: Visit `http://localhost:5000/api-docs` when server is running
- **Issues**: Create an issue on GitHub repository

---

## 🎉 Quick Test

After starting all servers:

1. Open **http://localhost:3000** (Admin Portal)
2. Login with default admin credentials
3. Click **"Config"** tab to set up train
4. Enter MongoDB URI and train details
5. Click **"Initialize Train"**
6. Click **"Start Journey"**
7. Navigate to **"Passengers"** to see loaded data

Congratulations! Your RAC Reallocation System is now running! 🚂

---

*Last Updated: December 2025*
