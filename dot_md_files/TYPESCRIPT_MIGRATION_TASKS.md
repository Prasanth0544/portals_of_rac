# TypeScript + Mongoose + Zod Migration Tasks

## Phase 1: Backend TypeScript Setup
- [x] Install TypeScript and dependencies in backend
- [x] Create tsconfig.json for backend
- [x] Create type definitions for core models (Passenger, Train, Station, Coach, Berth)
- [ ] Convert backend/config files to TypeScript
- [ ] Convert backend/services to TypeScript
- [ ] Convert backend/controllers to TypeScript
- [ ] Convert backend/routes to TypeScript
- [ ] Update server.js to server.ts

## Phase 2: Mongoose Integration
- [x] Install Mongoose in backend
- [x] Create Mongoose schema for Passenger
- [x] Create Mongoose schema for TTEUser
- [x] Create Mongoose schema for UpgradeNotification
- [ ] Update db.js to use Mongoose connections
- [ ] Migrate DataService to use Mongoose models
- [ ] Update controllers to use Mongoose queries

## Phase 3: Zod Validation
- [x] Install Zod in backend
- [x] Create Zod schemas for API request validation
- [x] Add validation middleware
- [ ] Add validation to train routes
- [ ] Add validation to passenger routes
- [ ] Add validation to TTE routes
- [ ] Add validation to auth routes

## Phase 4: Frontend TypeScript (Admin Portal)
- [ ] Install TypeScript in frontend
- [ ] Create tsconfig.json for frontend
- [ ] Create shared type definitions
- [ ] Convert components to TSX
- [ ] Convert pages to TSX
- [ ] Update API calls with types

## Phase 5: Frontend TypeScript (TTE Portal)
- [ ] Install TypeScript in tte-portal
- [ ] Create tsconfig.json
- [ ] Convert components to TSX
- [ ] Convert pages to TSX
- [ ] Update API calls with types

## Phase 6: Frontend TypeScript (Passenger Portal)
- [ ] Install TypeScript in passenger-portal
- [ ] Create tsconfig.json
- [ ] Convert components to TSX
- [ ] Convert pages to TSX
- [ ] Update API calls with types

## Phase 7: Testing & Cleanup
- [ ] Test all API endpoints
- [ ] Test all frontend features
- [ ] Remove old .js files
- [ ] Update documentation
