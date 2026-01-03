# 🌐 Share Docker Images via Docker Hub

Push your images to Docker Hub and pull them on any machine with internet access.

---

## Prerequisites

- Docker Hub account ([Create free account](https://hub.docker.com))
- Docker Desktop running on both machines

---

## Step 1: Login to Docker Hub

```bash
docker login
```

Enter your Docker Hub username and password when prompted.

---

## Step 2: List Your Local Images

```bash
docker images
```

You should see:
```
REPOSITORY              TAG       IMAGE ID
zip_2-backend           latest    abc123...
zip_2-admin-portal      latest    def456...
zip_2-tte-portal        latest    ghi789...
zip_2-passenger-portal  latest    jkl012...
```

---

## Step 3: Tag Images for Docker Hub

Replace `YOUR_USERNAME` with your Docker Hub username:

```bash
# Tag all 4 images
docker tag zip_2-backend YOUR_USERNAME/rac-backend:latest
docker tag zip_2-admin-portal YOUR_USERNAME/rac-admin:latest
docker tag zip_2-tte-portal YOUR_USERNAME/rac-tte:latest
docker tag zip_2-passenger-portal YOUR_USERNAME/rac-passenger:latest
```

---

## Step 4: Push to Docker Hub

```bash
# Push all 4 images (this may take a few minutes)
docker push YOUR_USERNAME/rac-backend:latest
docker push YOUR_USERNAME/rac-admin:latest
docker push YOUR_USERNAME/rac-tte:latest
docker push YOUR_USERNAME/rac-passenger:latest
```

---

## Step 5: On Other Laptop - Pull Images

```bash
# Login first
docker login

# Pull all images
docker pull YOUR_USERNAME/rac-backend:latest
docker pull YOUR_USERNAME/rac-admin:latest
docker pull YOUR_USERNAME/rac-tte:latest
docker pull YOUR_USERNAME/rac-passenger:latest

# Also pull MongoDB
docker pull mongo:7
```

---

## Step 6: Run on Other Laptop

Option A - Use docker run:
```bash
# Create network
docker network create rac-network

# Start MongoDB
docker run -d --name rac-mongodb --network rac-network -p 27017:27017 mongo:7

# Start Backend
docker run -d --name rac-backend --network rac-network -p 5000:5000 \
  -e MONGODB_URI=mongodb://rac-mongodb:27017 \
  YOUR_USERNAME/rac-backend:latest

# Start Portals
docker run -d --name rac-admin --network rac-network -p 5173:80 YOUR_USERNAME/rac-admin:latest
docker run -d --name rac-tte --network rac-network -p 5174:80 YOUR_USERNAME/rac-tte:latest
docker run -d --name rac-passenger --network rac-network -p 5175:80 YOUR_USERNAME/rac-passenger:latest
```

Option B - Update docker-compose.yml on other laptop to use your Docker Hub images:
```yaml
services:
  backend:
    image: YOUR_USERNAME/rac-backend:latest
  admin-portal:
    image: YOUR_USERNAME/rac-admin:latest
  # ... etc
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

## Useful Commands

```bash
# Check pushed images on Docker Hub
# Visit: https://hub.docker.com/u/YOUR_USERNAME

# Update an image (after code changes)
docker-compose build backend
docker tag zip_2-backend YOUR_USERNAME/rac-backend:v2
docker push YOUR_USERNAME/rac-backend:v2
```

---

*Last Updated: January 3, 2026*
