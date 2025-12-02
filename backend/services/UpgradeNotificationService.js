// backend/services/UpgradeNotificationService.js

const db = require("../config/db");

class UpgradeNotificationService {
    constructor() {
        // In-memory tracking of upgrade notifications and denials
        this.pendingNotifications = new Map(); // pnr -> array of notifications
        this.denialLog = []; // Array of denial records
    }

    /**
     * Create upgrade notification for RAC passenger
     */
    createUpgradeNotification(racPassenger, vacantBerth, currentStation) {
        const notification = {
            id: `UPGRADE_${Date.now()}_${racPassenger.pnr}`,
            pnr: racPassenger.pnr,
            name: racPassenger.name,
            currentBerth: `${racPassenger.coach}-${racPassenger.seatNo}`,
            offeredBerth: vacantBerth.fullBerthNo,
            offeredCoach: vacantBerth.coachNo,
            offeredSeatNo: vacantBerth.berthNo,
            offeredBerthType: vacantBerth.type,
            station: currentStation.name,
            stationCode: currentStation.code,
            timestamp: new Date().toISOString(),
            status: 'PENDING', // PENDING, ACCEPTED, DENIED
            vacantSegment: vacantBerth.vacantSegment
        };

        if (!this.pendingNotifications.has(racPassenger.pnr)) {
            this.pendingNotifications.set(racPassenger.pnr, []);
        }

        this.pendingNotifications.get(racPassenger.pnr).push(notification);

        console.log(`📩 Upgrade notification created for ${racPassenger.name} (${racPassenger.pnr})`);
        console.log(`   Offered: ${vacantBerth.fullBerthNo} (${vacantBerth.type})`);

        return notification;
    }

    /**
     * Accept upgrade offer
     */
    acceptUpgrade(pnr, notificationId) {
        const notifications = this.pendingNotifications.get(pnr);

        if (!notifications) {
            throw new Error(`No notifications found for PNR ${pnr}`);
        }

        const notification = notifications.find(n => n.id === notificationId);

        if (!notification) {
            throw new Error(`Notification ${notificationId} not found`);
        }

        if (notification.status !== 'PENDING') {
            throw new Error(`Notification already ${notification.status}`);
        }

        notification.status = 'ACCEPTED';
        notification.acceptedAt = new Date().toISOString();

        console.log(`✅ Upgrade accepted by ${notification.name} (${pnr})`);

        return notification;
    }

    /**
     * Deny upgrade offer
     */
    denyUpgrade(pnr, notificationId, reason = 'Passenger declined') {
        const notifications = this.pendingNotifications.get(pnr);

        if (!notifications) {
            throw new Error(`No notifications found for PNR ${pnr}`);
        }

        const notification = notifications.find(n => n.id === notificationId);

        if (!notification) {
            throw new Error(`Notification ${notificationId} not found`);
        }

        if (notification.status !== 'PENDING') {
            throw new Error(`Notification already ${notification.status}`);
        }

        notification.status = 'DENIED';
        notification.deniedAt = new Date().toISOString();
        notification.denialReason = reason;

        // Log denial
        this.denialLog.push({
            pnr: pnr,
            name: notification.name,
            offeredBerth: notification.offeredBerth,
            station: notification.station,
            timestamp: notification.deniedAt,
            reason: reason
        });

        console.log(`❌ Upgrade denied by ${notification.name} (${pnr}): ${reason}`);

        return notification;
    }

    /**
     * Get pending notifications for passenger
     */
    getPendingNotifications(pnr) {
        const notifications = this.pendingNotifications.get(pnr) || [];
        return notifications.filter(n => n.status === 'PENDING');
    }

    /**
     * Get all notifications for passenger
     */
    getAllNotifications(pnr) {
        return this.pendingNotifications.get(pnr) || [];
    }

    /**
     * Clear notifications for passenger
     */
    clearNotifications(pnr) {
        this.pendingNotifications.delete(pnr);
    }

    /**
     * Get denial log
     */
    getDenialLog() {
        return this.denialLog;
    }

    /**
     * Check if passenger has denied this specific berth recently
     */
    hasDeniedBerth(pnr, berthNo) {
        const notifications = this.pendingNotifications.get(pnr) || [];
        return notifications.some(n =>
            n.offeredBerth === berthNo && n.status === 'DENIED'
        );
    }

    /**
     * Get all sent notifications (for TTE portal tracking)
     * Returns all upgrade offers sent to passengers with their status
     */
    getAllSentNotifications() {
        const allNotifications = [];

        for (const [pnr, notifications] of this.pendingNotifications.entries()) {
            notifications.forEach(notification => {
                allNotifications.push({
                    pnr: notification.pnr,
                    passengerName: notification.name,
                    offeredBerth: notification.offeredBerth,
                    coach: notification.offeredCoach,
                    berthNo: notification.offeredSeatNo,
                    berthType: notification.offeredBerthType,
                    sentAt: notification.timestamp,
                    expiresAt: null, // Can add expiry logic if needed
                    status: notification.status.toLowerCase(),
                    respondedAt: notification.acceptedAt || notification.deniedAt || null,
                    offerId: notification.id
                });
            });
        }

        // Sort by most recent first
        allNotifications.sort((a, b) =>
            new Date(b.sentAt) - new Date(a.sentAt)
        );

        return allNotifications;
    }
}


module.exports = new UpgradeNotificationService();
