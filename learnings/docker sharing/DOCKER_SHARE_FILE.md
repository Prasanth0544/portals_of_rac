# 💾 Share Docker Images via File Export

Export your Docker images as `.tar` files and transfer them via USB, external drive, or any file sharing method.

---

## Prerequisites

- Docker Desktop running on both machines
- USB drive or file sharing method (~2-3 GB space needed)

---

## Step 1: List Your Images

```bash
docker images
```

Note the image names you want to export.

---

## Step 2: Save Images to Files

```bash
# Create a folder for exports
mkdir docker-exports
cd docker-exports

# Save each image (this takes a few minutes per image)
docker save zip_2-backend -o rac-backend.tar
docker save zip_2-admin-portal -o rac-admin.tar
docker save zip_2-tte-portal -o rac-tte.tar
docker save zip_2-passenger-portal -o rac-passenger.tar

# Also save MongoDB if needed
docker save mongo:7 -o mongo.tar
```

### Check file sizes:
```bash
dir
```

Expected sizes:
- Backend: ~200-400 MB
- Frontend portals: ~50-100 MB each
- MongoDB: ~700 MB

---

## Step 3: Transfer Files

Copy the `.tar` files to:
- USB drive
- External hard drive
- Network share
- Cloud storage (Google Drive, OneDrive, etc.)

---

## Step 4: On Other Laptop - Load Images

```bash
# Navigate to folder with .tar files
cd /path/to/docker-exports

# Load each image
docker load -i rac-backend.tar
docker load -i rac-admin.tar
docker load -i rac-tte.tar
docker load -i rac-passenger.tar
docker load -i mongo.tar
```

### Verify images loaded:
```bash
docker images
```

---

## Step 5: Run the Containers

```bash
# Create network
docker network create rac-network

# Start MongoDB
docker run -d --name rac-mongodb --network rac-network -p 27017:27017 mongo:7

# Start Backend
docker run -d --name rac-backend --network rac-network -p 5000:5000 \
  -e MONGODB_URI=mongodb://rac-mongodb:27017 \
  -e JWT_SECRET=your-secret-key \
  zip_2-backend

# Start Portals
docker run -d --name rac-admin --network rac-network -p 5173:80 zip_2-admin-portal
docker run -d --name rac-tte --network rac-network -p 5174:80 zip_2-tte-portal
docker run -d --name rac-passenger --network rac-network -p 5175:80 zip_2-passenger-portal
```

---

## Access URLs

| Portal | URL |
|--------|-----|
| Admin Portal | http://localhost:5173 |
| TTE Portal | http://localhost:5174 |
| Passenger Portal | http://localhost:5175 |
| Backend API | http://localhost:5000 |

---

## Compress for Smaller Transfer (Optional)

```bash
# Compress with gzip (reduces size by ~50%)
gzip rac-backend.tar
gzip rac-admin.tar
gzip rac-tte.tar
gzip rac-passenger.tar

# On other laptop, decompress first
gunzip rac-backend.tar.gz
docker load -i rac-backend.tar
```

---

## Quick Script - Save All

Create `save-docker-images.ps1`:
```powershell
# Save all RAC images
$images = @("zip_2-backend", "zip_2-admin-portal", "zip_2-tte-portal", "zip_2-passenger-portal", "mongo:7")
$names = @("rac-backend", "rac-admin", "rac-tte", "rac-passenger", "mongo")

for ($i = 0; $i -lt $images.Length; $i++) {
    Write-Host "Saving $($images[$i])..."
    docker save $images[$i] -o "$($names[$i]).tar"
}

Write-Host "Done! Files saved."
```

---

## Quick Script - Load All

Create `load-docker-images.ps1`:
```powershell
# Load all RAC images
$files = Get-ChildItem -Filter "*.tar"

foreach ($file in $files) {
    Write-Host "Loading $($file.Name)..."
    docker load -i $file.Name
}

Write-Host "Done! Run 'docker images' to verify."
```

---

*Last Updated: January 3, 2026*
