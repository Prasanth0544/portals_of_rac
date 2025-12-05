// backend/services/PassengerService.js

const UpgradeNotificationService = require('./UpgradeNotificationService');
const db = require('../config/db');

/**
 * Service for passenger-related business logic
 * Separates business logic from HTTP controllers
 */
class PassengerService {
    /**
     * Accept upgrade offer
     * @param {string} pnr - Passenger PNR
     * @param {string} notificationId - Notification ID
     * @param {TrainState} trainState - Current train state
     * @returns {Promise<Object>} Acceptance result
     * @throws {Error} If notification not found or invalid status
     */
    async acceptUpgrade(pnr, notificationId, trainState) {
        // Get notification
        const allNotifications = UpgradeNotificationService.getAllNotifications(pnr);
        const notification = allNotifications.find(n => n.id === notificationId);

        if (!notification) {
            throw new Error('Notification not found');
        }

        // Validate status
        if (notification.status !== 'PENDING') {
            throw new Error(`Notification already ${notification.status.toLowerCase()}`);
        }

        // Check if notification has expired
        if (notification.expiresAt && new Date(notification.expiresAt) < new Date()) {
            throw new Error('Notification has expired');
        }

        // Accept the notification
        const acceptedNotification = UpgradeNotificationService.acceptUpgrade(pnr, notificationId);

        // Find passenger in train state
        const passenger = trainState.findPassengerByPNR(pnr);

        return {
            success: true,
            notification: acceptedNotification,
            passenger: passenger ? {
                pnr: passenger.pnr,
                name: passenger.name,
                currentBerth: acceptedNotification.currentBerth,
                offeredBerth: acceptedNotification.offeredBerth
            } : null,
            message: 'Upgrade accepted. Pending TTE confirmation.'
        };
    }

    /**
     * Deny upgrade offer
     * @param {string} pnr - Passenger PNR
     * @param {string} notificationId - Notification ID
     * @returns {Promise<Object>} Denial result
     * @throws {Error} If notification not found or invalid status
     */
    async denyUpgrade(pnr, notificationId) {
        // Get notification
        const allNotifications = UpgradeNotificationService.getAllNotifications(pnr);
        const notification = allNotifications.find(n => n.id === notificationId);

        if (!notification) {
            throw new Error('Notification not found');
        }

        // Validate status
        if (notification.status !== 'PENDING') {
            throw new Error(`Notification already ${notification.status.toLowerCase()}`);
        }

        // Deny the notification
        const deniedNotification = UpgradeNotificationService.denyUpgrade(pnr, notificationId);

        return {
            success: true,
            notification: deniedNotification,
            message: 'Upgrade offer declined successfully'
        };
    }

    /**
     * Get upgrade notifications for passenger
     * @param {string} pnr - Passenger PNR
     * @returns {Array} Array of notifications
     */
    getUpgradeNotifications(pnr) {
        return UpgradeNotificationService.getAllNotifications(pnr);
    }

    /**
     * Get passenger details from database
     * @param {string} pnr - Passenger PNR
     * @param {TrainState} trainState - Current train state
     * @returns {Promise<Object>} Passenger details
     * @throws {Error} If passenger not found
     */
    async getPassengerDetails(pnr, trainState) {
        const passengersCollection = db.getPassengersCollection();
        const passenger = await passengersCollection.findOne({ PNR_Number: pnr });

        if (!passenger) {
            throw new Error('PNR not found');
        }

        // Extract station code from "Station Name (CODE)" format
        const extractStationCode = (stationString) => {
            if (!stationString) return '';
            const match = stationString.match(/\(([^)]+)\)$/);
            return match ? match[1] : stationString;
        };

        const fromCode = passenger.From || extractStationCode(passenger.Boarding_Station);
        const stationData = trainState
            ? trainState.stations.find(s => s.code === fromCode)
            : null;

        return {
            pnr: passenger.PNR_Number,
            irctcId: passenger.IRCTC_ID || null,  // ✅ ADDED
            name: passenger.Name,
            age: passenger.Age,
            gender: passenger.Gender,
            mobile: passenger.Mobile,
            email: passenger.Email,
            trainNo: passenger.Train_Number,
            trainName: passenger.Train_Name || (trainState ? trainState.trainName : 'Unknown'),
            berth: `${passenger.Assigned_Coach}-${passenger.Assigned_berth}`,
            berthType: passenger.Berth_Type,
            pnrStatus: passenger.PNR_Status,
            racStatus: passenger.Rac_status || '-',
            class: passenger.Class,
            quota: passenger.Quota || 'GN',
            boardingStation: fromCode,
            boardingStationFull: passenger.Boarding_Station,
            boardingTime: stationData ? stationData.arrival : 'N/A',
            destinationStation: passenger.To || extractStationCode(passenger.Deboarding_Station),
            destinationStationFull: passenger.Deboarding_Station,
            boarded: passenger.Boarded || false,
            passengerStatus: passenger.Passenger_Status || 'Offline',
            noShow: passenger.NO_show || false,
            coach: passenger.Assigned_Coach,
            seatNo: passenger.Assigned_berth
        };
    }

    /**
     * Get passengers by status
     * @param {string} status - Status filter
     * @param {TrainState} trainState - Current train state
     * @returns {Array} Filtered passengers
     */
    getPassengersByStatus(status, trainState) {
        if (!trainState) {
            throw new Error('Train not initialized');
        }

        const allPassengers = trainState.getAllPassengers();

        switch (status?.toLowerCase()) {
            case 'boarded':
                return allPassengers.filter(p => p.boarded);
            case 'rac':
                return allPassengers.filter(p => p.pnrStatus === 'RAC');
            case 'cnf':
                return allPassengers.filter(p => p.pnrStatus === 'CNF');
            case 'no-show':
                return allPassengers.filter(p => p.noShow);
            default:
                return allPassengers;
        }
    }
}

module.exports = new PassengerService();
