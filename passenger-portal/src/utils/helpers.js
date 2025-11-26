// passenger-portal/src/utils/helpers.js

import { VALIDATION, DATE_FORMATS } from '../constants';

/**
 * Format PNR number with proper spacing
 * @param {string} pnr - PNR number
 * @returns {string} Formatted PNR
 */
export const formatPNR = (pnr) => {
    if (!pnr) return '';
    const cleaned = pnr.replace(/\s/g, '');
    return cleaned.toUpperCase();
};

/**
 * Validate PNR format
 * @param {string} pnr - PNR number to validate
 * @returns {boolean} True if valid
 */
export const isValidPNR = (pnr) => {
    if (!pnr) return false;
    const cleaned = pnr.replace(/\s/g, '');
    return VALIDATION.PNR.PATTERN.test(cleaned);
};

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @param {string} format - Format string (optional)
 * @returns {string} Formatted date
 */
export const formatDate = (date, format = DATE_FORMATS.DISPLAY) => {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en', { month: 'short' });
    const year = d.getFullYear();
    const hours = String(d.getHours() % 12 || 12).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = d.getHours() >= 12 ? 'PM' : 'AM';

    switch (format) {
        case DATE_FORMATS.DISPLAY:
            return `${day} ${month} ${year}`;
        case DATE_FORMATS.DISPLAY_WITH_TIME:
            return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
        case DATE_FORMATS.TIME_ONLY:
            return `${hours}:${minutes} ${ampm}`;
        default:
            return d.toLocaleDateString();
    }
};

/**
 * Format time string (HH:MM)
 * @param {string} time - Time string
 * @returns {string} Formatted time
 */
export const formatTime = (time) => {
    if (!time) return '';

    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return time;

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
};

/**
 * Get time remaining in human-readable format
 * @param {number} milliseconds - Time in milliseconds
 * @returns {string} Formatted time remaining
 */
export const getTimeRemaining = (milliseconds) => {
    if (milliseconds <= 0) return 'Expired';

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
};

/**
 * Calculate countdown timer
 * @param {Date|string|number} expiryTime - Expiry timestamp
 * @returns {number} Milliseconds remaining
 */
export const calculateTimeRemaining = (expiryTime) => {
    const expiry = typeof expiryTime === 'number' ? expiryTime : new Date(expiryTime).getTime();
    const now = Date.now();
    return Math.max(0, expiry - now);
};

/**
 * Check if offer is expiring soon
 * @param {number} timeRemaining - Time remaining in milliseconds
 * @param {number} threshold - Threshold in milliseconds
 * @returns {boolean} True if expiring soon
 */
export const isExpiringSoon = (timeRemaining, threshold = 15000) => {
    return timeRemaining > 0 && timeRemaining <= threshold;
};

/**
 * Sanitize input string
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (input) => {
    if (!input) return '';
    return input.trim().replace(/[<>]/g, '');
};

/**
 * Get status display text
 * @param {string} status - Status code
 * @returns {string} Display text
 */
export const getStatusDisplayText = (status) => {
    const statusMap = {
        'CNF': 'Confirmed',
        'RAC': 'RAC',
        'WL': 'Waiting List',
        'CAN': 'Cancelled',
        'PENDING': 'Pending',
        'ACCEPTED': 'Accepted',
        'DENIED': 'Denied',
        'EXPIRED': 'Expired',
        'CONFIRMED': 'Confirmed',
        'REJECTED': 'Rejected'
    };

    return statusMap[status] || status;
};

/**
 * Get berth type display name
 * @param {string} berthType - Berth type code
 * @returns {string} Display name
 */
export const getBerthTypeDisplayName = (berthType) => {
    const berthMap = {
        'LB': 'Lower Berth',
        'MB': 'Middle Berth',
        'UB': 'Upper Berth',
        'SL': 'Side Lower',
        'SU': 'Side Upper'
    };

    return berthMap[berthType] || berthType;
};

/**
 * Get coach class display name
 * @param {string} coachClass - Coach class code
 * @returns {string} Display name
 */
export const getCoachClassDisplayName = (coachClass) => {
    const classMap = {
        'SL': 'Sleeper',
        'AC_3_Tier': '3-Tier AC',
        '2A': '2-Tier AC',
        '1A': 'First AC'
    };

    return classMap[coachClass] || coachClass;
};

/**
 * Parse berth notation (e.g., "S1-45" to coach S1, berth 45)
 * @param {string} berthNotation - Berth notation
 * @returns {object} {coach, berth}
 */
export const parseBerthNotation = (berthNotation) => {
    if (!berthNotation) return { coach: '', berth: '' };

    const match = berthNotation.match(/([A-Z]+\d+)-(\d+)/);
    if (match) {
        return {
            coach: match[1],
            berth: match[2]
        };
    }

    return { coach: berthNotation, berth: '' };
};

/**
 * Format berth notation
 * @param {string} coach - Coach name
 * @param {number|string} berth - Berth number
 * @returns {string} Formatted berth notation
 */
export const formatBerthNotation = (coach, berth) => {
    if (!coach || !berth) return '';
    return `${coach}-${berth}`;
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 300) => {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

/**
 * Deep clone object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));

    const clonedObj = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = deepClone(obj[key]);
        }
    }
    return clonedObj;
};

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if object is empty
 * @param {object} obj - Object to check
 * @returns {boolean} True if empty
 */
export const isEmptyObject = (obj) => {
    return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
};

/**
 * Local storage helpers with error handling
 */
export const storage = {
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error reading from localStorage: ${key}`, error);
            return defaultValue;
        }
    },

    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error writing to localStorage: ${key}`, error);
            return false;
        }
    },

    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing from localStorage: ${key}`, error);
            return false;
        }
    },

    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage', error);
            return false;
        }
    }
};

/**
 * Session storage helpers
 */
export const sessionStorage = {
    get: (key, defaultValue = null) => {
        try {
            const item = window.sessionStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error reading from sessionStorage: ${key}`, error);
            return defaultValue;
        }
    },

    set: (key, value) => {
        try {
            window.sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error writing to sessionStorage: ${key}`, error);
            return false;
        }
    },

    remove: (key) => {
        try {
            window.sessionStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing from sessionStorage: ${key}`, error);
            return false;
        }
    }
};

/**
 * Check network status
 * @returns {boolean} True if online
 */
export const isOnline = () => {
    return navigator.onLine;
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        }
    } catch (error) {
        console.error('Failed to copy to clipboard', error);
        return false;
    }
};

/**
 * Play notification sound
 * @param {string} soundType - Type of sound (success, warning, error)
 */
export const playNotificationSound = (soundType = 'success') => {
    // Create audio context and play notification sound
    // This is a placeholder - in production you'd load actual sound files
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        const frequencies = {
            success: 800,
            warning: 600,
            error: 400
        };

        oscillator.frequency.value = frequencies[soundType] || 600;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        // Silently fail if audio is not supported
        console.debug('Audio notification not available');
    }
};

/**
 * Request notification permission
 * @returns {Promise<boolean>} True if permission granted
 */
export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

/**
 * Show browser notification
 * @param {string} title - Notification title
 * @param {object} options - Notification options
 */
export const showNotification = (title, options = {}) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            icon: '/favicon.ico',
            badge: '/badge.png',
            ...options
        });
    }
};

export default {
    formatPNR,
    isValidPNR,
    formatDate,
    formatTime,
    getTimeRemaining,
    calculateTimeRemaining,
    isExpiringSoon,
    sanitizeInput,
    getStatusDisplayText,
    getBerthTypeDisplayName,
    getCoachClassDisplayName,
    parseBerthNotation,
    formatBerthNotation,
    debounce,
    throttle,
    deepClone,
    generateUniqueId,
    isEmptyObject,
    storage,
    sessionStorage,
    isOnline,
    copyToClipboard,
    playNotificationSound,
    requestNotificationPermission,
    showNotification
};
