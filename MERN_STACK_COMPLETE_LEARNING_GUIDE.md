# 🚀 Complete MERN Stack Learning Guide
## From Zero to Full-Stack Developer (16-Week Program)

> **Target Audience:** Complete beginners starting from scratch  
> **Daily Commitment:** 3-4 hours/day  
> **Weekly Commitment:** 20-25 hours/week

---

# 📋 Table of Contents

1. [Technology Overview](#-technology-overview)
2. [Prerequisites](#-prerequisites-week-0)
3. [Weekly Learning Schedule](#-weekly-learning-schedule)
4. [Detailed Topic Guides](#-detailed-topic-guides)
5. [Project-Based Learning](#-project-based-learning)
6. [Resources & Links](#-resources--links)

---

# 🎯 Technology Overview

## The MERN Stack Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                            │
├─────────────────────────────────────────────────────────────────────┤
│  React/React+Vite │ Next.js │ Angular │ React Native (Mobile)       │
│  TypeScript (.tsx/.ts) │ JavaScript (.jsx/.js)                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP/HTTPS (REST API / GraphQL)
                               │ WebSocket (Real-time)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVER (Backend)                            │
├─────────────────────────────────────────────────────────────────────┤
│  Node.js Runtime │ Express.js Framework                             │
│  JWT Authentication │ CORS │ Rate Limiting                          │
│  Web Push Notifications │ Nodemailer (Email)                        │
│  Swagger/OpenAPI Documentation                                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ MongoDB Driver / Mongoose ODM
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE                                    │
├─────────────────────────────────────────────────────────────────────┤
│  MongoDB (NoSQL) │ Redis (Caching) │ PostgreSQL (SQL alternative)   │
└─────────────────────────────────────────────────────────────────────┘
```

## Complete Technology Matrix

| Category | Technology | Difficulty | Week to Learn |
|----------|------------|------------|---------------|
| **Core Backend** | Node.js | ⭐⭐ Medium | Week 3 |
| **Core Backend** | Express.js | ⭐⭐ Medium | Week 4 |
| **Core Frontend** | React | ⭐⭐⭐ Medium-High | Week 5-6 |
| **Build Tool** | Vite | ⭐ Easy | Week 5 |
| **Database** | MongoDB | ⭐⭐ Medium | Week 7 |
| **Language** | JavaScript ES6+ | ⭐⭐ Medium | Week 1-2 |
| **Language** | TypeScript | ⭐⭐⭐ Medium-High | Week 8 |
| **Authentication** | JWT | ⭐⭐ Medium | Week 9 |
| **Real-time** | WebSocket | ⭐⭐⭐ Medium-High | Week 10 |
| **Notifications** | Web Push API | ⭐⭐⭐ Medium-High | Week 11 |
| **Security** | CORS, Rate Limiting | ⭐⭐ Medium | Week 9 |
| **Documentation** | Swagger/OpenAPI | ⭐⭐ Medium | Week 12 |
| **DevOps** | CI/CD (GitHub Actions) | ⭐⭐⭐ Medium-High | Week 13 |
| **Frameworks** | Next.js | ⭐⭐⭐ Medium-High | Week 14 |
| **Frameworks** | Angular | ⭐⭐⭐⭐ High | Week 15 |
| **Mobile** | React Native | ⭐⭐⭐ Medium-High | Week 16 |
| **Dashboards** | Power BI / Python | ⭐⭐ Medium | Bonus |

---

# 🏁 Prerequisites (Week 0)

## Before You Begin

### Required Software Installation

```bash
# 1. Install Node.js (LTS version)
# Download from: https://nodejs.org/

# 2. Verify installation
node --version    # Should show v18+ or v20+
npm --version     # Should show 9+

# 3. Install Git
# Download from: https://git-scm.com/

# 4. Install VS Code (Recommended IDE)
# Download from: https://code.visualstudio.com/

# 5. Install MongoDB (Local) or use MongoDB Atlas (Cloud)
# https://www.mongodb.com/try/download/community
# OR sign up at https://www.mongodb.com/atlas
```

### VS Code Extensions to Install

| Extension | Purpose |
|-----------|---------|
| **ES7+ React/Redux/React-Native snippets** | Code snippets |
| **Prettier** | Code formatting |
| **ESLint** | Code linting |
| **MongoDB for VS Code** | Database management |
| **Thunder Client** | API testing |
| **GitLens** | Git integration |
| **Auto Rename Tag** | HTML/JSX helper |

---

# 📅 Weekly Learning Schedule

## Phase 1: Foundations (Weeks 1-4)

### 📘 Week 1: JavaScript Fundamentals

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | Variables (var, let, const), Data Types | 3 hours | Write 10 variable examples |
| **Day 2** | Operators, Conditionals (if/else, switch) | 3 hours | Build a calculator |
| **Day 3** | Loops (for, while, forEach) | 3 hours | Array iteration exercises |
| **Day 4** | Functions (regular, arrow, callbacks) | 4 hours | Write 15 functions |
| **Day 5** | Arrays & Array Methods (map, filter, reduce) | 4 hours | Data manipulation exercises |
| **Day 6** | Objects & Object Methods | 3 hours | Create object-based data |
| **Day 7** | Review + Mini Project | 4 hours | Build a Todo List (console) |

**Key Concepts to Master:**
```javascript
// Arrow Functions
const greet = (name) => `Hello, ${name}!`;

// Array Methods
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
const evens = numbers.filter(n => n % 2 === 0);
const sum = numbers.reduce((acc, n) => acc + n, 0);

// Destructuring
const { name, age } = person;
const [first, second] = array;

// Spread Operator
const newArray = [...oldArray, newItem];
const newObject = { ...oldObject, newProp: value };

// Template Literals
const message = `User ${name} is ${age} years old`;
```

---

### 📘 Week 2: Advanced JavaScript (ES6+)

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | Template Literals, Destructuring | 3 hours | Refactor existing code |
| **Day 2** | Spread/Rest Operators | 3 hours | Function parameter exercises |
| **Day 3** | Promises & Promise Chaining | 4 hours | Async data fetching simulation |
| **Day 4** | Async/Await | 4 hours | Convert promises to async/await |
| **Day 5** | ES6 Modules (import/export) | 3 hours | Modularize code |
| **Day 6** | Classes & OOP in JavaScript | 3 hours | Create class hierarchies |
| **Day 7** | Error Handling (try/catch) | 3 hours | Build robust functions |

**Key Concepts:**
```javascript
// Promises
const fetchData = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ data: 'Success!' });
    }, 1000);
  });
};

// Async/Await
const getData = async () => {
  try {
    const response = await fetchData();
    console.log(response.data);
  } catch (error) {
    console.error('Error:', error);
  }
};

// ES6 Classes
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
  
  greet() {
    return `Hello, I'm ${this.name}`;
  }
}

// Modules
// utils.js
export const helper = () => { };
export default MainClass;

// app.js
import MainClass, { helper } from './utils.js';
```

---

### 📘 Week 3: Node.js Fundamentals

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | What is Node.js? Event Loop, npm | 3 hours | Install packages |
| **Day 2** | File System (fs module) | 3 hours | Read/write files |
| **Day 3** | Path module, OS module | 2 hours | Path operations |
| **Day 4** | HTTP module (creating servers) | 4 hours | Build raw HTTP server |
| **Day 5** | Streams and Buffers | 3 hours | Stream file data |
| **Day 6** | npm & package.json deep dive | 3 hours | Create your own package |
| **Day 7** | Mini Project: CLI Application | 4 hours | Build a file organizer CLI |

**Key Concepts:**
```javascript
// Basic HTTP Server
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Hello World!' }));
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});

// File System Operations
const fs = require('fs').promises;

async function readFile() {
  const data = await fs.readFile('file.txt', 'utf8');
  console.log(data);
}

// npm package.json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

---

### 📘 Week 4: Express.js Framework

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | Express Setup, Basic Routing | 3 hours | Create routes |
| **Day 2** | Middleware Concept | 4 hours | Build custom middleware |
| **Day 3** | Request/Response Objects | 3 hours | Handle different request types |
| **Day 4** | Route Parameters & Query Strings | 3 hours | Dynamic routes |
| **Day 5** | Error Handling Middleware | 3 hours | Centralized error handling |
| **Day 6** | Static Files & Template Engines | 3 hours | Serve static content |
| **Day 7** | Mini Project: REST API (no database) | 4 hours | In-memory CRUD API |

**Key Concepts:**
```javascript
const express = require('express');
const app = express();

// Middleware
app.use(express.json()); // Parse JSON bodies

// Custom Middleware
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
};
app.use(logger);

// Routes
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ userId: id });
});

app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  res.status(201).json({ message: 'User created' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(3000);
```

---

## Phase 2: Frontend Development (Weeks 5-8)

### 📘 Week 5: React Fundamentals + Vite

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | What is React? Vite setup | 3 hours | Create first React app |
| **Day 2** | JSX Syntax, Components | 4 hours | Build 10 components |
| **Day 3** | Props - Passing Data | 3 hours | Parent-child communication |
| **Day 4** | State with useState | 4 hours | Interactive components |
| **Day 5** | Handling Events | 3 hours | Forms and buttons |
| **Day 6** | Conditional Rendering | 3 hours | Show/hide elements |
| **Day 7** | Lists and Keys | 3 hours | Render dynamic lists |

**Setting Up React with Vite:**
```bash
# Create new React project with Vite
npm create vite@latest my-app -- --template react

# Navigate and install
cd my-app
npm install

# Start development server
npm run dev
```

**Key Concepts:**
```jsx
// Functional Component
function Welcome({ name }) {
  return <h1>Hello, {name}!</h1>;
}

// State with useState
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

// Conditional Rendering
function UserGreeting({ isLoggedIn }) {
  return (
    <div>
      {isLoggedIn ? (
        <h1>Welcome back!</h1>
      ) : (
        <h1>Please sign in</h1>
      )}
    </div>
  );
}

// Lists and Keys
function UserList({ users }) {
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

---

### 📘 Week 6: React Advanced Concepts

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | useEffect Hook | 4 hours | Side effects & cleanup |
| **Day 2** | useContext Hook | 3 hours | Global state management |
| **Day 3** | useRef & useMemo | 3 hours | Performance optimization |
| **Day 4** | Custom Hooks | 4 hours | Create reusable hooks |
| **Day 5** | React Router DOM | 4 hours | Multi-page navigation |
| **Day 6** | Forms & Controlled Components | 3 hours | Complex forms |
| **Day 7** | Mini Project: Portfolio Website | 4 hours | Apply all concepts |

**Key Concepts:**
```jsx
// useEffect
import { useState, useEffect } from 'react';

function DataFetcher() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
    
    // Cleanup function
    return () => {
      console.log('Component unmounted');
    };
  }, []); // Empty dependency array = run once

  if (loading) return <p>Loading...</p>;
  return <div>{JSON.stringify(data)}</div>;
}

// useContext
import { createContext, useContext } from 'react';

const ThemeContext = createContext('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <ChildComponent />
    </ThemeContext.Provider>
  );
}

function ChildComponent() {
  const theme = useContext(ThemeContext);
  return <p>Current theme: {theme}</p>;
}

// React Router
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/user/:id" element={<UserProfile />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

### 📘 Week 7: MongoDB & Mongoose

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | MongoDB Basics, Installation/Atlas | 3 hours | Database setup |
| **Day 2** | CRUD Operations (mongo shell) | 4 hours | Database operations |
| **Day 3** | Mongoose Setup & Schemas | 4 hours | Define models |
| **Day 4** | Mongoose CRUD Operations | 4 hours | API with database |
| **Day 5** | Relationships & Population | 3 hours | Related documents |
| **Day 6** | Indexing & Aggregation | 3 hours | Query optimization |
| **Day 7** | Mini Project: Blog API with DB | 4 hours | Full CRUD API |

**Key Concepts:**
```javascript
// MongoDB Connection
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/myapp')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));

// Schema Definition
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

// CRUD Operations
// Create
const newUser = await User.create({ name, email, password });

// Read
const users = await User.find();
const user = await User.findById(id);
const userByEmail = await User.findOne({ email });

// Update
await User.findByIdAndUpdate(id, { name: 'New Name' }, { new: true });

// Delete
await User.findByIdAndDelete(id);

// Population (References)
const postSchema = new mongoose.Schema({
  title: String,
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const posts = await Post.find().populate('author', 'name email');
```

---

### 📘 Week 8: TypeScript

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | TypeScript Setup, Basic Types | 3 hours | Type annotations |
| **Day 2** | Interfaces & Type Aliases | 4 hours | Define data structures |
| **Day 3** | Functions with TypeScript | 3 hours | Typed functions |
| **Day 4** | Generics | 4 hours | Reusable typed code |
| **Day 5** | TypeScript with React (.tsx) | 4 hours | Typed components |
| **Day 6** | TypeScript with Express | 3 hours | Typed backend |
| **Day 7** | Mini Project: Convert JS to TS | 4 hours | Migration practice |

**Key Concepts:**
```typescript
// Basic Types
let name: string = 'John';
let age: number = 30;
let isActive: boolean = true;
let items: string[] = ['a', 'b', 'c'];
let tuple: [string, number] = ['hello', 10];

// Interfaces
interface User {
  id: number;
  name: string;
  email: string;
  role?: string; // Optional property
}

// Type Alias
type Status = 'pending' | 'approved' | 'rejected';

// Functions
function greet(name: string): string {
  return `Hello, ${name}`;
}

const add = (a: number, b: number): number => a + b;

// Generics
function getFirst<T>(arr: T[]): T {
  return arr[0];
}

const firstNumber = getFirst<number>([1, 2, 3]);
const firstString = getFirst<string>(['a', 'b', 'c']);

// React with TypeScript
interface Props {
  title: string;
  onClick: () => void;
  count?: number;
}

const MyComponent: React.FC<Props> = ({ title, onClick, count = 0 }) => {
  return (
    <div>
      <h1>{title}</h1>
      <p>Count: {count}</p>
      <button onClick={onClick}>Click</button>
    </div>
  );
};
```

---

## Phase 3: Authentication & Security (Weeks 9-10)

### 📘 Week 9: Authentication (JWT) & Security

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | Password Hashing (bcrypt) | 3 hours | Hash passwords |
| **Day 2** | JWT Fundamentals | 4 hours | Create/verify tokens |
| **Day 3** | Auth Routes (Register/Login) | 4 hours | Full auth flow |
| **Day 4** | Protected Routes (Middleware) | 4 hours | Route protection |
| **Day 5** | CORS Configuration | 3 hours | Cross-origin setup |
| **Day 6** | Rate Limiting & Security Headers | 3 hours | API security |
| **Day 7** | Mini Project: Auth System | 4 hours | Complete auth |

**Key Concepts:**
```javascript
// Password Hashing with bcrypt
const bcrypt = require('bcrypt');

// Hash password before saving
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(password, salt);

// Verify password during login
const isMatch = await bcrypt.compare(password, user.password);

// JWT (JSON Web Token)
const jwt = require('jsonwebtoken');

// Generate token
const token = jwt.sign(
  { userId: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Verify token (middleware)
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// CORS Setup
const cors = require('cors');

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate Limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);
```

---

### 📘 Week 10: WebSocket Real-time Communication

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | WebSocket Basics | 3 hours | Understand protocol |
| **Day 2** | WS Library Setup (Node.js) | 4 hours | Server-side WebSocket |
| **Day 3** | Client-side WebSocket | 4 hours | React WebSocket client |
| **Day 4** | Broadcasting & Rooms | 3 hours | Group messaging |
| **Day 5** | Authentication with WebSocket | 3 hours | Secure connections |
| **Day 6** | Reconnection & Error Handling | 3 hours | Robust connections |
| **Day 7** | Mini Project: Real-time Chat | 4 hours | Chat application |

**Key Concepts:**
```javascript
// Server (Node.js with ws)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map();

wss.on('connection', (ws, req) => {
  const userId = req.url.split('userId=')[1];
  clients.set(userId, ws);
  
  console.log(`Client connected: ${userId}`);

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('Received:', message);
    
    // Broadcast to all clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  });

  ws.on('close', () => {
    clients.delete(userId);
    console.log(`Client disconnected: ${userId}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Client (React)
import { useEffect, useRef, useState } from 'react';

function useWebSocket(url) {
  const wsRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    wsRef.current = new WebSocket(url);

    wsRef.current.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages(prev => [...prev, data]);
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };

    return () => {
      wsRef.current?.close();
    };
  }, [url]);

  const sendMessage = (message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return { messages, sendMessage, isConnected };
}
```

---

## Phase 4: Notifications & Documentation (Weeks 11-12)

### 📘 Week 11: Web Push Notifications

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | Push Notification Basics | 3 hours | Understand flow |
| **Day 2** | VAPID Keys & Setup | 3 hours | Generate keys |
| **Day 3** | Service Worker for Push | 4 hours | Client-side setup |
| **Day 4** | Backend Push Implementation | 4 hours | Server-side |
| **Day 5** | Subscription Management | 3 hours | Save subscriptions |
| **Day 6** | Email Notifications (Nodemailer) | 3 hours | SMTP setup |
| **Day 7** | Mini Project: Notification System | 4 hours | Complete system |

**Key Concepts:**
```javascript
// Generate VAPID Keys (run once)
// npx web-push generate-vapid-keys

// Backend (Express)
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:your@email.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Store subscription
app.post('/api/push/subscribe', async (req, res) => {
  const subscription = req.body;
  // Save to database
  await Subscription.create({
    userId: req.user.id,
    subscription
  });
  res.status(201).json({ message: 'Subscribed' });
});

// Send notification
const sendPushNotification = async (subscription, payload) => {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
  } catch (error) {
    if (error.statusCode === 410) {
      // Subscription expired, remove from DB
      await Subscription.deleteOne({ subscription });
    }
  }
};

// Client Service Worker (sw.js)
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/badge.png',
    vibrate: [100, 50, 100],
    data: { url: data.url }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Email with Nodemailer
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html
  });
};
```

---

### 📘 Week 12: API Documentation (Swagger/OpenAPI)

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | OpenAPI Specification Basics | 3 hours | Write specs |
| **Day 2** | Swagger UI Setup | 4 hours | Setup swagger-ui-express |
| **Day 3** | Documenting Endpoints | 4 hours | Document all routes |
| **Day 4** | Request/Response Schemas | 3 hours | Define schemas |
| **Day 5** | Authentication in Swagger | 3 hours | JWT auth docs |
| **Day 6** | Auto-generating Documentation | 3 hours | JSDoc to Swagger |
| **Day 7** | Mini Project: Full API Docs | 4 hours | Complete documentation |

**Key Concepts:**
```javascript
// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'My API',
      version: '1.0.0',
      description: 'API Documentation'
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };

// In Express app
const { swaggerUi, specs } = require('./swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Route documentation
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 */
```

---

## Phase 5: DevOps & Advanced Frameworks (Weeks 13-16)

### 📘 Week 13: CI/CD & Deployment

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | Git Workflow (branching, PRs) | 3 hours | PR workflow |
| **Day 2** | GitHub Actions Basics | 4 hours | First workflow |
| **Day 3** | Automated Testing Pipeline | 4 hours | Test on push |
| **Day 4** | Build & Deploy Pipelines | 4 hours | Deploy automation |
| **Day 5** | Environment Variables | 3 hours | Secrets management |
| **Day 6** | Docker & Containerization | 4 hours | Containerize app |
| **Day 7** | Deploy to Vercel/Railway | 4 hours | Live deployment |

**Key Concepts:**
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
      
      - name: Build
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### 🐳 Docker Fundamentals

```dockerfile
# Dockerfile (Backend)
FROM node:18-alpine

WORKDIR /app

# Copy package files first (layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/myapp
      - JWT_SECRET=your-secret
    depends_on:
      - mongo

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

**Docker Commands:**
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Build specific service
docker-compose build backend

# Run single container
docker build -t my-app .
docker run -p 5000:5000 my-app
```

### 🔐 Advanced Security (CSRF & httpOnly Cookies)

**CSRF Protection (Double-Submit Cookie Pattern):**
```javascript
// middleware/csrf.js
const crypto = require('crypto');

const csrfProtection = (req, res, next) => {
  // Generate token if not exists
  if (!req.cookies.csrfToken) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrfToken', token, {
      httpOnly: false, // Client must read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  }

  // Validate for state-changing requests
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const headerToken = req.headers['x-csrf-token'];
    const cookieToken = req.cookies.csrfToken;
    
    if (!headerToken || headerToken !== cookieToken) {
      return res.status(403).json({ error: 'CSRF token mismatch' });
    }
  }

  next();
};

// Frontend: Include CSRF token in requests
axios.interceptors.request.use(config => {
  const csrfToken = getCookie('csrfToken');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
```

**httpOnly Cookies for JWT:**
```javascript
// Set tokens as httpOnly cookies (XSS protection)
res.cookie('accessToken', token, {
  httpOnly: true,  // Cannot be accessed by JavaScript
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000 // 15 minutes
});

res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

// Auth middleware reads from cookies
const token = req.cookies?.accessToken || 
              req.headers.authorization?.split(' ')[1];
```

---

### 📘 Week 14: Next.js

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | Next.js Setup & File-based Routing | 3 hours | Create Next.js app |
| **Day 2** | Pages vs App Router | 4 hours | Both routing systems |
| **Day 3** | SSR vs SSG vs ISR | 4 hours | Rendering methods |
| **Day 4** | API Routes | 3 hours | Backend in Next.js |
| **Day 5** | Data Fetching Patterns | 4 hours | Server components |
| **Day 6** | Middleware & Authentication | 3 hours | Protected routes |
| **Day 7** | Mini Project: Blog with Next.js | 4 hours | Full application |

**Key Concepts:**
```tsx
// app/page.tsx (App Router)
export default async function Home() {
  const posts = await getPosts(); // Server-side fetch
  
  return (
    <main>
      <h1>Blog</h1>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </main>
  );
}

// app/api/posts/route.ts (API Route)
import { NextResponse } from 'next/server';

export async function GET() {
  const posts = await db.post.findMany();
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const body = await request.json();
  const post = await db.post.create({ data: body });
  return NextResponse.json(post, { status: 201 });
}

// Dynamic Routes: app/posts/[id]/page.tsx
export default async function PostPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const post = await getPost(params.id);
  return <article>{post.content}</article>;
}

// Middleware: middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*'
};
```

---

### 📘 Week 15: Angular Fundamentals

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | Angular CLI & Project Structure | 3 hours | Setup project |
| **Day 2** | Components & Templates | 4 hours | Create components |
| **Day 3** | Directives (ngIf, ngFor, ngClass) | 4 hours | Template logic |
| **Day 4** | Services & Dependency Injection | 4 hours | Data services |
| **Day 5** | Routing & Navigation | 3 hours | Multi-page app |
| **Day 6** | HTTP Client & APIs | 3 hours | Backend integration |
| **Day 7** | Mini Project: Task Manager | 4 hours | Full Angular app |

**Key Concepts:**
```typescript
// Component
import { Component } from '@angular/core';

@Component({
  selector: 'app-user-list',
  template: `
    <div *ngIf="loading">Loading...</div>
    <ul>
      <li *ngFor="let user of users">
        {{ user.name }} - {{ user.email }}
      </li>
    </ul>
    <button (click)="addUser()">Add User</button>
  `,
  styles: [`
    li { padding: 10px; }
  `]
})
export class UserListComponent {
  users: User[] = [];
  loading = true;

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.userService.getUsers().subscribe(users => {
      this.users = users;
      this.loading = false;
    });
  }

  addUser() {
    // Add user logic
  }
}

// Service
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000/api/users';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  createUser(user: User): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }
}

// Routing (app-routing.module.ts)
const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'users', component: UserListComponent },
  { path: 'users/:id', component: UserDetailComponent },
  { path: '**', redirectTo: '' }
];
```

---

### 📘 Week 16: React Native (Mobile Development)

| Day | Topic | Duration | Practice |
|-----|-------|----------|----------|
| **Day 1** | React Native Setup (Expo) | 3 hours | First mobile app |
| **Day 2** | Core Components (View, Text, Image) | 4 hours | UI building |
| **Day 3** | Styling & Flexbox | 4 hours | Mobile layouts |
| **Day 4** | Navigation (React Navigation) | 4 hours | Multi-screen app |
| **Day 5** | State Management & API Calls | 3 hours | Data handling |
| **Day 6** | Device Features (Camera, Location) | 3 hours | Native APIs |
| **Day 7** | Mini Project: Mobile App | 4 hours | Complete app |

**Key Concepts:**
```jsx
// Setup with Expo
// npx create-expo-app MyApp
// cd MyApp && npx expo start

// Basic Component
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

export default function UserList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/users')
      .then(res => res.json())
      .then(setUsers);
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.email}>{item.email}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Users</Text>
      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  name: {
    fontSize: 18
  },
  email: {
    color: '#666'
  }
});

// Navigation
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

# 📊 Bonus: Dashboards (Python & Power BI)

## Python Dashboards

```python
# Using Dash (Plotly)
# pip install dash pandas plotly

import dash
from dash import dcc, html
import plotly.express as px
import pandas as pd

app = dash.Dash(__name__)

# Sample data
df = pd.DataFrame({
    'Month': ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    'Sales': [1200, 1450, 1380, 1650, 1800]
})

fig = px.line(df, x='Month', y='Sales', title='Monthly Sales')

app.layout = html.Div([
    html.H1('Sales Dashboard'),
    dcc.Graph(figure=fig),
    dcc.Dropdown(
        options=['Daily', 'Weekly', 'Monthly'],
        value='Monthly'
    )
])

if __name__ == '__main__':
    app.run_server(debug=True)
```

## Power BI Integration

| Step | Action |
|------|--------|
| 1 | Export data from MongoDB to CSV/JSON |
| 2 | Import into Power BI Desktop |
| 3 | Create data models & relationships |
| 4 | Design visualizations |
| 5 | Publish to Power BI Service |
| 6 | Embed in web app using iframe/API |

---

# 📖 Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CLIENT REQUEST FLOW                            │
└──────────────────────────────────────────────────────────────────────────┘

  User Action          →  React Component  →  API Call (Axios)
       │                        │                    │
       │                        │                    ▼
       │                        │         ┌─────────────────────┐
       │                        │         │   CORS Middleware   │
       │                        │         │   (Validates Origin)│
       │                        │         └──────────┬──────────┘
       │                        │                    ▼
       │                        │         ┌─────────────────────┐
       │                        │         │  Rate Limiter       │
       │                        │         │  (100 req/15 min)   │
       │                        │         └──────────┬──────────┘
       │                        │                    ▼
       │                        │         ┌─────────────────────┐
       │                        │         │  Auth Middleware    │
       │                        │         │  (JWT Verification) │
       │                        │         └──────────┬──────────┘
       │                        │                    ▼
       │                        │         ┌─────────────────────┐
       │                        │         │  Validation         │
       │                        │         │  (Zod/Joi Schema)   │
       │                        │         └──────────┬──────────┘
       │                        │                    ▼
       │                        │         ┌─────────────────────┐
       │                        │         │  Controller         │
       │                        │         │  (Business Logic)   │
       │                        │         └──────────┬──────────┘
       │                        │                    ▼
       │                        │         ┌─────────────────────┐
       │                        │         │  Database (MongoDB) │
       │                        │         │  via Mongoose       │
       │                        │         └──────────┬──────────┘
       │                        │                    ▼
       │                        │         ┌─────────────────────┐
       │                        │         │  Response           │
       │                        │         │  (JSON Data)        │
       │                        │         └──────────┬──────────┘
       │                        │                    │
       │                        ◄────────────────────┘
       │                        │
       ◄─── State Update ───────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                        REAL-TIME NOTIFICATION FLOW                       │
└──────────────────────────────────────────────────────────────────────────┘

  Event Trigger  →  Backend Process  →  ┬→ WebSocket Push (immediate)
                                        ├→ Web Push Notification
                                        ├→ Email (Nodemailer/SMTP)
                                        └→ SMS (Twilio) [optional]
```

---

# 🛠️ Development Environment Setup Checklist

```bash
# Complete Setup Commands

# 1. Create project structure
mkdir my-mern-project
cd my-mern-project

# 2. Initialize backend
mkdir backend && cd backend
npm init -y
npm install express mongoose dotenv cors jsonwebtoken bcrypt
npm install -D nodemon typescript @types/node @types/express

# 3. Initialize frontend
cd .. && npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
npm install axios react-router-dom @mui/material

# 4. Environment files
# Backend .env
MONGODB_URI=mongodb://localhost:27017/myapp
JWT_SECRET=your-super-secret-key
PORT=3000

# Frontend .env
VITE_API_URL=http://localhost:3000/api

# 5. Start development
# Terminal 1 (Backend)
cd backend && npm run dev

# Terminal 2 (Frontend)
cd frontend && npm run dev
```

---

# 📚 Recommended Learning Resources

## Free Resources

| Resource | URL | Topics |
|----------|-----|--------|
| **MDN Web Docs** | [developer.mozilla.org](https://developer.mozilla.org) | JavaScript, HTML, CSS |
| **React Docs** | [react.dev](https://react.dev) | Official React documentation |
| **Node.js Docs** | [nodejs.org/docs](https://nodejs.org/docs) | Node.js APIs |
| **MongoDB University** | [learn.mongodb.com](https://learn.mongodb.com) | Free MongoDB courses |
| **freeCodeCamp** | [freecodecamp.org](https://freecodecamp.org) | Full curriculum |
| **The Odin Project** | [theodinproject.com](https://theodinproject.com) | Full-stack path |

## YouTube Channels

- **Traversy Media** - Crash courses & projects
- **The Net Ninja** - Detailed tutorials
- **Fireship** - Quick, modern content
- **Web Dev Simplified** - Clear explanations
- **Codevolution** - React & Next.js

---

# ✅ Weekly Checklist Template

Use this checklist each week:

```markdown
## Week [X] Progress

### Learning Goals
- [ ] Complete all daily topics
- [ ] Practice exercises (minimum 2 hours)
- [ ] Build mini-project
- [ ] Review and take notes

### Daily Log
| Day | Topics Completed | Hours | Notes |
|-----|-----------------|-------|-------|
| Mon |                 |       |       |
| Tue |                 |       |       |
| Wed |                 |       |       |
| Thu |                 |       |       |
| Fri |                 |       |       |
| Sat |                 |       |       |
| Sun |                 |       |       |

### Week Summary
- Key learnings:
- Challenges faced:
- Questions to research:
- Next week prep:
```

---

# 🎓 Final Capstone Project

After completing all 16 weeks, build a comprehensive project combining all technologies:

## Project: Full-Stack Social Platform

### Features to Implement
- User authentication (JWT + bcrypt)
- Real-time chat (WebSocket)
- Push notifications
- File uploads
- Admin dashboard
- Mobile app (React Native)
- API documentation (Swagger)
- CI/CD pipeline

### Technology Stack
- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + Express + TypeScript
- **Database:** MongoDB with Mongoose
- **Real-time:** WebSocket
- **Mobile:** React Native with Expo
- **DevOps:** GitHub Actions + Vercel

---

> **💡 Remember:** Learning to code is a marathon, not a sprint. Consistency beats intensity. Code every day, even if just for 30 minutes!

---

*Generated for the RAC Reallocation System Project*  
*Last Updated: December 2024*
