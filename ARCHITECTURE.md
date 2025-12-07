# 🏗️ System Architecture

> **High-level description of the RAC Reallocation System**

## Overview

A **real-time Railway RAC (Reservation Against Cancellation) seat reallocation system** that enables dynamic seat upgrades for RAC passengers when confirmed berths become vacant.

---

## System Components

```
RAC-Reallocation-System/
├── backend/              # Node.js REST API + WebSocket Server
├── frontend/             # Admin Portal (Vite + React)
├── passenger-portal/     # Passenger Portal (Vite + React)
└── tte-portal/           # TTE Portal (Vite + React)
```

| Component | Tech Stack | Port | Purpose |
|-----------|------------|------|---------|
| **Backend** | Node.js, Express, MongoDB, WebSocket | 5000 | REST API & real-time updates |
| **Admin Portal** | Vite, React 19, Material-UI | 3000 | Train initialization & monitoring |
| **Passenger Portal** | Vite, React 19, Material-UI | 5173 | PNR check & upgrade acceptance |
| **TTE Portal** | Vite, React 19, Material-UI | 5174 | Verification & reallocation approval |

---

## Backend Architecture

### Core Layers

```
backend/
├── server.js           # Express + WebSocket entry point
├── routes/api.js       # 30+ REST endpoints
├── controllers/        # Request handlers (thin, delegate to services)
├── services/           # Business logic
├── models/             # TrainState, Berth, SegmentMatrix
├── middleware/         # Auth, validation, error handling
├── config/             # Database, WebSocket, Swagger
└── utils/              # Helpers, error classes
```

### Key Services

| Service | Purpose |
|---------|---------|
| `ReallocationService` | Orchestrates RAC upgrades |
| `EligibilityService` | Two-stage eligibility checking |
| `NoShowService` | Handles no-show marking |
| `RACQueueService` | Manages RAC passenger queue |
| `VacancyService` | Tracks vacant berths |
| `NotificationService` | Email/SMS/Push notifications |
| `StationEventService` | Station arrival/departure events |

### Error Handling

Centralized error handling with custom error classes:

```javascript
// AppError, ValidationError, NotFoundError, AuthenticationError, etc.
// Global middleware returns consistent JSON:
{ success: false, error: { code, message, statusCode, timestamp } }
```

---

## Frontend Portals

### Admin Portal (`frontend/`)

- Train initialization with MongoDB data
- Real-time coach/berth visualization
- Segment-based occupancy matrix
- Station-wise reallocation phase controls

### Passenger Portal (`passenger-portal/`)

- IRCTC ID login
- PNR status check
- Real-time upgrade offer notifications with countdown
- Accept/deny upgrade decisions
- QR code boarding pass generation

### TTE Portal (`tte-portal/`)

- TTE authentication
- Passenger boarding verification
- No-show marking with reasons
- RAC reallocation approval workflow
- Journey progression controls

---

## Data Flow

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Portals   │◄──────────────────►│   Backend   │
│  (React)    │     REST API       │  (Express)  │
└─────────────┘                    └──────┬──────┘
                                          │
                                   ┌──────▼──────┐
                                   │   MongoDB   │
                                   │  (rac DB)   │
                                   └─────────────┘
```

---

## Core Concepts

### Segment-Based Occupancy

Berths are tracked per journey **segment** (station-to-station), not per passenger. This allows the same berth to serve multiple passengers on non-overlapping journey segments.

```
Station:  A ─────── B ─────── C ─────── D
Berth 1:  [Passenger X]      [Passenger Y]
          (A→B)              (C→D)
```

### RAC Reallocation Flow

1. **No-Show Detected** → CNF berth becomes vacant
2. **Eligibility Check** → Find RAC passengers with journey overlap
3. **TTE Approval** → TTE reviews and approves reallocation
4. **Passenger Notification** → Push notification with 5-minute timer
5. **Acceptance** → Passenger accepts, status changes from RAC → CNF
6. **Database Update** → MongoDB updated with new berth assignment

### Two-Stage Eligibility

| Stage | Rules Checked |
|-------|---------------|
| **Stage 1** (Hard) | RAC status, boarded, journey overlap, class match, min distance |
| **Stage 2** (Soft) | Co-passenger constraints, online status, no pending offers |

---

## Database Schema

### Collections

| Collection | Purpose |
|------------|---------|
| `17225` | Station data for train 17225 |
| `17225_passengers` | Passenger records |
| `Trains_Details` | Train configuration |
| `users` | Admin/TTE/Passenger accounts |
| `push_subscriptions` | Web push subscriptions |

### Key Passenger Fields

```javascript
{
  PNR_Number: "1234567890",
  Passenger_Name: "John Doe",
  PNR_Status: "RAC",           // CNF, RAC, WL
  Rac_status: "RAC 1",
  Assigned_Coach: "B1",
  Assigned_berth: "12",
  Boarding_Station: "HYB",
  Deboarding_Station: "MAS",
  Passenger_Status: "Online",   // Online, Offline
  Boarded: true,
  NO_show: false
}
```

---

## API Overview

| Category | Key Endpoints |
|----------|---------------|
| **Train** | `POST /train/initialize`, `GET /train/state`, `POST /train/next-station` |
| **Passenger** | `GET /passenger/search/:pnr`, `POST /passenger/no-show` |
| **Reallocation** | `GET /reallocation/eligibility`, `POST /reallocation/apply` |
| **Auth** | `POST /auth/login`, `POST /auth/register` |
| **TTE** | `POST /tte/approve-reallocation`, `GET /tte/pending-reallocations` |

Full API documentation: http://localhost:5000/api-docs

---

## Notification System

| Channel | Technology | Use Case |
|---------|------------|----------|
| **Push** | Web Push API (VAPID) | Real-time upgrade offers |
| **WebSocket** | ws library | Live train state updates |
| **Email** | Nodemailer (Gmail) | Ticket confirmations (optional) |
| **SMS** | Twilio | Urgent alerts (optional) |

---

## Tech Stack Summary

| Layer | Technologies |
|-------|--------------|
| **Backend** | Node.js 14+, Express.js 4.x, MongoDB 6.x, WebSocket (ws) |
| **Frontend** | Vite, React 19, Material-UI 7.x, Axios |
| **Auth** | JWT tokens, bcrypt password hashing |
| **Validation** | Joi schemas, custom middleware |
| **Documentation** | Swagger/OpenAPI |

---

**For setup instructions, see [QUICKSTART.md](QUICKSTART.md)**
