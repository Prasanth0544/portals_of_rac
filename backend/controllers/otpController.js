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

            // Find passenger to get email - try primary collection, fall back to scanning
            let passenger = null;
            try {
                const collection = db.getPassengersCollection();
                passenger = await collection.findOne({
                    $or: [
                        { PNR_Number: pnr },
                        { pnr: pnr }
                    ]
                });
            } catch (collErr) {
                console.warn('⚠️ getPassengersCollection() failed, trying fallback lookup:', collErr.message);
                // Fallback: search in the rac DB across known collections
                try {
                    const racDb = await db.getDb();
                    const collections = await racDb.listCollections().toArray();
                    for (const col of collections) {
                        const c = racDb.collection(col.name);
                        passenger = await c.findOne({
                            $or: [
                                { PNR_Number: pnr },
                                { pnr: pnr }
                            ]
                        });
                        if (passenger) {
                            console.log(`✅ Found passenger in collection: ${col.name}`);
                            break;
                        }
                    }
                } catch (fallbackErr) {
                    console.error('❌ Fallback passenger lookup also failed:', fallbackErr.message);
                }
            }

            if (!passenger) {
                return res.status(400).json({
                    success: false,
                    message: `Passenger with PNR ${pnr} not found. Make sure the train journey is started and the PNR is correct.`
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
            let email = passenger.Email || passenger.email;

            // ✅ Fallback: If no email on train passenger data, check passenger_accounts
            if (!email && passenger.IRCTC_ID) {
                try {
                    const { COLLECTIONS } = require('../config/collections');
                    const racDb = await db.getDb();
                    const accountsCollection = racDb.collection(COLLECTIONS.PASSENGER_ACCOUNTS);
                    const account = await accountsCollection.findOne({
                        IRCTC_ID: passenger.IRCTC_ID
                    });
                    if (account) {
                        email = account.email || account.Email;
                    }
                } catch (lookupErr) {
                    console.warn('⚠️ Fallback email lookup failed:', lookupErr.message);
                }
            }

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'No email address found for this passenger. Please register with an email first.'
                });
            }

            // Send OTP
            const result = await OTPService.sendOTP(
                irctcId,
                pnr,
                email,
                purpose || 'ticket action'
            );

            const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
            const response = {
                success: true,
                message: result.emailSent
                    ? `OTP sent to ${maskedEmail}`
                    : `OTP generated — email delivery failed. Use the OTP shown on screen.`,
                maskedEmail,
                expiresIn: result.expiresIn,
                // Always include OTP in response for reliable demo/hackathon use.
                // Gmail may silently drop emails (spam filters, daily limits, etc.)
                devOtp: result.otp,
                emailSent: result.emailSent
            };

            res.json(response);

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
            const result = await OTPService.verifyOTP(irctcId, pnr, otp);

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
