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

            if (!pnr || !notificationId) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required fields: pnr, notificationId"
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

            //Accept the notification
            const notification = UpgradeNotificationService.acceptUpgrade(pnr, notificationId);

            // Perform the actual upgrade
            const upgradeResult = await ReallocationService.upgradeRACPassengerWithCoPassenger(
                pnr,
                {
                    coachNo: notification.offeredCoach,
                    berthNo: notification.offeredSeatNo
                },
                trainState
            );

            // Broadcast update
            if (wsManager) {
                wsManager.broadcastTrainUpdate('TTE_UPGRADE_CONFIRMED', {
                    pnr: pnr,
                    upgrade: upgradeResult
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
}

module.exports = new TTEController();
