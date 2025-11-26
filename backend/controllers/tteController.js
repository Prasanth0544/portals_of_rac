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
     * Get only currently boarded passengers
     * Returns passengers who are onboard at the current station
     * Filters: boarded === true, fromIdx <= currentStationIdx, toIdx >= currentStationIdx
     */
    async getCurrentlyBoardedPassengers(req, res) {
        try {
            const trainState = trainController.getGlobalTrainState();

            if (!trainState) {
                return res.status(400).json({
                    success: false,
                    message: "Train not initialized"
                });
            }

            const currentIdx = trainState.currentStationIdx;
            let passengers = trainState.getAllPassengers();

            // Filter for currently boarded passengers only
            // Excludes passengers deboarding at current station
            passengers = passengers.filter(p => {
                return p.boarded === true &&        // Must be boarded
                    p.fromIdx <= currentIdx &&   // Must have boarded by now
                    p.toIdx > currentIdx &&      // Haven't deboarded yet (excludes current station deboarding)
                    !p.noShow;                   // Not a no-show
            });

            res.json({
                success: true,
                data: {
                    currentStation: trainState.getCurrentStation()?.name,
                    currentStationIdx: currentIdx,
                    count: passengers.length,
                    passengers: passengers
                }
            });
        } catch (error) {
            console.error("❌ Error getting boarded passengers:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get currently boarded RAC passengers
     * Returns RAC passengers who are onboard at the current station
     * For offline upgrades management (both online and offline passengers)
     */
    async getBoardedRACPassengers(req, res) {
        try {
            const trainState = trainController.getGlobalTrainState();

            if (!trainState) {
                return res.status(400).json({
                    success: false,
                    message: "Train not initialized"
                });
            }

            const currentIdx = trainState.currentStationIdx;
            let passengers = trainState.getAllPassengers();

            // Filter for currently boarded RAC passengers only
            passengers = passengers.filter(p => {
                return p.pnrStatus === 'RAC' &&      // Must be RAC status
                    p.boarded === true &&         // Must be boarded
                    p.fromIdx <= currentIdx &&    // Must have boarded by now
                    p.toIdx > currentIdx &&       // Haven't deboarded yet
                    !p.noShow;                    // Not a no-show
            });

            // Separate by Online/Offline status
            const onlinePassengers = passengers.filter(p => p.passengerStatus?.toLowerCase() === 'online');
            const offlinePassengers = passengers.filter(p => p.passengerStatus?.toLowerCase() !== 'online');

            res.json({
                success: true,
                data: {
                    currentStation: trainState.getCurrentStation()?.name,
                    currentStationIdx: currentIdx,
                    total: passengers.length,
                    online: onlinePassengers.length,
                    offline: offlinePassengers.length,
                    passengers: passengers,
                    onlinePassengers: onlinePassengers,
                    offlinePassengers: offlinePassengers
                }
            });
        } catch (error) {
            console.error("❌ Error getting boarded RAC passengers:", error);
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

        // ✅ RECORD ACTION for Action History & Undo
        const user = req.user || { username: 'TTE' };
        const passenger = trainState.findPassengerByPNR(pnr);

        if (passenger) {
            trainState.recordAction(
                'APPLY_UPGRADE',
                pnr,
                { pnrStatus: 'RAC' },
                { pnrStatus: 'CNF', coach: acceptedNotification.offeredCoach, seat: acceptedNotification.offeredSeatNo },
                user.username
            );

            // ✅ SEND PUSH NOTIFICATION
            try {
                const PushNotificationService = require('../services/PushNotificationService');
                await PushNotificationService.notifyUpgrade(passenger);
                console.log(`📨 Push notification sent to ${passenger.Name}`);
            } catch (notifError) {
                console.error('⚠️ Failed to send push notification:', notifError);
            }
        }

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

    /**
     * Get action history (last 10 actions)
     */
    async getActionHistory(req, res) {
    try {
        const trainState = trainController.getGlobalTrainState();

        if (!trainState) {
            return res.status(400).json({
                success: false,
                message: "Train not initialized"
            });
        }

        const history = trainState.getActionHistory();

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error("❌ Error getting action history:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

    /**
     * Undo a specific action
     */
    async undoAction(req, res) {
    try {
        const { actionId } = req.body;
        const trainState = trainController.getGlobalTrainState();

        if (!trainState) {
            return res.status(400).json({
                success: false,
                message: "Train not initialized"
            });
        }

        if (!actionId) {
            return res.status(400).json({
                success: false,
                message: "Action ID is required"
            });
        }

        // Perform undo
        const result = await trainState.undoLastAction(actionId);

        // Broadcast update
        if (wsManager) {
            wsManager.broadcastTrainUpdate("ACTION_UNDONE", {
                actionId: actionId,
                action: result.action
            });
        }

        res.json({
            success: true,
            message: "Action undone successfully",
            data: result.action
        });
    } catch (error) {
        console.error("❌ Error undoing action:", error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * ===== OFFLINE UPGRADE MANAGEMENT =====
 * For passengers who are offline when upgrade offer is sent
 */

// In-memory queue for offline upgrades (could move to Redis/MongoDB later)
offlineUpgradesQueue = [];

    /**
     * Add a passenger to offline upgrades queue
     * Called when eligible passenger is offline
     */
    async addOfflineUpgrade(req, res) {
    try {
        const { pnr, berthDetails } = req.body;

        if (!pnr || !berthDetails) {
            return res.status(400).json({
                success: false,
                message: "PNR and berth details are required"
            });
        }

        const trainState = trainController.getGlobalTrainState();

        if (!trainState) {
            return res.status(400).json({
                success: false,
                message: "Train state not initialized"
            });
        }

        // Find passenger
        const passenger = trainState.racQueue.find(p => p.pnr === pnr);

        if (!passenger) {
            return res.status(404).json({
                success: false,
                message: "Passenger not found in RAC queue"
            });
        }

        // Check if already in queue
        const existingIndex = this.offlineUpgradesQueue.findIndex(u => u.pnr === pnr);

        const upgradeEntry = {
            id: `OFFLINE_${Date.now()}_${pnr}`,
            pnr: pnr,
            passengerName: passenger.name,
            currentStatus: passenger.pnrStatus,
            racNumber: passenger.racStatus,
            from: passenger.from,
            to: passenger.to,
            class: passenger.class,
            age: passenger.age,
            gender: passenger.gender,
            offeredBerth: `${berthDetails.coach}-${berthDetails.berthNo}`,
            coach: berthDetails.coach,
            berthNo: berthDetails.berthNo,
            berthType: berthDetails.type || 'Lower',
            addedAt: new Date().toISOString(),
            status: 'pending' // pending, confirmed, rejected
        };

        if (existingIndex !== -1) {
            // Update existing entry
            this.offlineUpgradesQueue[existingIndex] = upgradeEntry;
            console.log(`📝 Updated offline upgrade for ${passenger.name}`);
        } else {
            // Add new entry
            this.offlineUpgradesQueue.push(upgradeEntry);
            console.log(`➕ Added offline upgrade for ${passenger.name}`);
        }

        res.json({
            success: true,
            message: `Added ${passenger.name} to offline upgrades queue`,
            data: upgradeEntry
        });

    } catch (error) {
        console.error("❌ Error adding offline upgrade:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add offline upgrade",
            error: error.message
        });
    }
}

    /**
     * Get all pending offline upgrades
     * Called by TTE portal to show pending confirmations
     */
    async getOfflineUpgrades(req, res) {
    try {
        // Filter to show only pending upgrades
        const pendingUpgrades = this.offlineUpgradesQueue.filter(u => u.status === 'pending');

        res.json({
            success: true,
            data: {
                total: pendingUpgrades.length,
                upgrades: pendingUpgrades
            }
        });

    } catch (error) {
        console.error("❌ Error getting offline upgrades:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get offline upgrades",
            error: error.message
        });
    }
}

    /**
     * Confirm offline upgrade (TTE manual confirmation)
     * Triggers the actual upgrade process
     */
    async confirmOfflineUpgrade(req, res) {
    try {
        const { upgradeId } = req.body;

        if (!upgradeId) {
            return res.status(400).json({
                success: false,
                message: "Upgrade ID is required"
            });
        }

        // Find upgrade in queue
        const upgradeIndex = this.offlineUpgradesQueue.findIndex(u => u.id === upgradeId);

        if (upgradeIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Upgrade not found in queue"
            });
        }

        const upgrade = this.offlineUpgradesQueue[upgradeIndex];

        const trainState = trainController.getGlobalTrainState();

        if (!trainState) {
            return res.status(400).json({
                success: false,
                message: "Train state not initialized"
            });
        }

        // Apply the upgrade using existing reallocation logic
        const upgradResult = await ReallocationService.upgradeRACPassengerWithCoPassenger(
            upgrade.pnr,
            {
                coachNo: upgrade.coach,
                berthNo: upgrade.berthNo
            },
            trainState
        );

        if (upgradResult.success) {
            // Mark as confirmed in queue
            this.offlineUpgradesQueue[upgradeIndex].status = 'confirmed';
            this.offlineUpgradesQueue[upgradeIndex].confirmedAt = new Date().toISOString();

            // Broadcast update
            if (wsManager) {
                wsManager.broadcastStatsUpdate(trainState.stats);
            }

            console.log(`✅ TTE confirmed offline upgrade for ${upgrade.passengerName}`);

            res.json({
                success: true,
                message: `Successfully upgraded ${upgrade.passengerName}`,
                data: upgradResult
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Upgrade failed",
                error: upgradResult.error
            });
        }

    } catch (error) {
        console.error("❌ Error confirming offline upgrade:", error);
        res.status(500).json({
            success: false,
            message: "Failed to confirm offline upgrade",
            error: error.message
        });
    }
}

    /**
     * Reject offline upgrade
     */
    async rejectOfflineUpgrade(req, res) {
    try {
        const { upgradeId } = req.body;

        const upgradeIndex = this.offlineUpgradesQueue.findIndex(u => u.id === upgradeId);

        if (upgradeIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Upgrade not found"
            });
        }

        const upgrade = this.offlineUpgradesQueue[upgradeIndex];

        // Mark as rejected
        this.offlineUpgradesQueue[upgradeIndex].status = 'rejected';
        this.offlineUpgradesQueue[upgradeIndex].rejectedAt = new Date().toISOString();

        console.log(`❌ TTE rejected offline upgrade for ${upgrade.passengerName}`);

        res.json({
            success: true,
            message: `Rejected upgrade for ${upgrade.passengerName}`
        });

    } catch (error) {
        console.error("❌ Error rejecting offline upgrade:", error);
        res.status(500).json({
            success: false,
            message: "Failed to reject offline upgrade",
            error: error.message
        });
    }
}
}

module.exports = new TTEController();
