# RAC System - REST API Documentation

**Total APIs: 85** (GET: 40, POST: 45)

---

## 🔐 Authentication APIs (5)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/staff/login` | Staff (Admin/TTE) login |
| POST | `/auth/passenger/login` | Passenger login |
| GET | `/auth/verify` | Verify JWT token |
| POST | `/auth/logout` | Logout user |
| POST | `/auth/refresh` | Refresh access token |

---

## 📱 OTP APIs (2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/otp/send` | Send OTP for verification |
| POST | `/otp/verify` | Verify OTP code |

---

## 🚂 Train Operations APIs (8)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trains` | List all trains |
| POST | `/train/initialize` | Initialize train with data |
| POST | `/train/start-journey` | Start the journey |
| GET | `/train/state` | Get current train state |
| POST | `/train/next-station` | Move to next station |
| POST | `/train/reset` | Reset train state |
| GET | `/train/stats` | Get train statistics |
| GET | `/train/allocation-errors` | Get allocation errors |

---

## ⚙️ Configuration APIs (2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/config/setup` | Setup dynamic configuration |
| GET | `/config/current` | Get current config |

---

## 🔄 Reallocation & Upgrade APIs (13)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reallocation/apply` | Apply reallocation manually |
| GET | `/reallocation/eligibility` | Get eligibility matrix |
| GET | `/reallocation/pending` | Get pending reallocations |
| POST | `/reallocation/approve-batch` | Approve batch of reallocations |
| POST | `/reallocation/reject/:id` | Reject specific reallocation |
| GET | `/reallocation/station-wise` | Get station-wise data |
| GET | `/reallocation/approved` | Get approved reallocations |
| GET | `/reallocation/current-station-matching` | Get current station matching |
| POST | `/reallocation/create-from-matches` | Create pending from matches |
| GET | `/reallocation/upgrade-status` | Get upgrade lock status |
| POST | `/reallocation/upgrade/:upgradeId/approve` | Approve upgrade |
| POST | `/reallocation/upgrade/:upgradeId/reject` | Reject upgrade |
| POST | `/reallocation/reset-upgrade-lock` | Reset upgrade lock |

---

## 👤 Passenger APIs (18)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/passenger/available-boarding-stations/:pnr` | Get available boarding stations |
| POST | `/passenger/change-boarding-station` | Change boarding station |
| POST | `/passenger/self-cancel` | Self-cancel ticket |
| POST | `/passenger/approve-upgrade` | Approve own upgrade |
| GET | `/passenger/pending-upgrades/:irctcId` | Get pending upgrades |
| POST | `/passenger/revert-no-show` | Revert no-show status |
| POST | `/passenger/no-show` | Mark as no-show |
| GET | `/passenger/search/:pnr` | Search by PNR |
| GET | `/passenger/pnr/:pnr` | Get PNR details |
| GET | `/passengers/by-irctc/:irctcId` | Get by IRCTC ID |
| POST | `/passenger/cancel` | Cancel ticket |
| POST | `/passenger/set-status` | Set online/offline status |
| GET | `/passenger/upgrade-notifications/:pnr` | Get upgrade notifications |
| POST | `/passenger/accept-upgrade` | Accept upgrade offer |
| POST | `/passenger/deny-upgrade` | Deny upgrade offer |
| GET | `/passengers/all` | Get all passengers |
| GET | `/passengers/status/:status` | Get by status |
| GET | `/passengers/counts` | Get passenger counts |
| POST | `/passengers/add` | Add new passenger |

---

## 🎫 TTE Portal APIs (16)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tte/mark-no-show` | Mark passenger no-show |
| POST | `/tte/revert-no-show` | Revert no-show |
| POST | `/tte/offline-upgrades/add` | Add offline upgrade |
| GET | `/tte/offline-upgrades` | Get offline upgrades |
| POST | `/tte/offline-upgrades/confirm` | Confirm offline upgrade |
| POST | `/tte/offline-upgrades/reject` | Reject offline upgrade |
| GET | `/tte/action-history` | Get action history |
| POST | `/tte/undo` | Undo action |
| GET | `/tte/passengers` | Get all passengers filtered |
| GET | `/tte/boarded-passengers` | Get boarded passengers |
| GET | `/tte/boarded-rac-passengers` | Get boarded RAC passengers |
| POST | `/tte/mark-boarded` | Mark as boarded |
| POST | `/tte/mark-deboarded` | Mark as deboarded |
| POST | `/tte/confirm-upgrade` | Confirm upgrade |
| GET | `/tte/statistics` | Get statistics |
| GET | `/tte/upgraded-passengers` | Get upgraded passengers |
| GET | `/tte/boarding-queue` | Get boarding queue |
| POST | `/tte/confirm-all-boarded` | Confirm all boarded |

---

## 🛡️ Admin APIs (2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/fix-rac-boarding` | Fix RAC boarding status |
| POST | `/admin/push-subscribe` | Admin push subscribe |

---

## 📊 Visualization APIs (6)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/visualization/station-schedule` | Get station schedule |
| GET | `/visualization/segment-matrix` | Get segment matrix |
| GET | `/visualization/graph` | Get graph data |
| GET | `/visualization/heatmap` | Get heatmap data |
| GET | `/visualization/berth-timeline/:coach/:berth` | Get berth timeline |
| GET | `/visualization/vacancy-matrix` | Get vacancy matrix |

---

## 🔔 Push Notification APIs (8)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/push/vapid-public-key` | Get VAPID public key |
| GET | `/push/vapid-key` | Get VAPID key |
| POST | `/passenger/push-subscribe` | Passenger push subscribe |
| POST | `/passenger/push-unsubscribe` | Passenger push unsubscribe |
| GET | `/passenger/notifications` | Get in-app notifications |
| POST | `/passenger/notifications/:id/read` | Mark notification read |
| POST | `/passenger/notifications/mark-all-read` | Mark all read |
| POST | `/tte/push-subscribe` | TTE push subscribe |

---

## 🚃 Queue APIs (2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/train/rac-queue` | Get RAC queue |
| GET | `/train/vacant-berths` | Get vacant berths |

---

## Summary

| Category | Count |
|----------|-------|
| Authentication | 5 |
| OTP | 2 |
| Train Operations | 8 |
| Configuration | 2 |
| Reallocation/Upgrade | 13 |
| Passenger | 18 |
| TTE Portal | 16 |
| Admin | 2 |
| Visualization | 6 |
| Push Notifications | 8 |
| Queue | 2 |
| **TOTAL** | **85** |
