const { createAllIndexes, dropAllIndexes, rebuildIndexes, getIndexStats } = require('../../utils/create-indexes');
const db = require('../../config/db');

jest.mock('../../config/db');

describe('create-indexes', () => {
    let mockCollection;

    beforeEach(() => {
        jest.clearAllMocks();

        // Silence console logs
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});

        mockCollection = {
            createIndex: jest.fn().mockResolvedValue(true),
            dropAllIndexes: jest.fn().mockResolvedValue(true),
            aggregate: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue([{ name: 'idx_1', accesses: { ops: 5 } }])
            })
        };

        db.getPassengersCollection = jest.fn().mockReturnValue(mockCollection);
        db.getBeerthsCollection = jest.fn().mockReturnValue(mockCollection);
        db.getTrainCollection = jest.fn().mockReturnValue(mockCollection);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createAllIndexes', () => {
        it('should return safely if collections not initialized', async () => {
            db.getPassengersCollection.mockReturnValue(null);
            await createAllIndexes();
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Collections not initialized'));
        });

        it('should create all required indexes on all collections', async () => {
            const result = await createAllIndexes();
            expect(result).toBe(true);
            expect(mockCollection.createIndex).toHaveBeenCalledTimes(17);
        });

        it('should handle errors gracefully returning false in development', async () => {
            const tempNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            
            mockCollection.createIndex.mockRejectedValue(new Error('Index error'));
            const result = await createAllIndexes();
            
            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalled();
            
            process.env.NODE_ENV = tempNodeEnv;
        });

        it('should throw error in non-development', async () => {
            const tempNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            
            mockCollection.createIndex.mockRejectedValue(new Error('Index error'));
            await expect(createAllIndexes()).rejects.toThrow('Index error');
            
            process.env.NODE_ENV = tempNodeEnv;
        });
    });

    describe('dropAllIndexes', () => {
        it('should drop all indexes on Collections', async () => {
            const result = await dropAllIndexes();
            expect(result).toBe(true);
            expect(mockCollection.dropAllIndexes).toHaveBeenCalledTimes(3);
        });

        it('should ignore null collections without failing', async () => {
            db.getBeerthsCollection.mockReturnValue(null);
            db.getTrainCollection.mockReturnValue(null);

            const result = await dropAllIndexes();
            expect(result).toBe(true);
            expect(mockCollection.dropAllIndexes).toHaveBeenCalledTimes(1);
        });

        it('should handle errors gracefully', async () => {
            mockCollection.dropAllIndexes.mockRejectedValue(new Error('Drop error'));
            const result = await dropAllIndexes();
            
            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('rebuildIndexes', () => {
        it('should call drop and create', async () => {
            // we can test that it succeeds overall since drop and create respond true
            const result = await rebuildIndexes();
            expect(result).toBe(true);
        });

        it('should handle rebuild errors gracefully (by createAllIndexes throwing)', async () => {
            // Because dropAllIndexes catches and returns false, rebuildIndexes will only catch
            // if createAllIndexes throws (which it does when NODE_ENV !== 'development').
            const tempNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            
            mockCollection.createIndex.mockRejectedValue(new Error('Index error'));
            
            const result = await rebuildIndexes();
            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalled();
            
            process.env.NODE_ENV = tempNodeEnv;
        });
    });

    describe('getIndexStats', () => {
        it('should retrieve index stats from passenger collection', async () => {
            const result = await getIndexStats();
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].name).toBe('idx_1');
        });

        it('should return null on error', async () => {
            mockCollection.aggregate.mockImplementation(() => {
                throw new Error('Aggregate error');
            });

            const result = await getIndexStats();
            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalled();
        });
    });
});
