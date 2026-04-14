// backend/__tests__/services/CrossClassUpgradeService.test.js

const CrossClassUpgradeService = require('../../services/CrossClassUpgradeService');
const VacancyService = require('../../services/reallocation/VacancyService');

jest.mock('../../services/reallocation/VacancyService');

describe('CrossClassUpgradeService', () => {
    let mockTrainState;
    let mockDb;

    beforeEach(() => {
        jest.clearAllMocks();

        mockTrainState = {
            currentStationIdx: 1,
            stations: [
                { name: 'Station A', distance: 0 },
                { name: 'Station B', distance: 100 },
                { name: 'Station C', distance: 250 },
                { name: 'Station D', distance: 400 }
            ],
            racQueue: [
                {
                    pnr: 'P001',
                    name: 'John Doe',
                    age: 30,
                    gender: 'M',
                    racStatus: 'RAC 1',
                    class: 'SL',
                    from: 'Station B',
                    to: 'Station D',
                    fromIdx: 1,
                    toIdx: 3,
                    pnrStatus: 'RAC',
                    boarded: true,
                    noShow: false,
                    coach: 'S1',
                    berth: 'S1-15'
                },
                {
                    pnr: 'P002',
                    class: '3A', // Non-SL RAC shouldn't be eligible
                    pnrStatus: 'RAC',
                    boarded: true,
                    noShow: false
                }
            ],
            coaches: [
                {
                    class: 'SL',
                    coachNo: 'S1',
                    berths: [
                        {
                            berthNo: 15,
                            segmentOccupancy: [
                                ['P999'],       // idx 0
                                ['P001'],       // idx 1
                                ['P001'],       // idx 2
                                []              // idx 3
                            ]
                        }
                    ]
                },
                {
                    class: 'AC_3_Tier',
                    coachNo: 'B1',
                    berths: [
                        {
                            berthNo: 42,
                            segmentOccupancy: [
                                [], [], [], [] // all vacant
                            ]
                        }
                    ]
                }
            ]
        };

        mockDb = {
            getPassengersCollection: jest.fn().mockReturnValue({
                updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 })
            })
        };
    });

    describe('_getKm', () => {
        it('should return 0 for invalid index', () => {
            expect(CrossClassUpgradeService._getKm(mockTrainState.stations, 99)).toBe(0);
        });
    });

    describe('_remainingKm', () => {
        it('should calculate remaining distance correctly', () => {
            expect(CrossClassUpgradeService._remainingKm(mockTrainState.stations, 1, 3)).toBe(300);
        });

        it('should return 0 if toIdx is before currentIdx', () => {
            expect(CrossClassUpgradeService._remainingKm(mockTrainState.stations, 3, 1)).toBe(0);
        });
    });

    describe('_roundCost', () => {
        it('should round to nearest 10', () => {
            expect(CrossClassUpgradeService._roundCost(25)).toBe(30);
            expect(CrossClassUpgradeService._roundCost(24)).toBe(20);
            expect(CrossClassUpgradeService._roundCost(253)).toBe(250);
        });
    });

    describe('getEligibleUpgrades', () => {
        it('should return empty array if no eligible RAC passengers', () => {
            mockTrainState.racQueue = [];
            expect(CrossClassUpgradeService.getEligibleUpgrades(mockTrainState)).toEqual([]);
        });

        it('should return empty array if no vacant berths in AC', () => {
            VacancyService.getVacantBerths.mockReturnValue([]);
            expect(CrossClassUpgradeService.getEligibleUpgrades(mockTrainState)).toEqual([]);
        });

        it('should calculate upgrades correctly', () => {
            VacancyService.getVacantBerths.mockReturnValue([
                {
                    coach: 'B1',
                    berthNo: 42,
                    type: 'Upper',
                    class: 'AC_3_Tier',
                    fromIdx: 0,
                    toIdx: 3,
                    berth: 'B1-42'
                }
            ]);

            const upgrades = CrossClassUpgradeService.getEligibleUpgrades(mockTrainState);
            expect(upgrades).toHaveLength(1);
            expect(upgrades[0].passenger.pnr).toBe('P001');
            expect(upgrades[0].targetClass).toBe('AC_3_Tier');
            expect(upgrades[0].remainingKm).toBe(300); // 400 - 100
            expect(upgrades[0].cost).toBe(600); // 300 * 2 = 600
        });
    });

    describe('getUpgradeOptionsForPassenger', () => {
        it('should group options by target class for a passenger', () => {
            mockTrainState.racQueue[0].irctcId = 'USER123';
            VacancyService.getVacantBerths.mockReturnValue([
                {
                    coach: 'B1',
                    berthNo: 42,
                    class: 'AC_3_Tier',
                    fromIdx: 0,
                    toIdx: 3
                },
                {
                    coach: 'A1',
                    berthNo: 12,
                    class: 'AC_2_Tier',
                    fromIdx: 1,
                    toIdx: 4
                }
            ]);

            const result = CrossClassUpgradeService.getUpgradeOptionsForPassenger(mockTrainState, 'user123');
            expect(result.hasOptions).toBe(true);
            expect(Object.keys(result.options)).toHaveLength(2);
            expect(result.options['AC_3_Tier']).toHaveLength(1);
            expect(result.options['AC_2_Tier']).toHaveLength(1);
        });

        it('should return no options for passenger mismatch', () => {
            mockTrainState.racQueue[0].irctcId = 'USER123';
            VacancyService.getVacantBerths.mockReturnValue([]);
            const result = CrossClassUpgradeService.getUpgradeOptionsForPassenger(mockTrainState, 'USER999');
            expect(result.hasOptions).toBe(false);
        });
    });

    describe('applyUpgrade', () => {
        it('should throw error if passenger not found', async () => {
            await expect(CrossClassUpgradeService.applyUpgrade(mockTrainState, 'P999', 'B1', 42, mockDb))
                .rejects.toThrow(/Passenger P999 not found/);
        });

        it('should throw error if target coach not found', async () => {
            await expect(CrossClassUpgradeService.applyUpgrade(mockTrainState, 'P001', 'X1', 42, mockDb))
                .rejects.toThrow(/Coach X1 not found/);
        });

        it('should throw error if target berth not found', async () => {
            await expect(CrossClassUpgradeService.applyUpgrade(mockTrainState, 'P001', 'B1', 99, mockDb))
                .rejects.toThrow(/Berth 99 not found/);
        });

        it('should successfully apply upgrade and update DB', async () => {
            const result = await CrossClassUpgradeService.applyUpgrade(mockTrainState, 'P001', 'B1', 42, mockDb);
            
            expect(result.success).toBe(true);
            expect(result.to.coach).toBe('B1');
            
            // Should be removed from SL occupancy
            const slCoach = mockTrainState.coaches.find(c => c.coachNo === 'S1');
            expect(slCoach.berths[0].segmentOccupancy[1]).not.toContain('P001');

            // Should be added to AC occupancy
            const acCoach = mockTrainState.coaches.find(c => c.coachNo === 'B1');
            expect(acCoach.berths[0].segmentOccupancy[1]).toContain('P001');

            // Should be removed from RAC queue
            expect(mockTrainState.racQueue.find(p => p.pnr === 'P001')).toBeUndefined();

            // Should call DB update
            expect(mockDb.getPassengersCollection().updateOne).toHaveBeenCalledWith(
                { PNR_Number: 'P001' },
                expect.objectContaining({
                    $set: expect.objectContaining({
                        Assigned_Coach: 'B1',
                        Class: 'AC_3_Tier',
                        Cross_Class_Upgraded: true
                    })
                })
            );
        });

        it('should handle db error silently', async () => {
            mockDb.getPassengersCollection().updateOne.mockRejectedValue(new Error('DB Error'));
            
            const result = await CrossClassUpgradeService.applyUpgrade(mockTrainState, 'P001', 'B1', 42, mockDb);
            expect(result.success).toBe(true); // Should not throw
        });
    });
});
