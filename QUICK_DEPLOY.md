# 🚀 RAC System - Quick Deploy to Cloud (Free Tier)

**Deploy your RAC Reallocation System to the cloud in 30-45 minutes using 100% free services.**

> [!IMPORTANT]
> This guide is for **deploying to production** (cloud). For **local development**, see [QUICKSTART.md](QUICKSTART.md).

---

## ❌ Can I Use GitHub Pages?

**No, GitHub Pages won't work for this application.**

**Why?**  
GitHub Pages only hosts **static files** (HTML, CSS, JavaScript). Your RAC system needs:

- ❌ **Backend Server** (Node.js/Express) - GitHub Pages can't run server code
- ❌ **Database** (MongoDB) - GitHub Pages has no database support
- ❌ **WebSocket Server** - GitHub Pages doesn't support real-time connections
- ❌ **Server-side APIs** - GitHub Pages only serves pre-built files

**What GitHub Pages CAN host:**  
Simple portfolios, documentation sites, static React apps **without a backend**.

**What your app IS:**  
A full-stack application requiring a backend server, database, and real-time features.

---

## 🎯 Solution: Cloud Deployment (Free Tier)

Deploy your entire stack to the cloud using these services:

```mermaid
graph LR
    A[Your Local PC] -->|Push Code| B[GitHub Repository]
    B -->|Deploy Backend| C[Render Free Tier]
    B -->|Deploy Frontends| D[Vercel Free Tier]
    E[Local MongoDB] -->|Migrate Data| F[MongoDB Atlas Free Tier]
    C -->|Connect| F
    D -->|API Calls| C
    G[Users Anywhere] -->|Access| D
```

### Why This Works

| Component | Local (Your PC) | Cloud (Available 24/7) |
|-----------|-----------------|------------------------|
| **Database** | Only works when PC on ❌ | MongoDB Atlas - always on ✅ |
| **Backend** | Only accessible from PC ❌ | Render - global access ✅ |
| **Frontend** | localhost only ❌ | Vercel - CDN worldwide ✅ |

---

## 📋 What You'll Need

Before starting, sign up for these **free accounts**:

- [ ] [GitHub](https://github.com) - Code hosting
- [ ] [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Database (512MB free)
- [ ] [Render](https://render.com) - Backend hosting (750 hrs/month free)
- [ ] [Vercel](https://vercel.com) - Frontend hosting (unlimited free)

**Total Cost:** $0/month 🎉

---

## 📖 Deployment Steps

### Step 1: Push Your Code to GitHub

```bash
# If not already on GitHub
cd c:\Users\prasa\Desktop\RAC\zip_2

# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit for deployment"

# Create repository on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/rac-system.git
git branch -M main
git push -u origin main
```

---

### Step 2: Deploy Database to MongoDB Atlas

#### A. Create Free Cluster

1. Go to [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. Sign up (no credit card required)
3. Click **"Build a Database"**
4. Choose **"M0 Free"** tier
   - Provider: **AWS**
   - Region: **us-east-1** (or closest to you)
   - Cluster Name: `rac-cluster`
5. Click **"Create"**

#### B. Create Database User

1. Go to **Database Access** → **Add New Database User**
2. Authentication Method: **Password**
3. Username: `rac-admin`
4. Password: Click **"Autogenerate Secure Password"** (save it!)
5. Database User Privileges: **Atlas admin**
6. Click **"Add User"**

#### C. Allow Network Access

1. Go to **Network Access** → **Add IP Address**
2. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
3. Click **"Confirm"**

> [!WARNING]
> For production, restrict to specific IPs. "Allow from Anywhere" is for getting started quickly.

#### D. Get Connection String

1. Go to **Database** → Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Driver: **Node.js** version **5.5 or later**
4. Copy the connection string:

```
mongodb+srv://rac-admin:<password>@rac-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

5. Replace `<password>` with your actual password
6. Add database name at the end:

```
mongodb+srv://rac-admin:YOUR_PASSWORD@rac-cluster.xxxxx.mongodb.net/rac?retryWrites=true&w=majority
```

**Save this connection string - you'll need it!**

#### E. Migrate Your Data

If you have existing data in your local MongoDB:

```bash
# Export from local
mongodump --uri="mongodb://localhost:27017/rac" --out=./mongodb-backup

# Import to Atlas (replace with your connection string)
mongorestore --uri="mongodb+srv://rac-admin:PASSWORD@rac-cluster.xxxxx.mongodb.net/rac" ./mongodb-backup/rac

# Verify
mongosh "mongodb+srv://rac-admin:PASSWORD@rac-cluster.xxxxx.mongodb.net/rac"
> show collections
> db.17225.countDocuments()
> db.17225_passengers.countDocuments()
```

---

### Step 3: Deploy Backend to Render

#### A. Create Render Account

1. Go to [https://render.com](https://render.com)
2. Sign up with GitHub (recommended for easy integration)

#### B. Create Web Service

1. Dashboard → **"New +"** → **"Web Service"**
2. Click **"Connect a repository"**
3. Find and select your `rac-system` repository
4. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `rac-backend` |
| **Environment** | `Node` |
| **Region** | `Oregon (US West)` or closest |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` |

#### C. Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these (click "+ Add Environment Variable" for each):

```env
MONGODB_URI=mongodb+srv://rac-admin:PASSWORD@rac-cluster.xxxxx.mongodb.net/rac?retryWrites=true&w=majority
STATIONS_DB=rac
STATIONS_COLLECTION=17225
PASSENGERS_DB=rac
PASSENGERS_COLLECTION=17225_passengers
TRAIN_DETAILS_DB=rac
TRAIN_DETAILS_COLLECTION=Trains_Details
DEFAULT_TRAIN_NO=17225
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-change-this
JWT_EXPIRES_IN=24h
NODE_ENV=production
PORT=5000
LOG_LEVEL=INFO
```

**For VAPID keys** (required for push notifications):

```bash
# Generate on your local PC
npx web-push generate-vapid-keys

# Add the output to Render:
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv... (your public key)
VAPID_PRIVATE_KEY=UUxI4O8-FbRouAf7... (your private key)
VAPID_EMAIL=your-email@example.com
```

**ALLOWED_ORIGINS** (add this now, we'll update it later):

```env
ALLOWED_ORIGINS=https://localhost:3000
```

#### D. Deploy

1. Click **"Create Web Service"**
2. Render will start building (5-10 minutes)
3. Wait for status: **"Live"** 🟢
4. Your backend URL will be: `https://rac-backend.onrender.com`

#### E. Test Backend

```bash
curl https://rac-backend.onrender.com/api/health
# Expected: {"status":"ok"}
```

If you get an error, check the logs in Render dashboard.

#### F. Initialize Database

1. In Render dashboard, go to your service
2. Click **"Shell"** tab
3. Run these commands:

```bash
node scripts/createIndexes.js
node scripts/createTestAccounts.js
```

> [!NOTE]
> **Free Tier Limitation:** Render free tier spins down after 15 minutes of inactivity. First request after spindown takes ~30 seconds. Upgrade to $7/month for always-on service.

---

### Step 4: Deploy Frontends to Vercel

#### A. Create Vercel Account

1. Go to [https://vercel.com/signup](https://vercel.com/signup)
2. Sign up with **GitHub**
3. Authorize Vercel to access your repositories

#### B. Deploy Admin Portal

1. Dashboard → **"Add New..."** → **"Project"**
2. Click **"Import"** next to your `rac-system` repository
3. Configure project:

| Setting | Value |
|---------|-------|
| **Project Name** | `rac-admin` |
| **Framework Preset** | `Vite` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

4. Click **"Environment Variables"** → Add:

```env
VITE_API_URL=https://rac-backend.onrender.com
VITE_WS_URL=wss://rac-backend.onrender.com
```

5. Click **"Deploy"**
6. Wait for deployment (2-3 minutes)
7. Your admin portal will be live at: `https://rac-admin.vercel.app`

#### C. Deploy TTE Portal

Repeat the same process:

1. **"Add New..."** → **"Project"**
2. Import `rac-system` repository again
3. Configure:
   - **Project Name:** `rac-tte`
   - **Root Directory:** `tte-portal`
   - Same environment variables as admin
4. Deploy
5. Live at: `https://rac-tte.vercel.app`

#### D. Deploy Passenger Portal

Repeat one more time:

1. **"Add New..."** → **"Project"**
2. Import `rac-system` repository
3. Configure:
   - **Project Name:** `rac-passenger`
   - **Root Directory:** `passenger-portal`
   - Same environment variables
4. Deploy
5. Live at: `https://rac-passenger.vercel.app`

---

### Step 5: Update Backend CORS

Now that you have your frontend URLs, update backend CORS settings:

1. Go to **Render** → Your `rac-backend` service
2. Click **"Environment"** tab
3. Find `ALLOWED_ORIGINS` and update to:

```
https://rac-admin.vercel.app,https://rac-tte.vercel.app,https://rac-passenger.vercel.app
```

4. Click **"Save Changes"**
5. Wait for automatic redeploy (~1-2 minutes)

---

## ✅ Verify Deployment

### Test Each Portal

| Portal | URL | Test Login |
|--------|-----|------------|
| **Admin** | `https://rac-admin.vercel.app` | `ADMIN_01` / `Prasanth@123` |
| **TTE** | `https://rac-tte.vercel.app` | `TTE_01` / `Prasanth@123` |
| **Passenger** | `https://rac-passenger.vercel.app` | `IR_0001` / `Prasanth@123` |

### Check Real-Time Features

1. Open any portal
2. Open browser **DevTools** (F12) → **Console** tab
3. Look for: `✅ WebSocket connected`
4. Log in and test core features:
   - Admin: Initialize train, view statistics
   - TTE: Mark passenger as no-show
   - Passenger: View PNR status, accept upgrade offers

---

## 🎉 You're Live!

Your RAC System is now deployed globally and accessible from any device!

**Share your URLs:**
- Admin Portal: `https://rac-admin.vercel.app`
- TTE Portal: `https://rac-tte.vercel.app`
- Passenger Portal: `https://rac-passenger.vercel.app`

---

## 💰 Cost Breakdown

| Service | Free Tier Limits | When to Upgrade |
|---------|------------------|-----------------|
| **MongoDB Atlas** | 512MB storage, shared CPU | When data > 500MB |
| **Render** | 750 hrs/month, sleeps after 15min | When need always-on ($7/mo) |
| **Vercel** | Unlimited bandwidth, 100GB/mo | When team features needed ($20/mo) |

**Total: $0/month** until you hit limits! 🚀

---

## 🔧 Common Issues

### Backend Times Out

**Problem:** First request to backend takes 30+ seconds  
**Cause:** Render free tier spins down after inactivity  
**Solution:** Upgrade to $7/month paid plan, or accept 30s cold start

### CORS Errors

**Problem:** Frontend can't connect to backend  
**Cause:** `ALLOWED_ORIGINS` doesn't include frontend URL  
**Solution:** Update `ALLOWED_ORIGINS` in Render environment variables

### Database Connection Failed

**Problem:** Backend can't connect to MongoDB Atlas  
**Cause:** Network access not configured or wrong connection string  
**Solution:** 
1. Check Network Access allows 0.0.0.0/0
2. Verify `MONGODB_URI` has correct password
3. Check Render logs for exact error

### WebSocket Not Connecting

**Problem:** Real-time features don't work  
**Cause:** `VITE_WS_URL` incorrect or backend not supporting WSS  
**Solution:** Ensure `VITE_WS_URL` uses `wss://` (not `ws://`)

---

## 🔄 Updating Your Deployment

When you make code changes:

```bash
# Commit and push changes
git add .
git commit -m "Your changes"
git push origin main

# Automatic deployments:
# ✅ Render will auto-deploy backend
# ✅ Vercel will auto-deploy frontends
# ⏱️ Wait 2-5 minutes for deployments to complete
```

---

## 📚 Next Steps

- [ ] Set up custom domain (optional)
- [ ] Enable email notifications (configure SMTP)
- [ ] Set up monitoring (UptimeRobot, Sentry)
- [ ] Configure MongoDB Atlas backups
- [ ] Add CI/CD with GitHub Actions

**For advanced deployment options**, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 🆘 Need Help?

- **Local Development:** See [QUICKSTART.md](QUICKSTART.md)
- **Comprehensive Deployment:** See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Project Overview:** See [README.md](README.md)

---

**Built for Indian Railways - Train 17225 Amaravathi Express** 🚂

*Last Updated: December 24, 2025*
