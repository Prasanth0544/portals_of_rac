/**
 * ReallocationService.js (REFACTORED)
 * Main orchestrator for RAC reallocation operations
 * Delegates to specialized services for specific tasks
 */

const db = require("../config/db");
const wsManager = require("../config/websocket");
const UpgradeNotificationService = require("./UpgradeNotificationService");
const logger = require("../utils/logger");

// Import specialized services
const NoShowService = require("./reallocation/NoShowService");
const VacancyService = require("./reallocation/VacancyService");
const EligibilityService = require("./reallocation/EligibilityService");
const RACQueueService = require("./reallocation/RACQueueService");
const AllocationService = require("./reallocation/AllocationService");

class ReallocationService {
  async markNoShow(trainState, pnr) {
    return NoShowService.markNoShow(trainState, pnr);
  }

  getRACQueue(trainState) {
    return RACQueueService.getRACQueue(trainState);
  }

  getVacantBerths(trainState) {
    return VacancyService.getVacantBerths(trainState);
  }

  searchPassenger(trainState, pnr) {
    return RACQueueService.searchPassenger(trainState, pnr);
  }

  isEligibleForSegment(racPassenger, vacantSegment, trainState, currentStationIdx) {
    return EligibilityService.isEligibleForSegment(racPassenger, vacantSegment, trainState, currentStationIdx);
  }

  calculateJourneyDistance(fromStation, toStation, trainState) {
    return EligibilityService.calculateJourneyDistance(fromStation, toStation, trainState);
  }

  checkConflictingCNFPassenger(vacantSegment, trainState) {
    return EligibilityService.checkConflictingCNFPassenger(vacantSegment, trainState);
  }

  findCoPassenger(racPassenger, trainState) {
    return EligibilityService.findCoPassenger(racPassenger, trainState);
  }

  getEligibleRACForVacantSegment(trainState, vacantSegment, currentStationIdx) {
    return EligibilityService.getEligibleRACForVacantSegment(trainState, vacantSegment, currentStationIdx);
  }

  async applyReallocation(trainState, allocations) {
    return AllocationService.applyReallocation(trainState, allocations);
  }

  async upgradeRACPassengerWithCoPassenger(racPNR, newBerthDetails, trainState) {
    return AllocationService.upgradeRACPassengerWithCoPassenger(racPNR, newBerthDetails, trainState);
  }

  /**
   * Process a vacant berth to send upgrade offers to eligible RAC passengers
   * Called when a berth becomes vacant (e.g., no-show)
   */
  async processVacancyForUpgrade(trainState, vacantBerthInfo, currentStation) {
    try {
      // Validate inputs
      if (!trainState) {
        console.error('❌ processVacancyForUpgrade: trainState is null');
        return { error: 'Train state not initialized', offersCreated: 0 };
      }

      if (!vacantBerthInfo || !vacantBerthInfo.fullBerthNo) {
        console.error('❌ processVacancyForUpgrade: Invalid vacantBerthInfo', vacantBerthInfo);
        return { error: 'Invalid vacant berth information', offersCreated: 0 };
      }

      if (!currentStation) {
        console.error('❌ processVacancyForUpgrade: currentStation is null');
        return { error: 'Current station not provided', offersCreated: 0 };
      }

      logger.debug(`Processing vacancy for upgrade: ${vacantBerthInfo.fullBerthNo}`);
      logger.debug(`At station: ${currentStation.name} (${currentStation.code})`);

      // Find eligible RAC passengers (using loop since hasDeniedBerth is async)
      const eligibleRAC = [];
      for (const rac of trainState.racQueue) {
        // Must be boarded and online
        if (!rac.boarded) continue;
        if (rac.passengerStatus !== 'Online') continue;

        // Check if passenger already denied this specific berth
        if (await UpgradeNotificationService.hasDeniedBerth(rac.pnr, vacantBerthInfo.fullBerthNo)) {
          logger.debug(`Skipping ${rac.name} - previously denied ${vacantBerthInfo.fullBerthNo}`);
          continue;
        }

        eligibleRAC.push(rac);
      }

      logger.debug(`Found ${eligibleRAC.length} eligible RAC passenger(s)`);

      // Create notifications for eligible passengers
      let offersCreated = 0;
      const InAppNotificationService = require('./InAppNotificationService');

      for (const racPassenger of eligibleRAC) {
        try {
          const notification = await UpgradeNotificationService.createUpgradeNotification(
            racPassenger,
            vacantBerthInfo,
            currentStation
          );

          if (notification) {
            offersCreated++;
            logger.info(`Created upgrade offer for ${racPassenger.name} (${racPassenger.pnr})`);

            // Create in-app notification
            if (racPassenger.irctcId) {
              await InAppNotificationService.createNotification(
                racPassenger.irctcId,
                'UPGRADE_OFFER',
                {
                  pnr: racPassenger.pnr,
                  berth: vacantBerthInfo.fullBerthNo,
                  coach: vacantBerthInfo.coachNo,
                  berthType: vacantBerthInfo.type,
                  offerId: notification.id,
                  message: `Upgrade offer available: ${vacantBerthInfo.fullBerthNo}`
                }
              );


              // Send browser push notification
              const WebPushService = require('./WebPushService');

              if (racPassenger.passengerStatus === 'Online') {
                // Online passenger -> send to passenger portal
                await WebPushService.sendPushNotification(
                  racPassenger.irctcId,
                  {
                    title: '🎉 Upgrade Offer Available!',
                    body: `Berth ${vacantBerthInfo.fullBerthNo} in ${vacantBerthInfo.coachNo} is available!`,
                    url: 'http://localhost:5175/#/upgrade-offers',
                    tag: `upgrade-${racPassenger.pnr}`
                  }
                );
                logger.debug(`Push sent to Online passenger ${racPassenger.pnr}`);
              } else {
                // Offline passenger -> broadcast to all TTEs
                await WebPushService.sendPushToAllTTEs({
                  title: '📋 Offline Passenger Upgrade',
                  body: `${racPassenger.name} (PNR: ${racPassenger.pnr}) - ${vacantBerthInfo.fullBerthNo}`,
                  url: 'http://localhost:5173/#/upgrade-notifications',
                  tag: `tte-upgrade-${racPassenger.pnr}`
                });
                logger.debug(`Push to TTE for offline ${racPassenger.pnr}`);
              }

            }
          }
        } catch (notifError) {
          console.error(`   ❌ Failed to create notification for ${racPassenger.pnr}:`, notifError.message);
        }
      }

      return { offersCreated, error: null };
    } catch (error) {
      console.error('❌ Error in processVacancyForUpgrade:', error);
      return { error: error.message, offersCreated: 0 };
    }
  }


  /**
   * Get Stage 1 eligibility matrix - shows RAC passengers passing basic constraints
   * Returns: Array of vacant berths with stage1Eligible passengers
   */
  getStage1Eligible(trainState) {
    try {
      const vacantSegments = VacancyService.getVacantSegments(trainState);
      const currentStationIdx = trainState.currentStationIdx || 0;
      const stage1Matrix = [];

      vacantSegments.forEach((vacantSegment) => {
        const stage1Eligible = EligibilityService.getStage1EligibleRAC(
          vacantSegment,
          currentStationIdx,
          trainState
        );

        if (stage1Eligible.length > 0) {
          stage1Matrix.push({
            berth: `${vacantSegment.coachNo}-${vacantSegment.berthNo}`,
            coach: vacantSegment.coachNo,
            berthNo: vacantSegment.berthNo,
            type: vacantSegment.type,
            berthType: vacantSegment.type,
            class: vacantSegment.class,
            vacantFrom: trainState.stations?.[vacantSegment.fromIdx]?.name || vacantSegment.from,
            vacantTo: trainState.stations?.[vacantSegment.toIdx]?.name || vacantSegment.to,
            vacantFromIdx: vacantSegment.fromIdx,
            vacantToIdx: vacantSegment.toIdx,
            stage1Eligible: stage1Eligible,
            stage1Count: stage1Eligible.length,
          });
        }
      });

      return stage1Matrix;
    } catch (error) {
      console.error('Error generating Stage 1 matrix:', error);
      return [];
    }
  }

  /**
   * Get Stage 2 results - three separate lists (online, offline, not eligible)
   * Returns: Object with onlineEligible, offlineEligible, notEligible arrays
   */
  getStage2Results(trainState, vacantBerthData) {
    try {
      const currentStationIdx = trainState.currentStationIdx || 0;

      // Find the vacant segment
      const vacantSegments = VacancyService.getVacantSegments(trainState);
      const vacantSegment = vacantSegments.find(
        seg => seg.coachNo === vacantBerthData.coach &&
          seg.berthNo === vacantBerthData.berthNo
      );

      if (!vacantSegment) {
        return {
          onlineEligible: [],
          offlineEligible: [],
          notEligible: [],
          error: 'Vacant berth not found'
        };
      }

      // Get Stage 1 eligible first
      const stage1Eligible = EligibilityService.getStage1EligibleRAC(
        vacantSegment,
        currentStationIdx,
        trainState
      );

      // Apply Stage 2 filtering
      const stage2Results = EligibilityService.getStage2Results(
        stage1Eligible,
        vacantSegment,
        currentStationIdx,
        trainState
      );

      return {
        berth: `${vacantSegment.coachNo}-${vacantSegment.berthNo}`,
        coach: vacantSegment.coachNo,
        berthNo: vacantSegment.berthNo,
        type: vacantSegment.type,
        class: vacantSegment.class,
        vacantFrom: trainState.stations?.[vacantSegment.fromIdx]?.name || vacantSegment.from,
        vacantTo: trainState.stations?.[vacantSegment.toIdx]?.name || vacantSegment.to,
        ...stage2Results,
      };
    } catch (error) {
      console.error('Error generating Stage 2 results:', error);
      return {
        onlineEligible: [],
        offlineEligible: [],
        notEligible: [],
        error: error.message
      };
    }
  }

  /**
   * LEGACY: Get eligibility matrix - shows which RAC passengers are eligible for each vacant berth
   * NOTE: This uses the OLD single-stage logic. Use getStage1Eligible() for new UI.
   */
  getEligibilityMatrix(trainState) {
    try {
      const vacantSegments = VacancyService.getVacantSegments(trainState);
      const currentStationIdx = trainState.currentStationIdx || 0;
      const eligibilityMatrix = [];

      vacantSegments.forEach((vacantSegment) => {
        const stage1Eligible = EligibilityService.getStage1EligibleRAC(
          vacantSegment,
          currentStationIdx,
          trainState
        );

        if (stage1Eligible.length > 0) {
          eligibilityMatrix.push({
            berth: `${vacantSegment.coachNo}-${vacantSegment.berthNo}`,
            coach: vacantSegment.coachNo,
            berthNo: vacantSegment.berthNo,
            type: vacantSegment.type,
            berthType: vacantSegment.type,
            class: vacantSegment.class,
            vacantFrom: trainState.stations?.[vacantSegment.fromIdx]?.code || vacantSegment.from,
            vacantTo: trainState.stations?.[vacantSegment.toIdx]?.code || vacantSegment.to,
            vacantFromIdx: vacantSegment.fromIdx,
            vacantToIdx: vacantSegment.toIdx,
            vacantSegment: `${trainState.stations?.[vacantSegment.fromIdx]?.name || vacantSegment.from} → ${trainState.stations?.[vacantSegment.toIdx]?.name || vacantSegment.to}`,
            eligibleRAC: stage1Eligible,
            eligibleCount: stage1Eligible.length,
            topEligible: stage1Eligible[0], // Highest priority passenger
            topCandidate: stage1Eligible[0], // Compatibility field
          });
        }
      });

      return eligibilityMatrix;
    } catch (error) {
      console.error('Error generating eligibility matrix:', error);
      return [];
    }
  }

  getRACStats(trainState) {
    return RACQueueService.getRACStats(trainState);
  }
}

module.exports = new ReallocationService();

