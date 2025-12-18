/**
 * NotificationService Tests - Comprehensive Coverage
 * Tests for email and SMS notification service using nodemailer and Twilio
 */

const NotificationService = require('../../services/NotificationService');

jest.mock('nodemailer');
jest.mock('twilio');

const nodemailer = require('nodemailer');
const twilio = require('twilio');

describe('NotificationService - Comprehensive Tests', () => {
    let mockTransporter;
    let mockTwilioClient;

    beforeEach(() => {
        jest.clearAllMocks();

        mockTransporter = {
            sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
        };

        mockTwilioClient = {
            messages: {
                create: jest.fn().mockResolvedValue({ sid: 'test-sms-sid' })
            }
        };

        nodemailer.createTransport.mockReturnValue(mockTransporter);
        twilio.mockReturnValue(mockTwilioClient);

        process.env.EMAIL_USER = 'test@example.com';
        process.env.EMAIL_PASSWORD = 'password';
        process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
        process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
        process.env.TWILIO_PHONE_NUMBER = '+1234567890';

        NotificationService.emailTransporter = mockTransporter;
        NotificationService.twilioClient = mockTwilioClient;
    });

    describe('sendUpgradeNotification', () => {
        it('should send both email and SMS successfully', async () => {
            const passenger = {
                name: 'John Doe',
                email: 'john@example.com',
                mobile: '+919876543210',
                pnr: 'P001'
            };
            const oldStatus = 'RAC-15';
            const newBerth = {
                fullBerthNo: 'S1-15',
                coachNo: 'S1',
                berthNo: '15',
                type: 'Lower'
            };

            const result = await NotificationService.sendUpgradeNotification(passenger, oldStatus, newBerth);

            expect(result.email.sent).toBe(true);
            expect(result.sms.sent).toBe(true);
            expect(mockTransporter.sendMail).toHaveBeenCalled();
            expect(mockTwilioClient.messages.create).toHaveBeenCalled();
        });

        it('should handle email-only when mobile not provided', async () => {
            const passenger = {
                name: 'John Doe',
                email: 'john@example.com',
                pnr: 'P001'
            };
            const newBerth = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };

            const result = await NotificationService.sendUpgradeNotification(passenger, 'RAC', newBerth);

            expect(result.email.sent).toBe(true);
            expect(result.sms.sent).toBe(false);
            expect(mockTwilioClient.messages.create).not.toHaveBeenCalled();
        });

        it('should handle SMS-only when email not provided', async () => {
            const passenger = {
                name: 'John Doe',
                mobile: '+919876543210',
                pnr: 'P001'
            };
            const newBerth = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };

            const result = await NotificationService.sendUpgradeNotification(passenger, 'RAC', newBerth);

            expect(result.email.sent).toBe(false);
            expect(result.sms.sent).toBe(true);
            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
        });

        it('should handle email failure gracefully', async () => {
            mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

            const passenger = {
                name: 'John Doe',
                email: 'john@example.com',
                mobile: '+919876543210',
                pnr: 'P001'
            };
            const newBerth = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };

            const result = await NotificationService.sendUpgradeNotification(passenger, 'RAC', newBerth);

            expect(result.email.sent).toBe(false);
            expect(result.email.error).toBe('SMTP error');
            expect(result.sms.sent).toBe(true);
        });

        it('should handle SMS failure gracefully', async () => {
            mockTwilioClient.messages.create.mockRejectedValue(new Error('Twilio error'));

            const passenger = {
                name: 'John Doe',
                email: 'john@example.com',
                mobile: '+919876543210',
                pnr: 'P001'
            };
            const newBerth = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };

            const result = await NotificationService.sendUpgradeNotification(passenger, 'RAC', newBerth);

            expect(result.email.sent).toBe(true);
            expect(result.sms.sent).toBe(false);
            expect(result.sms.error).toBe('Twilio error');
        });

        it('should skip email when EMAIL_USER not configured', async () => {
            process.env.EMAIL_USER = '';

            const passenger = {
                name: 'John Doe',
                email: 'john@example.com',
                mobile: '+919876543210',
                pnr: 'P001'
            };
            const newBerth = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };

            const result = await NotificationService.sendUpgradeNotification(passenger, 'RAC', newBerth);

            expect(result.email.sent).toBe(false);
            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
        });

        it('should skip SMS when Twilio client not configured', async () => {
            NotificationService.twilioClient = null;

            const passenger = {
                name: 'John Doe',
                email: 'john@example.com',
                mobile: '+919876543210',
                pnr: 'P001'
            };
            const newBerth = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };

            const result = await NotificationService.sendUpgradeNotification(passenger, 'RAC', newBerth);

            expect(result.sms.sent).toBe(false);
        });
    });

    describe('sendEmail', () => {
        it('should send email with correct parameters', async () => {
            const passenger = { name: 'John', email: 'john@example.com', pnr: 'P001' };
            const newBerth = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };

            await NotificationService.sendEmail(passenger, 'RAC-15', newBerth);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'john@example.com',
                    subject: expect.stringContaining('RAC Ticket Confirmed')
                })
            );
        });

        it('should include passenger details in email', async () => {
            const passenger = { name: 'John Doe', email: 'john@example.com', pnr: 'P001' };
            const newBerth = { fullBerthNo: 'S1-15', coachNo: 'S1', type: 'Lower' };

            await NotificationService.sendEmail(passenger, 'RAC', newBerth);

            const callArgs = mockTransporter.sendMail.mock.calls[0][0];
            expect(callArgs.html).toContain('John Doe');
            expect(callArgs.html).toContain('P001');
            expect(callArgs.html).toContain('S1-15');
        });

        it('should handle berth without fullBerthNo', async () => {
            const passenger = { name: 'John', email: 'john@example.com', pnr: 'P001' };
            const newBerth = { coachNo: 'S1', berthNo: '15', type: 'Lower' };

            await NotificationService.sendEmail(passenger, 'RAC', newBerth);

            const callArgs = mockTransporter.sendMail.mock.calls[0][0];
            expect(callArgs.html).toContain('S1-15');
        });
    });

    describe('sendSMS', () => {
        it('should send SMS with correct parameters', async () => {
            const passenger = { name: 'John', mobile: '+919876543210', pnr: 'P001' };
            const newBerth = { fullBerthNo: 'S1-15', coachNo: 'S1' };

            await NotificationService.sendSMS(passenger, newBerth);

            expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: '+919876543210',
                    from: '+1234567890',
                    body: expect.stringContaining('P001')
                })
            );
        });

        it('should include berth details in SMS', async () => {
            const passenger = { mobile: '+919876543210', pnr: 'P001' };
            const newBerth = { fullBerthNo: 'S1-15', coachNo: 'S1' };

            await NotificationService.sendSMS(passenger, newBerth);

            const callArgs = mockTwilioClient.messages.create.mock.calls[0][0];
            expect(callArgs.body).toContain('S1-15');
            expect(callArgs.body).toContain('S1');
        });
    });

    describe('sendNoShowMarkedNotification', () => {
        it('should send both email and SMS for no-show notification', async () => {
            const passenger = {
                name: 'John Doe',
                Email: 'john@example.com',
                mobile: '+919876543210',
                coach: 'S1',
                berth: '15',
                passengerStatus: 'Online'
            };

            const result = await NotificationService.sendNoShowMarkedNotification('P001', passenger);

            expect(result.email.sent).toBe(true);
            expect(result.sms.sent).toBe(true);
        });

        it('should handle lowercase email field', async () => {
            const passenger = {
                name: 'John Doe',
                email: 'john@example.com',
                mobile: '+919876543210',
                coach: 'S1',
                berth: '15',
                passengerStatus: 'Online'
            };

            const result = await NotificationService.sendNoShowMarkedNotification('P001', passenger);

            expect(result.email.sent).toBe(true);
        });

        it('should send email with no-show alert content', async () => {
            const passenger = {
                name: 'John Doe',
                Email: 'john@example.com',
                coach: 'S1',
                berth: '15'
            };

            await NotificationService.sendNoShowMarkedNotification('P001', passenger);

            const callArgs = mockTransporter.sendMail.mock.calls[0][0];
            expect(callArgs.subject).toContain('NO-SHOW');
            expect(callArgs.html).toContain('John Doe');
            expect(callArgs.html).toContain('P001');
        });

        it('should handle email failure in no-show notification', async () => {
            mockTransporter.sendMail.mockRejectedValue(new Error('Email error'));

            const passenger = {
                name: 'John',
                Email: 'john@example.com',
                mobile: '+919876543210',
                coach: 'S1',
                berth: '15'
            };

            const result = await NotificationService.sendNoShowMarkedNotification('P001', passenger);

            expect(result.email.sent).toBe(false);
            expect(result.email.error).toBeDefined();
        });

        it('should handle SMS failure in no-show notification', async () => {
            mockTwilioClient.messages.create.mockRejectedValue(new Error('SMS error'));

            const passenger = {
                name: 'John',
                Email: 'john@example.com',
                mobile: '+919876543210',
                coach: 'S1',
                berth: '15'
            };

            const result = await NotificationService.sendNoShowMarkedNotification('P001', passenger);

            expect(result.sms.sent).toBe(false);
            expect(result.sms.error).toBeDefined();
        });
    });

    describe('sendNoShowRevertedNotification', () => {
        it('should send both email and SMS for revert notification', async () => {
            const passenger = {
                name: 'John Doe',
                email: 'john@example.com',
                mobile: '+919876543210',
                coach: 'S1',
                berth: '15'
            };

            const result = await NotificationService.sendNoShowRevertedNotification('P001', passenger);

            expect(result.email.sent).toBe(true);
            expect(result.sms.sent).toBe(true);
        });

        it('should send email with revert content', async () => {
            const passenger = {
                name: 'John Doe',
                email: 'john@example.com',
                coach: 'S1',
                berth: '15'
            };

            await NotificationService.sendNoShowRevertedNotification('P001', passenger);

            const callArgs = mockTransporter.sendMail.mock.calls[0][0];
            expect(callArgs.subject).toContain('NO-SHOW Status Cleared');
            expect(callArgs.html).toContain('BOARDED');
        });

        it('should handle email failure in revert notification', async () => {
            mockTransporter.sendMail.mockRejectedValue(new Error('Email error'));

            const passenger = {
                name: 'John',
                email: 'john@example.com',
                mobile: '+919876543210',
                coach: 'S1',
                berth: '15'
            };

            const result = await NotificationService.sendNoShowRevertedNotification('P001', passenger);

            expect(result.email.sent).toBe(false);
            expect(result.email.error).toBeDefined();
        });

        it('should handle SMS failure in revert notification', async () => {
            mockTwilioClient.messages.create.mockRejectedValue(new Error('SMS error'));

            const passenger = {
                name: 'John',
                email: 'john@example.com',
                mobile: '+919876543210',
                coach: 'S1',
                berth: '15'
            };

            const result = await NotificationService.sendNoShowRevertedNotification('P001', passenger);

            expect(result.sms.sent).toBe(false);
            expect(result.sms.error).toBeDefined();
        });
    });

    describe('testEmail', () => {
        it('should send test email successfully', async () => {
            const result = await NotificationService.testEmail('test@example.com');

            expect(result.success).toBe(true);
            expect(result.messageId).toBe('test-message-id');
            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'test@example.com',
                    subject: 'Test Email - RAC System'
                })
            );
        });

        it('should handle test email failure', async () => {
            mockTransporter.sendMail.mockRejectedValue(new Error('Test error'));

            const result = await NotificationService.testEmail('test@example.com');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Test error');
        });
    });

    describe('sendApprovalRequestNotification', () => {
        it('should send approval request email successfully', async () => {
            const passenger = {
                name: 'John Doe',
                email: 'john@example.com',
                pnr: 'P001'
            };
            const upgradeDetails = {
                currentRAC: '15',
                proposedBerthFull: 'S1-20',
                proposedBerthType: 'Lower',
                stationName: 'Station B'
            };

            const result = await NotificationService.sendApprovalRequestNotification(passenger, upgradeDetails);

            expect(result.sent).toBe(true);
            expect(mockTransporter.sendMail).toHaveBeenCalled();
        });

        it('should include upgrade details in email', async () => {
            const passenger = { name: 'John', email: 'john@example.com', pnr: 'P001' };
            const upgradeDetails = {
                currentRAC: '15',
                proposedBerthFull: 'S1-20',
                proposedBerthType: 'Lower',
                stationName: 'Station B'
            };

            await NotificationService.sendApprovalRequestNotification(passenger, upgradeDetails);

            const callArgs = mockTransporter.sendMail.mock.calls[0][0];
            expect(callArgs.html).toContain('S1-20');
            expect(callArgs.html).toContain('Lower');
            expect(callArgs.html).toContain('Station B');
        });

        it('should return error when email not configured', async () => {
            const passenger = { name: 'John', pnr: 'P001' };
            const upgradeDetails = {
                currentRAC: '15',
                proposedBerthFull: 'S1-20',
                proposedBerthType: 'Lower',
                stationName: 'Station B'
            };

            const result = await NotificationService.sendApprovalRequestNotification(passenger, upgradeDetails);

            expect(result.sent).toBe(false);
            expect(result.error).toBe('No email configured');
        });

        it('should return error when EMAIL_USER env not set', async () => {
            process.env.EMAIL_USER = '';
            const passenger = { name: 'John', email: 'john@example.com', pnr: 'P001' };
            const upgradeDetails = {
                currentRAC: '15',
                proposedBerthFull: 'S1-20',
                proposedBerthType: 'Lower',
                stationName: 'Station B'
            };

            const result = await NotificationService.sendApprovalRequestNotification(passenger, upgradeDetails);

            expect(result.sent).toBe(false);
            expect(result.error).toBe('No email configured');
        });

        it('should handle email sending failure', async () => {
            mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

            const passenger = { name: 'John', email: 'john@example.com', pnr: 'P001' };
            const upgradeDetails = {
                currentRAC: '15',
                proposedBerthFull: 'S1-20',
                proposedBerthType: 'Lower',
                stationName: 'Station B'
            };

            const result = await NotificationService.sendApprovalRequestNotification(passenger, upgradeDetails);

            expect(result.sent).toBe(false);
            expect(result.error).toBe('SMTP error');
        });
    });
});
