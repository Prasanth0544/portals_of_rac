// backend/routes/pushRoutes.js — Push notification & test routes

const express = require('express');
const router = express.Router();
const passengerController = require('../controllers/passengerController');
const PushSubscriptionService = require('../services/PushSubscriptionService');
const WebPushService = require('../services/WebPushService');
const { authMiddleware } = require('../middleware/auth');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ========== PUSH NOTIFICATION ROUTES ==========

// Get VAPID public key for push subscription
router.get('/push/vapid-public-key',
  (req, res) => passengerController.getVapidPublicKey(req, res)
);

// Get VAPID public key (alias)
router.get('/push/vapid-key', (req, res) => {
  res.json({
    success: true,
    vapidPublicKey: WebPushService.getVapidPublicKey()
  });
});

// Subscribe to push notifications (passenger)
router.post('/passenger/push-subscribe',
  (req, res) => passengerController.subscribeToPush(req, res)
);

// Unsubscribe from push notifications (passenger)
router.post('/passenger/push-unsubscribe',
  (req, res) => passengerController.unsubscribeFromPush(req, res)
);

// TTE subscribe to push notifications
router.post('/tte/push-subscribe',
  authMiddleware,
  async (req, res) => {
    try {
      const { subscription } = req.body;
      const tteId = req.user.userId || req.user.employeeId || req.user.username || req.user.id;

      if (!tteId) {
        return res.status(400).json({ success: false, message: 'TTE ID not found in token' });
      }

      await PushSubscriptionService.addTTESubscription(tteId, subscription);

      res.json({ success: true, message: 'TTE subscribed to push notifications' });
    } catch (error) {
      console.error('❌ TTE push subscribe error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin subscribe to push notifications
router.post('/admin/push-subscribe',
  authMiddleware,
  async (req, res) => {
    try {
      const { subscription } = req.body;
      const adminId = req.user.userId || req.user.employeeId || req.user.username || req.user.id;

      if (!adminId) {
        return res.status(400).json({ success: false, message: 'Admin ID not found in token' });
      }

      await PushSubscriptionService.addAdminSubscription(adminId, subscription);

      res.json({ success: true, message: 'Admin subscribed to push notifications' });
    } catch (error) {
      console.error('❌ Admin push subscribe error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Get push notification status
router.get('/push/status', (req, res) => {
  res.json({
    success: true,
    enabled: WebPushService.isEnabled(),
    vapidPublicKey: WebPushService.getVapidPublicKey()
  });
});

// Check current subscription count
router.get('/push/subscriptions-count', async (req, res) => {
  try {
    const count = await PushSubscriptionService.getTotalCount();

    const adminSubs = await PushSubscriptionService.getAllAdminSubscriptions();
    const tteSubs = await PushSubscriptionService.getAllTTESubscriptions();
    const collection = await PushSubscriptionService.getCollection();
    const passengerSubs = await collection.find({ type: 'passenger' }).toArray();

    res.json({
      success: true,
      total: count,
      breakdown: {
        admin: adminSubs.length,
        passenger: passengerSubs.length,
        tte: tteSubs.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// TEST ENDPOINT: Send test push notification to all subscribed clients
router.post('/push/test', async (req, res) => {
  try {
    if (!WebPushService.isEnabled()) {
      return res.status(503).json({
        success: false,
        message: 'Web Push is disabled — VAPID keys not configured'
      });
    }

    const {
      title = 'Test Notification',
      body = 'This is a test push from RAC system 🚂',
      tag = 'test-notification',
      targetIrctcId = null // optional: send only to a specific passenger
    } = req.body;

    console.log('🔔 Sending test push notification...');

    // Get all subscriptions
    const adminSubs    = await PushSubscriptionService.getAllAdminSubscriptions();
    const tteSubs      = await PushSubscriptionService.getAllTTESubscriptions();
    const collection   = await PushSubscriptionService.getCollection();
    const passengerQuery = targetIrctcId
      ? { type: 'passenger', userId: targetIrctcId }
      : { type: 'passenger' };
    const passengerDocs = await collection.find(passengerQuery).toArray();
    const passengerSubs = passengerDocs.map(doc => doc.subscription);

    // adminSubs and tteSubs are already raw PushSubscription objects
    const allSubscriptions = [...adminSubs, ...tteSubs, ...passengerSubs];

    if (allSubscriptions.length === 0) {
      return res.json({
        success: false,
        message: 'No push subscriptions found in database',
        hint: 'Open the passenger/TTE/admin portal and allow notifications first',
        details: { admin: 0, tte: 0, passenger: 0 }
      });
    }

    const payload = {
      title,
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag,
      url: FRONTEND_URL,
      data: {
        type: 'TEST_NOTIFICATION',
        timestamp: new Date().toISOString(),
        url: FRONTEND_URL
      }
    };

    let successCount = 0;
    let failureCount = 0;
    const failures = [];

    for (const sub of allSubscriptions) {
      const result = await WebPushService.sendPush(sub, payload);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        failures.push({ error: result.error, statusCode: result.statusCode });
      }
    }

    console.log(`📨 Test push: ${successCount}/${allSubscriptions.length} sent`);

    res.json({
      success: successCount > 0,
      message: successCount > 0
        ? `Test push sent to ${successCount} device(s)`
        : 'All push deliveries failed',
      details: {
        total: allSubscriptions.length,
        sent: successCount,
        failed: failureCount,
        subscriptions: {
          admin: adminSubs.length,
          tte: tteSubs.length,
          passenger: passengerSubs.length
        },
        ...(failureCount > 0 && { failures })
      }
    });

  } catch (error) {
    console.error('❌ Test push error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.toString()
    });
  }
});

// TEST ENDPOINT: Send test email
router.post('/test-email', async (req, res) => {
  try {
    const { recipientEmail, testType = 'generic' } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'recipientEmail is required'
      });
    }

    if (!process.env.EMAIL_USER) {
      return res.status(503).json({
        success: false,
        message: 'Email is not configured (EMAIL_USER missing in .env)'
      });
    }

    const notificationService = require('../services/NotificationService');

    const mockPassenger = {
      name: 'Test Passenger',
      pnr: 'TEST1234567',
      email: recipientEmail,
      coach: 'S4',
      berth: '32'
    };

    const mockBerth = {
      fullBerthNo: 'S6-18',
      coachNo: 'S6',
      berthNo: 18,
      type: 'Lower'
    };

    let result;

    switch (testType) {
      case 'upgrade':
        result = await notificationService.sendUpgradeNotification(mockPassenger, 'RAC 3', mockBerth);
        break;

      case 'noshow':
        result = await notificationService.sendNoShowMarkedNotification('TEST1234567', mockPassenger);
        break;

      case 'noshow-reverted':
        result = await notificationService.sendNoShowRevertedNotification('TEST1234567', { ...mockPassenger });
        break;

      case 'approval-request':
        result = await notificationService.sendApprovalRequestNotification(mockPassenger, {
          currentRAC: 'RAC 3',
          proposedBerthFull: 'S6-18',
          proposedBerthType: 'Lower',
          stationName: 'New Delhi'
        });
        break;

      case 'otp':
        // Test OTP email
        await notificationService.emailTransporter.sendMail({
          from: `"Indian Railways RAC System" <${process.env.EMAIL_USER}>`,
          to: recipientEmail,
          subject: '🔐 [TEST] OTP Verification - Indian Railways',
          html: `<html><body style="font-family:Arial;padding:20px">
            <h1 style="color:#2c3e50">🔐 OTP Test Email</h1>
            <div style="border:3px dashed #3498db;padding:20px;text-align:center;border-radius:8px;margin:20px 0">
              <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2c3e50">123456</div>
              <p style="color:#666">This is a sample OTP (not real)</p>
            </div>
            <p>If you received this, the OTP email system is working correctly!</p>
          </body></html>`
        });
        result = { email: { sent: true } };
        break;

      default:
        // Generic test
        await notificationService.emailTransporter.sendMail({
          from: `"Indian Railways RAC System" <${process.env.EMAIL_USER}>`,
          to: recipientEmail,
          subject: '✅ [TEST] Email System Working - Indian Railways RAC',
          html: `<html><body style="font-family:Arial;padding:20px">
            <div style="max-width:600px;margin:0 auto">
              <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center">
                <h1 style="margin:0">✅ Email System Working!</h1>
                <p style="margin:10px 0 0">Indian Railways RAC Reallocation System</p>
              </div>
              <div style="background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px">
                <p>This is a test email to verify that your email configuration is working correctly.</p>
                <table style="width:100%;border-collapse:collapse;margin:20px 0">
                  <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold">From:</td><td style="padding:10px;border-bottom:1px solid #ddd">${process.env.EMAIL_USER}</td></tr>
                  <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold">To:</td><td style="padding:10px;border-bottom:1px solid #ddd">${recipientEmail}</td></tr>
                  <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold">Timestamp:</td><td style="padding:10px;border-bottom:1px solid #ddd">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
                  <tr><td style="padding:10px;font-weight:bold">SMTP:</td><td style="padding:10px">${process.env.EMAIL_HOST || 'Gmail'}</td></tr>
                </table>
                <p style="color:#27ae60;font-weight:bold">✅ All email notification types are enabled and working.</p>
              </div>
            </div>
          </body></html>`
        });
        result = { email: { sent: true } };
    }

    res.json({
      success: true,
      message: `Test email (${testType}) sent from ${process.env.EMAIL_USER} to ${recipientEmail}`,
      details: {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        type: testType,
        result
      }
    });
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.toString(),
      hint: error.message.includes('auth') ? 'Check EMAIL_USER and EMAIL_PASSWORD in .env. Use a Gmail App Password.' : undefined
    });
  }
});

// Email transport status
router.get('/email/status', (req, res) => {
  const notificationService = require('../services/NotificationService');
  res.json({ success: true, ...notificationService.getStatus() });
});

module.exports = router;
