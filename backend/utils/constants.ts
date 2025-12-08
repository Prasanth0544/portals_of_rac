/**
 * constants.ts
 * Application-wide constants and configuration
 */

// Type definitions
interface BerthTypes {
    LOWER: string;
    MIDDLE: string;
    UPPER: string;
    SIDE_LOWER: string;
    SIDE_UPPER: string;
}

interface BerthStatus {
    VACANT: string;
    OCCUPIED: string;
    SHARED: string;
}

interface PNRStatus {
    CONFIRMED: string;
    RAC: string;
    WAITING: string;
}

interface ClassTypes {
    SLEEPER: string;
    AC_3_TIER: string;
    AC_2_TIER: string;
    AC_1_TIER: string;
    CHAIR_CAR: string;
    SECOND_SITTING: string;
}

interface EventTypes {
    JOURNEY_STARTED: string;
    STATION_ARRIVAL: string;
    PASSENGER_BOARDED: string;
    PASSENGER_DEBOARDED: string;
    NO_SHOW: string;
    RAC_UPGRADED: string;
    TRAIN_RESET: string;
}

interface WSMessageTypes {
    TRAIN_UPDATE: string;
    STATION_ARRIVAL: string;
    RAC_REALLOCATION: string;
    NO_SHOW: string;
    STATS_UPDATE: string;
    CONNECTION_SUCCESS: string;
    ERROR: string;
}

interface Validation {
    PNR_MIN_LENGTH: number;
    PNR_MAX_LENGTH: number;
    TRAIN_NO_LENGTH: number;
    MAX_PASSENGERS_PER_BERTH: number;
    MIN_AGE: number;
    MAX_AGE: number;
}

interface Messages {
    TRAIN_INITIALIZED: string;
    JOURNEY_STARTED: string;
    TRAIN_RESET: string;
    NO_SHOW_MARKED: string;
    REALLOCATION_APPLIED: string;
    TRAIN_NOT_INITIALIZED: string;
    JOURNEY_NOT_STARTED: string;
    INVALID_PNR: string;
    PASSENGER_NOT_FOUND: string;
    BERTH_NOT_FOUND: string;
}

interface Collections {
    STATIONS: string | null;
    PASSENGERS: string | null;
}

interface Databases {
    STATIONS: string | null;
    PASSENGERS: string | null;
}

interface HTTPStatus {
    OK: number;
    CREATED: number;
    BAD_REQUEST: number;
    NOT_FOUND: number;
    INTERNAL_ERROR: number;
}

// RAC_CONFIG is declared in types/global.d.ts

// Train Configuration (Dynamic - from global.RAC_CONFIG)
export const getTRAIN_NO = (): string | null => global.RAC_CONFIG?.trainNo || null;
export const getTRAIN_NAME = (): string | null => global.RAC_CONFIG?.trainName || null;

export const TOTAL_COACHES = 9;
export const BERTHS_PER_COACH = 72;
export const BERTHS_PER_COACH_3A = 64;

export const BERTH_TYPES: BerthTypes = {
    LOWER: 'Lower Berth',
    MIDDLE: 'Middle Berth',
    UPPER: 'Upper Berth',
    SIDE_LOWER: 'Side Lower',
    SIDE_UPPER: 'Side Upper'
};

export const BERTH_STATUS: BerthStatus = {
    VACANT: 'VACANT',
    OCCUPIED: 'OCCUPIED',
    SHARED: 'SHARED'
};

export const PNR_STATUS: PNRStatus = {
    CONFIRMED: 'CNF',
    RAC: 'RAC',
    WAITING: 'WL'
};

export const CLASS_TYPES: ClassTypes = {
    SLEEPER: 'SL',
    AC_3_TIER: 'AC_3_Tier',
    AC_2_TIER: '2A',
    AC_1_TIER: '1A',
    CHAIR_CAR: 'CC',
    SECOND_SITTING: '2S'
};

export const EVENT_TYPES: EventTypes = {
    JOURNEY_STARTED: 'JOURNEY_STARTED',
    STATION_ARRIVAL: 'STATION_ARRIVAL',
    PASSENGER_BOARDED: 'PASSENGER_BOARDED',
    PASSENGER_DEBOARDED: 'PASSENGER_DEBOARDED',
    NO_SHOW: 'NO_SHOW',
    RAC_UPGRADED: 'RAC_UPGRADED',
    TRAIN_RESET: 'TRAIN_RESET'
};

export const WS_MESSAGE_TYPES: WSMessageTypes = {
    TRAIN_UPDATE: 'TRAIN_UPDATE',
    STATION_ARRIVAL: 'STATION_ARRIVAL',
    RAC_REALLOCATION: 'RAC_REALLOCATION',
    NO_SHOW: 'NO_SHOW',
    STATS_UPDATE: 'STATS_UPDATE',
    CONNECTION_SUCCESS: 'CONNECTION_SUCCESS',
    ERROR: 'ERROR'
};

export const VALIDATION: Validation = {
    PNR_MIN_LENGTH: 10,
    PNR_MAX_LENGTH: 12,
    TRAIN_NO_LENGTH: 5,
    MAX_PASSENGERS_PER_BERTH: 2,
    MIN_AGE: 1,
    MAX_AGE: 120
};

export const MESSAGES: Messages = {
    TRAIN_INITIALIZED: 'Train initialized successfully',
    JOURNEY_STARTED: 'Journey started successfully',
    TRAIN_RESET: 'Train reset to initial state',
    NO_SHOW_MARKED: 'Passenger marked as no-show',
    REALLOCATION_APPLIED: 'Reallocation applied successfully',
    TRAIN_NOT_INITIALIZED: 'Train is not initialized',
    JOURNEY_NOT_STARTED: 'Journey has not started',
    INVALID_PNR: 'Invalid PNR format',
    PASSENGER_NOT_FOUND: 'Passenger not found',
    BERTH_NOT_FOUND: 'Berth not found'
};

export const getCOLLECTIONS = (): Collections => ({
    STATIONS: global.RAC_CONFIG?.stationsCollection || null,
    PASSENGERS: global.RAC_CONFIG?.passengersCollection || null
});

export const getDATABASES = (): Databases => ({
    STATIONS: global.RAC_CONFIG?.stationsDb || null,
    PASSENGERS: global.RAC_CONFIG?.passengersDb || null
});

export const HTTP_STATUS: HTTPStatus = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500
};

// CommonJS export for compatibility
module.exports = {
    getTRAIN_NO,
    getTRAIN_NAME,
    TOTAL_COACHES,
    BERTHS_PER_COACH,
    BERTHS_PER_COACH_3A,
    BERTH_TYPES,
    BERTH_STATUS,
    PNR_STATUS,
    CLASS_TYPES,
    EVENT_TYPES,
    WS_MESSAGE_TYPES,
    VALIDATION,
    MESSAGES,
    getCOLLECTIONS,
    getDATABASES,
    HTTP_STATUS
};
