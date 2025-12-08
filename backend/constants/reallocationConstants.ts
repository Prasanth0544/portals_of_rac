/**
 * Reallocation Service Constants
 * Extracted from ReallocationService.js for centralized configuration
 */

export interface EligibilityRulesConfig {
    MIN_JOURNEY_DISTANCE: number;
    MAX_RAC_PRIORITY: string;
    FULL_JOURNEY_COVERAGE: boolean;
    CLASS_MATCHING: boolean;
    SOLO_RAC_CONSTRAINT: boolean;
    NO_CNF_CONFLICT: boolean;
}

export interface UpgradeOfferConfig {
    EXPIRY_TTL: number;
    OFFER_TIMEOUT_CHECK: number;
    MAX_OFFERS_PER_PASSENGER: number;
}

export interface BerthTypesConfig {
    SL: string;
    AC_3_TIER: string;
    AC_2_TIER: string;
    AC_1_TIER: string;
    FIRST_CLASS: string;
}

export interface PassengerStatusConfig {
    RAC: string;
    CNF: string;
    WL: string;
    NO_SHOW: string;
    BOARDED: string;
    DEBOARDED: string;
}

export interface OnlineStatusConfig {
    ONLINE: string;
    OFFLINE: string;
}

export interface SharingStatusConfig {
    SOLO: string;
    SHARING: string;
    WILL_SHARE: string;
}

export interface VacancyTypeConfig {
    NO_SHOW: string;
    CANCELLATION: string;
    DEBOARDED: string;
    TRANSITION: string;
}

export interface ErrorMessagesConfig {
    NO_ELIGIBLE_CANDIDATES: string;
    PASSENGER_NOT_FOUND: string;
    BERTH_NOT_AVAILABLE: string;
    INVALID_UPGRADE: string;
    ALREADY_BOARDED: string;
    ALREADY_MARKED: string;
    SHARING_REQUIRED: string;
    JOURNEY_TOO_SHORT: string;
    CLASS_MISMATCH: string;
    CONFLICTING_CNF: string;
}

export interface LogLevelsConfig {
    INFO: string;
    WARN: string;
    ERROR: string;
    DEBUG: string;
}

export interface DBConfig {
    BATCH_SIZE: number;
    RETRY_ATTEMPTS: number;
    RETRY_DELAY: number;
}

export interface ReallocationConstantsType {
    ELIGIBILITY_RULES: EligibilityRulesConfig;
    UPGRADE_OFFER: UpgradeOfferConfig;
    BERTH_TYPES: BerthTypesConfig;
    PASSENGER_STATUS: PassengerStatusConfig;
    ONLINE_STATUS: OnlineStatusConfig;
    SHARING_STATUS: SharingStatusConfig;
    VACANCY_TYPE: VacancyTypeConfig;
    ERROR_MESSAGES: ErrorMessagesConfig;
    LOG_LEVELS: LogLevelsConfig;
    DB_CONFIG: DBConfig;
}

const REALLOCATION_CONSTANTS: ReallocationConstantsType = {
    // Eligibility Rules
    ELIGIBILITY_RULES: {
        MIN_JOURNEY_DISTANCE: 70,
        MAX_RAC_PRIORITY: 'RAC 3',
        FULL_JOURNEY_COVERAGE: true,
        CLASS_MATCHING: true,
        SOLO_RAC_CONSTRAINT: true,
        NO_CNF_CONFLICT: true,
    },

    // Offer Management
    UPGRADE_OFFER: {
        EXPIRY_TTL: 3600000,
        OFFER_TIMEOUT_CHECK: 60000,
        MAX_OFFERS_PER_PASSENGER: 1,
    },

    // Berth Configuration
    BERTH_TYPES: {
        SL: 'SL',
        AC_3_TIER: '3A',
        AC_2_TIER: '2A',
        AC_1_TIER: '1A',
        FIRST_CLASS: 'FC',
    },

    // Passenger Status
    PASSENGER_STATUS: {
        RAC: 'RAC',
        CNF: 'CNF',
        WL: 'WL',
        NO_SHOW: 'NO_SHOW',
        BOARDED: 'BOARDED',
        DEBOARDED: 'DEBOARDED',
    },

    // Passenger Online Status
    ONLINE_STATUS: {
        ONLINE: 'online',
        OFFLINE: 'offline',
    },

    // Sharing Status
    SHARING_STATUS: {
        SOLO: 'solo',
        SHARING: 'sharing',
        WILL_SHARE: 'will_share',
    },

    // Vacancy Types
    VACANCY_TYPE: {
        NO_SHOW: 'no_show',
        CANCELLATION: 'cancellation',
        DEBOARDED: 'deboarded',
        TRANSITION: 'transition',
    },

    // Error Messages
    ERROR_MESSAGES: {
        NO_ELIGIBLE_CANDIDATES: 'No eligible RAC passengers found',
        PASSENGER_NOT_FOUND: 'Passenger not found',
        BERTH_NOT_AVAILABLE: 'Berth not available',
        INVALID_UPGRADE: 'Cannot upgrade: constraints not met',
        ALREADY_BOARDED: 'Passenger has already boarded',
        ALREADY_MARKED: 'Passenger already marked as no-show',
        SHARING_REQUIRED: 'Passenger must be sharing berth',
        JOURNEY_TOO_SHORT: 'Journey distance less than 70km',
        CLASS_MISMATCH: 'Berth class does not match passenger class',
        CONFLICTING_CNF: 'Conflicting confirmed passenger',
    },

    // Logging
    LOG_LEVELS: {
        INFO: 'INFO',
        WARN: 'WARN',
        ERROR: 'ERROR',
        DEBUG: 'DEBUG',
    },

    // Database
    DB_CONFIG: {
        BATCH_SIZE: 100,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
    },
};

module.exports = REALLOCATION_CONSTANTS;
export default REALLOCATION_CONSTANTS;
