// passenger-portal/src/api.ts
import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from './types';

const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add request interceptor to attach token to all requests
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle token expiration
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
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
