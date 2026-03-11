# Phase 2: New Collections Implementation Plan

> **Priority:** After the main v2 backend migration (v2_backend_architecture.md) is complete.
> These 5 collections add analytics, audit trails, and caching on top of the working system.

---

## 1. `journey_history`

Tracks every completed journey. Shows to passengers in profile, used in analytics dashboard.

```javascript
{
    _id: ObjectId,
    train_number: "17225",
    train_name: "Narsapur Express",
    journey_date: "10-03-2026",
    
    // Journey stats
    total_passengers: 450,
    total_stations: 28,
    journey_duration: "19h 10m",
    distance_km: 831,
    
    // RAC performance
    total_rac_passengers: 24,
    total_upgrades: 18,
    total_no_shows: 3,
    upgrade_success_rate: 75.0,        // percentage
    
    // Timeline
    started_at: ISODate("2026-03-10T04:10:00Z"),
    completed_at: ISODate("2026-03-10T23:20:00Z"),
    status: "COMPLETED",               // COMPLETED | CANCELLED | IN_PROGRESS
    
    // Station-wise summary
    station_events: [
        {
            station_code: "NSL",
            station_name: "Narasaraopet",
            arrived_at: ISODate,
            boarded: 12,
            deboarded: 0,
            no_shows: 1,
            upgrades: 2
        }
    ]
}
```

**Indexes:**
```javascript
{ train_number: 1, journey_date: 1 }   // compound unique
{ status: 1 }
{ completed_at: -1 }                    // recent journeys first
```

**Populated by:** `trainController.js` when journey completes → call `JourneyHistoryService.recordCompletion(trainState)`

---

## 2. `upgrade_history`

Complete audit trail of every upgrade decision. **Critical for SIH demo — judges want proof the algorithm works.**

```javascript
{
    _id: ObjectId,
    train_number: "17225",
    journey_date: "10-03-2026",
    
    // Who was upgraded
    passenger_pnr: "4521234567",
    passenger_name: "Rajesh Kumar",
    passenger_index: 1,
    
    // From → To
    from_status: "RAC",
    to_status: "CNF",
    from_coach: "S3",
    from_berth: "7",                    // Side Lower (shared)
    to_coach: "S5",
    to_berth: "42",                     // Full berth
    from_class: "SL",
    to_class: "SL",                     // or "3AC" for cross-class
    
    // Why (algorithm decision)
    upgrade_type: "STATION_VACANCY",    // STATION_VACANCY | NO_SHOW | CROSS_CLASS
    triggered_by: "deboarding",         // deboarding | no_show | manual
    triggered_at_station: "GNT",
    triggered_at_station_idx: 5,
    
    // Approval
    approval_status: "APPROVED",        // APPROVED | REJECTED | AUTO_APPROVED | PENDING
    approved_by: "TTE_EMP001",          // TTE employee ID or "SYSTEM"
    approved_at: ISODate,
    rejection_reason: null,
    
    // Timing
    created_at: ISODate,
    notification_sent_at: ISODate,
    response_received_at: ISODate,
    time_to_respond_ms: 4500
}
```

**Indexes:**
```javascript
{ train_number: 1, journey_date: 1 }   // all upgrades for a journey
{ passenger_pnr: 1 }                   // upgrades per passenger
{ upgrade_type: 1 }                    // filter by type
{ approval_status: 1 }                // filter by status
{ created_at: -1 }                    // recent first
```

**Populated by:** `StationEventService.js` / `ReallocationService.js` → call `UpgradeHistoryService.record()` on every upgrade

---

## 3. `analytics`

Performance metrics. Powers the analytics dashboard.

```javascript
{
    _id: ObjectId,
    period: "daily",                    // daily | weekly | monthly
    date: "2026-03-10",
    
    // Volume
    total_journeys: 5,
    total_passengers: 2250,
    total_rac_passengers: 120,
    
    // Performance
    total_upgrades: 89,
    upgrade_success_rate: 74.2,
    avg_upgrade_time_ms: 3200,
    no_show_rate: 4.5,
    
    // Algorithm metrics
    berth_utilization_pct: 92.3,
    segment_fill_rate: 87.1,
    preference_match_rate: 68.0,
    cross_class_upgrades: 12,
    
    // Response times
    avg_api_response_ms: 45,
    p95_api_response_ms: 120,
    websocket_messages_sent: 1450,
    
    // System
    peak_concurrent_users: 34,
    errors_count: 0,
    
    created_at: ISODate
}
```

**Indexes:**
```javascript
{ period: 1, date: -1 }               // compound - latest first per period
```

**Populated by:** `AnalyticsService.js` → aggregates from `journey_history` + `upgrade_history` daily

---

## 4. `train_schedule_cache`

Cached active train data from RailwayData. Avoids re-querying `train_info` + `coach_positions` on every API call. Auto-cleaned by TTL index.

```javascript
{
    _id: ObjectId,
    train_number: "17225",
    train_name: "Narsapur Express",
    
    // From train_info
    train_type: "MEX",
    running_days: "1111111",
    src_station_code: "NS",
    dest_station_code: "UBL",
    total_stops: 28,
    distance_km: 831,
    
    // From coach_positions
    coaches: ["L", "SLR", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "B1", "SLR"],
    sleeper_count: 9,
    ac3_count: 1,
    ac2_count: 0,
    total_coaches: 13,
    rake_type: "ICF Rake",
    
    // Cache metadata
    cached_at: ISODate,
    expires_at: ISODate              // TTL index — auto-delete after 24h
}
```

**Indexes:**
```javascript
{ train_number: 1 }                    // unique
{ expires_at: 1, expireAfterSeconds: 0 }  // TTL auto-cleanup
```

**Populated by:** `RailwayDataService.getTrainWithCoaches()` → cache-aside pattern (check cache → miss → query → store)

---

## 5. `system_config`

Global app settings. Replaces hardcoded values in code.

```javascript
// RAC algorithm settings
{ key: "rac_settings", value: {
    auto_upgrade_enabled: true,
    max_cross_class_jump: 1,        // SL→3AC ok, SL→2AC not
    no_show_timeout_minutes: 15,
    upgrade_notification_timeout_ms: 30000,
    tte_auto_confirm_minutes: 15,
    preference_weight_senior: 3,
    preference_weight_women: 2,
    preference_weight_adult: 1,
    websocket_heartbeat_ms: 30000
}, updated_at: ISODate, updated_by: "admin" }

// App metadata
{ key: "app_version", value: "2.0.0" }
{ key: "maintenance_mode", value: false }
{ key: "allowed_origins", value: ["https://admin.rac.com"] }
```

**Indexes:**
```javascript
{ key: 1 }                             // unique
```

**Populated by:** Manual / admin API → `SystemConfigService.get()` / `.set()`

---

## Implementation Order

```
Step 1: Create empty collections + indexes in MongoDB
Step 2: Build service layer (5 new services)
Step 3: Wire into existing flow:
        - journey_history ← trainController (on journey complete)
        - upgrade_history ← ReallocationService (on every upgrade)
        - analytics ← cron job / on-demand aggregation
        - train_schedule_cache ← RailwayDataService (cache-aside)
        - system_config ← admin API
Step 4: Build API endpoints for reading (dashboard, history)
```

## New Files Needed

```
backend/services/JourneyHistoryService.js     [NEW]
backend/services/UpgradeHistoryService.js      [NEW]
backend/services/AnalyticsService.js           [NEW]
backend/services/SystemConfigService.js        [NEW]
backend/controllers/analyticsController.js     [NEW]
backend/routes/analyticsRoutes.js              [NEW]
```
