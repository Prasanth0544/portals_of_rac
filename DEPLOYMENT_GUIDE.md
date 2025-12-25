# RAC Reallocation System - Complete Deployment Guide

**Last Updated:** December 24, 2025  
**Version:** 2.0

---

## ⚡ Quick Start for First-Time Deployers

> [!IMPORTANT]
> **New to deployment?** Start here for a simple explanation before diving into the detailed options below.

### ❌ Can I Use GitHub Pages?

**No, GitHub Pages won't work for this application.**

**Why?** GitHub Pages only hosts **static files** (HTML, CSS, JavaScript). Your RAC system needs:

- ✅ **Backend Server** (Node.js/Express) - GitHub Pages can't run server code
- ✅ **Database** (MongoDB) - GitHub Pages has no database support
- ✅ **WebSocket Server** - GitHub Pages doesn't support real-time connections
- ✅ **Server-side APIs** - GitHub Pages only serves pre-built files

**What GitHub Pages CAN host:** Simple portfolios, documentation sites (like Jekyll blogs), static React apps without a backend.

**What your app IS:** A full-stack application requiring a backend server, database, and real-time features.

---

### 🎯 Recommended Path for Beginners

If this is your first deployment, follow this simplified path:

```mermaid
graph LR
    A[Local MongoDB Database] -->|Migrate| B[MongoDB Atlas Cloud]
    B --> C[Deploy Backend to Render]
    C --> D[Deploy Frontends to Vercel]
    D --> E[Live Application! 🎉]
```

**Total Cost:** $0/month (using free tiers)  
**Time:** 30-45 minutes  
**Difficulty:** ⭐⭐ Medium

#### Step-by-Step Quick Path:

1. **Database → MongoDB Atlas (Free)**
   - Sign up at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
   - Create free M0 cluster (512MB storage)
   - Get connection string
   - **Your data is now accessible from anywhere!**

2. **Backend → Render (Free)**
   - Sign up at [render.com](https://render.com)
   - Connect your GitHub repo
   - Deploy backend (Express server)
   - Free tier sleeps after inactivity but good for demos

3. **Frontends → Vercel or Netlify (Free)**
   - Sign up at [vercel.com](https://vercel.com) or [netlify.com](https://netlify.com)
   - Deploy all 3 React apps (admin, TTE, passenger portals)
   - Free tier perfect for production frontends

> [!TIP]
> **Jump to**: [Managed Services](#option-3-managed-services) section below for detailed instructions on this path.

---

### 🤔 Understanding Database Persistence

**Your Question:** "My database is on my device - can it be accessed as a site on another device?"

**Short Answer:** Not directly and not securely.

**Why it's a problem:**

| ❌ Local Database (Your Computer) | ✅ Cloud Database (MongoDB Atlas) |
|-----------------------------------|-----------------------------------|
| Only works when your PC is on | Always available 24/7 |
| Requires exposing your home IP | Secure cloud infrastructure |
| No backups if PC crashes | Automatic backups |
| Can't scale beyond one server | Can scale to millions of users |
| Security risk for home network | Enterprise-grade security |

**Solution:** Migrate to **MongoDB Atlas** (free tier available). Your data moves to the cloud and is accessible from any deployment (Docker, Kubernetes, managed services).

---

### 📊 Deployment Options Comparison

| Option | Best For | Cost | Complexity | Access from Other Devices |
|--------|----------|------|------------|--------------------------|
| **GitHub Pages** | Static sites only | Free | ⭐ | ❌ Won't work for this app |
| **MongoDB Atlas + Render + Vercel** | First deployment | $0 | ⭐⭐ | ✅ Yes - global access |
| **Docker Compose (local)** | Development/testing | Hosting cost | ⭐⭐ | ⚠️ Only if you expose ports |
| **Docker Compose + Atlas** | Small production | $0-50/mo | ⭐⭐ | ✅ Yes |
| **Kubernetes** | Enterprise production | $100+/mo | ⭐⭐⭐⭐⭐ | ✅ Yes |

> [!NOTE]
> **Recommendation**: Start with **MongoDB Atlas + Render + Vercel** (all free tiers). Once you have 1000+ users, upgrade to paid tiers or Kubernetes.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Deployment Options](#deployment-options)
5. [Option 1: Docker Compose (Recommended for First Deploy)](#option-1-docker-compose-recommended-for-first-deploy)
6. [Option 2: Kubernetes (Production-Grade)](#option-2-kubernetes-production-grade)
7. [Option 3: Managed Services](#option-3-managed-services)
8. [Data Management & Database](#data-management--database)
9. [Secrets & Configuration](#secrets--configuration)
10. [Post-Deployment Verification](#post-deployment-verification)
11. [Troubleshooting](#troubleshooting)
12. [Scaling & Monitoring](#scaling--monitoring)

---

## Project Overview

**RAC (Railway Automatic Coaches)** is a train reallocation system with:

- **Backend**: Node.js REST API (Express.js) running on port **5000**
- **Admin Portal**: React/Vite frontend for administrators
- **TTE Portal**: React/Vite frontend for Train Ticket Examiners
- **Passenger Portal**: React/Vite frontend for passengers
- **Database**: MongoDB (stations, passengers, train details)

All components are containerized with Docker and can be orchestrated via Docker Compose or Kubernetes.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Reverse Proxy / Ingress                  │
│                    (Nginx / Load Balancer)                      │
└────────────┬──────────────┬──────────────┬──────────────────────┘
             │              │              │
    ┌────────▼─────┐ ┌─────▼────────┐ ┌──▼─────────────┐
    │  Admin       │ │  TTE         │ │  Passenger     │
    │  Portal      │ │  Portal      │ │  Portal        │
    │  (Port 80)   │ │  (Port 80)   │ │  (Port 80)     │
    │  (Nginx)     │ │  (Nginx)     │ │  (Nginx)       │
    └──────────────┘ └──────────────┘ └────────────────┘

                    ┌──────────────────────┐
                    │   Backend API        │
                    │   (Port 5000)        │
                    │   (Node.js/Express)  │
                    └──────────────────────┘
                           │
                    ┌──────▼──────────┐
                    │    MongoDB      │
                    │   (Port 27017)  │
                    └─────────────────┘
```

---

## Prerequisites

### For All Deployments

- **Git** (to clone the repo)
- **Node.js v20+** (for local testing)
- **Docker** (required for all deployment options)

### For Docker Compose

- **Docker Desktop** (Windows/Mac) or Docker Engine (Linux)
- **Docker Compose** v1.29+ (usually bundled with Docker Desktop)
- **MongoDB Atlas** account (free tier available) or local MongoDB container

### For Kubernetes

- **kubectl** command-line tool
- **Kubernetes cluster** (local: Minikube, Docker Desktop, or cloud: EKS/AKS/GKE)
- **Docker registry** (Docker Hub, ACR, ECR, GCR)
- **helm** (optional, for advanced deployments)

### For Managed Services

- **Cloud provider account**: Azure, AWS, GCP, or Heroku
- **MongoDB Atlas** (free tier available)

---

## Deployment Options

| Option | Complexity | Cost | Data Persistence | Best For |
|--------|-----------|------|------------------|----------|
| **Docker Compose + MongoDB Atlas** | ⭐ Low | $0-100/mo | Cloud-managed ✅ | First deploy, small scale |
| **Docker Compose + Local MongoDB** | ⭐ Low | Hosting cost | Volume (local) | Testing, development |
| **Kubernetes + MongoDB Atlas** | ⭐⭐⭐ High | $100-500+/mo | Cloud-managed ✅ | Production, high availability |
| **Azure Container Apps** | ⭐⭐ Medium | $0-200/mo | Managed ✅ | Azure ecosystem |
| **Vercel (frontend) + Render (backend)** | ⭐⭐ Medium | $0-100/mo | Atlas MongoDB ✅ | Hybrid managed |

---

## Option 1: Docker Compose (Recommended for First Deploy)

### Step 1: Prerequisites Check

```bash
docker --version
docker compose version
git --version
```

### Step 2: Clone & Navigate

```bash
cd c:\Users\prasa\Desktop\RAC\zip_2
```

### Step 3: Create `.env` File

Create a `.env` file in the project root with the following variables:

```env
# MongoDB Configuration
# Option A: Use MongoDB Atlas (cloud)
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/rac?retryWrites=true&w=majority

# OR Option B: Use local MongoDB container
# MONGODB_URI=mongodb://admin:changeme@mongodb:27017

MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=changeme

# Stations Database
STATIONS_DB=rac
STATIONS_COLLECTION=17225

# Passengers Database
PASSENGERS_DB=rac
PASSENGERS_COLLECTION=17225_passengers

# Train Details
TRAIN_DETAILS_DB=rac
TRAIN_DETAILS_COLLECTION=Trains_Details
DEFAULT_TRAIN_NO=17225

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRES_IN=24h

# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=your-email@example.com

# CORS Origins (update with your domains)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:5000

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Twilio Configuration (optional)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Logging
LOG_LEVEL=INFO

# Environment
NODE_ENV=production
PORT=5000
```

**⚠️ Security Note**: Never commit `.env` to git. Add it to `.gitignore`.

### Step 4: Generate VAPID Keys (for push notifications)

If you don't have VAPID keys, generate them:

```bash
npm install -g web-push
web-push generate-vapid-keys
```

Copy the output keys to your `.env` file.

### Step 5: Start Services

**Option A: With Local MongoDB Container**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

This will:
- Build the backend image
- Build the admin, tte, and passenger portal images
- Start MongoDB container
- Start all services

**Option B: With MongoDB Atlas (Cloud)**

1. Skip the MongoDB setup in `docker-compose.yml` (or set it to `disable`)
2. Update `MONGODB_URI` in `.env` to your Atlas connection string
3. Run:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Step 6: Verify Services Are Running

```bash
# Check running containers
docker compose ps

# Expected output:
# NAME                     STATUS              PORTS
# rac-backend              Up (healthy)        0.0.0.0:5000->5000/tcp
# rac-admin-portal         Up (healthy)        0.0.0.0:3000->80/tcp
# rac-tte-portal           Up (healthy)        0.0.0.0:3001->80/tcp
# rac-passenger-portal     Up (healthy)        0.0.0.0:3002->80/tcp
# mongodb                  Up (healthy)        27017/tcp
```

### Step 7: Test the API

```bash
curl http://localhost:5000/api/health
# Expected: { "status": "ok" }
```

### Step 8: Access Portals

- **Admin Portal**: http://localhost:3000
- **TTE Portal**: http://localhost:3001
- **Passenger Portal**: http://localhost:3002
- **API**: http://localhost:5000

---

## Option 2: Kubernetes (Production-Grade)

### Step 1: Prerequisites

```bash
# Install kubectl
# Windows: choco install kubernetes-cli
# Mac: brew install kubectl
# Linux: curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Verify Kubernetes cluster is running
kubectl cluster-info
kubectl get nodes
```

### Step 2: Build & Push Docker Images

#### Option A: Docker Hub

```bash
# Login to Docker Hub
docker login

# Build images
docker build -t yourusername/rac-backend:latest ./backend
docker build -t yourusername/rac-admin:latest ./frontend
docker build -t yourusername/rac-tte:latest ./tte-portal
docker build -t yourusername/rac-passenger:latest ./passenger-portal

# Push images
docker push yourusername/rac-backend:latest
docker push yourusername/rac-admin:latest
docker push yourusername/rac-tte:latest
docker push yourusername/rac-passenger:latest
```

#### Option B: Azure Container Registry (ACR)

```bash
# Login to ACR
az acr login --name yourregistry

# Build and push
az acr build -r yourregistry -t rac-backend:latest ./backend
az acr build -r yourregistry -t rac-admin:latest ./frontend
az acr build -r yourregistry -t rac-tte:latest ./tte-portal
az acr build -r yourregistry -t rac-passenger:latest ./passenger-portal
```

### Step 3: Create Kubernetes Namespace

```bash
kubectl apply -f k8s/namespace.yaml
# or manually:
kubectl create namespace rac-system
```

### Step 4: Create Secrets

Create a `k8s/backend/secrets-prod.yaml` with base64-encoded values:

```bash
# Generate base64 values
echo -n 'mongodb+srv://user:pass@cluster.mongodb.net/rac' | base64
# Output: bW9uZ29kYitzcno6Ly91c2VyOnBhc3NAY2x1c3Rlci5tb25nb2RiLm5ldC9yYWM=

echo -n 'your-super-secret-jwt-key' | base64
# Output: eW91ci1zdXBlci1zZWNyZXQtand0LWtleQ==
```

Create `k8s/backend/secrets-prod.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: rac-backend-secrets
  namespace: rac-system
type: Opaque
data:
  MONGODB_URI: bW9uZ29kYitzcno6Ly91c2VyOnBhc3NAY2x1c3Rlci5tb25nb2RiLm5ldC9yYWM=
  JWT_SECRET: eW91ci1zdXBlci1zZWNyZXQtand0LWtleQ==
  VAPID_PUBLIC_KEY: <base64-encoded>
  VAPID_PRIVATE_KEY: <base64-encoded>
  VAPID_EMAIL: <base64-encoded>
  EMAIL_HOST: <base64-encoded>
  EMAIL_PORT: <base64-encoded>
  EMAIL_USER: <base64-encoded>
  EMAIL_PASSWORD: <base64-encoded>
  TWILIO_ACCOUNT_SID: <base64-encoded>
  TWILIO_AUTH_TOKEN: <base64-encoded>
  TWILIO_PHONE_NUMBER: <base64-encoded>
```

Apply the secret:

```bash
kubectl apply -f k8s/backend/secrets-prod.yaml
```

### Step 5: Update ConfigMap

Edit `k8s/backend/configmap.yaml`:

```yaml
data:
  ALLOWED_ORIGINS: "https://admin.yourdomain.com,https://tte.yourdomain.com,https://passenger.yourdomain.com"
  STATIONS_COLLECTION: "17225"
  PASSENGERS_COLLECTION: "17225_passengers"
  DEFAULT_TRAIN_NO: "17225"
```

Apply the ConfigMap:

```bash
kubectl apply -f k8s/backend/configmap.yaml
```

### Step 6: Update Deployment Images

Edit `k8s/backend/deployment.yaml` and `k8s/frontend/deployment.yaml`:

Replace `${DOCKER_REGISTRY}` with your registry path:

```yaml
image: yourusername/rac-backend:latest  # or yourregistry.azurecr.io/rac-backend:latest
```

### Step 7: Deploy to Kubernetes

```bash
# Deploy backend
kubectl apply -f k8s/backend/

# Deploy frontend
kubectl apply -f k8s/frontend/

# Deploy ingress (if using)
kubectl apply -f k8s/ingress.yaml

# Verify deployments
kubectl get deployments -n rac-system
kubectl get pods -n rac-system
kubectl get services -n rac-system
```

### Step 8: Check Pod Status

```bash
# Watch deployment progress
kubectl rollout status deployment/rac-backend -n rac-system
kubectl rollout status deployment/rac-admin-portal -n rac-system

# View pod logs
kubectl logs -f deployment/rac-backend -n rac-system
kubectl logs -f deployment/rac-admin-portal -n rac-system

# Describe pod for issues
kubectl describe pod <pod-name> -n rac-system
```

### Step 9: Access the Application

#### Via Port Forwarding (local development)

```bash
# Forward backend
kubectl port-forward svc/rac-backend 5000:5000 -n rac-system

# Forward frontend in another terminal
kubectl port-forward svc/rac-admin-portal 3000:80 -n rac-system
```

Then access at `http://localhost:3000`, `http://localhost:3001`, etc.

#### Via Ingress (production)

If you've deployed an Ingress, update your DNS records to point to the Ingress IP/hostname:

```bash
kubectl get ingress -n rac-system
# Note the external IP/hostname and configure your DNS
```

---

## Option 3: Managed Services

### Beginner-Friendly: Render + Vercel + MongoDB Atlas (Recommended)

> [!TIP]
> **Perfect for first-time deployers!** This approach uses popular free tiers to get your app live with zero cost.

#### Prerequisites
- GitHub account (to host your code)
- MongoDB Atlas account (database hosting)
- Render account (backend hosting)
- Vercel or Netlify account (frontend hosting)

---

#### Step 1: Migrate Database to MongoDB Atlas

**A. Create MongoDB Atlas Account**

1. Go to [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for free (no credit card required for M0 tier)
3. Create an organization and project

**B. Create Free Cluster**

```bash
# Or use CLI (optional)
atlascli auth login
atlascli clusters create rac-cluster --provider AWS --region US_EAST_1 --tier M0
```

**Via Web Console:**
1. Click **"Build a Database"**
2. Choose **"M0 Free"** tier (512MB storage, shared CPU)
3. Select cloud provider: **AWS** (or GCP/Azure)
4. Region: Choose closest to your users (e.g., `us-east-1`)
5. Cluster name: `rac-cluster`
6. Click **"Create"**

**C. Configure Database Access**

1. **Database Access** → **Add New Database User**
   - Username: `rac-admin`
   - Password: Generate secure password (save it!)
   - Database User Privileges: `Atlas admin`
   - Click **"Add User"**

2. **Network Access** → **Add IP Address**
   - Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Or add specific IPs for better security
   - Click **"Confirm"**

**D. Get Connection String**

1. Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Driver: **Node.js**, Version: **5.5 or later**
4. Copy connection string:

```
mongodb+srv://rac-admin:<password>@rac-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

5. Replace `<password>` with your actual password
6. Add database name: `mongodb+srv://rac-admin:password@rac-cluster.xxxxx.mongodb.net/rac?retryWrites=true&w=majority`

**E. Migrate Your Local Data**

If you have existing data in local MongoDB:

```bash
# Export from local MongoDB
mongodump --uri="mongodb://localhost:27017/rac" --out=./local-backup

# Import to MongoDB Atlas
mongorestore --uri="mongodb+srv://rac-admin:password@rac-cluster.xxxxx.mongodb.net/rac" ./local-backup/rac

# Verify migration
mongosh "mongodb+srv://rac-admin:password@rac-cluster.xxxxx.mongodb.net/rac"
> show collections
> db.17225.countDocuments()  # Should show your station data
> db.17225_passengers.countDocuments()  # Should show passenger data
```

---

#### Step 2: Deploy Backend to Render

**A. Prepare Your Repository**

1. Push your code to GitHub (if not already done)
2. Ensure `backend/` has a `Dockerfile` or `package.json`

**B. Create Render Account**

1. Go to [https://render.com](https://render.com)
2. Sign up with GitHub (easier integration)

**C. Create Web Service**

1. Dashboard → **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `rac-backend`
   - **Environment:** `Node`
   - **Region:** `Oregon (US West)` or closest
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free` (to start)

**D. Add Environment Variables**

In Render dashboard, add these environment variables:

```env
MONGODB_URI=mongodb+srv://rac-admin:password@rac-cluster.xxxxx.mongodb.net/rac?retryWrites=true&w=majority
STATIONS_DB=rac
STATIONS_COLLECTION=17225
PASSENGERS_DB=rac
PASSENGERS_COLLECTION=17225_passengers
TRAIN_DETAILS_DB=rac
TRAIN_DETAILS_COLLECTION=Trains_Details
DEFAULT_TRAIN_NO=17225
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-change-in-production
JWT_EXPIRES_IN=24h
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=your-email@example.com
ALLOWED_ORIGINS=https://rac-admin.vercel.app,https://rac-tte.vercel.app,https://rac-passenger.vercel.app
NODE_ENV=production
PORT=5000
LOG_LEVEL=INFO
```

**E. Deploy**

1. Click **"Create Web Service"**
2. Render will automatically build and deploy
3. Wait for deployment to complete (5-10 minutes)
4. Your backend will be live at: `https://rac-backend.onrender.com`

**F. Test Backend**

```bash
curl https://rac-backend.onrender.com/api/health
# Expected: {"status":"ok"}
```

> [!WARNING]
> **Free Tier Limitation:** Render free tier spins down after 15 minutes of inactivity. First request after inactivity takes ~30 seconds to wake up. Upgrade to $7/month for always-on.

---

#### Step 3: Deploy Frontends to Vercel

**A. Create Vercel Account**

1. Go to [https://vercel.com/signup](https://vercel.com/signup)
2. Sign up with GitHub

**B. Deploy Admin Portal**

1. Dashboard → **"Add New"** → **"Project"**
2. Import your GitHub repository
3. Configure:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. Add Environment Variables:
   ```env
   VITE_API_URL=https://rac-backend.onrender.com
   VITE_WS_URL=wss://rac-backend.onrender.com
   ```

5. Click **"Deploy"**
6. Your admin portal will be live at: `https://rac-admin.vercel.app`

**C. Deploy TTE Portal**

Repeat the same steps:
- **Root Directory:** `tte-portal`
- Live at: `https://rac-tte.vercel.app`

**D. Deploy Passenger Portal**

Repeat the same steps:
- **Root Directory:** `passenger-portal`
- Live at: `https://rac-passenger.vercel.app`

**E. Update Backend CORS**

Go back to Render → Your backend service → Environment variables

Update `ALLOWED_ORIGINS`:
```
https://rac-admin.vercel.app,https://rac-tte.vercel.app,https://rac-passenger.vercel.app
```

Click **"Save Changes"** (this will trigger a redeploy)

---

#### Step 4: Initialize Database

Once backend is deployed:

```bash
# Option 1: Via Render Shell
# Go to Render dashboard → Shell tab
node scripts/createIndexes.js
node scripts/createTestAccounts.js

# Option 2: Via local connection to Atlas
MONGODB_URI="mongodb+srv://..." node backend/scripts/createIndexes.js
MONGODB_URI="mongodb+srv://..." node backend/scripts/createTestAccounts.js
```

---

#### Step 5: Test Your Deployment

**A. Access Portals**

- **Admin Portal:** `https://rac-admin.vercel.app`
- **TTE Portal:** `https://rac-tte.vercel.app`
- **Passenger Portal:** `https://rac-passenger.vercel.app`

**B. Login with Test Accounts**

| Portal | Username | Password |
|--------|----------|----------|
| Admin | `ADMIN_01` | `Prasanth@123` |
| TTE | `TTE_01` | `Prasanth@123` |
| Passenger | `IR_0001` | `Prasanth@123` |

**C. Verify Real-Time Features**

1. Open browser DevTools → Console
2. Check for WebSocket connection: `✅ WebSocket connected`
3. Test train operations (initialize, start journey, mark no-show)

---

#### Cost Breakdown

| Service | Free Tier | Paid Tier |
|---------|-----------|----------|
| **MongoDB Atlas** | 512MB storage | $9/mo for 2GB |
| **Render (Backend)** | 750 hrs/mo, sleeps after 15 min | $7/mo always-on |
| **Vercel (3 Frontends)** | Unlimited bandwidth | $20/mo for team features |
| **Total** | **$0/month** 🎉 | ~$36/mo for production |

---

### Azure Container Apps (Recommended for Azure users)

```bash
# 1. Create resource group
az group create --name rac-rg --location eastus

# 2. Create Container Registry
az acr create --resource-group rac-rg --name racregistry --sku Basic

# 3. Build and push images
az acr build -r racregistry -t rac-backend:latest ./backend
az acr build -r racregistry -t rac-admin:latest ./frontend
az acr build -r racregistry -t rac-tte:latest ./tte-portal
az acr build -r racregistry -t rac-passenger:latest ./passenger-portal

# 4. Create Container Apps Environment
az containerapp env create \
  --name rac-env \
  --resource-group rac-rg \
  --location eastus

# 5. Deploy backend container app
az containerapp create \
  --name rac-backend \
  --resource-group rac-rg \
  --environment rac-env \
  --image racregistry.azurecr.io/rac-backend:latest \
  --target-port 5000 \
  --env-vars MONGODB_URI="mongodb+srv://..." JWT_SECRET="..." \
  --registry-server racregistry.azurecr.io \
  --registry-username <username> \
  --registry-password <password>

# 6. Deploy frontend container apps similarly
az containerapp create \
  --name rac-admin \
  --resource-group rac-rg \
  --environment rac-env \
  --image racregistry.azurecr.io/rac-admin:latest \
  --target-port 80 \
  --registry-server racregistry.azurecr.io \
  --registry-username <username> \
  --registry-password <password>
```

### Heroku (Simple & Free)

```bash
# 1. Login to Heroku
heroku login

# 2. Create Heroku apps
heroku create rac-backend
heroku create rac-admin

# 3. Set environment variables
heroku config:set MONGODB_URI="mongodb+srv://..." -a rac-backend
heroku config:set JWT_SECRET="..." -a rac-backend

# 4. Deploy
git push heroku main

# 5. View logs
heroku logs --tail -a rac-backend
```

### AWS ECS (Elastic Container Service)

```bash
# 1. Create ECR repository
aws ecr create-repository --repository-name rac-backend --region us-east-1

# 2. Build and push
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag rac-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/rac-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/rac-backend:latest

# 3. Create ECS task definition, service, cluster via AWS Console or CLI
```

---

## Data Management & Database

### MongoDB Data Persistence

#### **Option 1: MongoDB Atlas (Cloud) — Recommended**

1. **Sign Up**: https://www.mongodb.com/cloud/atlas
2. **Create Cluster**: Free tier available (M0)
3. **Get Connection String**: `mongodb+srv://username:password@cluster.mongodb.net/rac?retryWrites=true`
4. **Add to `.env`**: `MONGODB_URI=<your-connection-string>`
5. **Data Persists**: Across all deployments (Docker, Kubernetes, cloud)
6. **Backups**: Automatic (daily for paid tiers, manual for free)

#### **Option 2: Local MongoDB Container (Development)**

Data persists in a Docker volume:

```yaml
# docker-compose.yml snippet
volumes:
  mongodb_data:

services:
  mongodb:
    image: mongo:latest
    volumes:
      - mongodb_data:/data/db
```

**To backup**:
```bash
docker compose exec mongodb mongodump --out /dump
docker compose cp mongodb:/dump ./backup
```

**To restore**:
```bash
docker compose cp ./backup mongodb:/dump
docker compose exec mongodb mongorestore /dump
```

#### **Option 3: Kubernetes PersistentVolumeClaim**

For self-hosted MongoDB in Kubernetes (advanced):

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-pvc
  namespace: rac-system
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

### Importing Existing Data

**If you have an existing MongoDB backup**:

```bash
# Backup current database
mongodump --uri "mongodb://source-host:27017/rac" --out ./backup

# Restore to new MongoDB
mongorestore --uri "mongodb+srv://user:password@cluster.mongodb.net/rac" ./backup/rac
```

**Using mongo client**:

```bash
# Copy from source to destination
mongodump --uri "mongodb://source-host:27017/rac" | mongorestore --uri "mongodb+srv://user:password@cluster.mongodb.net" --archive
```

### Initialize Fresh Database

Run setup scripts after deployment:

```bash
# Docker Compose
docker compose exec backend node scripts/createIndexes.js
docker compose exec backend node scripts/createTestAccounts.js

# Kubernetes
kubectl exec deployment/rac-backend -n rac-system -- node scripts/createIndexes.js
kubectl exec deployment/rac-backend -n rac-system -- node scripts/createTestAccounts.js

# Local (inside backend directory)
node scripts/createIndexes.js
node scripts/createTestAccounts.js
```

---

## Secrets & Configuration

### ⚠️ Security Best Practices

1. **Never commit secrets to git**
2. **Use environment variables or secret managers**
3. **Rotate secrets regularly**
4. **Use HTTPS/TLS in production**
5. **Restrict database access by IP**

### Secret Management Options

#### **Docker Compose**
- Use `.env` file (add to `.gitignore`)
- Use `docker compose --file` with different env files

#### **Kubernetes**
- Use `kubectl create secret` (better)
- Use HashiCorp Vault (enterprise)
- Use cloud provider secret managers (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager)

```bash
# Create secret from literal values
kubectl create secret generic rac-backend-secrets \
  --from-literal=MONGODB_URI='mongodb+srv://...' \
  --from-literal=JWT_SECRET='your-secret' \
  -n rac-system

# Create secret from file
kubectl create secret generic rac-backend-secrets \
  --from-file=.env \
  -n rac-system

# Create secret from environment file
kubectl create secret generic rac-backend-secrets \
  --from-env-file=.env.prod \
  -n rac-system
```

#### **Azure Key Vault + Container Apps**

```bash
# Store secrets in Key Vault
az keyvault create --name rac-vault --resource-group rac-rg

az keyvault secret set --vault-name rac-vault --name mongodb-uri --value 'mongodb+srv://...'
az keyvault secret set --vault-name rac-vault --name jwt-secret --value 'your-secret'

# Reference in Container App
az containerapp create \
  --name rac-backend \
  --secret-volume-mount /secrets \
  --secret-volume-name rac-secrets \
  ...
```

### Required Secrets

```
MONGODB_URI          # MongoDB connection string
JWT_SECRET           # JWT signing key (min 32 chars)
VAPID_PUBLIC_KEY     # For push notifications
VAPID_PRIVATE_KEY    # For push notifications
VAPID_EMAIL          # For push notifications
EMAIL_HOST           # SMTP server (optional)
EMAIL_PORT           # SMTP port (optional)
EMAIL_USER           # SMTP username (optional)
EMAIL_PASSWORD       # SMTP password (optional)
TWILIO_ACCOUNT_SID   # Twilio account (optional)
TWILIO_AUTH_TOKEN    # Twilio token (optional)
TWILIO_PHONE_NUMBER  # Twilio phone (optional)
```

---

## Post-Deployment Verification

### Health Checks

```bash
# Backend API health
curl http://localhost:5000/api/health

# Frontend accessibility
curl http://localhost:3000  # Should return HTML
curl http://localhost:3001  # Should return HTML
curl http://localhost:3002  # Should return HTML
```

### Database Connection

```bash
# Connect to MongoDB and verify collections
mongosh "mongodb+srv://user:password@cluster.mongodb.net/rac"

# List collections
show collections

# Verify train configuration
db.Trains_Details.findOne()

# Check users
db.tte_users.findOne()
db.passenger_accounts.findOne()
```

### Logs

```bash
# Docker Compose
docker compose logs -f backend
docker compose logs -f admin-portal

# Kubernetes
kubectl logs -f deployment/rac-backend -n rac-system
kubectl logs -f deployment/rac-admin-portal -n rac-system

# Watch all pods
kubectl get pods -n rac-system --watch
```

### Load Testing (k6)

```bash
# Run performance tests
cd backend/k6
npm install
k6 run scenarios/smoke.js

# Or with Docker
docker run --rm -v $PWD:/scripts grafana/k6 run /scripts/smoke.js
```

---

## Troubleshooting

### Common Issues & Solutions

#### **1. MongoDB Connection Error**

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions**:
- Ensure MongoDB is running: `docker compose ps | grep mongodb`
- Check `MONGODB_URI` in `.env` or deployment config
- If using Atlas, whitelist your IP: https://cloud.mongodb.com/v2/
- Test connection: `mongosh "mongodb+srv://user:password@cluster.mongodb.net"`

#### **2. CORS Error in Frontend**

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions**:
- Update `ALLOWED_ORIGINS` in backend config to include frontend domain
- Example: `ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002`
- Restart backend after changing

#### **3. Port Already in Use**

```
Error: listen EADDRINUSE :::5000
```

**Solutions**:
```bash
# Find process using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

#### **4. Docker Image Not Found**

```
Error: pull access denied for yourusername/rac-backend
```

**Solutions**:
- Ensure image is built: `docker build -t yourusername/rac-backend ./backend`
- Push to registry: `docker push yourusername/rac-backend`
- Update deployment config with correct image path
- Check Docker login: `docker login`

#### **5. Kubernetes Pod CrashLoopBackOff**

```
kubectl get pods -n rac-system
# STATUS: CrashLoopBackOff
```

**Solutions**:
```bash
# Check pod logs
kubectl logs <pod-name> -n rac-system

# Check pod events
kubectl describe pod <pod-name> -n rac-system

# Verify secrets are created
kubectl get secrets -n rac-system

# Verify configmaps
kubectl get configmaps -n rac-system
```

#### **6. Out of Memory / Resource Limits**

```bash
# Check resource usage
kubectl top pods -n rac-system

# Increase limits in deployment.yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "1000m"

# Reapply
kubectl apply -f k8s/backend/deployment.yaml
```

#### **7. Database Quota Exceeded (MongoDB Atlas)**

```
Error: MongoServerError: Quota exceeded for collections
```

**Solutions**:
- Upgrade MongoDB Atlas tier (from free to paid)
- Delete unused collections
- Implement data archiving/retention policy

---

## Scaling & Monitoring

### Docker Compose Scaling

```bash
# Scale specific service (replicas)
docker compose up -d --scale backend=3

# View scaled services
docker compose ps
```

### Kubernetes Scaling

```bash
# Manual scaling
kubectl scale deployment rac-backend --replicas=3 -n rac-system

# Autoscaling (requires Metrics Server)
kubectl autoscale deployment rac-backend \
  --min=2 \
  --max=5 \
  --cpu-percent=80 \
  -n rac-system

# View autoscaler status
kubectl get hpa -n rac-system
```

### Monitoring & Logging

#### **Prometheus + Grafana (Kubernetes)**

```bash
# Install Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Forward Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
# Access at http://localhost:3000
```

#### **ELK Stack (Elasticsearch + Logstash + Kibana)**

```bash
# Install ELK
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch -n logging --create-namespace
helm install kibana elastic/kibana -n logging
```

#### **CloudWatch (AWS)**

```bash
# Configure CloudWatch logging in deployment
# Set log driver in docker-compose.prod.yml or container app environment
```

#### **Application Insights (Azure)**

```bash
# Create Application Insights
az monitor app-insights component create \
  --app rac-insights \
  --location eastus \
  --resource-group rac-rg

# Add instrumentation key to environment
```

### Backup Strategy

#### **MongoDB Backups**

```bash
# Scheduled backup with MongoDB Atlas
# (Automatic in paid tiers)

# Manual backup
mongodump --uri "mongodb+srv://user:password@cluster.mongodb.net/rac" --out ./backup-$(date +%Y%m%d)

# Upload to cloud storage
az storage blob upload --file backup-20241224 --container backups --name backup-20241224 --account-name yourStorageAccount
```

#### **Application State Backup**

```bash
# Backup database collections
kubectl exec deployment/rac-backend -n rac-system -- \
  mongodump --uri "$MONGODB_URI" --out /tmp/backup

# Copy from pod
kubectl cp rac-system/<pod-name>:/tmp/backup ./local-backup
```

---

## Production Checklist

Before deploying to production, ensure:

### Database
- [ ] ✅ MongoDB Atlas cluster created (or managed database)
- [ ] ✅ Database user created with strong password
- [ ] ✅ Network access configured (IP whitelist)
- [ ] ✅ Local data migrated successfully
- [ ] ✅ Database indexes created (`createIndexes.js`)
- [ ] ✅ Backup strategy enabled (Atlas automatic backups)
- [ ] ✅ Connection string tested from deployment environment

### Security
- [ ] ✅ All secrets configured (JWT, VAPID, email, Twilio)
- [ ] ✅ JWT_SECRET is strong (min 32 characters)
- [ ] ✅ VAPID keys generated for production
- [ ] ✅ `ALLOWED_ORIGINS` includes only production domains (no `localhost`)
- [ ] ✅ TLS/HTTPS enabled on all endpoints
- [ ] ✅ API rate limiting configured
- [ ] ✅ CSRF protection enabled
- [ ] ✅ Security headers configured (helmet.js)
- [ ] ✅ Environment variables never committed to Git

### Backend
- [ ] ✅ Health check endpoint working (`/api/health`)
- [ ] ✅ WebSocket server tested
- [ ] ✅ Resource limits set (memory, CPU)
- [ ] ✅ Logging configured (production log level)
- [ ] ✅ Error handling middleware active
- [ ] ✅ Test accounts created
- [ ] ✅ Backend accessible from all frontend domains

### Frontend
- [ ] ✅ All 3 portals deployed (Admin, TTE, Passenger)
- [ ] ✅ Environment variables set (`VITE_API_URL`, `VITE_WS_URL`)
- [ ] ✅ Production builds optimized
- [ ] ✅ Service worker registered (for push notifications)
- [ ] ✅ Custom domains configured (if applicable)

### Testing
- [ ] ✅ Manual smoke test completed (login, core features)
- [ ] ✅ Load testing passed (k6 scenarios)
- [ ] ✅ Push notifications working
- [ ] ✅ Email notifications working (if configured)
- [ ] ✅ Real-time updates (WebSocket) verified
- [ ] ✅ Mobile responsiveness tested

### Monitoring & Operations
- [ ] ✅ Monitoring/alerting configured
- [ ] ✅ Uptime monitoring set up
- [ ] ✅ Error tracking enabled (Sentry, LogRocket, etc.)
- [ ] ✅ Disaster recovery plan documented
- [ ] ✅ Rollback strategy defined
- [ ] ✅ Team has access to all deployment dashboards

### Documentation
- [ ] ✅ Deployment process documented
- [ ] ✅ Environment variables documented
- [ ] ✅ API documentation updated (Swagger)
- [ ] ✅ Troubleshooting guide created
- [ ] ✅ Contact info for emergencies documented

---

## Additional Resources

- **MongoDB Documentation**: https://docs.mongodb.com
- **Docker Compose Docs**: https://docs.docker.com/compose
- **Kubernetes Docs**: https://kubernetes.io/docs
- **Express.js Docs**: https://expressjs.com
- **React/Vite Docs**: https://vitejs.dev
- **Azure Container Apps**: https://learn.microsoft.com/azure/container-apps
- **Heroku Deployment**: https://devcenter.heroku.com

---

## Quick Reference Commands

```bash
# Docker Compose
docker compose up -d --build           # Start all services
docker compose down                    # Stop all services
docker compose logs -f backend         # View backend logs
docker compose ps                      # List running containers
docker compose exec backend bash       # Access container shell

# Kubernetes
kubectl apply -f k8s/                  # Deploy to cluster
kubectl get pods -n rac-system         # List pods
kubectl logs -f deployment/rac-backend -n rac-system  # View logs
kubectl port-forward svc/rac-backend 5000:5000 -n rac-system  # Port forward
kubectl delete -f k8s/                 # Remove all resources

# MongoDB
mongosh "mongodb+srv://user:password@cluster.mongodb.net/rac"  # Connect
show collections                       # List collections
db.Trains_Details.find()              # Query data
```

---

## Support & Troubleshooting

For issues:
1. Check logs: `docker compose logs` or `kubectl logs`
2. Verify environment variables are set
3. Ensure MongoDB connectivity
4. Check port availability
5. Review GitHub Issues (if applicable)
6. Create a detailed bug report with:
   - Error message (exact text)
   - Deployment method (Docker/K8s)
   - Environment details (OS, versions)
   - Steps to reproduce
   - Logs from all services

---

**Last Updated:** December 24, 2025  
**Version:** 2.0 - Enhanced with Beginner-Friendly Quick Start  
**Maintainer:** RAC Team

> [!NOTE]
> **New to deployment?** Check the [Quick Start for First-Time Deployers](#-quick-start-for-first-time-deployers) section at the top for a simplified explanation and recommended deployment path.
