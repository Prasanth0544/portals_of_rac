# 📁 Share Docker via Source Code

The simplest method - share your project code and let the other laptop build the images locally.

---

## Prerequisites

- Docker Desktop installed on other laptop
- Git (optional, for cloning)

---

## Option A: Share via Git (Recommended)

### Step 1: Push to GitHub

```bash
# If not already a git repo
git init
git add .
git commit -m "RAC Reallocation System"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/rac-system.git
git push -u origin main
```

### Step 2: On Other Laptop - Clone & Run

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/rac-system.git
cd rac-system

# Build and start all containers
docker-compose up -d --build
```

That's it! Docker will build all images from the Dockerfiles.

---

## Option B: Share via ZIP File

### Step 1: Create ZIP (exclude node_modules)

```bash
# In project root, create a clean ZIP
# Exclude: node_modules, .git, coverage, etc.
```

Or manually:
1. Copy the project folder
2. Delete `node_modules` folders from all directories
3. Delete `.git` folder
4. Delete `coverage` folder
5. ZIP the remaining files

### Step 2: On Other Laptop - Extract & Run

```bash
# Extract ZIP file
cd rac-system

# Build and start all containers
docker-compose up -d --build
```

---

## What Gets Built

When running `docker-compose up -d --build`:

| Service | Dockerfile | Build Time |
|---------|-----------|------------|
| Backend | `backend/Dockerfile` | ~2-3 min |
| Admin Portal | `frontend/Dockerfile` | ~3-5 min |
| TTE Portal | `tte-portal/Dockerfile` | ~3-5 min |
| Passenger Portal | `passenger-portal/Dockerfile` | ~3-5 min |
| MongoDB | Pulled from Docker Hub | ~2 min |

**Total first build:** ~15-20 minutes

---

## Files Required for Docker Build

Make sure these files are included:

```
rac-system/
├── docker-compose.yml          ✅ Required
├── docker-compose.prod.yml     ✅ Optional (production)
├── backend/
│   ├── Dockerfile              ✅ Required
│   ├── package.json            ✅ Required
│   ├── package-lock.json       ✅ Required
│   ├── server.js               ✅ Required
│   └── ... (all source files)
├── frontend/
│   ├── Dockerfile              ✅ Required
│   ├── nginx.conf              ✅ Required
│   ├── package.json            ✅ Required
│   └── ... (all source files)
├── tte-portal/
│   ├── Dockerfile              ✅ Required
│   ├── nginx.conf              ✅ Required
│   └── ... (all source files)
├── passenger-portal/
│   ├── Dockerfile              ✅ Required
│   ├── nginx.conf              ✅ Required
│   └── ... (all source files)
└── .dockerignore               ✅ Recommended
```

---

## Quick Commands on Other Laptop

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Stop everything
docker-compose down
```

---

## Access URLs

| Portal | URL | Login |
|--------|-----|-------|
| Admin Portal | http://localhost:5173 | `ADMIN_01` / `Prasanth@123` |
| TTE Portal | http://localhost:5174 | `TTE_01` / `Prasanth@123` |
| Passenger Portal | http://localhost:5175 | PNR: `1722500001` |
| Backend API | http://localhost:5000 | - |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Run `docker-compose build --no-cache` |
| Port already in use | Change ports in `docker-compose.yml` |
| Permission denied | Run terminal as Administrator |
| Out of disk space | Run `docker system prune -a` |

---

## Advantages of This Method

✅ **Smallest transfer size** (~50 MB without node_modules)  
✅ **Always latest code** (can pull updates via git)  
✅ **No Docker Hub account needed**  
✅ **Works offline** (after initial npm packages are cached)  
✅ **Easy to modify** (full source code available)  

---

*Last Updated: January 3, 2026*
