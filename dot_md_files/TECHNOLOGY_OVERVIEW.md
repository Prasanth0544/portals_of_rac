# 🎯 Technology Overview - RAC Reallocation System

A comprehensive guide to all technologies used in this project.

---

## 📚 Core Technologies (Must Know)

### 1. Frontend (React + Vite)

| Technology | Purpose | Priority |
|------------|---------|----------|
| **React 19** | Component-based UI framework | ⭐⭐⭐ Essential |
| **TypeScript (.tsx/.ts)** | Type-safe JavaScript | ⭐⭐⭐ Essential |
| **Vite** | Fast build tool (replaces Create React App) | ⭐⭐ High |
| **Material-UI (MUI)** | React component library | ⭐⭐ High |
| **Axios** | HTTP client for API calls | ⭐⭐ High |
| **React Router** | Client-side navigation | ⭐⭐ High |
| **CSS/Vanilla CSS** | Styling | ⭐⭐ High |

---

### 2. Backend (Node.js + Express)

| Technology | Purpose | Priority |
|------------|---------|----------|
| **Node.js** | JavaScript runtime | ⭐⭐⭐ Essential |
| **Express.js** | Web framework for REST APIs | ⭐⭐⭐ Essential |
| **MongoDB + Mongoose** | NoSQL database + ODM | ⭐⭐⭐ Essential |
| **JWT (jsonwebtoken)** | Authentication tokens | ⭐⭐⭐ Essential |
| **WebSocket (ws library)** | Real-time bidirectional communication | ⭐⭐ High |

---

### 3. Database

| Technology | Purpose | Priority |
|------------|---------|----------|
| **MongoDB** | NoSQL document database | ⭐⭐⭐ Essential |
| **Mongoose** | MongoDB object modeling | ⭐⭐⭐ Essential |

---

## 📦 Supporting Libraries (Should Know)

### Validation & Security
- **Zod** / **Joi** – Schema validation
- **bcrypt** – Password hashing
- **express-rate-limit** – API rate limiting
- **CORS** – Cross-Origin Resource Sharing

### Notifications
- **Web Push API (VAPID)** – Browser push notifications
- **Nodemailer** – Email sending via SMTP
- **Twilio** – SMS notifications (optional)

### Caching & Performance
- **node-cache** – In-memory caching

### DevOps & Deployment
- **Docker** – Containerization (Dockerfiles + docker-compose)
- **Kubernetes** – Container orchestration (manifests included)
- **GitHub Actions** – CI/CD pipelines (lint, test, build, deploy)
- **Nginx** – Reverse proxy for frontend static files

### Testing
- **Jest** – JavaScript testing framework
- **Supertest** – HTTP assertion testing

### Developer Tools
- **Nodemon** – Auto-reload during development
- **TypeScript** – Static type checking
- **Swagger (OpenAPI)** – API documentation

---

## 📖 Learning Path (Recommended Order)

```
1. JavaScript Fundamentals
   └── ES6+ (Promises, async/await, destructuring)

2. React Basics
   ├── Components, Props, State
   ├── Hooks (useState, useEffect, useContext)
   └── React Router

3. Node.js + Express
   ├── REST API design
   ├── Middleware concept
   └── Route handling

4. MongoDB + Mongoose
   ├── CRUD operations
   ├── Schema design
   └── Queries & aggregations

5. Authentication
   ├── JWT tokens
   ├── Bcrypt hashing
   └── Middleware protection

6. Advanced Topics
   ├── TypeScript
   ├── WebSocket real-time communication
   ├── Web Push notifications
   └── Testing with Jest
```

---

## 🏗️ Project Technology Stack Summary

| Stack Layer | Technologies |
|-------------|--------------|
| **MERN** | **M**ongoDB, **E**xpress, **R**eact, **N**ode.js |
| **Build Tool** | Vite (Modern + Fast) |
| **Language** | TypeScript (type-safe JS) |
| **Real-time** | WebSocket |
| **Notifications** | Web Push + Email + SMS |
| **Auth** | JWT + bcrypt |
| **Testing** | Jest + Supertest |
| **DevOps** | Docker + Kubernetes + GitHub Actions |

---

## 🔗 Related Documentation

- [README.md](../README.md) - Quick start guide
- [QUICKSTART.md](../QUICKSTART.md) - Complete setup instructions
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture & communication
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Docker & Kubernetes deployment

---

**Last Updated:** December 12, 2025
