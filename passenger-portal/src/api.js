import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Passenger Portal API
export const passengerAPI = {
    // Public PNR lookup
    getPNRDetails: async (pnr) => {
        const response = await api.get(`/passenger/pnr/${pnr}`);
        return response.data;
    },

    // Self-cancellation
    cancelBooking: async (pnr) => {
        const response = await api.post('/passenger/cancel', { pnr });
        return response.data;
    },

    // Upgrade notifications
    getUpgradeNotifications: async (pnr) => {
        const response = await api.get(`/passenger/upgrade-notifications/${pnr}`);
        return response.data;
    },

    acceptUpgrade: async (pnr, notificationId) => {
        const response = await api.post('/passenger/accept-upgrade', {
            pnr,
            notificationId
        });
        return response.data;
    },

    denyUpgrade: async (pnr, notificationId, reason) => {
        const response = await api.post('/passenger/deny-upgrade', {
            pnr,
            notificationId,
            reason
        });
        return response.data;
    }
};

export default api;
