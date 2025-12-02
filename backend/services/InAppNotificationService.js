// backend/services/InAppNotificationService.js
/**
 * In-App Notification Service
 * Manages real-time notifications for passenger portal
 */

class InAppNotificationService {
    constructor() {
        // Store notifications by IRCTC ID
        this.notifications = new Map(); // irctcId -> [notifications]
        console.log('📱 InAppNotificationService initialized');
    }

    /**
     * Create a new notification
     */
    createNotification(irctcId, type, data) {
        if (!irctcId) {
            console.error('❌ Cannot create notification: IRCTC ID is required');
            return null;
        }

        const notification = {
            id: `NOTIF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            irctcId,
            type, // 'NO_SHOW_MARKED', 'UPGRADE_OFFER', 'NO_SHOW_REVERTED'
            data,
            read: false,
            createdAt: new Date().toISOString()
        };

        // Initialize array if doesn't exist
        if (!this.notifications.has(irctcId)) {
            this.notifications.set(irctcId, []);
        }

        // Add notification at the beginning (most recent first)
        this.notifications.get(irctcId).unshift(notification);

        console.log(`📬 Created ${type} notification for ${irctcId}`);
        return notification;
    }

    /**
     * Get all notifications for a user
     */
    getNotifications(irctcId, limit = null) {
        const userNotifications = this.notifications.get(irctcId) || [];

        if (limit) {
            return userNotifications.slice(0, limit);
        }

        return userNotifications;
    }

    /**
     * Get unread notifications
     */
    getUnreadNotifications(irctcId) {
        const userNotifications = this.notifications.get(irctcId) || [];
        return userNotifications.filter(n => !n.read);
    }

    /**
     * Get unread count
     */
    getUnreadCount(irctcId) {
        return this.getUnreadNotifications(irctcId).length;
    }

    /**
     * Mark notification as read
     */
    markAsRead(irctcId, notificationId) {
        const userNotifications = this.notifications.get(irctcId);

        if (!userNotifications) {
            throw new Error('No notifications found for this user');
        }

        const notification = userNotifications.find(n => n.id === notificationId);

        if (!notification) {
            throw new Error('Notification not found');
        }

        notification.read = true;
        console.log(`✅ Marked notification ${notificationId} as read`);
        return notification;
    }

    /**
     * Mark all notifications as read
     */
    markAllAsRead(irctcId) {
        const userNotifications = this.notifications.get(irctcId);

        if (!userNotifications) {
            return 0;
        }

        let count = 0;
        userNotifications.forEach(notification => {
            if (!notification.read) {
                notification.read = true;
                count++;
            }
        });

        console.log(`✅ Marked ${count} notifications as read for ${irctcId}`);
        return count;
    }

    /**
     * Delete notification
     */
    deleteNotification(irctcId, notificationId) {
        const userNotifications = this.notifications.get(irctcId);

        if (!userNotifications) {
            throw new Error('No notifications found for this user');
        }

        const index = userNotifications.findIndex(n => n.id === notificationId);

        if (index === -1) {
            throw new Error('Notification not found');
        }

        userNotifications.splice(index, 1);
        console.log(`🗑️  Deleted notification ${notificationId}`);
        return true;
    }

    /**
     * Clear all notifications for a user
     */
    clearAllNotifications(irctcId) {
        this.notifications.delete(irctcId);
        console.log(`🗑️  Cleared all notifications for ${irctcId}`);
        return true;
    }

    /**
     * Get notification statistics
     */
    getStats(irctcId) {
        const userNotifications = this.notifications.get(irctcId) || [];

        return {
            total: userNotifications.length,
            unread: userNotifications.filter(n => !n.read).length,
            read: userNotifications.filter(n => n.read).length,
            byType: {
                NO_SHOW_MARKED: userNotifications.filter(n => n.type === 'NO_SHOW_MARKED').length,
                UPGRADE_OFFER: userNotifications.filter(n => n.type === 'UPGRADE_OFFER').length,
                NO_SHOW_REVERTED: userNotifications.filter(n => n.type === 'NO_SHOW_REVERTED').length
            }
        };
    }
}

module.exports = new InAppNotificationService();
