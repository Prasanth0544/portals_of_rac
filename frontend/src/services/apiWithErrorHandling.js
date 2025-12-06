// frontend/src/services/apiWithErrorHandling.js
// Enhanced API service with error handling, validation, and notifications

import axios from 'axios';
import { errorToast, networkErrorToast, serverErrorToast, validationErrorToast } from './toastNotification';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ========================== REQUEST INTERCEPTOR ==========================

api.interceptors.request.use(
  (config) => {
    // Add JWT token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (import.meta.env.DEV) {
      console.log(`[API] Request: ${config.method.toUpperCase()} ${config.url}`, config.data);
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
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`[API] Response: ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    // Handle different error scenarios
    if (!error.response) {
      // Network error
      console.error('[API] Network error:', error.message);
      networkErrorToast();
      return Promise.reject({
        type: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection.',
        error
      });
    }

    const { status, data } = error.response;

    if (status === 400) {
      // Validation error
      console.error('[API] Validation error:', data);
      validationErrorToast(data.message || 'Validation failed');
      return Promise.reject({
        type: 'VALIDATION_ERROR',
        message: data.message || 'Validation failed',
        details: data.details,
        status
      });
    }

    if (status === 401 || status === 403) {
      // Authentication/Authorization error
      console.error('[API] Auth error:', data);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject({
        type: 'AUTH_ERROR',
        message: 'Authentication failed. Please login again.',
        status
      });
    }

    if (status === 404) {
      // Not found error
      console.error('[API] Not found:', data);
      errorToast('Not Found', data.message || 'Resource not found');
      return Promise.reject({
        type: 'NOT_FOUND',
        message: data.message || 'Resource not found',
        status
      });
    }

    if (status === 409) {
      // Conflict error
      console.error('[API] Conflict:', data);
      errorToast('Conflict', data.message || 'Operation conflict');
      return Promise.reject({
        type: 'CONFLICT',
        message: data.message || 'Operation conflict',
        status
      });
    }

    if (status >= 500) {
      // Server error
      console.error('[API] Server error:', data);
      serverErrorToast();
      return Promise.reject({
        type: 'SERVER_ERROR',
        message: data.message || 'Server error. Please try again later.',
        status
      });
    }

    // Other errors
    console.error('[API] Error:', data);
    errorToast('Error', data.message || 'An error occurred');
    return Promise.reject({
      type: 'UNKNOWN_ERROR',
      message: data.message || 'An unexpected error occurred',
      status
    });
  }
);

// ========================== SAFE REQUEST WRAPPER ==========================

const safeRequest = async (requestFn, options = {}) => {
  const {
    showError = true,
    retryCount = 0,
    retryDelay = 1000
  } = options;

  try {
    const response = await requestFn();
    // response.data is the JSON payload from backend (e.g., {success: true, data: {...}})
    // We return the full response.data so caller gets the structure they expect
    return response.data;
  } catch (error) {
    // Retry logic for network errors
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

export const setupConfig = (payload) =>
  safeRequest(() => api.post('/config/setup', payload));

export const getTrains = () =>
  safeRequest(() => api.get('/trains'));

// ========================== TRAIN APIs ==========================

export const initializeTrain = (trainNo, journeyDate, trainName) =>
  safeRequest(() => api.post('/train/initialize', { trainNo, journeyDate, trainName }));

export const startJourney = () =>
  safeRequest(() => api.post('/train/start-journey'));

export const getTrainState = () =>
  safeRequest(() => api.get('/train/state'));

export const moveToNextStation = () =>
  safeRequest(() => api.post('/train/next-station'));

export const resetTrain = () =>
  safeRequest(() => api.post('/train/reset'));

export const getTrainStats = () =>
  safeRequest(() => api.get('/train/stats'));

// ========================== PASSENGER APIs ==========================

export const markPassengerNoShow = (pnr) =>
  safeRequest(() => api.post('/passenger/no-show', { pnr }));

export const getRACQueue = () =>
  safeRequest(() => api.get('/train/rac-queue'));

export const getVacantBerths = () =>
  safeRequest(() => api.get('/train/vacant-berths'));

export const searchPassenger = (pnr) =>
  safeRequest(() => api.get(`/passenger/search/${pnr}`));

export const getAllPassengers = () =>
  safeRequest(() => api.get('/passengers/all'));

export const getPassengersByStatus = (status) =>
  safeRequest(() => api.get(`/passengers/status/${status}`));

export const getPassengerCounts = () =>
  safeRequest(() => api.get('/passengers/counts'));

export const addPassenger = (passengerData) =>
  safeRequest(() => api.post('/passengers/add', passengerData));

export const setPassengerStatus = (pnr, status) =>
  safeRequest(() => api.post('/passenger/set-status', { pnr, status }));

// ========================== REALLOCATION APIs ==========================

export const getEligibilityMatrix = () =>
  safeRequest(() => api.get('/reallocation/eligibility'));

export const applyReallocation = (allocations) =>
  safeRequest(() => api.post('/reallocation/apply', { allocations }));

// ========================== VISUALIZATION APIs ==========================

export const getSegmentMatrix = () =>
  safeRequest(() => api.get('/visualization/segment-matrix'));

export const getGraphData = () =>
  safeRequest(() => api.get('/visualization/graph'));

export const getHeatmap = () =>
  safeRequest(() => api.get('/visualization/heatmap'));

export const getBerthTimeline = (coach, berth) =>
  safeRequest(() => api.get(`/visualization/berth-timeline/${coach}/${berth}`));

export const getVacancyMatrix = () =>
  safeRequest(() => api.get('/visualization/vacancy-matrix'));

export const getRACtoCNF = () =>
  safeRequest(() => api.get('/visualization/rac-to-cnf'));

export const getStationSchedule = () =>
  safeRequest(() => api.get('/visualization/station-schedule'));

// ========================== EXPORT ==========================

export default api;
