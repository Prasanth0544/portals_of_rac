# System-Wide Limitations & Improvement Recommendations

**Last Updated:** 2025-12-09  
**Purpose:** Consolidated list of known limitations, technical debt, and scalability improvements needed across all system components.

---

## ✅ RECENTLY COMPLETED (Dec 2025)

### Completed Items
- [x] **TypeScript Migration** - All 3 frontend portals converted to TypeScript ✅
- [x] **Backend Unit Tests** - 74 tests passing with Jest ✅
- [x] **API Service Layer** - Centralized axios calls in all portals ✅
- [x] **Vite Migration** - All frontends migrated from CRA to Vite ✅
- [x] **Documentation Updates** - All README files + QUICKSTART.md updated ✅
- [x] **CORS Configuration** - Backend configured for ports 5173/5174/5175 ✅
- [x] **Input Validation** - Zod schemas implemented ✅

---

## 🔴 CRITICAL PRIORITIES

### 1. Security
- [x] **Backend OTP Storage** - ~~In-memory~~ → MongoDB with TTL ✅ COMPLETED
- [ ] **No Rate Limiting** - API vulnerable to abuse
- [ ] **No CSRF Protection** - Forms need CSRF tokens
- [ ] **JWT Refresh Strategy** - No refresh token implementation

### 2. Scalability  
- [ ] **Single Server Architecture** - No horizontal scaling
- [ ] **No Load Balancing** - Single point of failure
- [x] **In-Memory State** - ~~Lost on restart~~ → OTP, Upgrade Notifications, In-App Notifications now in MongoDB ✅ COMPLETED

### 3. Reliability
- [ ] **No Health Monitoring** - Basic /health endpoint only
- [ ] **No Centralized Logging** - Console logs only
- [ ] **No Error Tracking** - No Sentry/error monitoring
- [ ] **No Automated Backups** - MongoDB backups manual

---

## 🖥️ BACKEND LIMITATIONS

### Security Issues

#### 1. OTP Storage - ✅ COMPLETED (MongoDB with TTL)
**Status:** ✅ FIXED - OTPs now persist in MongoDB `rac.otp_store` collection
**Solution:** TTL index auto-expires after 5 minutes  
**Files Changed:** `OTPService.js`, `otpController.js`
```javascript
// NEW: MongoDB-backed OTP storage
await collection.updateOne(
  { key },
  { $set: { otp, createdAt: new Date() } },
  { upsert: true }
);
// TTL index handles automatic cleanup
```

#### 2. No Rate Limiting
**Current:** No request throttling  
**Risk:** API abuse, DDoS vulnerability  
**Impact:** Server overload, service degradation  
**Fix:** Implement express-rate-limit
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/otp/send', limiter);
```

#### 3. JWT Token Security
**Current:** No refresh token mechanism  
**Risk:** Long-lived tokens if stolen  
**Impact:** Security breach persistence  
**Fix:** Implement refresh token pattern
- Access token: 15 minutes
- Refresh token: 7 days
- Store refresh tokens in Redis

#### 4. Password Policy
**Current:** No password complexity requirements  
**Risk:** Weak passwords allowed  
**Impact:** Account compromise  
**Fix:** Enforce strong passwords
- Minimum 8 characters
- Uppercase, lowercase, number, special char
- Check against common password lists

### Performance Issues

#### 5. No Caching Layer
**Current:** Every request hits database  
**Risk:** Slow response times  
**Impact:** Poor user experience at scale  
**Fix:** Implement Redis caching
```javascript
// Cache passenger data
const cachedPassenger = await redis.get(`passenger:${pnr}`);
if (cachedPassenger) return JSON.parse(cachedPassenger);

const passenger = await db.findOne({ PNR_Number: pnr });
await redis.setEx(`passenger:${pnr}`, 300, JSON.stringify(passenger));
```

#### 6. No Database Connection Pooling Configuration
**Current:** Default MongoDB connection settings  
**Risk:** Connection exhaustion  
**Impact:** Failed requests under load  
**Fix:** Configure connection pool
```javascript
mongoose.connect(uri, {
  maxPoolSize: 50,
  minPoolSize: 10,
  socketTimeoutMS: 45000,
});
```

#### 7. No Query Optimization
**Current:** Some queries without indices  
**Risk:** Slow queries  
**Impact:** Performance degradation  
**Fix:** Add compound indices
```javascript
// Example: Frequent query by PNR + Status
db.collection.createIndex({ PNR_Number: 1, Passenger_Status: 1 });
```

### Scalability Issues

#### 8. Single Server Architecture
**Current:** One Node.js instance  
**Risk:** Single point of failure  
**Impact:** Complete service outage if crashes  
**Fix:** Multi-instance deployment
- PM2 cluster mode
- Docker + Kubernetes
- Load balancer (Nginx)

#### 9. In-Memory Train State
**Current:** TrainState in server memory  
**Risk:** Lost on restart/crash  
**Impact:** Journey state loss  
**Fix:** Persist to Redis or MongoDB
```javascript
// Sync to Redis every state change
await redis.set('trainState', JSON.stringify(trainState));

// Restore on startup
const savedState = await redis.get('trainState');
if (savedState) trainState.restore(JSON.parse(savedState));
```

#### 10. No Message Queue
**Current:** Synchronous notification sending  
**Risk:** Slow API responses  
**Impact:** User waits for email/SMS  
**Fix:** Implement message queue
```javascript
// Use RabbitMQ/Bull
const queue = new Bull('notifications');

queue.add('send-email', {
  to: email,
  subject: 'OTP',
  html: template
});
```

### Monitoring & Observability

#### 11. No Centralized Logging
**Current:** console.log() everywhere  
**Risk:** Hard to debug production issues  
**Impact:** Slow incident resolution  
**Fix:** Implement Winston + ELK stack
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

#### 12. No Error Tracking
**Current:** Errors only in console  
**Risk:** Missing critical errors  
**Impact:** Unknown production failures  
**Fix:** Integrate Sentry
```javascript
const Sentry = require("@sentry/node");

Sentry.init({ dsn: "YOUR_DSN" });

app.use(Sentry.Handlers.errorHandler());
```

#### 13. No Performance Monitoring
**Current:** No APM (Application Performance Monitoring)  
**Risk:** Can't identify bottlenecks  
**Impact:** Slow endpoints unknown  
**Fix:** Integrate New Relic or DataDog

#### 14. No Health Checks
**Current:** Basic /health endpoint  
**Risk:** Can't detect partial failures  
**Impact:** Service appears up but broken  
**Fix:** Comprehensive health checks
- Database connectivity
- Redis connectivity
- External API availability
- Disk space
- Memory usage

### Data Management

#### 15. No Database Backups
**Current:** Manual MongoDB backups  
**Risk:** Data loss  
**Impact:** Catastrophic failure recovery  
**Fix:** Automated daily backups
```bash
# Cron job for daily backup
0 2 * * * mongodump --db PassengerDB --out /backups/$(date +\%Y\%m\%d)
```

#### 16. No Data Retention Policy
**Current:** All data kept indefinitely  
**Risk:** Database bloat  
**Impact:** Performance degradation  
**Fix:** Archive old journey data
- Archive journeys > 30 days
- Keep last 90 days in hot storage
- Move to cold storage after

#### 17. No Data Validation on Import
**Current:** Trust all imported CSV data  
**Risk:** Bad data corrupts system  
**Impact:** Calculation errors  
**Fix:** Strict validation + sanitization
```javascript
const validatePassengerData = (data) => {
  const schema = Joi.object({
    PNR_Number: Joi.string().length(10).required(),
    IRCTC_ID: Joi.string().alphanum().required(),
    Email: Joi.string().email().required(),
    // ... all fields
  });
  
  return schema.validate(data);
};
```

### Testing

#### 18. No Unit Tests
**Current:** Zero test coverage  
**Risk:** Regressions introduced easily  
**Impact:** Breaking changes undetected  
**Fix:** Implement Jest + Supertest
```javascript
// Example test
describe('OTPService', () => {
  it('should generate 6-digit OTP', () => {
    const otp = OTPService.generateOTP();
    expect(otp).toMatch(/^\d{6}$/);
  });
});
```

#### 19. No Integration Tests
**Current:** Manual API testing only  
**Risk:** Breaking changes in integrations  
**Impact:** Production failures  
**Fix:** API integration tests
```javascript
// Example
describe('POST /api/otp/send', () => {
  it('should send OTP successfully', async () => {
    const res = await request(app)
      .post('/api/otp/send')
      .send({ irctcId: 'TEST123', pnr: '1234567890' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

#### 20. No Load Testing
**Current:** Unknown system capacity  
**Risk:** Can't handle traffic spikes  
**Impact:** Service crashes under load  
**Fix:** Implement k6 or Artillery
```javascript
// k6 load test
import http from 'k6/http';

export default function () {
  http.get('http://localhost:5000/api/train/state');
}

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100  
    { duration: '2m', target: 0 },   // Ramp down
  ],
};
```

### Code Quality

#### 21. Inconsistent Error Handling
**Current:** Mix of throws, returns, callbacks  
**Risk:** Uncaught errors crash server  
**Impact:** Service outages  
**Fix:** Standardize async/await + try/catch
```javascript
// Consistent pattern
async function handleRequest(req, res) {
  try {
    const result = await service.doSomething();
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error in handleRequest:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
```

#### 22. No API Versioning
**Current:** Single /api/* namespace  
**Risk:** Breaking changes affect all clients  
**Impact:** Forced client updates  
**Fix:** Implement versioning
```javascript
app.use('/api/v1', apiRoutesV1);
app.use('/api/v2', apiRoutesV2);
```

#### 23. Request Validation Middleware - ✅ COMPLETED
**Status:** ✅ FIXED - Implemented Zod validation with middleware
**Files Created:** `validation/schemas.ts`, `middleware/validate.ts`
```typescript
// NEW: Zod-based validation
import { validateBody } from './middleware/validate';
import { markNoShowSchema } from './validation/schemas';

router.post('/no-show', validateBody(markNoShowSchema), controller.markNoShow);
```

### Infrastructure

#### 24. No Docker Containerization
**Current:** Bare metal/VM deployment  
**Risk:** Environment inconsistencies  
**Impact:** "Works on my machine" issues  
**Fix:** Dockerize application
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

#### 25. No CI/CD Pipeline
**Current:** Manual deployment  
**Risk:** Human error in deployment  
**Impact:** Deployment failures  
**Fix:** GitHub Actions workflow
```yaml
name: Deploy
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: npm test
      - name: Deploy
        run: ./deploy.sh
```

#### 26. No Environment Configuration Management
**Current:** .env files manually maintained  
**Risk:** Secret leakage  
**Impact:** Security breach  
**Fix:** Use secret management
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault

### Documentation

#### 27. Incomplete API Documentation
**Current:** Swagger setup but incomplete  
**Risk:** Integration difficulties  
**Impact:** Developer friction  
**Fix:** Complete Swagger annotations
```javascript
/**
 * @swagger
 * /api/otp/send:
 *   post:
 *     summary: Send OTP to passenger email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPRequest'
 */
```

#### 28. No Architecture Decision Records (ADRs)
**Current:** Design decisions not documented  
**Risk:** Lost context over time  
**Impact:** Puzzling future developers  
**Fix:** Create ADR documents
```markdown
# ADR 001: Use MongoDB for Passenger Data

## Status: Accepted

## Context
Need to store passenger records with flexible schema...

## Decision
Use MongoDB for passenger database...

## Consequences
+ Flexible schema
- Need to manage indices
```

---

## 📊 PRIORITY MATRIX

### Must Fix (P0) - Before Production
1. OTP Storage → Redis
2. Rate Limiting
3. Error Tracking (Sentry)
4. Database Backups
5. Health Monitoring

### Should Fix (P1) - Within 1 Month
6. Caching Layer
7. Load Balancing
8. Centralized Logging
9. JWT Refresh Tokens
10. Unit Tests

### Nice to Have (P2) - Within 3 Months
11. Message Queue
12. Performance Monitoring
13. Load Testing
14. Docker Containerization
15. CI/CD Pipeline

### Future Enhancements (P3) - 6+ Months
16. Microservices Architecture
17. Database Sharding
18. Multi-region Deployment
19. GraphQL API
20. AI/ML for Predictive Allocation

---

## 💰 ESTIMATED EFFORT

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P0 | Redis for OTP | 1 day | High |
| P0 | Rate Limiting | 2 hours | High |
| P0 | Sentry Integration | 4 hours | High |
| P0 | Automated Backups | 1 day | Critical |
| P1 | Redis Caching | 3 days | High |
| P1 | Load Balancer | 2 days | High |
| P1 | Winston Logging | 1 day | Medium |
| P1 | Unit Tests | 2 weeks | High |
| P2 | Message Queue | 1 week | Medium |
| P2 | Docker | 3 days | Medium |
| P2 | CI/CD | 1 week | Medium |

**Total P0: ~3 days**  
**Total P0+P1: ~4 weeks**  
**Total All: ~8 weeks**

---

## 🎯 IMPLEMENTATION ROADMAP

### Week 1-2: Critical Security & Reliability
- [ ] Migrate OTP to Redis
- [ ] Add rate limiting (all endpoints)
- [ ] Setup Sentry error tracking
- [ ] Configure automated DB backups
- [ ] Implement comprehensive health checks

### Week 3-4: Performance & Scalability
- [ ] Implement Redis caching layer
- [ ] Setup Nginx load balancer
- [ ] Configure PM2 cluster mode
- [ ] Optimize database queries + indices
- [ ] Add connection pooling configuration

### Week 5-6: Monitoring & Observability
- [ ] Setup Winston logging
- [ ] Configure log aggregation (ELK/CloudWatch)
- [ ] Add performance monitoring (New Relic)
- [ ] Create monitoring dashboards (Grafana)
- [ ] Setup alerting (PagerDuty/Slack)

### Week 7-8: Testing & Quality
- [ ] Write unit tests (target 80% coverage)
- [ ] Add integration tests (API endpoints)
- [ ] Load testing (k6)
- [ ] Security scanning (OWASP ZAP)
- [ ] Code quality (SonarQube)

### Week 9-12: Infrastructure & DevOps
- [ ] Dockerize application
- [ ] Setup CI/CD pipeline
- [ ] Implement secret management
- [ ] Create deployment playbooks
- [ ] Disaster recovery plan

---

**Note:** Frontend, TTE Portal, and Passenger Portal limitations added below.

---

## 🎨 FRONTEND & PORTAL LIMITATIONS

### Security Issues (All Portals)

#### 29. JWT in localStorage (XSS Vulnerable)
**Current:** All portals store tokens in localStorage  
**Risk:** Vulnerable to XSS attacks  
**Impact:** Token theft possible  
**Fix:** Use httpOnly cookies
```javascript
// Backend sets httpOnly cookie
res.cookie('token', jwt, { httpOnly: true, secure: true, sameSite: 'strict' });

// Frontend reads automatically
// No need to store in localStorage
```

#### 30. No CSRF Protection
**Current:** No CSRF tokens on forms  
**Risk:** Cross-site request forgery  
**Impact:** Unauthorized actions  
**Fix:** Implement CSRF tokens
```javascript
// Backend
const csrf = require('csurf');
app.use(csrf({ cookie: true }));

// Frontend
axios.defaults.headers.common['X-CSRF-Token'] = csrfToken;
```

#### 31. No Input Sanitization
**Current:** User input not sanitized  
**Risk:** XSS injection  
**Impact:** Script injection attacks  
**Fix:** Use DOMPurify
```javascript
import DOMPurify from 'dompurify';

const sanitized = DOMPurify.sanitize(userInput);
```

### Performance Issues

#### 32. No Code Splitting
**Current:** Single bundle for all pages  
**Risk:** Large initial bundle (800KB admin)  
**Impact:** Slow initial load  
**Fix:** Implement lazy loading
```javascript
const ReallocationPage = React.lazy(() => import('./pages/ReallocationPage'));

<Suspense fallback={<Loading />}>
  <ReallocationPage />
</Suspense>
```

#### 33. No Image Optimization
**Current:** Large unoptimized images  
**Risk:** Slow page loads  
**Impact:** Poor mobile experience  
**Fix:** Optimize and use WebP
```javascript
// Use next/image or react-image with lazy loading
<img src="image.webp" loading="lazy" alt="..." />
```

#### 34. No Response Caching
**Current:** Every request hits API  
**Risk:** Slow repeated requests  
**Impact:** Poor UX, increased load  
**Fix:** Implement React Query
```javascript
import { useQuery } from 'react-query';

const { data } = useQuery('passengers', fetchPassengers, {
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

#### 35. Inefficient Renders
**Current:** No React.memo, useMemo  
**Risk:** Unnecessary re-renders  
**Impact:** Sluggish UI  
**Fix:** Optimize components
```javascript
const MemoizedComponent = React.memo(({ data }) => {
  return <ExpensiveComponent data={data} />;
});
```

### Frontend Architecture

#### 36. No State Management
**Current:** Local state only, props drilling  
**Risk:** State synchronization issues  
**Impact:** Bugs, hard to maintain  
**Fix:** Implement Redux or Zustand
```javascript
// Zustand (lightweight)
const useStore = create((set) => ({
  passengers: [],
  setPassengers: (passengers) => set({ passengers }),
}));
```

#### 37. Direct API Calls in Components
**Current:** axios in every component  
**Risk:** Code duplication, hard to test  
**Impact:** Maintenance nightmare  
**Fix:** Create API service layer
```javascript
// services/api.js
export const passengerAPI = {
  getAll: () => axios.get('/passengers/all'),
  search: (pnr) => axios.get(`/passenger/search/${pnr}`),
};
```

#### 38. No Error Boundary
**Current:** Errors crash entire app  
**Risk:** White screen on error  
**Impact:**Bad UX, lost user data  
**Fix:** Implement error boundaries
```javascript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) {
    logError(error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorPage />;
    }
    return this.props.children;
  }
}
```

#### 39. No TypeScript - ✅ COMPLETED
**Status:** ✅ FULLY COMPLETED - All portals converted to TypeScript
**Scope:**
- [x] Admin Portal (`frontend/`) - All .jsx → .tsx
- [x] TTE Portal (`tte-portal/`) - All .jsx → .tsx  
- [x] Passenger Portal (`passenger-portal/`) - All .js → .ts/.tsx
- [x] Backend TypeScript config + types defined
```typescript
// Full type safety across all portals
interface Passenger {
  PNR_Number: string;
  Name: string;
  pnrStatus: 'CNF' | 'RAC' | 'WL';
  // ... complete type definitions
}
```

### UX Issues

#### 40. Alert-based Errors
**Current:** window.alert() for errors  
**Risk:** Poor UX, blocks UI  
**Impact:** Frustrating experience  
**Fix:** Toast notifications
```javascript
import { toast } from 'react-toastify';

toast.error('Failed to load passengers');
```

#### 41. No Loading States
**Current:** Blank screen while loading  
**Risk:** Users think app is broken  
**Impact:** Confusion, abandoned sessions  
**Fix:** Loading skeletons
```javascript
{loading ? <Skeleton count={5} /> : <PassengerList />}
```

#### 42. No Offline Support
**Current:** Crashes without internet  
**Risk:** App unusable offline  
**Impact:** Lost productivity  
**Fix:** Implement service worker
```javascript
// register-sw.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

#### 43. No Accessibility (A11y)
**Current:** No ARIA labels, poor keyboard nav  
**Risk:** Unusable for disabled users  
**Impact:** Legal liability, exclusion  
**Fix:** Add ARIA attributes
```jsx
<button aria-label="Mark passenger as no-show">
  Mark No-Show
</button>
```

#### 44. No Dark Mode
**Current:** Light mode only  
**Risk:** Eye strain  
**Impact:** User preference not respected  
**Fix:** Implement theme toggle
```javascript
const [theme, setTheme] = useState('light');

<ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
```

### Mobile Issues

#### 45. Tables Not Responsive
**Current:** Tables overflow on mobile  
**Risk:** Unusable on phones  
**Impact:** Mobile users frustrated  
**Fix:** Responsive table design
```css
@media (max-width: 768px) {
  table {
    display: block;
    overflow-x: auto;
  }
}
```

#### 46. Touch Targets Too Small
**Current:** Buttons < 44px  
**Risk:** Hard to tap accurately  
**Impact:** Accessibility issue  
**Fix:** Increase touch targets
```css
button {
  min-height: 44px;
  min-width: 44px;
}
```

### Testing

#### 47. No Frontend Tests
**Current:** Zero test coverage  
**Risk:** Regressions undetected  
**Impact:** Broken UI in production  
**Fix:** Jest + React Testing Library
```javascript
import { render, screen } from '@testing-library/react';

test('renders passenger list', () => {
  render(<PassengerList />);
  expect(screen.getByText(/passengers/i)).toBeInTheDocument();
});
```

#### 48. No E2E Tests
**Current:** Manual testing only  
**Risk:** User flows break  
**Impact:** Critical bugs in production  
**Fix:** Cypress or Playwright
```javascript
// cypress/e2e/passenger-flow.cy.js
describe('Passenger Flow', () => {
  it('should cancel ticket', () => {
    cy.visit('/dashboard');
    cy.get('[data-testid="cancel-button"]').click();
    cy.get('[data-testid="confirm"]').click();
    cy.contains('Ticket cancelled successfully');
  });
});
```

### Infrastructure

#### 49. No PWA Support
**Current:** Regular web apps  
**Risk:** No installability  
**Impact:** Missed engagement  
**Fix:** Add manifest + service worker
```json
// manifest.json
{
  "name": "RAC Passenger Portal",
  "short_name": "RAC",
  "start_url": "/",
  "display": "standalone",
  "icons": [...]
}
```

#### 50. No Monitoring/Analytics
**Current:** No usage tracking  
**Risk:** Don't know what users do  
**Impact:** Can't improve UX  
**Fix:** Google Analytics
```javascript
import ReactGA from 'react-ga4';

ReactGA.initialize('G-XXXXXXXXXX');
ReactGA.send('pageview');
```

#### 51. Build Not Optimized
**Current:** Development build in production (Admin)  
**Risk:** Huge bundle, slow  
**Impact:** Poor performance  
**Fix:** Production build
```bash
npm run build
```

#### 52. No CDN
**Current:** Static assets from origin  
**Risk:** Slow global access  
**Impact:** High latency  
**Fix:** CloudFront/Cloudflare CDN

### Portal-Specific Issues

#### 53. Admin Portal - CRA Not Updated
**Current:** Using Create React App (legacy)  
**Risk:** Outdated tooling  
**Impact:** Missing optimizations  
**Fix:** Migrate to Vite
```bash
npm create vite@latest admin-portal -- --template react
```

#### 54. TTE Portal - No Offline Upgrade Queueing
**Current:** Offline upgrades require connection  
**Risk:** Lost in poor network areas  
**Impact:** Manual retry needed  
**Fix:** IndexedDB queue
```javascript
// Queue upgrade, sync when online
const db = await openDB('upgrades', 1);
await db.add('queue', upgradeData);
```

#### 55. Passenger Portal - No Ticket Download
**Current:** Can't save boarding pass  
**Risk:** Need internet to show ticket  
**Impact:** Inconvenient for passengers  
**Fix:** Generate PDF
```javascript
import jsPDF from 'jspdf';

const pdf = new jsPDF();
pdf.text('Boarding Pass', 10, 10);
pdf.save('ticket.pdf');
```

#### 56. Duplicate WebSocket Connections  
**Current:** Each component creates own WS  
**Risk:** Connection limit exhaustion  
**Impact:** Performance issues  
**Fix:** Single WebSocket instance
```javascript
// services/websocket.js
class WebSocketService {
  static instance = null;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new WebSocket('ws://localhost:5000');
    }
    return this.instance;
  }
}
```

#### 57. Environment Variables in Frontend Code
**Current:** API_URL hardcoded  
**Risk:** Need rebuild for different envs  
**Impact:** Deployment friction  
**Fix:** Runtime config
```javascript
// public/config.js
window.CONFIG = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
};
```

---

## 📊 UPDATED PRIORITY MATRIX

### Must Fix (P0) - Before Production
1. JWT in localStorage → httpOnly cookies
2. OTP Storage → Redis
3. Rate Limiting
4. CSRF Protection
5. Error Tracking (Sentry)
6. Database Backups
7. Production Build (Admin portal)

### Should Fix (P1) - Within 1 Month
8. Code Splitting
9. State Management (Zustand)
10. API Service Layer
11. Error Boundaries
12. Loading States
13. Responsive Tables
14. Caching Layer
15. Load Balancing
16. Unit/E2E Tests

### Nice to Have (P2) - Within 3 Months
17. TypeScript Migration
18. PWA Support
19. Dark Mode
20. Offline Support
21. Accessibility Improvements
22. Message Queue
23. Docker Containerization
24. CI/CD Pipeline

### Future Enhancements (P3) - 6+ Months
25. Microservices Architecture
26. Database Sharding
27. Multi-region Deployment
28. GraphQL API
29. AI/ML Predictive Allocation
30. Mobile Apps (React Native)

---

## 💰 UPDATED EFFORT ESTIMATE

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P0 | JWT → httpOnly | 1 day | Critical |
| P0 | CSRF Protection | 4 hours | High |
| P0 | Production Build | 1 hour | High |
| P1 | Code Splitting | 2 days | High |
| P1 | State Management | 3 days | High |
| P1 | API Layer | 2 days | Medium |
| P1 | Error Boundaries | 1 day | High |
| P1 | Frontend Tests | 2 weeks | High |
| P2 | TypeScript | 4 weeks | Medium |
| P2 | PWA | 1 week | Medium |

**Frontend P0: ~2 days**  
**Frontend P1: ~4 weeks**  
**Total P0 (Backend+Frontend): ~5 days**  
**Total P0+P1: ~8 weeks**

---


