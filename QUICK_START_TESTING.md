# Quick Start Testing Guide

## ✅ Currently Running:
- ✅ Backend: http://localhost:5000
- ✅ Admin Portal: http://localhost:5173

## 🚀 Start Remaining Portals:

### TTE Portal:
```bash
cd tte-portal
npm run dev
```
**Expected URL:** http://localhost:5174

### Passenger Portal:
```bash
cd passenger-portal
npm run dev
```
**Expected URL:** http://localhost:5175

---

## 🔑 Test Credentials

### Admin Portal (http://localhost:5173)
```
Username: admin
Password: admin123
```

### TTE Portal (http://localhost:5174)
```
Username: TTE001
Password: tte123
```

### Passenger Portal (http://localhost:5175)
```
IRCTC ID: IR_8001
Password: pass123
```

---

## ⚡ Quick Test Scenarios

### 1. Test Authentication (5 min)
- [ ] Login to Admin Portal
- [ ] Login to TTE Portal  
- [ ] Login to Passenger Portal
- [ ] Check 3-dot menu shows user info
- [ ] Test logout on each portal

### 2. Test Passenger Portal Features (10 min)
- [ ] QR Code displays
- [ ] Journey Timeline shows stations
- [ ] Boarding Pass shows details
- [ ] Push Notification settings visible

### 3. Test TTE Portal Features (10 min)
- [ ] Navigate all 4 tabs
- [ ] Search passenger by PNR
- [ ] Filter by class/status
- [ ] View Action History

### 4. Test RAC Reallocation (15 min)
**Setup:**
1. Admin: Note RAC passengers in queue
2. TTE: Go to Boarding Verification

**Test:**
1. Mark a CNF passenger as NO_SHOW
2. Expected: RAC passenger gets upgraded
3. Check: Action History shows upgrade
4. Test: Undo the upgrade

### 5. Test Mobile Responsive (5 min)
- [ ] Open DevTools (F12)
- [ ] Toggle device simulation (Ctrl+Shift+M)
- [ ] Test on iPhone SE view (375px)
- [ ] Verify tabs scroll horizontally (TTE)
- [ ] Verify all content readable

---

## 🐛 Common Issues & Fixes

### Port Already in Use
```bash
# Kill process on port 5174
npx kill-port 5174

# Or change port in vite.config.js
server: { port: 5176 }
```

### CORS Errors
- Check backend allows http://localhost:5174 and http://localhost:5175
- Restart backend if needed

### MongoDB Connection Error
```bash
# Check MongoDB is running
mongod --version

# Start MongoDB if not running
net start MongoDB
```

### WebSocket Not Connecting
- Check backend WebSocket server running
- Look for errors in browser console
- Refresh page

---

## 📝 Testing Checklist

Use the comprehensive checklist in `task.md` for detailed testing.

**Priority Tests:**
1. ✅ All portals load
2. ✅ Authentication works
3. ✅ QR Code visible
4. ✅ Search/Filter works
5. ✅ Action History shows
6. ✅ RAC reallocation triggers

---

## 🎯 Next Steps After Testing

1. **Document any bugs found**
2. **Test reallocation logic thoroughly**
3. **Identify improvements needed**
4. **Then improve reallocation algorithm**
5. **Finally plan tech migration**

---

**Start Testing:** Open http://localhost:5173 for Admin Portal!
