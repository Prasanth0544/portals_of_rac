const SeatPreferenceService = require('../../services/SeatPreferenceService');

describe('SeatPreferenceService', () => {
    let mockTrainState;

    beforeEach(() => {
        mockTrainState = {
            currentStationIdx: 0,
            stations: [
                { idx: 0, code: 'STA' },
                { idx: 1, code: 'STB' },
                { idx: 2, code: 'STC' }
            ],
            coaches: [
                {
                    coachNo: 'S1',
                    class: 'SL',
                    berths: [
                        {
                            berthNo: '1',
                            type: 'Lower',
                            segmentOccupancy: [null, null],
                            segments: [{ status: 'vacant' }, { status: 'vacant' }]
                        },
                        {
                            berthNo: '2',
                            type: 'Upper',
                            segmentOccupancy: [['P001'], null],
                            segments: [{ status: 'occupied' }, { status: 'vacant' }]
                        },
                        {
                            berthNo: '7',
                            type: 'Side Lower',
                            segmentOccupancy: [['RAC1'], ['RAC1', 'RAC2']],
                            segments: [{ status: 'vacant' }, { status: 'vacant' }]
                        }
                    ]
                }
            ],
            racQueue: [
                { pnr: 'P003', racStatus: 'RAC 1', passengerIndex: 1 }
            ]
        };
    });

    describe('calculatePriority', () => {
        it('should return SENIOR priority for age >= 60', () => {
            expect(SeatPreferenceService.calculatePriority({ age: 65 })).toBe(3);
            expect(SeatPreferenceService.calculatePriority({ Age: 60 })).toBe(3);
        });

        it('should return WOMAN priority for Female under 60', () => {
            expect(SeatPreferenceService.calculatePriority({ age: 30, gender: 'Female' })).toBe(2);
            expect(SeatPreferenceService.calculatePriority({ Age: 25, Gender: 'Female' })).toBe(2);
        });

        it('should return ADULT priority for Male >= 18 under 60', () => {
            expect(SeatPreferenceService.calculatePriority({ age: 30, gender: 'Male' })).toBe(1);
        });

        it('should return CHILD priority for age < 18', () => {
            expect(SeatPreferenceService.calculatePriority({ age: 10, gender: 'Male' })).toBe(0);
        });
    });

    describe('matchesPreference', () => {
        it('should match any preference if preference is No Preference or missing', () => {
            expect(SeatPreferenceService.matchesPreference('Lower', null)).toBe(true);
            expect(SeatPreferenceService.matchesPreference('Upper', 'No Preference')).toBe(true);
        });

        it('should match correctly for Lower Berth', () => {
            expect(SeatPreferenceService.matchesPreference('Lower Berth', 'Lower Berth')).toBe(true);
            expect(SeatPreferenceService.matchesPreference('LB', 'Lower Berth')).toBe(true);
            expect(SeatPreferenceService.matchesPreference('Upper', 'Lower Berth')).toBe(false);
        });

        it('should handle undefined berthType', () => {
            expect(SeatPreferenceService.matchesPreference(null, 'Lower Berth')).toBe(false);
        });
    });

    describe('getRecommendedPreference', () => {
        it('should recommend Lower Berth for seniors', () => {
            expect(SeatPreferenceService.getRecommendedPreference({ age: 65 })).toBe('Lower Berth');
        });

        it('should recommend Side Lower for females traveling alone (not senior)', () => {
            expect(SeatPreferenceService.getRecommendedPreference({ age: 30, gender: 'Female' })).toBe('Side Lower');
        });

        it('should recommend No Preference for young adults (18-39)', () => {
            expect(SeatPreferenceService.getRecommendedPreference({ age: 25, gender: 'Male' })).toBe('No Preference');
        });

        it('should recommend Lower Berth for middle-aged adults (40-59)', () => {
            expect(SeatPreferenceService.getRecommendedPreference({ age: 45, gender: 'Male' })).toBe('Lower Berth');
        });

        it('should recommend No Preference for children', () => {
            expect(SeatPreferenceService.getRecommendedPreference({ age: 10, gender: 'Male' })).toBe('No Preference');
        });
    });

    describe('isBerthAvailable', () => {
        it('should check availability using segmentOccupancy', () => {
            const berth = mockTrainState.coaches[0].berths[0];
            expect(SeatPreferenceService.isBerthAvailable(berth, 0, 2)).toBe(true);

            const occupiedBerth = mockTrainState.coaches[0].berths[1];
            expect(SeatPreferenceService.isBerthAvailable(occupiedBerth, 0, 1)).toBe(false);
        });

        it('should handle RAC berths allowance (up to 2 passengers)', () => {
            const sideLower = mockTrainState.coaches[0].berths[2];
            // segment 0 has 1 passenger -> available
            expect(SeatPreferenceService.isBerthAvailable(sideLower, 0, 1)).toBe(true);
            // segment 1 has 2 passengers -> not available
            expect(SeatPreferenceService.isBerthAvailable(sideLower, 1, 2)).toBe(false);
        });

        it('should check availability using segments array if segmentOccupancy missing', () => {
            const berth = { segments: [{ status: 'vacant' }, { status: 'occupied' }] };
            expect(SeatPreferenceService.isBerthAvailable(berth, 0, 1)).toBe(true);
            expect(SeatPreferenceService.isBerthAvailable(berth, 0, 2)).toBe(false);
        });

        it('should return true if neither array is present', () => {
            const berth = {};
            expect(SeatPreferenceService.isBerthAvailable(berth, 0, 1)).toBe(true);
        });
    });

    describe('findBestMatch', () => {
        it('should find an exact match if preference is found', () => {
            const passenger = { seatPreference: 'Lower Berth', Class: 'SL' };
            const result = SeatPreferenceService.findBestMatch(mockTrainState, passenger, 0, 2);

            expect(result.exactMatch).toBe(true);
            expect(result.match.berthNo).toBe('1');
        });

        it('should skip coaches with mismatched booking class', () => {
            const passenger = { seatPreference: 'Lower Berth', bookingClass: '3A' };
            const result = SeatPreferenceService.findBestMatch(mockTrainState, passenger, 0, 2);

            expect(result.exactMatch).toBe(false);
            expect(result.match).toBe(null);
        });

        it('should return first available if preference not met', () => {
            const passenger = { seatPreference: 'Upper Berth', Class: 'SL' };
            const result = SeatPreferenceService.findBestMatch(mockTrainState, passenger, 0, 2);

            // Berth 2 is occupied in segment 0. Berth 1 is first available, though it's Lower.
            expect(result.exactMatch).toBe(false);
            expect(result.match.berthNo).toBe('1');
        });
    });

    describe('sortByPriority', () => {
        it('should sort passengers by priority', () => {
            const passengers = [
                { age: 10, gender: 'Male' }, // CHILD = 0
                { age: 65, gender: 'Male' }, // SENIOR = 3
                { age: 30, gender: 'Female' } // WOMAN = 2
            ];

            const sorted = SeatPreferenceService.sortByPriority(passengers);

            expect(sorted[0].age).toBe(65);
            expect(sorted[1].age).toBe(30);
            expect(sorted[2].age).toBe(10);
        });

        it('should use explicit preferencePriority if provided', () => {
            const passengers = [
                { age: 65, preferencePriority: 1 },
                { age: 10, preferencePriority: 5 }
            ];

            const sorted = SeatPreferenceService.sortByPriority(passengers);

            expect(sorted[0].age).toBe(10); // Priority 5 > 1
        });
    });

    describe('findBestCoachForGroup', () => {
        it('should find best coach for a group', () => {
            const group = { passengers: [{ bookingClass: 'SL' }, { bookingClass: 'SL' }] };
            const coach = SeatPreferenceService.findBestCoachForGroup(mockTrainState, group);
            expect(coach).toBe('S1'); // S1 has 2 available berths (Berth 1 and Berth 7-RAC)
        });

        it('should return null if no coach matches class', () => {
            const group = { passengers: [{ Booking_Class: '3A' }] };
            const coach = SeatPreferenceService.findBestCoachForGroup(mockTrainState, group);
            expect(coach).toBeNull();
        });
    });

    describe('allocateGroupSeats', () => {
        it('should allocate seats for a group', async () => {
            const group = {
                passengers: [
                    { age: 65, seatPreference: 'Lower Berth', Class: 'SL', passengerIndex: 1 },
                    { age: 30, seatPreference: 'Upper Berth', Class: 'SL', passengerIndex: 2 }
                ]
            };

            const results = await SeatPreferenceService.allocateGroupSeats(mockTrainState, group);

            expect(results.length).toBe(2);
            expect(results[0].passenger.age).toBe(65); // Sorted by priority
            expect(results[0].preferenceMatched).toBe(true);
            expect(results[0].allocatedBerth.berthNo).toBe('1');
            expect(results[1].preferenceMatched).toBe(false); // No upper berth available
        });
    });

    describe('getPassengersInGroup', () => {
        it('should find passengers by PNR in berths and queue', () => {
            mockTrainState.coaches[0].berths[0].passengers = [
                { pnr: 'P003', name: 'John', passengerIndex: 2 },
                { pnr: 'P004' } // other PNR
            ];

            const passengers = SeatPreferenceService.getPassengersInGroup(mockTrainState, 'P003');

            expect(passengers.length).toBe(2); // 1 in berth, 1 in queue
            expect(passengers[0].passengerIndex).toBe(1); // queue passenger
            expect(passengers[1].passengerIndex).toBe(2); // berth passenger
        });
    });

    describe('getBookingGroupSummary', () => {
        it('should return null if no passengers found', () => {
            expect(SeatPreferenceService.getBookingGroupSummary(mockTrainState, 'NONEXISTENT')).toBeNull();
        });

        it('should compile stats for group', () => {
            // Setup group
            mockTrainState.coaches[0].berths[0].passengers = [
                { pnr: 'P003', name: 'John', onboard: true, pnrStatus: 'CNF', Is_Group_Leader: true, IRCTC_ID: 'IR1' }
            ];
            // Queue has 1 RAC

            const summary = SeatPreferenceService.getBookingGroupSummary(mockTrainState, 'P003');

            expect(summary).not.toBeNull();
            expect(summary.totalPassengers).toBe(2);
            expect(summary.irctcId).toBe('IR1');
            expect(summary.stats.cnf).toBe(1);
        });
    });
});
