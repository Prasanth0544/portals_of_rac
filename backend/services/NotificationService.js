// backend/services/NotificationService.js
// Smart dual-transport email service:
//   Production (Render):  Resend HTTP API  — RESEND_API_KEY env var
//   Development (local):  Gmail SMTP       — EMAIL_USER / EMAIL_PASSWORD env vars
//
// Why Resend in production?
//   Render free tier blocks outbound SMTP ports (587 / 465) at the network firewall level.
//   Resend sends via HTTPS (port 443) which Render never blocks.
//   Free tier: 3,000 emails/month, 100/day — more than enough for a railway RAC system.
//
// Setup:
//   1. Sign up free at https://resend.com
//   2. Create an API key
//   3. Add to Render env:  RESEND_API_KEY=re_xxxx
//   4. (Optional) verify a custom domain in Resend for a non-@resend.dev sender

const nodemailer = require('nodemailer');

// ─── Transport selection ───────────────────────────────────────────────────────
const USE_RESEND = !!(process.env.RESEND_API_KEY);
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'Indian Railways RAC <onboarding@resend.dev>';

class NotificationService {
    constructor() {
        this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // ── Resend (production) ──────────────────────────────────────────────
        if (USE_RESEND) {
            const { Resend } = require('resend');
            this.resend = new Resend(process.env.RESEND_API_KEY);
            this.emailTransporter = null; // not used in Resend mode
            console.log('📧 NotificationService → Resend HTTP API (production mode)');
            console.log('   From:', RESEND_FROM);

        // ── nodemailer / Gmail SMTP (local dev) ──────────────────────────────
        } else {
            const emailPort = parseInt(process.env.EMAIL_PORT || '587');
            const isSecurePort = emailPort === 465 || process.env.EMAIL_SECURE === 'true';

            const transportConfig = process.env.EMAIL_HOST
                ? {
                    host: process.env.EMAIL_HOST,
                    port: emailPort,
                    secure: isSecurePort,
                    requireTLS: !isSecurePort,
                    pool: true,
                    connectionTimeout: 10000,
                    greetingTimeout: 10000,
                    socketTimeout: 15000,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD
                    },
                    tls: { rejectUnauthorized: false }
                }
                : {
                    service: 'gmail',
                    pool: true,
                    connectionTimeout: 10000,
                    greetingTimeout: 10000,
                    socketTimeout: 15000,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD
                    }
                };

            this.emailTransporter = nodemailer.createTransport(transportConfig);
            this.resend = null;

            console.log('📧 NotificationService → nodemailer SMTP (local dev mode)');
            console.log('   Email User:', process.env.EMAIL_USER || '✗ NOT SET');
            console.log('   Email Pass:', process.env.EMAIL_PASSWORD ? '✓ Set' : '✗ NOT SET');
            console.log('   SMTP:', process.env.EMAIL_HOST || 'gmail (default)');

            // Verify SMTP on startup (non-blocking, 5s timeout)
            this.smtpVerified = false;
            this.smtpFailed = false;

            if (this.emailTransporter && process.env.NODE_ENV !== 'test') {
                const VERIFY_TIMEOUT_MS = 5000;
                const verifyPromise = new Promise((resolve, reject) => {
                    this.emailTransporter.verify((error, success) => {
                        if (error) reject(error); else resolve(success);
                    });
                });
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('SMTP verify timed out after 5s')), VERIFY_TIMEOUT_MS)
                );

                Promise.race([verifyPromise, timeoutPromise])
                    .then(() => {
                        this.smtpVerified = true;
                        console.log('✅ SMTP credentials verified — email is ready to send');
                    })
                    .catch((error) => {
                        this.smtpFailed = true;
                        console.error('❌ SMTP verification FAILED:', error.message);
                        if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
                            console.error('   → Port 587 blocked. In production, set RESEND_API_KEY instead.');
                        } else {
                            console.error('   → Check EMAIL_USER / EMAIL_PASSWORD or use RESEND_API_KEY.');
                        }
                    });
            }
        }
    }

    // ─── Core send method ────────────────────────────────────────────────────
    /**
     * Unified send — routes to Resend or nodemailer based on config.
     * @param {{ to, subject, html, from? }} mailOptions
     */
    async _sendMail({ to, subject, html, from }) {
        if (USE_RESEND) {
            const { data, error } = await this.resend.emails.send({
                from: from || RESEND_FROM,
                to: Array.isArray(to) ? to : [to],
                subject,
                html
            });
            if (error) throw new Error(`Resend error: ${error.message || JSON.stringify(error)}`);
            return { messageId: data?.id };
        } else {
            return this.emailTransporter.sendMail({
                from: from || `"Indian Railways RAC System" <${process.env.EMAIL_USER}>`,
                to,
                subject,
                html
            });
        }
    }

    // ─── Upgrade confirmation ───────────────────────────────────────────────
    async sendUpgradeNotification(passenger, oldStatus, newBerth) {
        const results = { email: { sent: false, error: null } };

        const hasEmail = passenger.email || passenger.Email;
        const canSend = USE_RESEND ? !!this.resend : (hasEmail && !!process.env.EMAIL_USER);

        if (hasEmail && canSend) {
            try {
                await this._sendMail({
                    to: hasEmail,
                    subject: '🎉 RAC Ticket Confirmed - Indian Railways',
                    html: this._upgradeHtml(passenger, oldStatus, newBerth)
                });
                results.email.sent = true;
                console.log(`📧 Upgrade email sent to ${hasEmail}`);
            } catch (error) {
                results.email.error = error.message;
                console.error('❌ Upgrade email failed:', error.message);
            }
        }
        return results;
    }

    _upgradeHtml(passenger, oldStatus, newBerth) {
        const berthLabel = newBerth.fullBerthNo || `${newBerth.coachNo}-${newBerth.berthNo}`;
        return `<!DOCTYPE html><html><head><style>
            body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
            .container{max-width:600px;margin:0 auto;padding:20px}
            .header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
            .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
            .info-table{width:100%;border-collapse:collapse;margin:20px 0}
            .info-table td{padding:12px;border-bottom:1px solid #ddd}
            .info-table td:first-child{font-weight:bold;width:40%}
            .highlight{background:#fff3cd;padding:15px;border-left:4px solid #ffc107;margin:20px 0}
            .footer{text-align:center;margin-top:20px;color:#666;font-size:12px}
        </style></head><body>
        <div class="container">
            <div class="header"><h1 style="margin:0">🎉 Congratulations!</h1>
            <p style="margin:10px 0 0;font-size:18px">Your RAC Ticket is Now Confirmed</p></div>
            <div class="content">
                <p>Dear <strong>${passenger.name}</strong>,</p>
                <p>Great news! Your RAC ticket has been confirmed and you've been allocated a berth.</p>
                <div class="highlight"><strong>Your New Berth: ${berthLabel}</strong></div>
                <table class="info-table">
                    <tr><td>PNR Number:</td><td><strong>${passenger.pnr}</strong></td></tr>
                    <tr><td>Previous Status:</td><td>${oldStatus}</td></tr>
                    <tr><td>New Status:</td><td><strong style="color:#28a745">CONFIRMED (CNF)</strong></td></tr>
                    <tr><td>Berth Number:</td><td><strong>${berthLabel}</strong></td></tr>
                    <tr><td>Coach:</td><td>${newBerth.coachNo}</td></tr>
                    <tr><td>Berth Type:</td><td>${newBerth.type}</td></tr>
                </table>
                <p>Please check your boarding pass on the passenger portal for updated details.</p>
                <p><a href="${this.frontendUrl}/passenger" style="background:#667eea;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;display:inline-block;margin:10px 0;font-weight:600">View Boarding Pass</a></p>
                <p><strong>Happy Journey! 🚂</strong></p>
            </div>
            <div class="footer"><p>This is an automated notification from Indian Railways RAC Reallocation System</p>
            <p>Please do not reply to this email</p></div>
        </div></body></html>`;
    }

    // ─── NO-SHOW marked ─────────────────────────────────────────────────────
    async sendNoShowMarkedNotification(pnr, passenger) {
        const results = { email: { sent: false, error: null } };
        console.log(`📢 Sending NO-SHOW notification for PNR: ${pnr}`);

        const passengerEmail = passenger.Email || passenger.email;
        const canSend = USE_RESEND ? !!this.resend : (passengerEmail && !!process.env.EMAIL_USER);

        if (passengerEmail && canSend) {
            try {
                await this._sendMail({
                    from: USE_RESEND ? RESEND_FROM : `"Indian Railways Alert" <${process.env.EMAIL_USER}>`,
                    to: passengerEmail,
                    subject: '⚠️ NO-SHOW Alert - Immediate Action Required',
                    html: this._noShowHtml(pnr, passenger)
                });
                results.email.sent = true;
                console.log(`📧 NO-SHOW email sent to ${passengerEmail}`);
            } catch (error) {
                results.email.error = error.message;
                console.error('❌ NO-SHOW email failed:', error.message);
            }
        }
        return results;
    }

    _noShowHtml(pnr, passenger) {
        return `<!DOCTYPE html><html><head><style>
            body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
            .container{max-width:600px;margin:0 auto;padding:20px;background:#fff}
            .header{background:#e74c3c;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
            .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
            .alert-box{background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0}
            .info-table{width:100%;border-collapse:collapse;margin:20px 0}
            .info-table td{padding:12px;border-bottom:1px solid #ddd}
            .info-table td:first-child{font-weight:bold;width:40%}
            .action-button{background:#27ae60;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;display:inline-block;margin:10px 0;font-weight:600}
            .footer{text-align:center;margin-top:20px;color:#666;font-size:12px}
        </style></head><body>
        <div class="container">
            <div class="header"><h1 style="margin:0">⚠️ NO-SHOW Alert</h1>
            <p style="margin:10px 0 0;font-size:18px">Immediate Action Required</p></div>
            <div class="content">
                <p>Dear <strong>${passenger.name}</strong>,</p>
                <p>You have been marked as <strong>NO-SHOW</strong> by the Train Ticket Examiner (TTE) for your journey.</p>
                <div class="alert-box"><strong>⚠️ Important:</strong> If you are present on the train, please contact the TTE immediately or use the passenger portal to revert this status.</div>
                <table class="info-table">
                    <tr><td>PNR Number:</td><td><strong>${pnr}</strong></td></tr>
                    <tr><td>Berth:</td><td>${passenger.coach}-${passenger.berth}</td></tr>
                    <tr><td>Status:</td><td><strong style="color:#e74c3c">NO-SHOW</strong></td></tr>
                </table>
                <p><strong>What this means:</strong></p>
                <ul>
                    <li>Your berth may be allocated to another passenger</li>
                    <li>You must contact the TTE if you are present on the train</li>
                    <li>You can also use the passenger portal to dispute this status</li>
                </ul>
                <center><a href="${this.frontendUrl}/passenger" class="action-button">Open Passenger Portal</a></center>
                <p style="margin-top:20px;font-size:13px;color:#666">If you are not on the train, please ignore this message.</p>
            </div>
            <div class="footer"><p>Automated alert from Indian Railways</p><p>Please do not reply</p></div>
        </div></body></html>`;
    }

    // ─── NO-SHOW reverted ───────────────────────────────────────────────────
    async sendNoShowRevertedNotification(pnr, passenger) {
        const results = { email: { sent: false, error: null } };
        console.log(`✅ Sending NO-SHOW REVERTED notification for PNR: ${pnr}`);

        const passengerEmail = passenger.email || passenger.Email;
        const canSend = USE_RESEND ? !!this.resend : (passengerEmail && !!process.env.EMAIL_USER);

        if (passengerEmail && canSend) {
            try {
                await this._sendMail({
                    from: USE_RESEND ? RESEND_FROM : `"Indian Railways" <${process.env.EMAIL_USER}>`,
                    to: passengerEmail,
                    subject: '✅ NO-SHOW Status Cleared - Welcome Back!',
                    html: this._noShowRevertedHtml(pnr, passenger)
                });
                results.email.sent = true;
                console.log(`📧 NO-SHOW revert email sent to ${passengerEmail}`);
            } catch (error) {
                results.email.error = error.message;
                console.error('❌ Revert email failed:', error.message);
            }
        }
        return results;
    }

    _noShowRevertedHtml(pnr, passenger) {
        return `<!DOCTYPE html><html><head><style>
            body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
            .container{max-width:600px;margin:0 auto;padding:20px;background:#fff}
            .header{background:#27ae60;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
            .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
            .success-box{background:#d4edda;border-left:4px solid #28a745;padding:15px;margin:20px 0;color:#155724}
            .info-table{width:100%;border-collapse:collapse;margin:20px 0}
            .info-table td{padding:12px;border-bottom:1px solid #ddd}
            .info-table td:first-child{font-weight:bold;width:40%}
            .footer{text-align:center;margin-top:20px;color:#666;font-size:12px}
        </style></head><body>
        <div class="container">
            <div class="header"><h1 style="margin:0">✅ Status Cleared!</h1>
            <p style="margin:10px 0 0;font-size:18px">You're Back on Board</p></div>
            <div class="content">
                <p>Dear <strong>${passenger.name}</strong>,</p>
                <p>Good news! Your NO-SHOW status has been successfully cleared.</p>
                <div class="success-box"><strong>✅ All Clear:</strong> You are confirmed as present on the train. Your berth is secure.</div>
                <table class="info-table">
                    <tr><td>PNR Number:</td><td><strong>${pnr}</strong></td></tr>
                    <tr><td>Berth:</td><td>${passenger.coach}-${passenger.berth}</td></tr>
                    <tr><td>Status:</td><td><strong style="color:#27ae60">BOARDED</strong></td></tr>
                </table>
                <p><strong>Happy Journey! 🚂</strong></p>
                <p>Thank you for clarifying your presence on the train.</p>
            </div>
            <div class="footer"><p>Automated notification from Indian Railways</p><p>Please do not reply</p></div>
        </div></body></html>`;
    }

    // ─── Upgrade approval request (to passenger) ────────────────────────────
    async sendApprovalRequestNotification(passenger, upgradeDetails) {
        const passengerEmail = passenger.email || passenger.Email;
        const canSend = USE_RESEND ? !!this.resend : (passengerEmail && !!process.env.EMAIL_USER);

        if (!passengerEmail || !canSend) {
            console.log('⚠️ Cannot send approval request email — no email transport configured');
            return { sent: false, error: 'No email transport configured' };
        }

        try {
            await this._sendMail({
                from: USE_RESEND ? RESEND_FROM : `"Indian Railways RAC System" <${process.env.EMAIL_USER}>`,
                to: passengerEmail,
                subject: '🎫 Upgrade Available! Action Required - Indian Railways',
                html: this._approvalRequestHtml(passenger, upgradeDetails)
            });
            console.log(`📧 Approval request email sent to ${passengerEmail}`);
            return { sent: true };
        } catch (error) {
            console.error('❌ Approval request email failed:', error.message);
            return { sent: false, error: error.message };
        }
    }

    _approvalRequestHtml(passenger, upgradeDetails) {
        return `<!DOCTYPE html><html><head><style>
            body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
            .container{max-width:600px;margin:0 auto;padding:20px}
            .header{background:linear-gradient(135deg,#27ae60 0%,#2ecc71 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
            .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
            .upgrade-box{background:#fff;border:2px solid #27ae60;border-radius:8px;padding:20px;margin:20px 0}
            .btn{display:inline-block;background:#27ae60;color:white;padding:15px 30px;text-decoration:none;border-radius:5px;font-weight:bold;margin:10px 5px}
            .footer{text-align:center;margin-top:20px;color:#666;font-size:12px}
        </style></head><body>
        <div class="container">
            <div class="header"><h1 style="margin:0">🎫 Upgrade Available!</h1>
            <p style="margin:10px 0 0;font-size:18px">Action Required</p></div>
            <div class="content">
                <p>Dear <strong>${passenger.name}</strong>,</p>
                <p>Great news! A berth upgrade is available for your RAC ticket.</p>
                <div class="upgrade-box">
                    <h3 style="margin-top:0;color:#27ae60">Upgrade Details</h3>
                    <p><strong>PNR:</strong> ${passenger.pnr}</p>
                    <p><strong>Current Status:</strong> RAC - ${upgradeDetails.currentRAC}</p>
                    <p><strong>Offered Berth:</strong> ${upgradeDetails.proposedBerthFull}</p>
                    <p><strong>Berth Type:</strong> ${upgradeDetails.proposedBerthType}</p>
                    <p><strong>Station:</strong> ${upgradeDetails.stationName}</p>
                </div>
                <p style="text-align:center">
                    <a href="${this.frontendUrl}/passenger/upgrade-offers" class="btn">✓ View &amp; Approve Upgrade</a>
                </p>
                <p style="color:#e74c3c;font-weight:bold">⚠️ Please approve quickly! The TTE can also approve this upgrade, and the first approval wins.</p>
                <div class="footer"><p>Indian Railways - RAC Reallocation System</p></div>
            </div>
        </div></body></html>`;
    }

    // ─── Test email ─────────────────────────────────────────────────────────
    async testEmail(recipientEmail) {
        try {
            const info = await this._sendMail({
                to: recipientEmail,
                subject: 'Test Email - RAC System',
                html: '<html><body><h1>✅ Test email working!</h1><p>Indian Railways RAC Reallocation System email is configured correctly.</p></body></html>'
            });
            return { success: true, messageId: info?.messageId, transport: USE_RESEND ? 'resend' : 'smtp' };
        } catch (error) {
            return { success: false, error: error.message, transport: USE_RESEND ? 'resend' : 'smtp' };
        }
    }

    /**
     * Returns which transport is active and its status
     */
    getStatus() {
        return {
            transport: USE_RESEND ? 'resend' : 'smtp',
            configured: USE_RESEND ? !!this.resend : !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
            from: USE_RESEND ? RESEND_FROM : process.env.EMAIL_USER
        };
    }
}

module.exports = new NotificationService();
