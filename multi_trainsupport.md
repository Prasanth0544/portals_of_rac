## Multi Train Support
 — even those monitoring a different train. With 1000 trains × 200 passengers each, a single station arrival event would be sent to 200,000 clients instead of just 200.

**Solution:** Implement train-specific WebSoc
### 1. WebSocket Rooms

**Problem:** Currently, the system supports only a single train at a time. When scaling to multiple trains, all WebSocket messages (station arrivals, boarding updates, upgrade offers) would be broadcast to every connected clientket "rooms". When a client connects, it subscribes to a specific `trainNo`. The server tags the WebSocket connection and only sends messages to clients in that train's room.

**How it works:**
- Client sends `{ type: 'SUBSCRIBE_TRAIN', trainNo: '12345' }` on connect
- Server stores `ws.trainNo = '12345'` on the connection
- New method `broadcastToTrain(trainNo, data)` replaces `broadcast()` — only iterates clients matching that `trainNo`
- All existing `broadcastTrainUpdate()` calls route through `broadcastToTrain()` using the train's number

**Architecture:**
- Each train gets its own isolated message channel
- Passengers, TTEs, and admins on Train 12345 only receive updates for Train 12345
- Targeted sends (`sendToUser`, `sendToTTEs`) already work per-user — rooms add the train-level isolation layer on top
- Combined with the existing IDENTIFY system: a client would send both `SUBSCRIBE_TRAIN` (which train) and `IDENTIFY` (who am I)

**Impact:** With N trains, broadcast traffic reduced by **Nx** — each message reaches only the ~200 clients on that train instead of all connected clients across all trains

---

2. **Background Job Queue for Notifications** — Offload push + email to in-memory background queue so API returns instantly (✅ Implemented)

---

3. **HashMap for Passenger Lookups** — Replace O(n) `array.find()` scans with O(1) `Map.get()` lookups in TrainState (✅ Implemented)

---

4. **Batch DB Writes** — Replace individual `updateOne()` calls with single `bulkWrite()` to reduce DB round-trips (✅ Implemented)

---

5. **Targeted WebSocket Messages** — Send messages to specific users via `sendToUser(irctcId)` or roles via `sendToTTEs()` instead of broadcasting to all clients (✅ Implemented)

---

## Summary

| # | Optimization | Speedup | Status |
|---|---|---|---|
| 1 | WebSocket Rooms | 1000x (multi-train) | Pending |
| 2 | Background Queue | API instant | ✅ Done |
| 3 | HashMap Lookups | 100-1000x | ✅ Done |
| 4 | Batch DB Writes | Nx faster | ✅ Done |
| 5 | Targeted WS Send | 200x less traffic | ✅ Done |