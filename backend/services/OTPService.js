// backend/services/OTPService.js
const crypto = require('crypto');
const NotificationService = require('./NotificationService');

class OTPService {
    constructor() {
        // Store OTPs in memory with expiry (in production, use Redis)
        this.otpStore = new Map();
        this.OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Generate a 6-digit OTP
     */
    generateOTP() {
        return crypto.randomInt(100000, 999999).toString();
    }

    /**
     * Generate and send OTP via email
     */
    async sendOTP(irctcId, pnr, email, purpose = 'verification') {
        try {
            // Generate OTP
            const otp = this.generateOTP();
            const expiryTime = Date.now() + this.OTP_EXPIRY_MS;

            // Store OTP (key: irctcId_pnr)
            const key = `${irctcId}_${pnr}`;
            this.otpStore.set(key, {
                otp,
                expiryTime,
                attempts: 0,
                maxAttempts: 3
            });

            // Send OTP email
            await NotificationService.emailTransporter.sendMail({
                from: `"Indian Railways OTP" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: '🔐 Your OTP for Indian Railways',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; }
                            .header { background: #2c3e50; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                            .otp-box { background: #ffffff; border: 3px dashed #3498db; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
                            .otp-code { font-size: 36px; font-weight: bold; color: #2c3e50; letter-spacing: 8px; }
                            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 15px 0; font-size: 14px; }
                            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1 style="margin: 0;">🔐 OTP Verification</h1>
                                <p style="margin: 10px 0 0 0;">Indian Railways - RAC System</p>
                            </div>
                            <div class="content">
                                <p>Your One-Time Password (OTP) for ${purpose} is:</p>
                                
                                <div class="otp-box">
                                    <div class="otp-code">${otp}</div>
                                </div>
                                
                                <div class="warning">
                                    <strong>⚠️ Important:</strong>
                                    <ul style="margin: 5px 0; padding-left: 20px;">
                                        <li>This OTP is valid for <strong>5 minutes</strong></li>
                                        <li>Do not share this OTP with anyone</li>
                                        <li>Indian Railways will never ask for your OTP via phone or SMS</li>
                                    </ul>
                                </div>
                                
                                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                                    <strong>PNR:</strong> ${pnr}<br>
                                    <strong>IRCTC ID:</strong> ${irctcId}
                                </p>
                                
                                <p style="font-size: 13px; color: #999; margin-top: 15px;">
                                    If you didn't request this OTP, please ignore this email.
                                </p>
                            </div>
                            <div class="footer">
                                <p>This is an automated email from Indian Railways</p>
                                <p>Please do not reply to this email</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            });

            console.log(`📧 OTP sent to ${email} for ${irctcId}/${pnr}`);

            return {
                success: true,
                message: 'OTP sent successfully',
                expiresIn: this.OTP_EXPIRY_MS / 1000 // in seconds
            };

        } catch (error) {
            console.error('❌ Error sending OTP:', error);
            throw new Error('Failed to send OTP: ' + error.message);
        }
    }

    /**
     * Verify OTP
     */
    verifyOTP(irctcId, pnr, otpInput) {
        const key = `${irctcId}_${pnr}`;
        const otpData = this.otpStore.get(key);

        // Check if OTP exists
        if (!otpData) {
            return {
                success: false,
                message: 'No OTP found. Please request a new OTP.'
            };
        }

        // Check if expired
        if (Date.now() > otpData.expiryTime) {
            this.otpStore.delete(key);
            return {
                success: false,
                message: 'OTP has expired. Please request a new OTP.'
            };
        }

        // Check max attempts
        if (otpData.attempts >= otpData.maxAttempts) {
            this.otpStore.delete(key);
            return {
                success: false,
                message: 'Maximum attempts exceeded. Please request a new OTP.'
            };
        }

        // Increment attempts
        otpData.attempts += 1;

        // Verify OTP
        if (otpData.otp === otpInput.toString()) {
            // OTP is correct - delete it
            this.otpStore.delete(key);
            console.log(`✅ OTP verified successfully for ${irctcId}/${pnr}`);
            return {
                success: true,
                message: 'OTP verified successfully'
            };
        } else {
            // OTP is incorrect
            const attemptsLeft = otpData.maxAttempts - otpData.attempts;
            return {
                success: false,
                message: `Invalid OTP. ${attemptsLeft} attempt(s) remaining.`
            };
        }
    }

    /**
     * Clear OTP (for cleanup)
     */
    clearOTP(irctcId, pnr) {
        const key = `${irctcId}_${pnr}`;
        this.otpStore.delete(key);
    }

    /**
     * Get OTP status (for debugging)
     */
    getOTPStatus(irctcId, pnr) {
        const key = `${irctcId}_${pnr}`;
        const otpData = this.otpStore.get(key);

        if (!otpData) {
            return { exists: false };
        }

        return {
            exists: true,
            expiresAt: new Date(otpData.expiryTime),
            attempts: otpData.attempts,
            maxAttempts: otpData.maxAttempts
        };
    }
}

module.exports = new OTPService();
