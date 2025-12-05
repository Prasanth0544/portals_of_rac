// backend/controllers/otpController.js
const OTPService = require('../services/OTPService');
const db = require('../config/db');

class OTPController {
    /**
     * Send OTP to passenger email
     */
    async sendOTP(req, res) {
        try {
            const { irctcId, pnr, purpose } = req.body;

            if (!irctcId || !pnr) {
                return res.status(400).json({
                    success: false,
                    message: 'IRCTC ID and PNR are required'
                });
            }

            // Find passenger to get email
            const collection = db.getPassengersCollection();
            const passenger = await collection.findOne({ PNR_Number: pnr });

            if (!passenger) {
                return res.status(404).json({
                    success: false,
                    message: 'Passenger not found'
                });
            }

            // Verify IRCTC ID matches
            if (passenger.IRCTC_ID !== irctcId) {
                return res.status(403).json({
                    success: false,
                    message: 'IRCTC ID does not match PNR'
                });
            }

            // Get email (handle both field names)
            const email = passenger.Email || passenger.email;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'No email address found for this passenger'
                });
            }

            // Send OTP
            const result = await OTPService.sendOTP(
                irctcId,
                pnr,
                email,
                purpose || 'ticket action'
            );

            res.json({
                success: true,
                message: `OTP sent to ${email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`,
                expiresIn: result.expiresIn
            });

        } catch (error) {
            console.error('❌ Error sending OTP:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to send OTP'
            });
        }
    }

    /**
     * Verify OTP
     */
    async verifyOTP(req, res) {
        try {
            const { irctcId, pnr, otp } = req.body;

            if (!irctcId || !pnr || !otp) {
                return res.status(400).json({
                    success: false,
                    message: 'IRCTC ID, PNR, and OTP are required'
                });
            }

            // Verify OTP
            const result = OTPService.verifyOTP(irctcId, pnr, otp);

            if (result.success) {
                res.json({
                    success: true,
                    message: 'OTP verified successfully',
                    verified: true
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message,
                    verified: false
                });
            }

        } catch (error) {
            console.error('❌ Error verifying OTP:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify OTP',
                verified: false
            });
        }
    }
}

module.exports = new OTPController();
