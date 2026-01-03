# 📡 API Endpoints List

Complete list of all REST API endpoints in the RAC Reallocation System.

---

## 🔐 Authentication APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/staff/login` | Staff (Admin/TTE) login |
| POST | `/auth/passenger/login` | Passenger login |
| GET | `/auth/verify` | Verify JWT token |
| POST | `/auth/logout` | Logout and clear session |
| POST | `/auth/refresh` | Refresh access token |

---

## 🎫 TTE (Ticket Examiner) APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tte/mark-no-show` | Mark passenger as no-show |
| POST | `/tte/revert-no-show` | Revert no-show status |
| POST | `/tte/offline-upgrades/add` | Add offline upgrade request |
| GET | `/tte/offline-upgrades` | Get offline upgrade list |
| POST | `/tte/offline-upgrades/confirm` | Confirm offline upgrade |
| POST | `/tte/offline-upgrades/reject` | Reject offline upgrade |
| GET | `/tte/action-history` | Get TTE action history |
| POST | `/tte/undo` | Undo last action |
| GET | `/tte/passengers` | Get all passengers for TTE |
| GET | `/tte/boarded-passengers` | Get boarded passengers |
| GET | `/tte/boarded-rac-passengers` | Get boarded RAC passengers |
| POST | `/tte/mark-boarded` | Mark passenger as boarded |
| POST | `/tte/mark-deboarded` | Mark passenger as deboarded |
| POST | `/tte/confirm-upgrade` | Confirm passenger upgrade |
| GET | `/tte/statistics` | Get TTE statistics |
| GET | `/tte/upgraded-passengers` | Get upgraded passengers list |
| GET | `/tte/boarding-queue` | Get boarding queue |
| POST | `/tte/confirm-all-boarded` | Confirm all passengers boarded |
| POST | `/tte/push-subscribe` | Subscribe TTE to push notifications |

---

## 👤 Passenger APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/passenger/revert-no-show` | Passenger revert no-show |
| GET | `/passenger/available-boarding-stations/:pnr` | Get available boarding stations |
| POST | `/passenger/change-boarding-station` | Change boarding station |
| POST | `/passenger/self-cancel` | Self-cancel booking |
| POST | `/passenger/approve-upgrade` | Approve upgrade offer |
| GET | `/passenger/pending-upgrades/:irctcId` | Get pending upgrades |
| POST | `/passenger/no-show` | Mark passenger no-show |
| GET | `/passenger/search/:pnr` | Search passenger by PNR |
| GET | `/passenger/pnr/:pnr` | Get passenger details by PNR |
| POST | `/passenger/cancel` | Cancel passenger booking |
| POST | `/passenger/set-status` | Set passenger status |
| GET | `/passenger/upgrade-notifications/:pnr` | Get upgrade notifications |
| POST | `/passenger/accept-upgrade` | Accept upgrade offer |
| POST | `/passenger/deny-upgrade` | Deny upgrade offer |
| POST | `/passenger/push-subscribe` | Subscribe to push notifications |
| POST | `/passenger/push-unsubscribe` | Unsubscribe from push notifications |
| GET | `/passenger/notifications` | Get all notifications |
| POST | `/passenger/notifications/:id/read` | Mark notification as read |
| POST | `/passenger/notifications/mark-all-read` | Mark all notifications as read |

---

## 🔁 Reallocation APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reallocation/apply` | Apply reallocation |
| GET | `/reallocation/eligibility` | Get eligibility matrix |
| GET | `/reallocation/pending` | Get pending reallocations |
| POST | `/reallocation/approve-batch` | Approve batch reallocations |
| POST | `/reallocation/reject/:id` | Reject specific reallocation |
| GET | `/reallocation/station-wise` | Get station-wise reallocations |
| GET | `/reallocation/approved` | Get approved reallocations |
| GET | `/reallocation/current-station-matching` | Get current station matches |
| POST | `/reallocation/create-from-matches` | Create reallocation from matches |
| GET | `/reallocation/upgrade-status` | Get upgrade status |
| POST | `/reallocation/upgrade/:upgradeId/approve` | Approve specific upgrade |
| POST | `/reallocation/upgrade/:upgradeId/reject` | Reject specific upgrade |
| POST | `/reallocation/reset-upgrade-lock` | Reset upgrade lock |

---

## 🚂 Train APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trains` | List all trains |
| POST | `/train/initialize` | Initialize train journey |
| POST | `/train/start-journey` | Start the journey |
| GET | `/train/state` | Get current train state |
| POST | `/train/next-station` | Move to next station |
| POST | `/train/reset` | Reset train state |
| GET | `/train/stats` | Get train statistics |
| GET | `/train/allocation-errors` | Get allocation errors |
| GET | `/train/rac-queue` | Get RAC queue |
| GET | `/train/vacant-berths` | Get vacant berths |

---

## 👥 Passengers (Bulk) APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/passengers/all` | Get all passengers |
| GET | `/passengers/status/:status` | Get passengers by status |
| GET | `/passengers/counts` | Get passenger counts |
| POST | `/passengers/add` | Add new passenger |
| GET | `/passengers/by-irctc/:irctcId` | Get passenger by IRCTC ID |

---

## 📊 Visualization APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/visualization/station-schedule` | Get station schedule |
| GET | `/visualization/segment-matrix` | Get segment matrix |
| GET | `/visualization/graph` | Get graph data |
| GET | `/visualization/heatmap` | Get heatmap data |
| GET | `/visualization/berth-timeline/:coach/:berth` | Get berth timeline |
| GET | `/visualization/vacancy-matrix` | Get vacancy matrix |

---

## ⚙️ Configuration APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/config/setup` | Setup configuration |
| GET | `/config/current` | Get current configuration |

---

## 📱 OTP APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/otp/send` | Send OTP |
| POST | `/otp/verify` | Verify OTP |

---

## 🔔 Push Notification APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/push/vapid-public-key` | Get VAPID public key |
| GET | `/push/vapid-key` | Get VAPID key (alias) |
| POST | `/admin/push-subscribe` | Admin subscribe to push |

---

## 🛠️ Admin APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/fix-rac-boarding` | Fix RAC boarding issues |
| POST | `/admin/push-subscribe` | Subscribe admin to push notifications |

---

## 📈 Summary

| Category | Count |
|----------|-------|
| Authentication | 5 |
| TTE | 19 |
| Passenger | 19 |
| Reallocation | 13 |
| Train | 10 |
| Passengers (Bulk) | 5 |
| Visualization | 6 |
| Configuration | 2 |
| OTP | 2 |
| Push Notifications | 3 |
| Admin | 2 |
| **Total** | **86** |

---

*Last Updated: January 3, 2026*
