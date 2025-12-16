// frontend/src/services/apiWithErrorHandling.ts
// Enhanced API service with error handling, validation, and notifications

import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { errorToast, networkErrorToast, serverErrorToast, validationErrorToast } from './toastNotification';

const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Types
interface ApiError {
    type: string;
    message: string;
    details?: any;
    status?: number;
    error?: any;
}

interface SafeRequestOptions {
    showError?: boolean;
    retryCount?: number;
    retryDelay?: number;
}

interface ApiResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    details?: any;
    type?: string;
    status?: number;
}

const api: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    withCredentials: true, // Required for cookies (CSRF)
    headers: {
        'Content-Type': 'application/json',
    },
});

// CSRF Token management
let csrfToken: string | null = null;

const fetchCsrfToken = async (): Promise<string | null> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/csrf-token`, { withCredentials: true });
        csrfToken = response.data.csrfToken;
        return csrfToken;
    } catch (error) {
        console.warn('[API] Failed to fetch CSRF token:', error);
        return null;
    }
};

// Initialize CSRF token on module load
fetchCsrfToken();

// ========================== REQUEST INTERCEPTOR ==========================

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

        if (import.meta.env.DEV) {
            console.log(`[API] Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
        }

        return config;
    },
    (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
    }
);

// ========================== RESPONSE INTERCEPTOR ==========================

api.interceptors.response.use(
    (response: AxiosResponse) => {
        if (import.meta.env.DEV) {
            console.log(`[API] Response: ${response.config.url}`, response.data);
        }
        return response;
    },
    async (error) => {
        if (!error.response) {
            console.error('[API] Network error:', error.message);
            networkErrorToast();
            return Promise.reject({
                type: 'NETWORK_ERROR',
                message: 'Network error. Please check your connection.',
                error
            } as ApiError);
        }

        const { status, data } = error.response;

        if (status === 400) {
            console.error('[API] Validation error:', data);
            validationErrorToast(data.message || 'Validation failed');
            return Promise.reject({
                type: 'VALIDATION_ERROR',
                message: data.message || 'Validation failed',
                details: data.details,
                status
            } as ApiError);
        }

        if (status === 401) {
            // Check if token expired (not invalid credentials)
            const isExpiredToken = data?.message?.toLowerCase().includes('expired') ||
                data?.message?.toLowerCase().includes('jwt');

            if (isExpiredToken) {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    try {
                        console.log('[API] Token expired, attempting refresh...');
                        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
                        const newToken = refreshResponse.data.token;

                        // Save new token
                        localStorage.setItem('token', newToken);
                        console.log('[API] Token refreshed successfully');

                        // Retry original request with new token
                        error.config.headers.Authorization = `Bearer ${newToken}`;
                        return api.request(error.config);
                    } catch (refreshError) {
                        console.error('[API] Token refresh failed:', refreshError);
                    }
                }
            }

            // If refresh fails or no refresh token, logout
            console.error('[API] Auth error:', data);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return Promise.reject({
                type: 'AUTH_ERROR',
                message: 'Authentication failed. Please login again.',
                status
            } as ApiError);
        }

        if (status === 403) {
            console.error('[API] Forbidden:', data);
            return Promise.reject({
                type: 'FORBIDDEN',
                message: data.message || 'Access forbidden',
                status
            } as ApiError);
        }

        if (status === 404) {
            console.error('[API] Not found:', data);
            errorToast('Not Found', data.message || 'Resource not found');
            return Promise.reject({
                type: 'NOT_FOUND',
                message: data.message || 'Resource not found',
                status
            } as ApiError);
        }

        if (status === 409) {
            console.error('[API] Conflict:', data);
            errorToast('Conflict', data.message || 'Operation conflict');
            return Promise.reject({
                type: 'CONFLICT',
                message: data.message || 'Operation conflict',
                status
            } as ApiError);
        }

        if (status >= 500) {
            console.error('[API] Server error:', data);
            serverErrorToast();
            return Promise.reject({
                type: 'SERVER_ERROR',
                message: data.message || 'Server error. Please try again later.',
                status
            } as ApiError);
        }

        console.error('[API] Error:', data);
        errorToast('Error', data.message || 'An error occurred');
        return Promise.reject({
            type: 'UNKNOWN_ERROR',
            message: data.message || 'An unexpected error occurred',
            status
        } as ApiError);
    }
);

// ========================== SAFE REQUEST WRAPPER ==========================

const safeRequest = async <T = any>(
    requestFn: () => Promise<AxiosResponse<T>>,
    options: SafeRequestOptions = {}
): Promise<ApiResult<T>> => {
    const { showError = true, retryCount = 0, retryDelay = 1000 } = options;

    try {
        const response = await requestFn();
        return response.data as any;
    } catch (error: any) {
        if (error.type === 'NETWORK_ERROR' && retryCount > 0) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return safeRequest(requestFn, {
                ...options,
                retryCount: retryCount - 1,
                showError: false
            });
        }

        if (showError) {
            console.error('[API Error Handler]', error);
        }

        return {
            success: false,
            error: error.message || 'An error occurred',
            details: error.details,
            type: error.type,
            status: error.status
        };
    }
};

// ========================== CONFIG APIs ==========================

export const setupConfig = (payload: any): Promise<ApiResult> =>
    safeRequest(() => api.post('/config/setup', payload));

export const getTrains = (): Promise<ApiResult> =>
    safeRequest(() => api.get('/trains'));

// ========================== TRAIN APIs ==========================

export const initializeTrain = (trainNo?: string, journeyDate?: string, trainName?: string): Promise<ApiResult> =>
    safeRequest(() => api.post('/train/initialize', { trainNo, journeyDate, trainName }));

export const startJourney = (): Promise<ApiResult> =>
    safeRequest(() => api.post('/train/start-journey'));

export const getTrainState = (): Promise<ApiResult> =>
    safeRequest(() => api.get('/train/state'));

export const moveToNextStation = (): Promise<ApiResult> =>
    safeRequest(() => api.post('/train/next-station'));

export const resetTrain = (): Promise<ApiResult> =>
    safeRequest(() => api.post('/train/reset'));

export const getTrainStats = (): Promise<ApiResult> =>
    safeRequest(() => api.get('/train/stats'));

// ========================== PASSENGER APIs ==========================

export const markPassengerNoShow = (pnr: string): Promise<ApiResult> =>
    safeRequest(() => api.post('/passenger/no-show', { pnr }));

export const getRACQueue = (): Promise<ApiResult> =>
    safeRequest(() => api.get('/train/rac-queue'));

export const getVacantBerths = (): Promise<ApiResult> =>
    safeRequest(() => api.get('/train/vacant-berths'));

export const searchPassenger = (pnr: string): Promise<ApiResult> =>
    safeRequest(() => api.get(`/passenger/search/${pnr}`));

export const getAllPassengers = (): Promise<ApiResult> =>
    safeRequest(() => api.get('/passengers/all'));

export const getPassengersByStatus = (status: string): Promise<ApiResult> =>
    safeRequest(() => api.get(`/passengers/status/${status}`));

export const getPassengerCounts = (): Promise<ApiResult> =>
    safeRequest(() => api.get('/passengers/counts'));

export const addPassenger = (passengerData: any): Promise<ApiResult> =>
    safeRequest(() => api.post('/passengers/add', passengerData));

export const setPassengerStatus = (pnr: string, status: string): Promise<ApiResult> =>
    safeRequest(() => api.post('/passenger/set-status', { pnr, status }));

// ========================== REALLOCATION APIs ==========================

export const getEligibilityMatrix = (): Promise<ApiResult> =>
    safeRequest(() => api.get('/reallocation/eligibility'));

export const applyReallocation = (allocations: any[]): Promise<ApiResult> =>
    safeRequest(() => api.post('/reallocation/apply', { allocations }));

// ========================== VISUALIZATION APIs ==========================

export const getSegmentMatrix = (): Promise<ApiResult> =>
    safeRequest(() => api.get('/visualization/segment-matrix'));

export const getGraphData = (): Promise<ApiResult> =>
    safeRequest(() => api.get('/visualization/graph'));

export const getHeatmap = (): Promise<ApiResult> =>
    safeRequest(() => api.get('/visualization/heatmap'));

export const getBerthTimeline = (coach: string, berth: string | number): Promise<ApiResult> =>
    safeRequest(() => api.get(`/visualization/berth-timeline/${coach}/${berth}`));

export const getVacancyMatrix = (): Promise<ApiResult> =>
    safeRequest(() => api.get('/visualization/vacancy-matrix'));

export const getRACtoCNF = (): Promise<ApiResult> =>
    safeRequest(() => api.get('/visualization/rac-to-cnf'));

export const getStationSchedule = (): Promise<ApiResult> =>
    safeRequest(() => api.get('/visualization/station-schedule'));

// ========================== EXPORT ==========================

export default api;
