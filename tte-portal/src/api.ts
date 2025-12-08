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
}

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

    // ========== Action History & Undo ==========
    // Get action history (last 10 actions)
    getActionHistory: async (): Promise<ApiResponse> => {
        const response = await api.get('/tte/action-history');
        return response.data;
    },

    // Undo a specific action
    undoAction: async (actionId: string): Promise<ApiResponse> => {
        const response = await api.post('/tte/undo', { actionId });
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
