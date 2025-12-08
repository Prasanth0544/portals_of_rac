# TypeScript + Mongoose + Zod Migration Plan

## Goal
Migrate the RAC Reallocation System to TypeScript with Mongoose ODM and Zod validation while keeping the codebase functional at each step.

## Key Principle: Incremental Migration
Each file will be converted individually. The app will remain functional throughout.

---

## Phase 1: Backend TypeScript Setup

### Installation
```bash
cd backend
npm install typescript ts-node @types/node @types/express --save-dev
npm install @types/cors @types/jsonwebtoken @types/bcryptjs --save-dev
```

### Configuration Files
- `backend/tsconfig.json` - TypeScript compiler config
- `backend/types/index.ts` - Core type definitions

---

## Phase 2: Mongoose Integration

### Installation
```bash
npm install mongoose @types/mongoose
```

### New Files
- `backend/models/Passenger.ts` - Mongoose schema
- `backend/models/Train.ts` - Mongoose schema

---

## Phase 3: Zod Validation

### Installation
```bash
npm install zod
```

### New Files
- `backend/validation/schemas.ts` - Request validation schemas
- `backend/middleware/validate.ts` - Validation middleware

---

## Phase 4-6: Frontend TypeScript
Convert admin, TTE, and passenger portals to TypeScript

---

## Verification
After each phase: test backend starts, APIs work, frontends function
