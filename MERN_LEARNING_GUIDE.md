# 🚀 Complete MERN Stack Learning Guide
## From Absolute Basics to Your RAC Project

---

# 📖 PART 1: FOUNDATIONS

---

## 1️⃣ HTML Basics (Start Here)

HTML is the skeleton of every web page. Learn it first.

### What is HTML?
HTML (HyperText Markup Language) defines the **structure** of web pages using tags.

### Basic Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My First Page</title>
</head>
<body>
    <h1>Hello World!</h1>
    <p>This is a paragraph.</p>
</body>
</html>
```

### Essential Tags
| Tag | Purpose | Example |
|-----|---------|---------|
| `<h1>-<h6>` | Headings | `<h1>Title</h1>` |
| `<p>` | Paragraph | `<p>Text here</p>` |
| `<a>` | Links | `<a href="url">Click</a>` |
| `<img>` | Images | `<img src="pic.jpg" alt="desc">` |
| `<div>` | Container | `<div>Content</div>` |
| `<span>` | Inline container | `<span>text</span>` |
| `<ul>/<ol>` | Lists | `<ul><li>Item</li></ul>` |
| `<form>` | Forms | `<form><input type="text"></form>` |
| `<button>` | Buttons | `<button>Click Me</button>` |
| `<table>` | Tables | `<table><tr><td>Cell</td></tr></table>` |

### In Your Project
See [frontend/index.html](file:///c:/Users/prasa/Desktop/RAC/zip_2/frontend/index.html) - React apps start with a minimal HTML file.

### 📚 Learn HTML
- [MDN HTML Basics](https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/HTML_basics)
- [freeCodeCamp HTML](https://www.freecodecamp.org/learn/2022/responsive-web-design/)

---

## 2️⃣ CSS Basics

CSS styles your HTML - colors, layouts, fonts.

### What is CSS?
CSS (Cascading Style Sheets) controls how HTML elements **look**.

### Ways to Add CSS
```html
<!-- 1. Inline -->
<p style="color: red;">Red text</p>

<!-- 2. Internal -->
<style>
  p { color: blue; }
</style>

<!-- 3. External (recommended) -->
<link rel="stylesheet" href="styles.css">
```

### CSS Syntax
```css
/* selector { property: value; } */
h1 {
    color: #333;
    font-size: 24px;
    margin-bottom: 10px;
}

/* Classes (reusable) */
.button {
    background-color: #007bff;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
}

/* IDs (unique) */
#header {
    background: linear-gradient(to right, #667eea, #764ba2);
}
```

### Box Model (Critical Concept!)
```
┌──────────────────────────────────┐
│            MARGIN                │
│  ┌──────────────────────────┐   │
│  │        BORDER            │   │
│  │  ┌──────────────────┐   │   │
│  │  │    PADDING       │   │   │
│  │  │  ┌──────────┐   │   │   │
│  │  │  │ CONTENT  │   │   │   │
│  │  │  └──────────┘   │   │   │
│  │  └──────────────────┘   │   │
│  └──────────────────────────┘   │
└──────────────────────────────────┘
```

### Flexbox Layout
```css
.container {
    display: flex;
    justify-content: center;  /* horizontal */
    align-items: center;      /* vertical */
    gap: 10px;
}
```

### CSS Grid
```css
.grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
}
```

### In Your Project
- [frontend/src/App.css](file:///c:/Users/prasa/Desktop/RAC/zip_2/frontend/src/App.css)
- [frontend/src/pages/ReallocationPage.css](file:///c:/Users/prasa/Desktop/RAC/zip_2/frontend/src/pages/ReallocationPage.css) (27KB!)

### 📚 Learn CSS
- [MDN CSS Basics](https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/CSS_basics)
- [CSS Tricks Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [CSS Grid Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)

---

## 3️⃣ JavaScript Fundamentals

JavaScript makes web pages **interactive**. This is the MOST IMPORTANT language to master.

### Variables
```javascript
// Modern JavaScript (ES6+)
let age = 25;           // Can be reassigned
const name = "Prasanth"; // Cannot be reassigned
var old = "avoid this";  // Old way, avoid

// Data Types
let number = 42;
let decimal = 3.14;
let text = "Hello";
let isActive = true;
let nothing = null;
let notDefined = undefined;
let items = [1, 2, 3];           // Array
let person = { name: "John" };   // Object
```

### Operators
```javascript
// Arithmetic
let sum = 5 + 3;      // 8
let diff = 10 - 4;    // 6
let product = 3 * 4;  // 12
let quotient = 15 / 3; // 5
let remainder = 17 % 5; // 2

// Comparison (use === and !==)
5 === 5     // true (strict equality)
5 == "5"    // true (loose - avoid!)
5 === "5"   // false (strict - use this!)
5 !== 3     // true

// Logical
true && true   // AND
true || false  // OR
!true          // NOT
```

### Conditionals
```javascript
if (age >= 18) {
    console.log("Adult");
} else if (age >= 13) {
    console.log("Teen");
} else {
    console.log("Child");
}

// Ternary operator
let status = age >= 18 ? "Adult" : "Minor";
```

### Loops
```javascript
// For loop
for (let i = 0; i < 5; i++) {
    console.log(i);
}

// For...of (arrays)
let fruits = ["apple", "banana", "cherry"];
for (let fruit of fruits) {
    console.log(fruit);
}

// For...in (objects)
let person = { name: "John", age: 30 };
for (let key in person) {
    console.log(key, person[key]);
}

// While loop
let count = 0;
while (count < 3) {
    console.log(count);
    count++;
}
```

### Functions
```javascript
// Function declaration
function add(a, b) {
    return a + b;
}

// Arrow function (modern, use this!)
const multiply = (a, b) => a * b;

const greet = (name) => {
    return `Hello, ${name}!`;
};

// Default parameters
const greetUser = (name = "Guest") => `Hello, ${name}`;
```

### Arrays
```javascript
let numbers = [1, 2, 3, 4, 5];

// Common methods
numbers.push(6);           // Add to end: [1,2,3,4,5,6]
numbers.pop();             // Remove from end: [1,2,3,4,5]
numbers.unshift(0);        // Add to start: [0,1,2,3,4,5]
numbers.shift();           // Remove from start: [1,2,3,4,5]
numbers.length;            // 5

// Modern Array Methods (VERY IMPORTANT!)
const doubled = numbers.map(n => n * 2);       // [2,4,6,8,10]
const evens = numbers.filter(n => n % 2 === 0); // [2,4]
const sum = numbers.reduce((acc, n) => acc + n, 0); // 15
const found = numbers.find(n => n > 3);        // 4
const hasEvens = numbers.some(n => n % 2 === 0); // true
const allPositive = numbers.every(n => n > 0);   // true

// Destructuring
const [first, second, ...rest] = numbers; // first=1, second=2, rest=[3,4,5]
```

### Objects
```javascript
// Object creation
const passenger = {
    pnr: "1234567890",
    name: "Prasanth",
    status: "CNF",
    journey: {
        from: "HYD",
        to: "BNG"
    }
};

// Access properties
console.log(passenger.name);        // Dot notation
console.log(passenger["pnr"]);      // Bracket notation

// Destructuring
const { pnr, name, status } = passenger;

// Spread operator
const updated = { ...passenger, status: "RAC" };

// Object methods
Object.keys(passenger);    // ["pnr", "name", "status", "journey"]
Object.values(passenger);  // ["1234567890", "Prasanth", "CNF", {...}]
Object.entries(passenger); // [["pnr", "1234567890"], ...]
```

### Classes
```javascript
class TrainState {
    constructor(trainNo, trainName) {
        this.trainNo = trainNo;
        this.trainName = trainName;
        this.journeyStarted = false;
    }

    startJourney() {
        this.journeyStarted = true;
        console.log(`Journey started for ${this.trainName}`);
    }

    static getTotalTrains() {
        return 100;
    }
}

// Usage
const train = new TrainState("17225", "Amaravathi Express");
train.startJourney();
```

### Promises & Async/Await
```javascript
// Promise (older syntax)
fetch('/api/passengers')
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error(error));

// Async/Await (modern, preferred!)
async function getPassengers() {
    try {
        const response = await fetch('/api/passengers');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch:', error);
    }
}
```

### Modules (Import/Export)
```javascript
// ES Modules (frontend)
import React from 'react';
import { useState, useEffect } from 'react';
export default App;
export { helper };

// CommonJS (backend/Node.js)
const express = require('express');
module.exports = router;
```

### In Your Project
- Classes: [models/TrainState.js](file:///c:/Users/prasa/Desktop/RAC/zip_2/backend/models/TrainState.js)
- Async/await: Throughout all controllers
- Array methods: Data processing in services

### 📚 Learn JavaScript
- [JavaScript.info](https://javascript.info/) - Best comprehensive tutorial
- [freeCodeCamp JavaScript](https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/)
- [Eloquent JavaScript](https://eloquentjavascript.net/) - Free book

---

# 📖 PART 2: BACKEND DEVELOPMENT

---

## 4️⃣ Node.js

Node.js lets you run JavaScript on the server (outside the browser).

### Installation
1. Download from [nodejs.org](https://nodejs.org/)
2. Verify: `node --version` and `npm --version`

### Your First Node.js Script
```javascript
// hello.js
console.log("Hello from Node.js!");

// Run with: node hello.js
```

### Core Modules
```javascript
// File System
const fs = require('fs');
fs.readFileSync('file.txt', 'utf8');
fs.writeFileSync('output.txt', 'Hello');

// Path
const path = require('path');
path.join(__dirname, 'folder', 'file.txt');

// HTTP (raw server)
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World');
});
server.listen(3000);

// Events
const EventEmitter = require('events');
const emitter = new EventEmitter();
emitter.on('event', () => console.log('Event fired!'));
emitter.emit('event');
```

### NPM (Node Package Manager)
```bash
# Initialize a project
npm init -y

# Install packages
npm install express        # Add to dependencies
npm install nodemon -D     # Add to devDependencies
npm install                # Install all from package.json

# Run scripts
npm run dev
npm start
```

### package.json Explained
```json
{
  "name": "my-app",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### Environment Variables
```javascript
// .env file
PORT=5000
MONGODB_URI=mongodb://localhost:27017
JWT_SECRET=mysecretkey

// Load in code
require('dotenv').config();
const port = process.env.PORT || 3000;
```

### In Your Project
- Entry: [backend/server.js](file:///c:/Users/prasa/Desktop/RAC/zip_2/backend/server.js)
- Package: [backend/package.json](file:///c:/Users/prasa/Desktop/RAC/zip_2/backend/package.json)

### 📚 Learn Node.js
- [Node.js Official Docs](https://nodejs.org/en/learn)
- [The Odin Project - Node.js](https://www.theodinproject.com/paths/full-stack-javascript/courses/nodejs)

---

## 5️⃣ Express.js

Express is a minimal web framework for Node.js. It handles HTTP requests.

### Basic Server
```javascript
const express = require('express');
const app = express();

// Middleware
app.use(express.json());  // Parse JSON bodies

// Routes
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/api/users', (req, res) => {
    res.json([{ id: 1, name: 'John' }]);
});

app.post('/api/users', (req, res) => {
    const { name, email } = req.body;
    res.status(201).json({ id: 2, name, email });
});

// Start server
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
```

### Request & Response
```javascript
// Request object (req)
req.params    // URL parameters: /users/:id → req.params.id
req.query     // Query string: /users?name=john → req.query.name
req.body      // POST/PUT body (needs express.json())
req.headers   // HTTP headers
req.method    // GET, POST, PUT, DELETE

// Response object (res)
res.send('text');           // Send text
res.json({ data: 'value' }); // Send JSON
res.status(404);            // Set status code
res.status(404).json({ error: 'Not found' });
res.redirect('/login');     // Redirect
```

### Routing
```javascript
// Basic routes
app.get('/api/trains', getAllTrains);
app.get('/api/trains/:id', getTrainById);
app.post('/api/trains', createTrain);
app.put('/api/trains/:id', updateTrain);
app.delete('/api/trains/:id', deleteTrain);

// Router (separate file)
// routes/api.js
const router = express.Router();
router.get('/passengers', getPassengers);
router.post('/passengers', createPassenger);
module.exports = router;

// server.js
app.use('/api', require('./routes/api'));
```

### Middleware
```javascript
// Middleware = functions that run BEFORE your route handlers

// Built-in middleware
app.use(express.json());         // Parse JSON
app.use(express.static('public')); // Serve static files

// Custom middleware
const logger = (req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();  // MUST call next() to continue
};
app.use(logger);

// Auth middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // Verify token...
    next();
};

// Use on specific routes
app.get('/api/protected', authMiddleware, (req, res) => {
    res.json({ secret: 'data' });
});
```

### Error Handling
```javascript
// Async error handling
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/api/data', asyncHandler(async (req, res) => {
    const data = await fetchData();
    res.json(data);
}));

// Global error handler (LAST middleware)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: err.message 
    });
});
```

### CORS
```javascript
const cors = require('cors');

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

### In Your Project
- Server: [backend/server.js](file:///c:/Users/prasa/Desktop/RAC/zip_2/backend/server.js)
- Routes: [backend/routes/api.js](file:///c:/Users/prasa/Desktop/RAC/zip_2/backend/routes/api.js) (797 lines!)
- Auth Middleware: [backend/middleware/auth.js](file:///c:/Users/prasa/Desktop/RAC/zip_2/backend/middleware/auth.js)

### 📚 Learn Express
- [Express Official Guide](https://expressjs.com/en/guide/routing.html)
- [MDN Express Tutorial](https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs)

---

## 6️⃣ MongoDB

MongoDB is a NoSQL database that stores data as JSON-like documents.

### Key Concepts
| Concept | SQL Equivalent | Description |
|---------|----------------|-------------|
| Database | Database | Container for collections |
| Collection | Table | Group of documents |
| Document | Row | Single record (JSON object) |
| Field | Column | Key-value pair |
| _id | Primary Key | Unique identifier (auto-generated) |

### Document Example
```javascript
// A passenger document
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "PNR_Number": "1234567890",
  "Name": "Prasanth",
  "Age": 25,
  "Gender": "Male",
  "PNR_Status": "CNF",
  "Boarding_Station": "HYD",
  "Deboarding_Station": "BNG",
  "Assigned_Coach": "S1",
  "Assigned_berth": 15,
  "Berth_Type": "Lower Berth",
  "Boarded": true,
  "NO_show": false,
  "createdAt": ISODate("2025-12-07T10:00:00Z")
}
```

### MongoDB Shell Commands
```javascript
// Show databases
show dbs

// Use/create database
use PassengerDB

// Show collections
show collections

// CRUD Operations
// Create
db.passengers.insertOne({ name: "John", age: 30 })
db.passengers.insertMany([{ name: "Jane" }, { name: "Bob" }])

// Read
db.passengers.find()                        // All documents
db.passengers.find({ name: "John" })        // Filter
db.passengers.findOne({ PNR_Number: "123" }) // Single document
db.passengers.find({ age: { $gt: 25 } })    // age > 25
db.passengers.find({ status: { $in: ["CNF", "RAC"] } })

// Update
db.passengers.updateOne(
  { PNR_Number: "123" },
  { $set: { Boarded: true } }
)
db.passengers.updateMany(
  { status: "WL" },
  { $set: { notified: true } }
)

// Delete
db.passengers.deleteOne({ PNR_Number: "123" })
db.passengers.deleteMany({ status: "CANCELLED" })
```

### Node.js MongoDB Driver
```javascript
const { MongoClient } = require('mongodb');

// Connect
const client = new MongoClient('mongodb://localhost:27017');
await client.connect();
const db = client.db('PassengerDB');
const collection = db.collection('passengers');

// CRUD in Node.js
// Create
await collection.insertOne({ name: "John", age: 30 });

// Read
const passenger = await collection.findOne({ PNR_Number: "123" });
const allPassengers = await collection.find({ status: "CNF" }).toArray();

// Update
await collection.updateOne(
  { PNR_Number: "123" },
  { $set: { Boarded: true, BoardedAt: new Date() } }
);

// Delete
await collection.deleteOne({ PNR_Number: "123" });

// Indexes (for faster queries)
await collection.createIndex({ PNR_Number: 1 });
await collection.createIndex({ Boarding_Station: 1, PNR_Status: 1 });
```

### Query Operators
```javascript
// Comparison
{ age: { $eq: 25 } }     // Equal
{ age: { $ne: 25 } }     // Not equal
{ age: { $gt: 25 } }     // Greater than
{ age: { $gte: 25 } }    // Greater or equal
{ age: { $lt: 25 } }     // Less than
{ age: { $lte: 25 } }    // Less or equal
{ age: { $in: [20, 25, 30] } }  // In array

// Logical
{ $and: [{ age: { $gt: 18 } }, { status: "CNF" }] }
{ $or: [{ status: "CNF" }, { status: "RAC" }] }
{ age: { $not: { $gt: 30 } } }
```

### In Your Project
- Connection: [backend/config/db.js](file:///c:/Users/prasa/Desktop/RAC/zip_2/backend/config/db.js)
- Your databases: `rac` (auth, config) and `PassengerDB` (train data)

### 📚 Learn MongoDB
- [MongoDB University](https://learn.mongodb.com/) - FREE official courses
- [MongoDB Manual](https://www.mongodb.com/docs/manual/)

---

# 📖 PART 3: FRONTEND DEVELOPMENT

---

## 7️⃣ React.js

React is a library for building user interfaces with reusable components.

### Core Concepts

#### Components
```jsx
// Function Component (modern, use this!)
function Welcome({ name }) {
    return <h1>Hello, {name}!</h1>;
}

// Usage
<Welcome name="Prasanth" />
```

#### JSX (JavaScript XML)
```jsx
// JSX looks like HTML but it's JavaScript
const element = (
    <div className="container">
        <h1>{title}</h1>
        <p>Count: {1 + 1}</p>
        {isLoggedIn && <UserMenu />}
        {items.map(item => <li key={item.id}>{item.name}</li>)}
    </div>
);

// Rules:
// - Use className instead of class
// - All tags must close: <img /> not <img>
// - Return single parent element (use <> </> for fragments)
// - Use {} for JavaScript expressions
```

#### useState Hook
```jsx
import { useState } from 'react';

function Counter() {
    // state variable, setter function = useState(initial value)
    const [count, setCount] = useState(0);
    const [user, setUser] = useState({ name: '', email: '' });

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>+1</button>
            <button onClick={() => setCount(prev => prev - 1)}>-1</button>
            
            {/* For objects, spread previous state */}
            <input 
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
            />
        </div>
    );
}
```

#### useEffect Hook
```jsx
import { useState, useEffect } from 'react';

function UserProfile({ userId }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Runs after component renders
    useEffect(() => {
        // Fetch data
        async function fetchUser() {
            const response = await fetch(`/api/users/${userId}`);
            const data = await response.json();
            setUser(data);
            setLoading(false);
        }
        fetchUser();

        // Cleanup function (optional)
        return () => {
            console.log('Component unmounting');
        };
    }, [userId]); // Dependency array - runs when userId changes

    if (loading) return <p>Loading...</p>;
    return <h1>{user.name}</h1>;
}

// useEffect patterns:
useEffect(() => { }, []);      // Run once on mount
useEffect(() => { }, [dep]);   // Run when dep changes
useEffect(() => { });          // Run on every render (avoid!)
```

#### Props
```jsx
// Parent component
function App() {
    const handleClick = (id) => console.log('Clicked:', id);
    
    return (
        <PassengerCard 
            name="John"
            pnr="1234567890"
            status="CNF"
            onSelect={handleClick}
        />
    );
}

// Child component
function PassengerCard({ name, pnr, status, onSelect }) {
    return (
        <div className="card" onClick={() => onSelect(pnr)}>
            <h3>{name}</h3>
            <p>PNR: {pnr}</p>
            <span className={`status ${status}`}>{status}</span>
        </div>
    );
}
```

#### Conditional Rendering
```jsx
function Dashboard({ user, isLoading, error }) {
    // Early return
    if (isLoading) return <Spinner />;
    if (error) return <ErrorMessage error={error} />;
    if (!user) return <LoginPrompt />;

    return (
        <div>
            {/* Logical AND */}
            {user.isAdmin && <AdminPanel />}
            
            {/* Ternary */}
            {user.verified ? <VerifiedBadge /> : <VerifyButton />}
            
            {/* Conditional class */}
            <div className={`card ${user.premium ? 'premium' : ''}`}>
                {user.name}
            </div>
        </div>
    );
}
```

#### Lists and Keys
```jsx
function PassengerList({ passengers }) {
    return (
        <ul>
            {passengers.map(passenger => (
                <li key={passenger.pnr}>  {/* key must be unique */}
                    {passenger.name} - {passenger.status}
                </li>
            ))}
        </ul>
    );
}
```

#### Forms and Events
```jsx
function LoginForm() {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();  // Prevent page reload
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        // Handle response...
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Username"
            />
            <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
            />
            <button type="submit">Login</button>
        </form>
    );
}
```

#### Custom Hooks
```jsx
// hooks/usePassengers.js
function usePassengers() {
    const [passengers, setPassengers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/api/passengers')
            .then(res => res.json())
            .then(data => {
                setPassengers(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    return { passengers, loading, error };
}

// Usage
function PassengerPage() {
    const { passengers, loading, error } = usePassengers();
    // ...
}
```

### In Your Project
- Main App: [frontend/src/App.jsx](file:///c:/Users/prasa/Desktop/RAC/zip_2/frontend/src/App.jsx)
- Pages: [frontend/src/pages/](file:///c:/Users/prasa/Desktop/RAC/zip_2/frontend/src/pages/)
- Custom Hooks: [passenger-portal/src/hooks/](file:///c:/Users/prasa/Desktop/RAC/zip_2/passenger-portal/src/hooks/)

### 📚 Learn React
- [React Official Tutorial](https://react.dev/learn)
- [Full Stack Open](https://fullstackopen.com/) - Full MERN course

---

## 8️⃣ React Router

Handles navigation in single-page apps.

```jsx
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';

function App() {
    return (
        <BrowserRouter>
            <nav>
                <Link to="/">Home</Link>
                <Link to="/passengers">Passengers</Link>
            </nav>
            
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/passengers" element={<PassengersPage />} />
                <Route path="/passenger/:pnr" element={<PassengerDetail />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}

// Access URL parameters
function PassengerDetail() {
    const { pnr } = useParams();
    const navigate = useNavigate();
    
    return (
        <div>
            <h1>Passenger: {pnr}</h1>
            <button onClick={() => navigate('/passengers')}>Back</button>
        </div>
    );
}
```

---

## 9️⃣ Axios (HTTP Client)

Makes API calls easier than fetch.

```javascript
import axios from 'axios';

// Create configured instance
const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to all requests
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// API calls
const getPassengers = () => api.get('/passengers');
const getPassenger = (pnr) => api.get(`/passenger/${pnr}`);
const createPassenger = (data) => api.post('/passenger', data);
const updatePassenger = (pnr, data) => api.put(`/passenger/${pnr}`, data);
const deletePassenger = (pnr) => api.delete(`/passenger/${pnr}`);
```

### In Your Project
- [frontend/src/services/api.js](file:///c:/Users/prasa/Desktop/RAC/zip_2/frontend/src/services/api.js)

---

# 📖 PART 4: ADVANCED TOPICS

---

## 🔐 JWT Authentication

```javascript
// Backend: Generate token
const jwt = require('jsonwebtoken');

const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
);

// Backend: Verify token (middleware)
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Frontend: Store and send token
localStorage.setItem('token', token);
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

---

## 📡 WebSocket (Real-Time)

```javascript
// Backend
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('message', (message) => {
        console.log('Received:', message);
    });
    
    // Broadcast to all clients
    wss.clients.forEach(client => {
        client.send(JSON.stringify({ type: 'UPDATE', data: {...} }));
    });
});

// Frontend
const ws = new WebSocket('ws://localhost:5000');

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Handle update
};
ws.onclose = () => console.log('Disconnected');
```

### In Your Project
- [backend/config/websocket.js](file:///c:/Users/prasa/Desktop/RAC/zip_2/backend/config/websocket.js)

---

## 🔔 Web Push Notifications

```javascript
// Backend
const webPush = require('web-push');

webPush.setVapidDetails(
    'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

await webPush.sendNotification(subscription, JSON.stringify({
    title: 'Upgrade Available!',
    body: 'Your RAC ticket can be upgraded to CNF'
}));

// Frontend (Service Worker)
self.addEventListener('push', (event) => {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon.png'
    });
});
```

---

## 🔄 Git Version Control

```bash
# Initialize
git init

# Basic workflow
git status                    # Check changes
git add .                     # Stage all changes
git commit -m "Description"   # Commit
git push origin main          # Push to remote

# Branches
git branch feature-name       # Create branch
git checkout feature-name     # Switch branch
git checkout -b new-branch    # Create and switch
git merge feature-name        # Merge into current branch

# Common commands
git log --oneline            # View history
git diff                     # See changes
git stash                    # Save changes temporarily
git stash pop                # Restore stashed changes
```

---

# 📖 PART 5: YOUR PROJECT STRUCTURE

---

## Backend Architecture

```
backend/
├── server.js              # Entry point, Express setup
├── config/
│   ├── db.js              # MongoDB connection
│   ├── websocket.js       # WebSocket manager
│   └── swagger.js         # API documentation
├── controllers/           # Request handlers (9 files)
│   ├── authController.js
│   ├── trainController.js
│   ├── passengerController.js
│   └── reallocationController.js
├── services/              # Business logic (19 files)
│   ├── ReallocationService.js
│   ├── NotificationService.js
│   └── DataService.js
├── models/               # Data models (3 files)
│   ├── TrainState.js     # 1,267 lines of train logic!
│   ├── Berth.js
│   └── SegmentMatrix.js
├── routes/
│   └── api.js            # 30+ API endpoints
├── middleware/
│   ├── auth.js           # JWT verification
│   └── validation.js     # Input validation
└── utils/                # Helper functions
```

## Frontend Architecture

```
frontend/ (or passenger-portal/, tte-portal/)
├── index.html            # Entry HTML
├── vite.config.js        # Vite configuration
├── src/
│   ├── main.jsx          # React entry point
│   ├── App.jsx           # Root component
│   ├── App.css           # Global styles
│   ├── components/       # Reusable components
│   ├── pages/            # Page components
│   ├── services/         # API calls
│   ├── hooks/            # Custom hooks
│   └── utils/            # Helper functions
└── public/               # Static files
```

---

# 📚 RECOMMENDED LEARNING PATH

```
Week 1-2: HTML + CSS + JavaScript basics
Week 3: JavaScript advanced (async, classes)
Week 4: Node.js + NPM basics
Week 5: Express.js + REST APIs
Week 6: MongoDB CRUD operations
Week 7-8: React fundamentals
Week 9: React Router + State management
Week 10: Full stack project (clone your RAC system!)
Week 11-12: Advanced (WebSocket, Auth, Deployment)
```

## Top Free Resources

1. **[Full Stack Open](https://fullstackopen.com/)** - Complete MERN curriculum
2. **[The Odin Project](https://www.theodinproject.com/)** - Full-stack path
3. **[freeCodeCamp](https://www.freecodecamp.org/)** - Certifications
4. **[MongoDB University](https://learn.mongodb.com/)** - Database courses
5. **[JavaScript.info](https://javascript.info/)** - JS deep dive
6. **[React Official Docs](https://react.dev/)** - Latest React

---

> [!TIP]
> **Best way to learn:** Run your project, add console.logs everywhere, break things, fix them!
