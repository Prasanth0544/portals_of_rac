// backend/types/index.ts
// Core type definitions for the RAC Reallocation System

// =============================================
// Station Types
// =============================================
export interface Station {
    code: string;
    name: string;
    arrivalTime?: string;
    departureTime?: string;
    distance?: number;
    day?: number;
}

// =============================================
// Passenger Types
// =============================================
export interface Passenger {
    PNR_Number: string;
    Name: string;
    Age: number;
    Gender: 'Male' | 'Female' | 'Other';
    PNR_Status: 'CNF' | 'RAC' | 'WL';
    Rac_status?: string;
    Assigned_Coach: string;
    Assigned_Berth: string;
    Berth_Type: 'SL' | 'SU' | 'LB' | 'MB' | 'UB' | 'Side-LB' | 'Side-UB';
    Booking_Class: 'Sleeper' | '3AC';
    Boarding_Station: string;
    Deboarding_Station: string;
    Passenger_Status: 'Online' | 'Offline';
    IRCTC_ID: string;
    Email?: string;
    Boarded?: boolean;
    NO_show?: boolean;
    Deboarded?: boolean;
    Upgraded_From?: string;
    fromIdx?: number;
    toIdx?: number;
}

// In-memory passenger format (simplified)
export interface InMemoryPassenger {
    pnr: string;
    name: string;
    age: number;
    gender: string;
    pnrStatus: string;
    racStatus?: string;
    coach: string;
    seatNo: string;
    berthType: string;
    bookingClass: string;
    from: string;
    to: string;
    fromIdx: number;
    toIdx: number;
    passengerStatus: string;
    irctcId: string;
    email?: string;
    boarded: boolean;
    noShow: boolean;
    deboarded: boolean;
}

// =============================================
// Coach & Berth Types
// =============================================
export interface Berth {
    berthNo: number;
    fullBerthNo: string;
    type: string;
    status: 'VACANT' | 'OCCUPIED' | 'RAC';
    passengers: InMemoryPassenger[];
    segmentOccupancy: Map<string, InMemoryPassenger>;
}

export interface Coach {
    coachNo: string;
    class: 'Sleeper' | '3AC';
    capacity: number;
    berths: Berth[];
}

// =============================================
// Train Types
// =============================================
export interface TrainState {
    trainNo: string;
    trainName: string;
    journeyDate: string;
    stations: Station[];
    coaches: Coach[];
    racQueue: InMemoryPassenger[];
    currentStationIdx: number;
    journeyStarted: boolean;
    stats: TrainStats;
}

export interface TrainStats {
    totalPassengers: number;
    cnfPassengers: number;
    racPassengers: number;
    currentOnboard: number;
    totalBoarded: number;
    totalDeboarded: number;
    totalNoShows: number;
    totalRACUpgraded: number;
}

// =============================================
// API Request/Response Types
// =============================================
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

export interface InitializeTrainRequest {
    trainNo: string;
    journeyDate: string;
    trainName?: string;
}

export interface LoginRequest {
    employeeId: string;
    password: string;
}

export interface MarkNoShowRequest {
    pnr: string;
}

export interface UpgradeRequest {
    pnr: string;
    newCoach: string;
    newBerth: string;
}

// =============================================
// TTE User Types
// =============================================
export interface TTEUser {
    employeeId: string;
    password: string;
    name: string;
    role: 'Admin' | 'TTE';
    email?: string;
}

// =============================================
// Upgrade Notification Types
// =============================================
export interface UpgradeNotification {
    id: string;
    pnr: string;
    irctcId: string;
    passengerName: string;
    currentBerth: string;
    proposedCoach: string;
    proposedBerth: string;
    proposedBerthType: string;
    stationCode: string;
    stationName: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    createdAt: Date;
    expiresAt: Date;
    tteApproved?: boolean;
    passengerApproved?: boolean;
}

// =============================================
// Station Reallocation Types
// =============================================
export interface StationReallocation {
    id: string;
    stationCode: string;
    stationName: string;
    racPassenger: InMemoryPassenger;
    vacantBerth: {
        coach: string;
        berthNo: string;
        berthType: string;
    };
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Date;
}
