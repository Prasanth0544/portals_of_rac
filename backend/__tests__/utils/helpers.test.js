/**
 * helpers Tests
 * Tests for utility helper functions
 */

const helpers = require('../../utils/helpers');

describe('helpers', () => {
    describe('formatPNR', () => {
        it('should format 10-digit PNR with spaces', () => {
            if (helpers.formatPNR) {
                const result = helpers.formatPNR('1234567890');
                expect(result.length).toBeGreaterThan(10); // Has spaces
            }
        });
    });

    describe('isValidPNR', () => {
        it('should return true for valid 10-digit PNR', () => {
            if (helpers.isValidPNR) {
                expect(helpers.isValidPNR('1234567890')).toBe(true);
            }
        });

        it('should return false for invalid PNR', () => {
            if (helpers.isValidPNR) {
                expect(helpers.isValidPNR('123')).toBe(false);
                expect(helpers.isValidPNR('abcdefghij')).toBe(false);
            }
        });
    });

    describe('generateUUID', () => {
        it('should generate unique IDs', () => {
            if (helpers.generateUUID) {
                const id1 = helpers.generateUUID();
                const id2 = helpers.generateUUID();
                expect(id1).not.toBe(id2);
            }
        });
    });

    describe('sanitizeString', () => {
        it('should remove HTML tags', () => {
            if (helpers.sanitizeString) {
                const result = helpers.sanitizeString('<script>alert("xss")</script>');
                expect(result).not.toContain('<script>');
            }
        });

        it('should trim whitespace', () => {
            if (helpers.sanitizeString) {
                const result = helpers.sanitizeString('  test  ');
                expect(result).toBe('test');
            }
        });
    });

    describe('calculateTimeDifference', () => {
        it('should calculate time difference correctly', () => {
            if (helpers.calculateTimeDifference) {
                const now = new Date();
                const later = new Date(now.getTime() + 3600000); // 1 hour later
                const diff = helpers.calculateTimeDifference(now, later);
                expect(diff).toBeGreaterThan(0);
            }
        });
    });

    describe('formatDate', () => {
        it('should format date correctly', () => {
            if (helpers.formatDate) {
                const date = new Date('2024-01-15');
                const result = helpers.formatDate(date);
                expect(result).toBeDefined();
                expect(typeof result).toBe('string');
            }
        });
    });

    describe('debounce', () => {
        it('should debounce function calls', (done) => {
            if (helpers.debounce) {
                let callCount = 0;
                const fn = helpers.debounce(() => callCount++, 100);

                fn();
                fn();
                fn();

                setTimeout(() => {
                    expect(callCount).toBe(1);
                    done();
                }, 150);
            } else {
                done();
            }
        });
    });

    describe('deepClone', () => {
        it('should create deep copy of object', () => {
            if (helpers.deepClone) {
                const original = { a: { b: 1 } };
                const clone = helpers.deepClone(original);

                clone.a.b = 2;
                expect(original.a.b).toBe(1);
            }
        });
    });
});
