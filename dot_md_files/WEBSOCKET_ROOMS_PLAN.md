# WebSocket Rooms Migration Plan

**Category:** Performance Optimization / Architecture  
**Priority:** Medium  
**Effort:** Major (1-2 weeks)  
**Status:** NOT STARTED

---

## What is the Problem?

Currently, the backend uses the `ws` library which broadcasts all messages to ALL connected clients:

```
Current Flow:
TTE approves upgrade
    ↓
Server broadcasts to ALL 100+ connected clients
    ↓
Each client filters: "Is this message for me?"
    ↓
Only 2-3 clients actually needed it
    ↓
RESULT: 90% wasted network traffic
```

---

## What is WebSocket Rooms?

**Socket.io rooms** allow targeted message delivery:

```
With Rooms:
TTE approves upgrade
    ↓
Server sends to:
├─ "passenger_IR0001" room (specific passenger)
├─ "admin_dashboard" room (admins only)
└─ "train_17225" room (relevant train watchers)
    ↓
Only 3 clients receive the message
    ↓
RESULT: 97% network traffic reduction
```

---

## Is This a Security Feature?

**NO** - This is a **performance optimization**.

| Security | Performance |
|----------|-------------|
| Already implemented | Not yet optimized |
| JWT tokens verify identity | Broadcasting is wasteful |
| Role-based access control | All clients receive unnecessary data |
| Messages are authorized | Just inefficient delivery |

**No security risk** - clients can only act on messages they're authorized for. Just wasteful bandwidth.

---

## Proposed Room Structure

```
Room Naming Convention:
├─ "train_{trainNo}" → All users viewing train 17225
├─ "passenger_{irctcId}" → Specific passenger notifications
├─ "tte_{tteId}" → TTE-specific events
├─ "admin_dashboard" → Admin metrics only
└─ "global" → System-wide announcements
```

---

## Implementation Steps

### Phase 1: Install socket.io
```bash
cd backend
npm install socket.io socket.io-client
```

### Phase 2: Update WebSocket Manager
File: `backend/config/websocket.js`

Replace `ws` setup with:
```javascript
const { Server } = require('socket.io');

const io = new Server(httpServer, {
  cors: {
    origin: [...],
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  const { userId, role, trainNo } = socket.handshake.query;
  
  // Join appropriate rooms
  socket.join(`train_${trainNo}`);
  
  if (role === 'ADMIN') {
    socket.join('admin_dashboard');
  } else if (role === 'TTE') {
    socket.join(`tte_${userId}`);
  } else if (role === 'PASSENGER') {
    socket.join(`passenger_${userId}`);
  }
  
  socket.on('disconnect', () => {
    // Automatic cleanup by socket.io
  });
});
```

### Phase 3: Update Broadcast Calls
Replace:
```javascript
wsManager.broadcast({ type: 'RAC_UPGRADE', data });
```

With:
```javascript
io.to(`passenger_${irctcId}`).emit('RAC_UPGRADE', data);
io.to('admin_dashboard').emit('STATS_UPDATE', summary);
```

### Phase 4: Update Frontend Clients
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  query: {
    userId: user.id,
    role: user.role,
    trainNo: currentTrain
  }
});

socket.on('RAC_UPGRADE', (data) => {
  // Handle upgrade notification
});
```

---

## Files to Modify

| File | Change |
|------|--------|
| `backend/config/websocket.js` | Replace ws with socket.io |
| `backend/server.js` | Update socket initialization |
| `backend/services/*` | Update broadcast calls |
| `frontend/src/hooks/useWebSocket.ts` | Switch to socket.io-client |
| `tte-portal/src/hooks/useWebSocket.ts` | Switch to socket.io-client |
| `passenger-portal/src/hooks/useWebSocket.ts` | Switch to socket.io-client |

---

## Benefits

| Metric | Before | After |
|--------|--------|-------|
| Messages per event | 100+ | 2-5 |
| Network bandwidth | High | 95% reduced |
| Client processing | Filter every message | Only relevant ones |
| Scalability | Poor | Good |

---

## When to Implement

**Not urgent** - current system works, just inefficient.

Implement when:
- User count exceeds 50+ concurrent
- Network bandwidth becomes a concern
- Preparing for production scale

---

**Status:** NOT STARTED (Plan for Future Implementation)  
**Last Updated:** December 23, 2025
