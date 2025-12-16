// passenger-portal/src/api.ts
import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from './types';

const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Required for cookies (CSRF)
    headers: {
        'Content-Type': 'application/json'
    }
});

// CSRF Token management
let csrfToken: string | null = null;

const fetchCsrfToken = async (): Promise<string | null> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/csrf-token`, { withCredentials: true });
        csrfToken = response.data.csrfToken;
        return csrfToken;
    } catch (error) {
        console.warn('[Passenger API] Failed to fetch CSRF token:', error);
        return null;
    }
};

// Initialize CSRF token on module load
fetchCsrfToken();

// Add request interceptor to attach token and CSRF to all requests
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add CSRF token for state-changing requests
        if (csrfToken && config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
            config.headers['X-CSRF-Token'] = csrfToken;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle token expiration with auto-refresh
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
        if (error.response?.status === 401) {
            const data = error.response?.data;
            const isExpiredToken = data?.message?.toLowerCase().includes('expired') ||
                data?.message?.toLowerCase().includes('jwt');

            if (isExpiredToken) {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    try {
                        console.log('[Passenger API] Token expired, attempting refresh...');
                        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
                        const newToken = refreshResponse.data.token;

                        // Save new token
                        localStorage.setItem('token', newToken);
                        console.log('[Passenger API] Token refreshed successfully');

                        // Retry original request with new token
                        error.config.headers.Authorization = `Bearer ${newToken}`;
                        return api.request(error.config);
                    } catch (refreshError) {
                        console.error('[Passenger API] Token refresh failed:', refreshError);
                    }
                }
            }

            // If refresh fails or no refresh token, logout
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('passengerPNR');
            console.warn('⚠️ Session expired. Please login again.');
        }
        return Promise.reject(error);
    }
);

// Passenger Portal API
export const passengerAPI = {
    // Public PNR lookup
    getPNRDetails: async (pnr: string): Promise<ApiResponse> => {
        const response = await api.get(`/passenger/pnr/${pnr}`);
        return response.data;
    },

    // Passenger login
    login: async (irctcId: string, password: string): Promise<ApiResponse> => {
        const response = await api.post('/auth/passenger/login', { irctcId, password });
        return response.data;
    },

    // Self-cancellation
    cancelBooking: async (pnr: string): Promise<ApiResponse> => {
        const response = await api.post('/passenger/cancel', { pnr });
        return response.data;
    },

    // Upgrade notifications
    getUpgradeNotifications: async (pnr: string): Promise<ApiResponse> => {
        const response = await api.get(`/passenger/upgrade-notifications/${pnr}`);
        return response.data;
    },

    acceptUpgrade: async (pnr: string, notificationId: string): Promise<ApiResponse> => {
        const response = await api.post('/passenger/accept-upgrade', {
            pnr,
            notificationId
        });
        return response.data;
    },

    denyUpgrade: async (pnr: string, notificationId: string, reason: string): Promise<ApiResponse> => {
        const response = await api.post('/passenger/deny-upgrade', {
            pnr,
            notificationId,
            reason
        });
        return response.data;
    },

    // Approve upgrade (dual-approval flow)
    approveUpgrade: async (irctcId: string, reallocationId: string): Promise<ApiResponse> => {
        const response = await api.post('/passenger/approve-upgrade', { irctcId, reallocationId });
        return response.data;
    },

    // Get pending upgrades for passenger
    getPendingUpgrades: async (irctcId: string): Promise<ApiResponse> => {
        const response = await api.get(`/passenger/pending-upgrades/${irctcId}`);
        return response.data;
    },

    // Get train state
    getTrainState: async (): Promise<ApiResponse> => {
        const response = await api.get('/train/state');
        return response.data;
    }
};

export default api;
