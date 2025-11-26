// backend/controllers/tteController.js
const db = require("../config/db");
const wsManager = require("../config/websocket");
const trainController = require("./trainController");
const ReallocationService = require("../services/ReallocationService");

class TTEController {
    /**
     * Get all passengers with optional filters
     */
    async getAllPassengersFiltered(req, res) {
        try {
            const { status, coach } = req.query;
            const trainState = trainController.getGlobalTrainState();

            if (!trainState) {
                return res.status(400).json({
                    success: false,
                    message: "Train not initialized"
                });
            }

            let passengers = trainState.getAllPassengers();

            // Apply filters
            if (status) {
                switch (status.toLowerCase()) {
                    case 'boarded':
                        passengers = passengers.filter(p => p.boarded);
                        break;
                    case 'pending':
                        passengers = passengers.filter(p => !p.boarded && !p.noShow && p.fromIdx >= trainState.currentStationIdx);
                        break;
                    case 'deboarded':
                        passengers = passengers.filter(p => p.toIdx < trainState.currentStationIdx);
                        break;
                    case 'no-show':
                        passengers = passengers.filter(p => p.noShow);
                        break;
                    case 'rac':
                        passengers = passengers.filter(p => p.pnrStatus === 'RAC');
                        break;
                    case 'cnf':
                        passengers = passengers.filter(p => p.pnrStatus === 'CNF');
                        break;
                }
            }

            if (coach) {
                passengers = passengers.filter(p => p.coach === coach);
            }

            res.json({
                success: true,
                data: {
                    count: passengers.length,
                    passengers: passengers
                }
            });
        } catch (error) {
            console.error("❌ Error getting filtered passengers:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Manual mark passenger as boarded
     */
    async manualMarkBoarded(req, res) {
        try {
            const { pnr } = req.body;

            if (!pnr) {
                return res.status(400).json({
                    success: false,
                    message: "PNR number is required"
                });
            }

            const passengersCollection = db.getPassengersCollection();
            const trainState = trainController.getGlobalTrainState();

            if (!trainState) {
                return res.status(400).json({
                    success: false,
                    message: "Train not initialized"
                });
            }

            // Find passenger in memory
            const passenger = trainState.findPassengerByPNR(pnr);
            if (!passenger) {
                return res.status(404).json({
                    success: false,
                    message: "Passenger not found"
                });
            }

            // Update in-memory
            passenger.boarded = true;
            trainState.stats.currentOnboard++;

            // Update MongoDB (optional field, may not exist in schema)
            await passengersCollection.updateOne(
                { PNR_Number: pnr },
                { $set: { Boarded: true } }
            );

            // Broadcast update
            if (wsManager) {
                wsManager.broadcastTrainUpdate('PASSENGER_BOARDED', {
                    pnr: pnr,
                    name: passenger.name,
                    stats: trainState.stats
                });
            }

            res.json({
                success: true,
                message: "Passenger marked as boarded",
                data: { pnr: pnr, name: passenger.name }
            });
        } catch (error) {
            console.error("❌ Error marking boarded:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Manual mark passenger as deboarded
     */
    async manualMarkDeboarded(req, res) {
        try {
            const { pnr } = req.body;

            if (!pnr) {
                return res.status(400).json({
                    success: false,
                    message: "PNR number is required"
                });
            }

            const trainState = trainController.getGlobalTrainState();

            if (!trainState) {
                return res.status(400).json({
                    success: false,
                    message: "Train not initialized"
                });
            }

            // Find and remove passenger
            const passenger = trainState.findPassengerByPNR(pnr);
            if (!passenger) {
                return res.status(404).json({
                    success: false,
                    message: "Passenger not found"
                });
            }

            const location = trainState.findPassenger(pnr);
            if (location) {
                location.berth.removePassenger(pnr);
                location.berth.updateStatus();
                trainState.stats.currentOnboard--;
                trainState.stats.totalDeboarded++;
            }

            // Broadcast update
            if (wsManager) {
                wsManager.broadcastTrainUpdate('PASSENGER_DEBOARDED', {
                    pnr: pnr,
                    name: passenger.name,
                    stats: trainState.stats
                });
            }

            res.json({
                success: true,
                message: "Passenger marked as deboarded",
                data: { pnr: pnr, name: passenger.name }
            });
        } catch (error) {
            console.error("❌ Error marking deboarded:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * TTE confirm upgrade (for offline passengers)
     */
    async confirmUpgrade(req, res) {
        try {
            const { pnr, notificationId } = req.body;

            // Validation: Required fields
            if (!pnr || !notificationId) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required fields: pnr, notificationId"
                });
            }

            // Validation: PNR format
            if (typeof pnr !== 'string' || pnr.length !== 10) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid PNR format"
                });
            }

            const UpgradeNotificationService = require('../services/UpgradeNotificationService');
            const trainState = trainController.getGlobalTrainState();

            if (!trainState) {
                return res.status(400).json({
                    success: false,
                    message: "Train not initialized"
                });
            }

            // Validation: Check if notification exists
            const allNotifications = UpgradeNotificationService.getAllNotifications(pnr);
            const notification = allNotifications.find(n => n.id === notificationId);

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: "Notification not found"
                });
            }

            // Validation: Check notification status
            if (notification.status !== 'PENDING' && notification.status !== 'ACCEPTED') {
                return res.status(400).json({
                    success: false,
                    message: `Notification already ${notification.status.toLowerCase()}`
                });
            }

            //Accept the notification
            const acceptedNotification = UpgradeNotificationService.acceptUpgrade(pnr, notificationId);

            // Perform the actual upgrade
            const upgradeResult = await ReallocationService.upgradeRACPassengerWithCoPassenger(
                pnr,
                {
                    coachNo: acceptedNotification.offeredCoach,
                    berthNo: acceptedNotification.offeredSeatNo
                },
                trainState
            );

            // Broadcast update
            if (wsManager) {
                wsManager.broadcastTrainUpdate('TTE_UPGRADE_CONFIRMED', {
                    pnr: pnr,
                    upgrade: upgradeResult
                });

                // Notify passenger directly via WebSocket
                wsManager.notifyUpgradeConfirmed(pnr, {
                    notificationId: notificationId,
                    newBerth: acceptedNotification.offeredBerth,
                    coach: acceptedNotification.offeredCoach,
                    confirmedAt: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                message: "Upgrade confirmed by TTE",
                data: upgradeResult
            });

        } catch (error) {
            console.error("❌ Error confirming upgrade:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
 * Get journey statistics for TTE dashboard
 */
    getStatistics(req, res) {
        try {
            const trainState = trainController.getGlobalTrainState();

            if (!trainState) {
                return res.status(400).json({
                    success: false,
                    message: "Train not initialized"
                });
            }

            const allPassengers = trainState.getAllPassengers();

            const stats = {
                train: {
                    number: trainState.trainNo,
                    name: trainState.trainName,
                    currentStation: trainState.getCurrentStation()?.name || "Unknown",
                    currentStationIndex: trainState.currentStationIdx,
                    totalStations: trainState.stations.length
                },
                passengers: {
                    total: trainState.stats.totalPassengers,
                    cnf: trainState.stats.cnfPassengers,
                    rac: trainState.stats.racPassengers,
                    racUpgraded: trainState.stats.totalRACUpgraded || 0,
                    boarded: allPassengers.filter(p => p.boarded).length,
                    pending: allPassengers.filter(p => !p.boarded && !p.noShow && p.fromIdx >= trainState.currentStationIdx).length,
                    deboarded: trainState.stats.totalDeboarded,
                    noShows: trainState.stats.totalNoShows,
                    currentOnboard: trainState.stats.currentOnboard
                },
                berths: {
                    total: trainState.coaches.reduce((sum, coach) => sum + coach.berths.length, 0),
                    occupied: trainState.coaches.reduce((sum, coach) =>
                        sum + coach.berths.filter(b => b.status === 'occupied').length, 0),
                    vacant: trainState.stats.vacantBerths
                },
                racQueue: {
                    count: trainState.racQueue.length,
                    passengers: trainState.racQueue.map(r => ({
                        pnr: r.pnr,
                        name: r.name,
                        racNumber: r.racNumber,
                        from: r.from,
                        to: r.to,
                        boarded: r.boarded || false
                    }))
                }
            };

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error("❌ Error getting statistics:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * ========================================
     * BOARDING VERIFICATION METHODS
     * ========================================
     */

    /**
     * Get boarding verification queue
     * GET /api/tte/boarding-queue
     */
    getBoardingQueue(req, res) {
        try {
            const trainState = trainController.getGlobalTrainState();

            if (!trainState) {
                return res.status(400).json({
                    success: false,
                    message: 'Train not initialized'
                });
            }

            const queue = Array.from(
                trainState.boardingVerificationQueue.values()
            );

            const stats = trainState.getVerificationStats();

            res.json({
                success: true,
                data: {
                    station: stats.currentStation,
                    stats: stats,
                    passengers: queue
                }
            });
        } catch (error) {
            console.error('❌ Error getting boarding queue:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Confirm all passengers boarded
     * POST /api/tte/confirm-all-boarded
     */
    async confirmAllBoarded(req, res) {
        try {
            const trainState = trainController.getGlobalTrainState();

            if (!trainState) {
                return res.status(400).json({
                    success: false,
                    message: 'Train not initialized'
                });
            }

            const result = await trainState.confirmAllBoarded();

            res.json({
                success: true,
                message: `${result.count} passengers confirmed boarded`,
                count: result.count
            });
        } catch (error) {
            console.error('❌ Error confirming boarding:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Mark individual passenger as NO_SHOW
     * POST /api/tte/mark-no-show
     * Body: { pnr: "PNR_NUMBER" }
     */
    async markNoShow(req, res) {
        try {
            const { pnr } = req.body;

            if (!pnr) {
                return res.status(400).json({
                    success: false,
                    message: 'PNR is required'
                });
            }

            const trainState = trainController.getGlobalTrainState();

            if (!trainState) {
                return res.status(400).json({
                    success: false,
                    message: 'Train not initialized'
                });
            }

            const result = await trainState.markNoShowFromQueue(pnr);

            res.json({
                success: true,
                message: `Passenger ${pnr} marked as NO_SHOW`,
                pnr: result.pnr
            });
        } catch (error) {
            console.error('❌ Error marking no-show:', error);

            if (error.message.includes('not found in verification queue')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new TTEController();
