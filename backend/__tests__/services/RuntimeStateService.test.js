const db = require('../../config/db');
const RuntimeStateService = require('../../services/RuntimeStateService');

jest.mock('../../config/db');

describe('RuntimeStateService', () => {
    let collection;

    beforeEach(() => {
        jest.clearAllMocks();
        collection = {
            updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
            findOne: jest.fn(),
            deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
            deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 })
        };
    });

    describe('saveState', () => {
        it('returns false when passengers DB is unavailable', async () => {
            db.getPassengersDb.mockReturnValue(null);
            const result = await RuntimeStateService.saveState({ trainNo: '17225' });
            expect(result).toBe(false);
        });

        it('saves state successfully with defaults', async () => {
            db.getPassengersDb.mockReturnValue({ collection: jest.fn().mockReturnValue(collection) });
            const result = await RuntimeStateService.saveState({ trainNo: '17225', journeyDate: '2025-12-20' });

            expect(collection.updateOne).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('returns false when save throws', async () => {
            db.getPassengersDb.mockReturnValue({ collection: jest.fn().mockReturnValue(collection) });
            collection.updateOne.mockRejectedValue(new Error('save failed'));
            const result = await RuntimeStateService.saveState({ trainNo: '17225', journeyDate: '2025-12-20' });
            expect(result).toBe(false);
        });
    });

    describe('loadState', () => {
        it('returns null when passengers DB is unavailable', async () => {
            db.getPassengersDb.mockReturnValue(null);
            const result = await RuntimeStateService.loadState('17225', '2025-12-20');
            expect(result).toBeNull();
        });

        it('returns normalized state when document exists', async () => {
            db.getPassengersDb.mockReturnValue({ collection: jest.fn().mockReturnValue(collection) });
            collection.findOne.mockResolvedValue({
                journeyStarted: true,
                currentStationIdx: 3,
                engineRunning: true,
                lastTickAt: new Date('2025-12-20T10:00:00.000Z')
            });

            const result = await RuntimeStateService.loadState('17225', '2025-12-20');
            expect(result).toEqual(expect.objectContaining({
                journeyStarted: true,
                currentStationIdx: 3,
                engineRunning: true
            }));
        });

        it('returns null when document does not exist', async () => {
            db.getPassengersDb.mockReturnValue({ collection: jest.fn().mockReturnValue(collection) });
            collection.findOne.mockResolvedValue(null);

            const result = await RuntimeStateService.loadState('17225', '2025-12-20');
            expect(result).toBeNull();
        });

        it('returns null when load throws', async () => {
            db.getPassengersDb.mockReturnValue({ collection: jest.fn().mockReturnValue(collection) });
            collection.findOne.mockRejectedValue(new Error('load failed'));
            const result = await RuntimeStateService.loadState('17225', '2025-12-20');
            expect(result).toBeNull();
        });
    });

    describe('clearState', () => {
        it('returns false when passengers DB is unavailable', async () => {
            db.getPassengersDb.mockReturnValue(null);
            const result = await RuntimeStateService.clearState('17225');
            expect(result).toBe(false);
        });

        it('clears state for a specific train', async () => {
            db.getPassengersDb.mockReturnValue({ collection: jest.fn().mockReturnValue(collection) });
            const result = await RuntimeStateService.clearState('17225');
            expect(collection.deleteOne).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('clears all runtime states when trainNo is not provided', async () => {
            db.getPassengersDb.mockReturnValue({ collection: jest.fn().mockReturnValue(collection) });
            const result = await RuntimeStateService.clearState();
            expect(collection.deleteMany).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('returns false when clear throws', async () => {
            db.getPassengersDb.mockReturnValue({ collection: jest.fn().mockReturnValue(collection) });
            collection.deleteOne.mockRejectedValue(new Error('clear failed'));
            const result = await RuntimeStateService.clearState('17225');
            expect(result).toBe(false);
        });
    });
});
