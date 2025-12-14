# ============================================
# RAC Reallocation System - Deployment Guide
# ============================================

This guide covers deploying the RAC Reallocation System using Docker and Kubernetes.

---

## Quick Reference

| Service | Local Port | Docker Port | Description |
|---------|------------|-------------|-------------|
| Backend API | 5000 | 5000 | Node.js Express API |
| Admin Portal | 5173 | 80 | Admin dashboard |
| TTE Portal | 5174 | 80 | Train Ticket Examiner |
| Passenger Portal | 5175 | 80 | Passenger self-service |
| MongoDB | 27017 | 27017 | Database |

---

## 🐳 Docker Deployment

### Prerequisites
- Docker 24+ installed
- Docker Compose v2+
- 4GB+ RAM available

### Development (Local)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose build --no-cache
docker-compose up -d
```

### Production

```bash
# Set environment variables (create .env file or export)
export MONGO_ROOT_USER=admin
export MONGO_ROOT_PASSWORD=your-secure-password
export JWT_SECRET=your-production-jwt-secret-min-32-chars

# Deploy with production overrides
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check status
docker-compose ps
```

### Required Environment Variables (Production)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ | JWT signing secret (32+ chars) |
| `MONGO_ROOT_USER` | ✅ | MongoDB admin username |
| `MONGO_ROOT_PASSWORD` | ✅ | MongoDB admin password |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated frontend URLs |
| `VAPID_PUBLIC_KEY` | ✅ | Push notification public key |
| `VAPID_PRIVATE_KEY` | ✅ | Push notification private key |

---

## ☸️ Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (EKS, GKE, AKS, or local)
- kubectl configured
- Ingress Controller installed
- Container registry access

### Step 1: Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### Step 2: Create Secrets

```bash
# Create secrets from template
# Edit k8s/backend/secrets.yaml first!
kubectl apply -f k8s/backend/secrets.yaml
```

**Encoding secrets:**
```bash
# Example: encode MongoDB URI
echo -n 'mongodb://user:pass@host:27017' | base64
```

### Step 3: Deploy ConfigMap

```bash
kubectl apply -f k8s/backend/configmap.yaml
```

### Step 4: Deploy Applications

```bash
# Deploy backend
kubectl apply -f k8s/backend/deployment.yaml
kubectl apply -f k8s/backend/service.yaml

# Deploy frontends
kubectl apply -f k8s/frontend/deployment.yaml
kubectl apply -f k8s/frontend/service.yaml
```

### Step 5: Configure Ingress

```bash
# Edit k8s/ingress.yaml with your domains
kubectl apply -f k8s/ingress.yaml
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n rac-system

# Check services
kubectl get svc -n rac-system

# Check ingress
kubectl get ingress -n rac-system

# View logs
kubectl logs -f deployment/rac-backend -n rac-system
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Setup

1. **Add Repository Secrets** (Settings → Secrets → Actions):
   - `DOCKER_USERNAME` - Docker Hub username
   - `DOCKER_PASSWORD` - Docker Hub access token

2. **Triggers**:
   - **CI**: Runs on push/PR to main/develop
   - **CD**: Runs on push to main (staging) or release tag (production)

### Manual Deployment

```bash
# Build and push images manually
docker build -t your-registry/rac-backend:v1.0.0 ./backend
docker push your-registry/rac-backend:v1.0.0
```

---

## 🔍 Health Checks

### Backend Health Endpoint
```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": 123.45,
  "cache": { "hits": 100, "misses": 10 }
}
```

### Docker Health Status
```bash
docker-compose ps
# All services should show "healthy"
```

---

## 🛠 Troubleshooting

### Container won't start
```bash
docker-compose logs backend
docker-compose logs mongodb
```

### MongoDB connection issues
```bash
# Check if MongoDB is healthy
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### Frontend not loading
```bash
# Check nginx logs
docker-compose logs admin-portal
```

### Kubernetes pod crash loop
```bash
kubectl describe pod <pod-name> -n rac-system
kubectl logs <pod-name> -n rac-system --previous
```

---

## 📊 Resource Requirements

### Minimum (Development)
- 2 CPU cores
- 4GB RAM
- 10GB disk

### Recommended (Production)
- 4 CPU cores
- 8GB RAM
- 50GB SSD

---

## 🔐 Security Checklist

- [ ] Change all default passwords
- [ ] Generate new JWT secret (32+ characters)
- [ ] Generate new VAPID keys: `npx web-push generate-vapid-keys`
- [ ] Enable TLS/HTTPS in production
- [ ] Configure firewall rules
- [ ] Enable MongoDB authentication
- [ ] Set up backup automation
