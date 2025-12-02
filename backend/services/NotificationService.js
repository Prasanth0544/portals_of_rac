// backend/services/NotificationService.js
const nodemailer = require('nodemailer');
const twilio = require('twilio');

class NotificationService {
    constructor() {
        // Email transporter (Gmail)
        this.emailTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        // Twilio SMS client
        this.twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
            ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
            : null;

        console.log('📧 NotificationService initialized');
        console.log('   Email:', process.env.EMAIL_USER ? '✓ Configured' : '✗ Not configured');
        console.log('   SMS:', this.twilioClient ? '✓ Configured' : '✗ Not configured');
    }

    /**
     * Send upgrade notification via ALL channels
     */
    async sendUpgradeNotification(passenger, oldStatus, newBerth) {
        const results = {
            email: { sent: false, error: null },
            sms: { sent: false, error: null }
        };

        // 1. Send Email
        if (passenger.email && process.env.EMAIL_USER) {
            try {
                await this.sendEmail(passenger, oldStatus, newBerth);
                results.email.sent = true;
                console.log(`📧 Email sent to ${passenger.email}`);
            } catch (error) {
                results.email.error = error.message;
                console.error('❌ Email failed:', error.message);
            }
        }

        // 2. Send SMS
        if (passenger.mobile && this.twilioClient) {
            try {
                await this.sendSMS(passenger, newBerth);
                results.sms.sent = true;
                console.log(`📱 SMS sent to ${passenger.mobile}`);
            } catch (error) {
                results.sms.error = error.message;
                console.error('❌ SMS failed:', error.message);
            }
        }

        return results;
    }

    /**
     * Send email notification for upgrade
     */
    async sendEmail(passenger, oldStatus, newBerth) {
        const mailOptions = {
            from: `"Indian Railways RAC System" <${process.env.EMAIL_USER}>`,
            to: passenger.email,
            subject: '🎉 RAC Ticket Confirmed - Indian Railways',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        .info-table td { padding: 12px; border-bottom: 1px solid #ddd; }
                        .info-table td:first-child { font-weight: bold; width: 40%; }
                        .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1 style="margin: 0;">🎉 Congratulations!</h1>
                            <p style="margin: 10px 0 0 0; font-size: 18px;">Your RAC Ticket is Now Confirmed</p>
                        </div>
                        <div class="content">
                            <p>Dear <strong>${passenger.name}</strong>,</p>
                            <p>Great news! Your RAC ticket has been confirmed and you've been allocated a berth.</p>
                            
                            <div class="highlight">
                                <strong>Your New Berth: ${newBerth.fullBerthNo || `${newBerth.coachNo}-${newBerth.berthNo}`}</strong>
                            </div>
                            
                            <table class="info-table">
                                <tr>
                                    <td>PNR Number:</td>
                                    <td><strong>${passenger.pnr}</strong></td>
                                </tr>
                                <tr>
                                    <td>Previous Status:</td>
                                    <td>${oldStatus}</td>
                                </tr>
                                <tr>
                                    <td>New Status:</td>
                                    <td><strong style="color: #28a745;">CONFIRMED (CNF)</strong></td>
                                </tr>
                                <tr>
                                    <td>Berth Number:</td>
                                    <td><strong>${newBerth.fullBerthNo || `${newBerth.coachNo}-${newBerth.berthNo}`}</strong></td>
                                </tr>
                                <tr>
                                    <td>Coach:</td>
                                    <td>${newBerth.coachNo}</td>
                                </tr>
                                <tr>
                                    <td>Berth Type:</td>
                                    <td>${newBerth.type}</td>
                                </tr>
                            </table>
                            
                            <p>Please check your boarding pass on the passenger portal for updated details.</p>
                            <p><strong>Happy Journey!</strong></p>
                        </div>
                        <div class="footer">
                            <p>This is an automated notification from Indian Railways RAC Reallocation System</p>
                            <p>Please do not reply to this email</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        return this.emailTransporter.sendMail(mailOptions);
    }

    /**
     * Send SMS notification for upgrade
     */
    async sendSMS(passenger, newBerth) {
        const message = `IRCTC: Congratulations! Your RAC ticket (PNR: ${passenger.pnr}) is now CONFIRMED. New berth: ${newBerth.fullBerthNo || `${newBerth.coachNo}-${newBerth.berthNo}`}, Coach: ${newBerth.coachNo}. Happy Journey!`;

        return this.twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: passenger.mobile
        });
    }

    /**
     * Send NO-SHOW marked notification (both online and offline passengers)
     */
    async sendNoShowMarkedNotification(pnr, passenger) {
        const results = {
            email: { sent: false, error: null },
            sms: { sent: false, error: null }
        };

        console.log(`📢 Sending NO-SHOW notification for PNR: ${pnr} (${passenger.passengerStatus})`);

        // Get email (handle both 'Email' and 'email' field names from MongoDB)
        const passengerEmail = passenger.Email || passenger.email;
        console.log(`🔍 DEBUG: Email="${passengerEmail}" | Configured="${process.env.EMAIL_USER}"`);

        // Send Email (for both online and offline)
        if (passengerEmail && process.env.EMAIL_USER) {
            try {
                const mailOptions = {
                    from: `"Indian Railways Alert" <${process.env.EMAIL_USER}>`,
                    to: passengerEmail,
                    subject: '⚠️ NO-SHOW Alert - Immediate Action Required',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; }
                                .header { background: #e74c3c; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                                .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                                .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                                .info-table td { padding: 12px; border-bottom: 1px solid #ddd; }
                                .info-table td:first-child { font-weight: bold; width: 40%; }
                                .action-button { background: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; font-weight: 600; }
                                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1 style="margin: 0;">⚠️ NO-SHOW Alert</h1>
                                    <p style="margin: 10px 0 0 0; font-size: 18px;">Immediate Action Required</p>
                                </div>
                                <div class="content">
                                    <p>Dear <strong>${passenger.name}</strong>,</p>
                                    <p>You have been marked as <strong>NO-SHOW</strong> by the Train Ticket Examiner (TTE) for your journey.</p>
                                    
                                    <div class="alert-box">
                                        <strong>⚠️ Important:</strong> If you are present on the train, please contact the TTE immediately or use the passenger portal to revert this status.
                                    </div>
                                    
                                    <table class="info-table">
                                        <tr>
                                            <td>PNR Number:</td>
                                            <td><strong>${pnr}</strong></td>
                                        </tr>
                                        <tr>
                                            <td>Berth:</td>
                                            <td>${passenger.coach}-${passenger.berth}</td>
                                        </tr>
                                        <tr>
                                            <td>Status:</td>
                                            <td><strong style="color: #e74c3c;">NO-SHOW</strong></td>
                                        </tr>
                                    </table>
                                    
                                    <p><strong>What this means:</strong></p>
                                    <ul>
                                        <li>Your berth may be allocated to another passenger</li>
                                        <li>You must contact the TTE if you are present on the train</li>
                                        <li>You can also use the passenger portal to dispute this status</li>
                                    </ul>
                                    
                                    <center>
                                        <a href="http://localhost:5175" class="action-button">Open Passenger Portal</a>
                                    </center>
                                    
                                    <p style="margin-top: 20px; font-size: 13px; color: #666;">
                                        If you are not on the train, please ignore this message.
                                    </p>
                                </div>
                                <div class="footer">
                                    <p>This is an automated alert from Indian Railways</p>
                                    <p>For assistance, contact TTE or railway helpdesk</p>
                                    <p>Please do not reply to this email</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `
                };

                await this.emailTransporter.sendMail(mailOptions);
                results.email.sent = true;
                console.log(`📧 NO-SHOW email sent to ${passengerEmail}`);
            } catch (error) {
                results.email.error = error.message;
                console.error('❌ NO-SHOW email failed:', error.message);
            }
        }

        // Send SMS (for both online and offline)
        if (passenger.mobile && this.twilioClient) {
            try {
                const message = `IRCTC ALERT: You have been marked as NO-SHOW for PNR ${pnr}, Berth ${passenger.coach}-${passenger.berth}. If present on train, contact TTE immediately or login to passenger portal to revert. Indian Railways`;

                await this.twilioClient.messages.create({
                    body: message,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: passenger.mobile
                });

                results.sms.sent = true;
                console.log(`📱 NO-SHOW SMS sent to ${passenger.mobile}`);
            } catch (error) {
                results.sms.error = error.message;
                console.error('❌ NO-SHOW SMS failed:', error.message);
            }
        }

        return results;
    }

    /**
     * Send NO-SHOW reverted notification
     */
    async sendNoShowRevertedNotification(pnr, passenger) {
        const results = {
            email: { sent: false, error: null },
            sms: { sent: false, error: null }
        };

        console.log(`✅ Sending NO-SHOW REVERTED notification for PNR: ${pnr}`);

        // Send Email
        if (passenger.email && process.env.EMAIL_USER) {
            try {
                const mailOptions = {
                    from: `"Indian Railways" <${process.env.EMAIL_USER}>`,
                    to: passenger.email,
                    subject: '✅ NO-SHOW Status Cleared - Welcome Back!',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; }
                                .header { background: #27ae60; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                                .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; color: #155724; }
                                .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                                .info-table td { padding: 12px; border-bottom: 1px solid #ddd; }
                                .info-table td:first-child { font-weight: bold; width: 40%; }
                                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1 style="margin: 0;">✅ Status Cleared!</h1>
                                    <p style="margin: 10px 0 0 0; font-size: 18px;">You're Back on Board</p>
                                </div>
                                <div class="content">
                                    <p>Dear <strong>${passenger.name}</strong>,</p>
                                    <p>Good news! Your NO-SHOW status has been successfully cleared.</p>
                                    
                                    <div class="success-box">
                                        <strong>✅ All Clear:</strong> You are confirmed as present on the train. Your berth is secure.
                                    </div>
                                    
                                    <table class="info-table">
                                        <tr>
                                            <td>PNR Number:</td>
                                            <td><strong>${pnr}</strong></td>
                                        </tr>
                                        <tr>
                                            <td>Berth:</td>
                                            <td>${passenger.coach}-${passenger.berth}</td>
                                        </tr>
                                        <tr>
                                            <td>Status:</td>
                                            <td><strong style="color: #27ae60;">BOARDED</strong></td>
                                        </tr>
                                    </table>
                                    
                                    <p><strong>Happy Journey!</strong></p>
                                    <p>Thank you for clarifying your presence on the train.</p>
                                </div>
                                <div class="footer">
                                    <p>This is an automated notification from Indian Railways</p>
                                    <p>Please do not reply to this email</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `
                };

                await this.emailTransporter.sendMail(mailOptions);
                results.email.sent = true;
                console.log(`📧 NO-SHOW revert email sent to ${passenger.email}`);
            } catch (error) {
                results.email.error = error.message;
                console.error('❌ Revert email failed:', error.message);
            }
        }

        // Send SMS
        if (passenger.mobile && this.twilioClient) {
            try {
                const message = `IRCTC: Your NO-SHOW status has been cleared for PNR ${pnr}. You are confirmed as boarded on ${passenger.coach}-${passenger.berth}. Happy Journey! Indian Railways`;

                await this.twilioClient.messages.create({
                    body: message,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: passenger.mobile
                });

                results.sms.sent = true;
                console.log(`📱 NO-SHOW revert SMS sent to ${passenger.mobile}`);
            } catch (error) {
                results.sms.error = error.message;
                console.error('❌ Revert SMS failed:', error.message);
            }
        }

        return results;
    }

    /**
     * Test email configuration
     */
    async testEmail(recipientEmail) {
        try {
            const info = await this.emailTransporter.sendMail({
                from: process.env.EMAIL_USER,
                to: recipientEmail,
                subject: 'Test Email - RAC System',
                text: 'This is a test email from the RAC Reallocation System. If you receive this, your email configuration is working correctly!'
            });
            return { success: true, messageId: info.messageId };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = new NotificationService();
