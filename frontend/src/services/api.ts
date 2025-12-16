// frontend/src/services/api.ts

import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Types for API responses
interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

interface TrainState {
    trainNo: string;
    trainName?: string;
    journeyDate?: string;
    currentStationIdx: number;
    journeyStarted: boolean;
    coaches: any[];
    stations: any[];
    racQueue: any[];
    stats?: any;
}

interface Passenger {
    pnr: string;
    name: string;
    pnrStatus: string;
    class: string;
    coach: string;
    seat?: number;
    from: string;
    to: string;
    boarded: boolean;
    noShow: boolean;
}

interface AllocationRequest {
    pnr: string;
    coach: string;
    berth: number | string;
}

interface PassengerCounts {
    total: number;
    cnf: number;
    rac: number;
    wl: number;
    boarded: number;
    noShow: number;
}

const api: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    withCredentials: true, // Required for cookies (CSRF)
    headers: {
        'Content-Type': 'application/json',
    },
});

// CSRF Token helper - read from cookies
const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
};

// ========================== INTERCEPTORS ==========================

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add CSRF token for state-changing requests
        if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
            const csrfToken = getCookie('csrfToken');
            if (csrfToken) {
                config.headers['X-CSRF-Token'] = csrfToken;
            }
        }

        if (import.meta.env.DEV) {
            console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response: AxiosResponse) => {
        if (import.meta.env.DEV) {
            console.log(`API Response: ${response.config.url}`, response.data);
        }
        return response;
    },
    (error) => {
        return Promise.reject(error.response?.data || error);
    }
);

// ========================== HELPER FUNCTION ==========================

const handleRequest = async <T>(fn: () => Promise<AxiosResponse<T>>): Promise<T> => {
    try {
        const response = await fn();
        return response.data;
    } catch (error: any) {
        throw error.response?.data || error;
    }
};

// ========================== CONFIG APIs ==========================

export const setupConfig = (payload: any): Promise<any> =>
    handleRequest(() => api.post('/config/setup', payload));

export const getTrains = (): Promise<any[]> =>
    handleRequest(() => api.get('/trains'));

// ========================== VISUALIZATION APIs ==========================

export const getStationSchedule = async (): Promise<any> => {
    const response = await api.get('/visualization/station-schedule');
    return response.data;
};

// ========================== TRAIN APIs ==========================

export const initializeTrain = (trainNo: string, journeyDate: string, trainName?: string): Promise<TrainState> =>
    handleRequest(() => api.post('/train/initialize', { trainNo, journeyDate, trainName }));

export const startJourney = (): Promise<any> =>
    handleRequest(() => api.post('/train/start-journey'));

export const getTrainState = (): Promise<TrainState> =>
    handleRequest(() => api.get('/train/state'));

export const moveToNextStation = (): Promise<any> =>
    handleRequest(() => api.post('/train/next-station'));

export const resetTrain = (): Promise<any> =>
    handleRequest(() => api.post('/train/reset'));

export const getTrainStats = (): Promise<any> =>
    handleRequest(() => api.get('/train/stats'));

// ========================== REALLOCATION APIs ==========================

export const markPassengerNoShow = (pnr: string): Promise<any> =>
    handleRequest(() => api.post('/passenger/no-show', { pnr }));

export const getRACQueue = (): Promise<Passenger[]> =>
    handleRequest(() => api.get('/train/rac-queue'));

export const getVacantBerths = (): Promise<any[]> =>
    handleRequest(() => api.get('/train/vacant-berths'));

export const searchPassenger = (pnr: string): Promise<Passenger> =>
    handleRequest(() => api.get(`/passenger/search/${pnr}`));

export const getEligibilityMatrix = (): Promise<any> =>
    handleRequest(() => api.get('/reallocation/eligibility'));

export const applyReallocation = (allocations: AllocationRequest[]): Promise<any> =>
    handleRequest(() => api.post('/reallocation/apply', { allocations }));

// ========================== PASSENGER APIs ==========================

export const getAllPassengers = (): Promise<Passenger[]> =>
    handleRequest(() => api.get('/passengers/all'));

export const getPassengersByStatus = (status: string): Promise<Passenger[]> =>
    handleRequest(() => api.get(`/passengers/status/${status}`));

export const getPassengerCounts = (): Promise<PassengerCounts> =>
    handleRequest(() => api.get('/passengers/counts'));

// ========================== VISUALIZATION APIs ==========================

export const getSegmentMatrix = (): Promise<any> =>
    handleRequest(() => api.get('/visualization/segment-matrix'));

export const getGraphData = (): Promise<any> =>
    handleRequest(() => api.get('/visualization/graph'));

export const getHeatmap = (): Promise<any> =>
    handleRequest(() => api.get('/visualization/heatmap'));

export const getBerthTimeline = (coach: string, berth: string | number): Promise<any> =>
    handleRequest(() => api.get(`/visualization/berth-timeline/${coach}/${berth}`));

export const getVacancyMatrix = (): Promise<any> =>
    handleRequest(() => api.get('/visualization/vacancy-matrix'));

export const getRACtoCNF = (): Promise<any> =>
    handleRequest(() => api.get('/visualization/rac-to-cnf'));

// ========================== ADD / UPDATE APIs ==========================

export const addPassenger = async (passengerData: any): Promise<any> => {
    const response = await api.post('/passengers/add', passengerData);
    return response.data;
};

export const setPassengerStatus = (pnr: string, status: string): Promise<any> =>
    handleRequest(() => api.post('/passenger/set-status', { pnr, status }));

// ========================== EXPORT DEFAULT ==========================

export default api;
