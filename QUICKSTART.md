# 🚀 Quick Start Guide

> **How to run the RAC Reallocation System**

## Prerequisites

- **Node.js** v14+ ([nodejs.org](https://nodejs.org/))
- **MongoDB** v4+ running locally
- **npm** v6+ (comes with Node.js)

```bash
# Verify installation
node --version && npm --version && mongod --version
```

---

## Installation (One-Time)

### 1. Install Dependencies

```bash
# Run from project root
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd passenger-portal && npm install && cd ..
cd tte-portal && npm install && cd ..
```

### 2. Setup Environment

```bash
# Copy environment template
copy backend\.env.example backend\.env    # Windows
cp backend/.env.example backend/.env      # Linux/Mac
```

### 3. Create Test Accounts

```bash
# Requires MongoDB running
cd backend
node scripts/createTestAccounts.js
```

This creates:

| Account | Username | Password |
|---------|----------|----------|
| Admin | `ADMIN_01` | `Prasanth@123` |
| TTE | `TTE_01` | `Prasanth@123` |
| Passenger | `IR_0001` | `Prasanth@123` |

---

## Running the Application

### Start MongoDB First

```bash
mongod                          # Windows
sudo systemctl start mongod     # Linux
```

### Start All Servers (4 terminals)

| Terminal | Command | URL |
|----------|---------|-----|
| 1. Backend | `cd backend && npm run dev` | http://localhost:5000 |
| 2. Admin Portal | `cd frontend && npm run dev` | http://localhost:3000 |
| 3. Passenger Portal | `cd passenger-portal && npm run dev` | http://localhost:5173 |
| 4. TTE Portal | `cd tte-portal && npm run dev` | http://localhost:5174 |

### Windows PowerShell - Start All at Once

```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd passenger-portal; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd tte-portal; npm run dev"
```

---

## Access URLs

| Portal | URL | Login |
|--------|-----|-------|
| **Admin Portal** | http://localhost:3000 | `ADMIN_01` / `Prasanth@123` |
| **TTE Portal** | http://localhost:5174 | `TTE_01` / `Prasanth@123` |
| **Passenger Portal** | http://localhost:5173 | `IR_0001` / `Prasanth@123` |
| **API Docs (Swagger)** | http://localhost:5000/api-docs | - |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection failed | Run `mongod` in a separate terminal |
| Login fails | Run `node scripts/createTestAccounts.js` |
| Port already in use | Kill the process or change port in `.env` |
| CORS errors | Backend CORS is configured for all default ports |

---

## Push Notifications (Optional)

Generate VAPID keys for browser push notifications:

```bash
cd backend
npx web-push generate-vapid-keys
```

Add the generated keys to `backend/.env`:

```env
VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_EMAIL=mailto:your-email@example.com
```

---

**For detailed architecture, see [ARCHITECTURE.md](ARCHITECTURE.md)**
