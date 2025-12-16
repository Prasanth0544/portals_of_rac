// tte-portal/src/api.ts
import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface PassengerFilters {
    status?: string;
    coach?: string;
    from?: string;
    to?: string;
    [key: string]: string | undefined;
}

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    // Login response fields
    token?: string;
    refreshToken?: string;
    expiresIn?: number;
    user?: {
        employeeId?: string;
        name?: string;
        email?: string;
        role?: string;
        trainAssigned?: number;
        permissions?: string[];
    };
}

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
        console.warn('[TTE API] Failed to fetch CSRF token:', error);
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
                        console.log('[TTE API] Token expired, attempting refresh...');
                        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
                        const newToken = refreshResponse.data.token;

                        // Save new token
                        localStorage.setItem('token', newToken);
                        console.log('[TTE API] Token refreshed successfully');

                        // Retry original request with new token
                        error.config.headers.Authorization = `Bearer ${newToken}`;
                        return api.request(error.config);
                    } catch (refreshError) {
                        console.error('[TTE API] Token refresh failed:', refreshError);
                    }
                }
            }

            // If refresh fails or no refresh token, logout
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('tteId');
            alert('⚠️ Session expired. Please login again.');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// TTE Portal API
export const tteAPI = {
    // Get filtered passengers
    getPassengers: async (filters: PassengerFilters = {}): Promise<ApiResponse> => {
        const params = new URLSearchParams(filters as Record<string, string>).toString();
        const response = await api.get(`/tte/passengers?${params}`);
        return response.data;
    },

    // Get currently boarded passengers
    getBoardedPassengers: async (): Promise<ApiResponse> => {
        const response = await api.get('/tte/boarded-passengers');
        return response.data;
    },

    // Get currently boarded RAC passengers (for offline upgrades)
    getBoardedRACPassengers: async (): Promise<ApiResponse> => {
        const response = await api.get('/tte/boarded-rac-passengers');
        return response.data;
    },

    // Manual mark boarded
    markBoarded: async (pnr: string): Promise<ApiResponse> => {
        const response = await api.post('/tte/mark-boarded', { pnr });
        return response.data;
    },

    // Manual mark deboarded
    markDeboarded: async (pnr: string): Promise<ApiResponse> => {
        const response = await api.post('/tte/mark-deboarded', { pnr });
        return response.data;
    },

    // Mark passenger as no-show
    markNoShow: async (pnr: string): Promise<ApiResponse> => {
        const response = await api.post('/tte/mark-no-show', { pnr });
        return response.data;
    },

    // Revert no-show status
    revertNoShow: async (pnr: string): Promise<ApiResponse> => {
        const response = await api.post('/tte/revert-no-show', { pnr });
        return response.data;
    },

    // Confirm upgrade for offline passenger
    confirmUpgrade: async (pnr: string, notificationId: string): Promise<ApiResponse> => {
        const response = await api.post('/tte/confirm-upgrade', {
            pnr,
            notificationId
        });
        return response.data;
    },

    // Get journey statistics
    getStatistics: async (): Promise<ApiResponse> => {
        const response = await api.get('/tte/statistics');
        return response.data;
    },

    // Get upgraded passengers (RAC → CNF) from MongoDB
    getUpgradedPassengers: async (): Promise<ApiResponse> => {
        const response = await api.get('/tte/upgraded-passengers');
        return response.data;
    },

    // Train operations
    moveNextStation: async (): Promise<ApiResponse> => {
        const response = await api.post('/train/next-station');
        return response.data;
    },

    getTrainState: async (): Promise<ApiResponse> => {
        const response = await api.get('/train/state');
        return response.data;
    },

    // Offline upgrades management
    getOfflineUpgrades: async (): Promise<ApiResponse> => {
        const response = await api.get('/tte/offline-upgrades');
        return response.data;
    },

    confirmOfflineUpgrade: async (upgradeId: string): Promise<ApiResponse> => {
        const response = await api.post('/tte/offline-upgrades/confirm', { upgradeId });
        return response.data;
    },

    rejectOfflineUpgrade: async (upgradeId: string): Promise<ApiResponse> => {
        const response = await api.post('/tte/offline-upgrades/reject', { upgradeId });
        return response.data;
    },

    // ========== Authentication ==========
    // Staff login (TTE/Admin)
    login: async (employeeId: string, password: string): Promise<ApiResponse> => {
        const response = await api.post('/auth/staff/login', { employeeId, password });
        return response.data;
    },

    // ========== Boarding Verification ==========
    // Get boarding verification queue
    getBoardingQueue: async (): Promise<ApiResponse> => {
        const response = await api.get('/tte/boarding-queue');
        return response.data;
    },

    // Confirm all passengers boarded (bulk)
    confirmAllBoarded: async (): Promise<ApiResponse> => {
        const response = await api.post('/tte/confirm-all-boarded');
        return response.data;
    },

    // ========== Visualization ==========
    // Get station schedule
    getStationSchedule: async (): Promise<ApiResponse> => {
        const response = await api.get('/visualization/station-schedule');
        return response.data;
    },

    // ========== Reallocation Management ==========
    // Get pending reallocations for TTE approval
    getPendingReallocations: async (): Promise<ApiResponse> => {
        const response = await api.get('/reallocation/pending');
        return response.data;
    },

    // Approve batch of reallocations
    approveBatchReallocations: async (reallocationIds: string[], tteId: string): Promise<ApiResponse> => {
        const response = await api.post('/reallocation/approve-batch', { reallocationIds, tteId });
        return response.data;
    },

    // Reject a specific reallocation
    rejectReallocation: async (id: string, reason: string, tteId: string): Promise<ApiResponse> => {
        const response = await api.post(`/reallocation/reject/${id}`, { reason, tteId });
        return response.data;
    },

    // ========== Vacant Berths ==========
    // Get vacant berths at current station
    getVacantBerths: async (): Promise<ApiResponse> => {
        const response = await api.get('/train/vacant-berths');
        return response.data;
    }
};

export default api;
