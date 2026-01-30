# Push Notification Errors - Root Cause Analysis

## Overview

Two distinct bugs prevented web push notifications from working in the RAC portals.

---

## 🐛 Bug #1: localStorage Key Mismatch (Passenger Portal)

### Location
`passenger-portal/src/services/pushNotificationService.ts` (line 102)

### The Problem

```javascript
// ❌ BROKEN CODE
const irctcId = localStorage.getItem('irctcId');  // Returns NULL!
```

The code was trying to read a localStorage key `'irctcId'` that **never existed**.

### Why It Happened

Looking at `LoginPage.tsx`, the login flow stores user data like this:

```javascript
// LoginPage.tsx (lines 24-29)
localStorage.setItem('token', response.token);
localStorage.setItem('user', JSON.stringify(response.user));  // ← User object stored here
localStorage.setItem('tickets', JSON.stringify(response.tickets));
```

The `user` object contains `IRCTC_ID` as a property:
```javascript
{
  "name": "Prasanth Gannavarapu",
  "IRCTC_ID": "IR_0001",   // ← The ID is INSIDE the user object
  "email": "...",
  ...
}
```

But the push notification service was looking for a **separate** localStorage key `'irctcId'` which was never set.

### The Fix

```javascript
// ✅ FIXED CODE
const userStr = localStorage.getItem('user');
const user = userStr ? JSON.parse(userStr) : null;
const irctcId = user?.IRCTC_ID || user?.irctcId;  // Extract from user object
```

### Impact
- Subscription requests sent `null` as the IRCTC ID
- Backend received: `{ irctcId: null, subscription: {...} }`
- MongoDB tried to save with null userId

---

## 🐛 Bug #2: MongoDB Unique Index on Non-Existent Field

### Location
- `backend/scripts/createIndexes.js` (line 112-115)
- MongoDB collection: `rac.push_subscriptions`

### The Problem

An index was created expecting an `identifier` field:

```javascript
// ❌ Index definition in createIndexes.js
await pushSubsCollection.createIndex(
    { identifier: 1 },
    { unique: true, name: 'idx_push_subscriptions_identifier' }
);
```

But `PushSubscriptionService.js` uses completely different fields:

```javascript
// How documents are actually structured in PushSubscriptionService.js
{
    type: 'passenger',           // ← Used for queries
    userId: 'IR_0001',           // ← Used for queries  
    subscription: {
        endpoint: 'https://...',  // ← Used for queries
        keys: {...}
    },
    // identifier: ???  ← THIS FIELD DOESN'T EXIST!
}
```

### The Error Message

```
MongoServerError: E11000 duplicate key error collection: rac.push_subscriptions 
index: idx_push_subscriptions_identifier 
dup key: { identifier: null }
```

### Why This Error Occurs

MongoDB's unique index enforces that every document must have a unique value for `identifier`. When:

1. First subscription saved → `identifier` field is missing → MongoDB treats it as `null`
2. Second subscription saved → `identifier` is also `null`
3. **CONFLICT!** → Two documents with `identifier: null` violates unique constraint

### The Fix

1. **Dropped the problematic index:**
```javascript
db.collection('push_subscriptions').dropIndex('idx_push_subscriptions_identifier');
```

2. **Updated createIndexes.js for future runs:**
```javascript
// ✅ FIXED: Uses the actual fields from PushSubscriptionService
await pushSubsCollection.createIndex(
    { type: 1, userId: 1, 'subscription.endpoint': 1 },
    { unique: true, name: 'idx_push_subscriptions_compound' }
);
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      BEFORE FIX (BROKEN)                        │
└─────────────────────────────────────────────────────────────────┘

User Login
    │
    ▼
localStorage.setItem('user', JSON.stringify({IRCTC_ID: 'IR_0001', ...}))
    │
    ▼
Push Service runs subscribeToPushNotifications()
    │
    ▼
localStorage.getItem('irctcId')  ──────────────►  Returns NULL ❌
    │
    ▼
POST /api/passenger/push-subscribe
Body: { irctcId: null, subscription: {...} }
    │
    ▼
MongoDB insert with userId: null
    │
    ▼
Unique index on 'identifier' field → field is missing → treated as null
    │
    ▼
Second request → another null → DUPLICATE KEY ERROR ❌


┌─────────────────────────────────────────────────────────────────┐
│                       AFTER FIX (WORKING)                       │
└─────────────────────────────────────────────────────────────────┘

User Login
    │
    ▼
localStorage.setItem('user', JSON.stringify({IRCTC_ID: 'IR_0001', ...}))
    │
    ▼
Push Service runs subscribeToPushNotifications()
    │
    ▼
localStorage.getItem('user') → JSON.parse() → user.IRCTC_ID ──► 'IR_0001' ✅
    │
    ▼
POST /api/passenger/push-subscribe
Body: { irctcId: 'IR_0001', subscription: {...} }
    │
    ▼
MongoDB upsert with userId: 'IR_0001'
    │
    ▼
No conflicting index → Document saved successfully ✅
```

---

## Files Modified

| File | Change |
|------|--------|
| `passenger-portal/src/services/pushNotificationService.ts` | Fixed IRCTC ID extraction from user object |
| `backend/scripts/createIndexes.js` | Changed index from `identifier` to compound `{type, userId, endpoint}` |

## MongoDB Commands Executed

```javascript
// Dropped the problematic index
db.push_subscriptions.dropIndex('idx_push_subscriptions_identifier')
```

---

## Lessons Learned

1. **Always verify localStorage keys match between components** - The login page and push service were written separately without coordinating the key names.

2. **MongoDB indexes must match actual document structure** - The index script was likely copy-pasted or written without checking how `PushSubscriptionService.js` actually structures documents.

3. **Unique indexes on missing fields = null collision** - MongoDB treats missing fields as `null`, and unique indexes don't allow duplicate nulls (unless you use `sparse: true`).
