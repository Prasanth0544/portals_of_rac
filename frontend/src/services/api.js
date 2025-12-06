// frontend/src/services/api.js

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ========================== INTERCEPTORS ==========================

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (import.meta.env.DEV) {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
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

const handleRequest = async (fn) => {
  try {
    const response = await fn();
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// ========================== CONFIG APIs ==========================

export const setupConfig = (payload) =>
  handleRequest(() => api.post('/config/setup', payload));

// Train list
export const getTrains = () =>
  handleRequest(() => api.get('/trains'));

// ========================== VISUALIZATION APIs ==========================

export const getStationSchedule = async () => {
  const response = await api.get('/visualization/station-schedule');
  return response.data;
};

// ========================== TRAIN APIs ==========================

export const initializeTrain = (trainNo, journeyDate, trainName) =>
  handleRequest(() => api.post('/train/initialize', { trainNo, journeyDate, trainName }));

export const startJourney = () =>
  handleRequest(() => api.post('/train/start-journey'));

export const getTrainState = () =>
  handleRequest(() => api.get('/train/state'));

export const moveToNextStation = () =>
  handleRequest(() => api.post('/train/next-station'));

export const resetTrain = () =>
  handleRequest(() => api.post('/train/reset'));

export const getTrainStats = () =>
  handleRequest(() => api.get('/train/stats'));

// ========================== REALLOCATION APIs ==========================

export const markPassengerNoShow = (pnr) =>
  handleRequest(() => api.post('/passenger/no-show', { pnr }));

export const getRACQueue = () =>
  handleRequest(() => api.get('/train/rac-queue'));

export const getVacantBerths = () =>
  handleRequest(() => api.get('/train/vacant-berths')); // existing one

export const searchPassenger = (pnr) =>
  handleRequest(() => api.get(`/passenger/search/${pnr}`));

export const getEligibilityMatrix = () =>
  handleRequest(() => api.get('/reallocation/eligibility'));

export const applyReallocation = (allocations) =>
  handleRequest(() => api.post('/reallocation/apply', { allocations }));

// ========================== PASSENGER APIs ==========================

export const getAllPassengers = () =>
  handleRequest(() => api.get('/passengers/all'));

export const getPassengersByStatus = (status) =>
  handleRequest(() => api.get(`/passengers/status/${status}`));

export const getPassengerCounts = () =>
  handleRequest(() => api.get('/passengers/counts'));

// ========================== VISUALIZATION APIs ==========================

export const getSegmentMatrix = () =>
  handleRequest(() => api.get('/visualization/segment-matrix'));

export const getGraphData = () =>
  handleRequest(() => api.get('/visualization/graph'));

export const getHeatmap = () =>
  handleRequest(() => api.get('/visualization/heatmap'));

export const getBerthTimeline = (coach, berth) =>
  handleRequest(() => api.get(`/visualization/berth-timeline/${coach}/${berth}`));

export const getVacancyMatrix = () =>
  handleRequest(() => api.get('/visualization/vacancy-matrix'));

// 🔹 New API: Get RAC passengers upgraded to CNF
export const getRACtoCNF = () =>
  handleRequest(() => api.get('/visualization/rac-to-cnf'));

// ========================== ADD / UPDATE APIs ==========================

export const addPassenger = async (passengerData) => {
  const response = await api.post('/passengers/add', passengerData);
  return response.data;
};

export const setPassengerStatus = (pnr, status) =>
  handleRequest(() => api.post('/passenger/set-status', { pnr, status }));

// ========================== EXPORT DEFAULT ==========================

export default api;
