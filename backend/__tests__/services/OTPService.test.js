/**
 * OTPService Tests
 * Tests for OTP generation only (sendOTP requires full email config)
 */

const OTPService = require('../../services/OTPService');

describe('OTPService', () => {
    describe('generateOTP', () => {
        it('should generate a 6-digit OTP', () => {
            const otp = OTPService.generateOTP();
            expect(otp).toMatch(/^\d{6}$/);
            expect(otp.length).toBe(6);
        });

        it('should generate numeric OTP only', () => {
            const otp = OTPService.generateOTP();
            expect(parseInt(otp, 10)).not.toBeNaN();
        });

        it('should generate OTP within valid range (100000-999999)', () => {
            for (let i = 0; i < 50; i++) {
                const otp = parseInt(OTPService.generateOTP(), 10);
                expect(otp).toBeGreaterThanOrEqual(100000);
                expect(otp).toBeLessThanOrEqual(999999);
            }
        });

        it('should generate different OTPs across multiple calls', () => {
            const otps = new Set();
            for (let i = 0; i < 20; i++) {
                otps.add(OTPService.generateOTP());
            }
            // With high probability, we should have at least some unique values
            expect(otps.size).toBeGreaterThan(5);
        });
    });
});
