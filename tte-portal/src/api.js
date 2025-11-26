// tte-portal/src/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// TTE Portal API
export const tteAPI = {
    // Get filtered passengers
    getPassengers: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/tte/passengers?${params}`);
        return response.data;
    },

    // Get currently boarded passengers
    getBoardedPassengers: async () => {
        const response = await api.get('/tte/boarded-passengers');
        return response.data;
    },

    // Get currently boarded RAC passengers (for offline upgrades)
    getBoardedRACPassengers: async () => {
        const response = await api.get('/tte/boarded-rac-passengers');
        return response.data;
    },

    // Manual mark boarded
    markBoarded: async (pnr) => {
        const response = await api.post('/tte/mark-boarded', { pnr });
        return response.data;
    },

    // Manual mark deboarded
    markDeboarded: async (pnr) => {
        const response = await api.post('/tte/mark-deboarded', { pnr });
        return response.data;
    },

    // Mark passenger as no-show
    markNoShow: async (pnr) => {
        const response = await api.post('/tte/mark-no-show', { pnr });
        return response.data;
    },

    // Confirm upgrade for offline passenger
    confirmUpgrade: async (pnr, notificationId) => {
        const response = await api.post('/tte/confirm-upgrade', {
            pnr,
            notificationId
        });
        return response.data;
    },

    // Get journey statistics
    getStatistics: async () => {
        const response = await api.get('/tte/statistics');
        return response.data;
    },

    // Train operations
    moveNextStation: async () => {
        const response = await api.post('/train/next-station');
        return response.data;
    },

    getTrainState: async () => {
        const response = await api.get('/train/state');
        return response.data;
    },

    // Offline upgrades management
    getOfflineUpgrades: async () => {
        const token = localStorage.getItem('token');
        const response = await api.get('/tte/offline-upgrades', {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response;
    },

    confirmOfflineUpgrade: async (upgradeId) => {
        const token = localStorage.getItem('token');
        const response = await api.post('/tte/offline-upgrades/confirm',
            { upgradeId },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response;
    },

    rejectOfflineUpgrade: async (upgradeId) => {
        const token = localStorage.getItem('token');
        const response = await api.post('/tte/offline-upgrades/reject',
            { upgradeId },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response;
    }
};

export default api;
