// Test script for email and push services
// Run: node test_notifications.js

process.chdir(__dirname);
require('dotenv').config({ path: './.env' });

async function main() {
  console.log('\n=== NOTIFICATION SERVICE TEST ===\n');
  console.log('Environment:');
  console.log('  EMAIL_USER    :', process.env.EMAIL_USER || '❌ NOT SET');
  console.log('  EMAIL_PASS    :', process.env.EMAIL_PASSWORD ? '✓ Set' : '❌ NOT SET');
  console.log('  EMAIL_HOST    :', process.env.EMAIL_HOST || 'Gmail (default)');
  console.log('  EMAIL_PORT    :', process.env.EMAIL_PORT || '587 (default)');
  console.log('  VAPID_PUBLIC  :', process.env.VAPID_PUBLIC_KEY ? `✓ Set (${process.env.VAPID_PUBLIC_KEY.slice(0,20)}...)` : '❌ NOT SET');
  console.log('  VAPID_PRIVATE :', process.env.VAPID_PRIVATE_KEY ? '✓ Set' : '❌ NOT SET');
  console.log('  FRONTEND_URL  :', process.env.FRONTEND_URL || 'http://localhost:3000 (default)');
  console.log('');

  // ─── TEST 1: SMTP CONNECTION ───────────────────────────────────────────────
  console.log('TEST 1: SMTP Connection Verification');
  console.log('─'.repeat(50));
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    await transporter.verify();
    console.log('  ✅ SMTP Connection: PASSED');
    console.log('  → Gmail SMTP is reachable and credentials are valid\n');
  } catch (err) {
    console.log('  ❌ SMTP Connection: FAILED');
    console.log('  Error:', err.message);
    if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
      console.log('  → Outbound SMTP port 587 may be blocked (common on Render free tier)');
    } else if (err.message.includes('auth') || err.message.includes('535')) {
      console.log('  → Invalid Gmail credentials. Check EMAIL_USER and EMAIL_PASSWORD');
      console.log('  → Use an App Password: https://myaccount.google.com/apppasswords');
    }
    console.log('');
  }

  // ─── TEST 2: SEND REAL TEST EMAIL ─────────────────────────────────────────
  const testRecipient = process.env.EMAIL_USER; // send to yourself
  console.log(`TEST 2: Send Test Email → ${testRecipient}`);
  console.log('─'.repeat(50));

  const emailTypes = [
    { type: 'generic',          subject: '✅ [TEST] Email Working - RAC System' },
    { type: 'upgrade',          subject: '🎉 [TEST] RAC Upgrade Notification' },
    { type: 'noshow',           subject: '⚠️ [TEST] NO-SHOW Alert' },
    { type: 'noshow-reverted',  subject: '✅ [TEST] NO-SHOW Cleared' },
    { type: 'otp',              subject: '🔐 [TEST] OTP Verification' },
    { type: 'approval-request', subject: '🎫 [TEST] Upgrade Approval Request' },
  ];

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      requireTLS: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });

    for (const { type, subject } of emailTypes) {
      try {
        await transporter.sendMail({
          from: `"Indian Railways RAC System" <${process.env.EMAIL_USER}>`,
          to: testRecipient,
          subject: `${subject}`,
          html: `<html><body style="font-family:Arial;padding:20px;max-width:600px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
              <h2 style="margin:0">${subject}</h2>
            </div>
            <div style="background:#f9f9f9;padding:20px;border-radius:0 0 8px 8px">
              <p>This is a <strong>${type}</strong> notification test from the Indian Railways RAC System.</p>
              <p>✅ Email delivery is working correctly.</p>
              <table style="border-collapse:collapse;width:100%">
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>Type</strong></td><td style="padding:8px;border:1px solid #ddd">${type}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>Sent at</strong></td><td style="padding:8px;border:1px solid #ddd">${new Date().toLocaleString('en-IN', {timeZone:'Asia/Kolkata'})} IST</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>SMTP</strong></td><td style="padding:8px;border:1px solid #ddd">${process.env.EMAIL_HOST || 'smtp.gmail.com'}:${process.env.EMAIL_PORT || 587}</td></tr>
              </table>
            </div>
          </body></html>`
        });
        console.log(`  ✅ [${type.padEnd(18)}] Sent to ${testRecipient}`);
      } catch (err) {
        console.log(`  ❌ [${type.padEnd(18)}] FAILED: ${err.message}`);
      }
    }
  } catch (err) {
    console.log('  ❌ Could not create transporter:', err.message);
  }
  console.log('');

  // ─── TEST 3: VAPID KEY VALIDATION ─────────────────────────────────────────
  console.log('TEST 3: VAPID / Web Push Configuration');
  console.log('─'.repeat(50));
  try {
    const webPush = require('web-push');
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webPush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:test@test.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      console.log('  ✅ VAPID keys: Valid format and loaded into web-push');
      console.log('  ✅ VAPID email:', process.env.VAPID_EMAIL || 'mailto:test@test.com');
      console.log('  → Web Push is ENABLED. Browser subscriptions will receive notifications.');
    } else {
      console.log('  ⚠️  VAPID keys: NOT configured → Web Push is DISABLED');
      console.log('  → To enable: npx web-push generate-vapid-keys, then add to .env');
    }
  } catch (err) {
    console.log('  ❌ web-push module error:', err.message);
  }
  console.log('');

  // ─── TEST 4: PUSH SUBSCRIPTION DB CHECK ───────────────────────────────────
  console.log('TEST 4: MongoDB Push Subscriptions Count');
  console.log('─'.repeat(50));
  try {
    const db = require('./config/db');
    await db.connect();
    const racDb = await db.getDb();
    const col = racDb.collection(process.env.PUSH_SUBSCRIPTIONS_COLLECTION || 'push_subscriptions');
    const [passenger, tte, admin] = await Promise.all([
      col.countDocuments({ type: 'passenger' }),
      col.countDocuments({ type: 'tte' }),
      col.countDocuments({ type: 'admin' }),
    ]);
    console.log(`  Passenger subscriptions : ${passenger}`);
    console.log(`  TTE subscriptions       : ${tte}`);
    console.log(`  Admin subscriptions     : ${admin}`);
    console.log(`  Total                   : ${passenger + tte + admin}`);
    if (passenger + tte + admin === 0) {
      console.log('  ℹ️  No subscriptions yet. Open portal and allow browser notifications first.');
    } else {
      console.log('  ✅ Push subscriptions exist — test push will be delivered.');
    }
    await db.disconnect?.();
  } catch (err) {
    console.log('  ❌ MongoDB error:', err.message);
    console.log('  → Is MongoDB running on', process.env.MONGODB_URI || 'mongodb://localhost:27017?');
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

main().catch(console.error);
