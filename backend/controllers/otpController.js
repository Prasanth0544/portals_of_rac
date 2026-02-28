// backend/controllers/otpController.js
const OTPService = require('../services/OTPService');
const db = require('../config/db');

class OTPController {
    /**
     * Send OTP to passenger email
     */
    async sendOTP(req, res) {
        try {
            console.log('\n--- OTP SEND REQUEST ---');
            console.log('Body:', req.body);

            const { irctcId, pnr, purpose } = req.body;

            // Made irctcId optional — PNR is enough to identify the passenger
            if (!pnr) {
                console.warn('❌ OTP send failed: Missing PNR in request');
                return res.status(400).json({
                    success: false,
                    message: 'PNR is required'
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
                // Fallback: search in the passengers DB across known collections
                try {
                    const passengersDb = db.getPassengersDb();
                    const racDb = await db.getDb();
                    const { COLLECTIONS } = require('../config/collections');
                    const trainsCol = racDb.collection(COLLECTIONS.TRAINS_DETAILS);
                    const trains = await trainsCol.find({}, {
                        projection: { Passengers_Collection_Name: 1, passengersCollection: 1 }
                    }).toArray();

                    const collectionNames = new Set();
                    for (const t of trains) {
                        const name = t.passengersCollection || t.Passengers_Collection_Name;
                        if (name) collectionNames.add(name.trim());
                    }

                    for (const colName of collectionNames) {
                        try {
                            passenger = await passengersDb.collection(colName).findOne({
                                $or: [
                                    { PNR_Number: pnr },
                                    { pnr: pnr }
                                ]
                            });
                            if (passenger) {
                                console.log(`✅ Found passenger in fallback collection: ${colName}`);
                                break;
                            }
                        } catch (e) { /* skip */ }
                    }
                } catch (fallbackErr) {
                    console.error('❌ Fallback passenger lookup also failed:', fallbackErr.message);
                }
            }

            // Final fallback: Check in-memory train state (for dynamically added passengers that might not be in DB yet)
            if (!passenger) {
                const trainController = require('./trainController');
                const trainState = trainController.getGlobalTrainState();
                if (trainState) {
                    const inMemoryPassenger = trainState.findPassengerByPNR(pnr);
                    if (inMemoryPassenger) {
                        console.log(`✅ Found passenger in memory trainState: ${pnr}`);
                        passenger = {
                            PNR_Number: inMemoryPassenger.pnr,
                            IRCTC_ID: inMemoryPassenger.irctcId || irctcId || 'demo_user',
                            Email: inMemoryPassenger.email,
                            email: inMemoryPassenger.email,
                            Name: inMemoryPassenger.name
                        };
                    }
                }
            }

            if (!passenger) {
                return res.status(400).json({
                    success: false,
                    message: `Passenger with PNR ${pnr} not found in DB or memory.`
                });
            }

            // Verify IRCTC ID matches ONLY IF provided in the request
            if (irctcId && passenger.IRCTC_ID && passenger.IRCTC_ID !== irctcId) {
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

            // Hackathon/Demo graceful fallback: If NO EMAIL AT ALL, still generate the OTP and show on screen!
            if (!email) {
                console.warn(`⚠️ No email found for PNR ${pnr}. Generating OTP for on-screen display only.`);
                email = 'demo-passenger@indianrailways.gov.in';
            }

            // Send OTP
            // Pass the active IRCTC ID (either from req, or passenger DB, or fallback)
            const activeIrctcId = irctcId || passenger.IRCTC_ID || 'demo_user';

            const result = await OTPService.sendOTP(
                activeIrctcId,
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

            if (!pnr || !otp) {
                return res.status(400).json({
                    success: false,
                    message: 'PNR and OTP are required'
                });
            }

            // Determine active IRCTC ID matching the sendOTP flow
            let activeIrctcId = irctcId;
            if (!activeIrctcId) {
                try {
                    const collection = db.getPassengersCollection();
                    const passenger = await collection.findOne({ PNR_Number: pnr });
                    activeIrctcId = passenger?.IRCTC_ID || 'demo_user';
                } catch (e) {
                    activeIrctcId = 'demo_user';
                }
            }

            // Verify OTP
            const result = await OTPService.verifyOTP(activeIrctcId, pnr, otp);

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
