// backend/controllers/passenger/notificationController.js
// In-app notifications + push subscription endpoints for passengers

const db = require('../../config/db');

class PassengerNotificationController {
  /**
   * Get in-app notifications for passenger
   * GET /api/passenger/notifications
   */
  getInAppNotifications(req, res) {
    try {
      const irctcId = req.user?.irctcId || req.query.irctcId;

      if (!irctcId) {
        return res.status(400).json({
          success: false,
          message: 'IRCTC ID is required'
        });
      }

      const InAppNotificationService = require('../../services/InAppNotificationService');
      const notifications = InAppNotificationService.getNotifications(irctcId);
      const stats = InAppNotificationService.getStats(irctcId);

      res.json({
        success: true,
        data: {
          notifications,
          stats
        }
      });
    } catch (error) {
      console.error('❌ Error getting notifications:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get unread notification count
   * GET /api/passenger/notifications/unread-count
   */
  getUnreadCount(req, res) {
    try {
      const irctcId = req.user?.irctcId || req.query.irctcId;

      if (!irctcId) {
        return res.status(400).json({
          success: false,
          message: 'IRCTC ID is required'
        });
      }

      const InAppNotificationService = require('../../services/InAppNotificationService');
      const count = InAppNotificationService.getUnreadCount(irctcId);

      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Mark notification as read
   * POST /api/passenger/notifications/:id/read
   */
  markNotificationRead(req, res) {
    try {
      const { id } = req.params;
      const irctcId = req.user?.irctcId || req.body.irctcId;

      if (!irctcId) {
        return res.status(400).json({
          success: false,
          message: 'IRCTC ID is required'
        });
      }

      const InAppNotificationService = require('../../services/InAppNotificationService');
      const notification = InAppNotificationService.markAsRead(irctcId, id);

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: notification
      });
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Mark all notifications as read
   * POST /api/passenger/notifications/mark-all-read
   */
  markAllNotificationsRead(req, res) {
    try {
      const irctcId = req.user?.irctcId || req.body.irctcId;

      if (!irctcId) {
        return res.status(400).json({
          success: false,
          message: 'IRCTC ID is required'
        });
      }

      const InAppNotificationService = require('../../services/InAppNotificationService');
      const count = InAppNotificationService.markAllAsRead(irctcId);

      res.json({
        success: true,
        message: `Marked ${count} notifications as read`,
        data: { count }
      });
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Subscribe to push notifications
   * POST /api/passenger/push-subscribe
   */
  async subscribeToPush(req, res) {
    try {
      const { irctcId, subscription } = req.body;

      console.log('🔔 Push subscribe request received:', { irctcId: irctcId ? '✓' : '✗', subscription: subscription ? '✓' : '✗' });

      if (!irctcId || !subscription) {
        console.error('❌ Missing required fields:', { irctcId, hasSubscription: !!subscription });
        return res.status(400).json({
          success: false,
          message: 'IRCTC ID and subscription are required',
          received: { irctcId: !!irctcId, subscription: !!subscription }
        });
      }

      const PushSubscriptionService = require('../../services/PushSubscriptionService');
      await PushSubscriptionService.addSubscription(irctcId, subscription, req.headers['user-agent']);

      console.log(`✅ Passenger ${irctcId} subscribed to push notifications`);
      res.json({
        success: true,
        message: 'Subscribed to push notifications (stored in MongoDB)',
        irctcId
      });
    } catch (error) {
      console.error('❌ Error subscribing to push:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.toString()
      });
    }
  }

  /**
   * Unsubscribe from push notifications
   * POST /api/passenger/push-unsubscribe
   */
  async unsubscribeFromPush(req, res) {
    try {
      const { irctcId, endpoint } = req.body;

      if (!irctcId || !endpoint) {
        return res.status(400).json({
          success: false,
          message: 'IRCTC ID and endpoint are required'
        });
      }

      const PushSubscriptionService = require('../../services/PushSubscriptionService');
      const removed = await PushSubscriptionService.removeSubscription(irctcId, endpoint);

      res.json({
        success: removed,
        message: removed ? 'Unsubscribed successfully' : 'Subscription not found'
      });
    } catch (error) {
      console.error('❌ Error unsubscribing from push:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get VAPID public key for push subscription
   * GET /api/passenger/vapid-public-key
   */
  getVapidPublicKey(req, res) {
    try {
      const WebPushService = require('../../services/WebPushService');
      const publicKey = WebPushService.getVapidPublicKey();

      res.json({
        success: true,
        publicKey
      });
    } catch (error) {
      console.error('❌ Error getting VAPID key:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new PassengerNotificationController();
