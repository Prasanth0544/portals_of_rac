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
     * Send email notification
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
     * Send SMS notification
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
