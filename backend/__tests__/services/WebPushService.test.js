describe('WebPushService', () => {
    let WebPushService;
    let webPush;
    let PushSubscriptionService;

    const loadService = () => {
        jest.resetModules();
        process.env.VAPID_PUBLIC_KEY = 'pub_key';
        process.env.VAPID_PRIVATE_KEY = 'priv_key';
        process.env.VAPID_EMAIL = 'mailto:test@example.com';
        process.env.FRONTEND_URL = 'http://localhost:3000';

        jest.doMock('web-push', () => ({
            setVapidDetails: jest.fn(),
            sendNotification: jest.fn()
        }));

        jest.doMock('../../services/PushSubscriptionService', () => ({
            getSubscriptions: jest.fn(),
            deleteSubscription: jest.fn(),
            getAllTTESubscriptions: jest.fn(),
            getAllAdminSubscriptions: jest.fn()
        }));

        WebPushService = require('../../services/WebPushService');
        webPush = require('web-push');
        PushSubscriptionService = require('../../services/PushSubscriptionService');
    };

    beforeEach(() => {
        loadService();
    });

    it('configures VAPID details at module load', () => {
        expect(webPush.setVapidDetails).toHaveBeenCalledWith(
            'mailto:test@example.com',
            'pub_key',
            'priv_key'
        );
    });

    describe('sendPushNotification', () => {
        it('returns error when IRCTC ID missing', async () => {
            const result = await WebPushService.sendPushNotification('', { title: 'x' });
            expect(result).toEqual(expect.objectContaining({ success: false, error: 'IRCTC ID required' }));
        });

        it('returns no-subscription result', async () => {
            PushSubscriptionService.getSubscriptions.mockResolvedValue([]);
            const result = await WebPushService.sendPushNotification('IR1', { title: 'x' });
            expect(result).toEqual(expect.objectContaining({ success: false, sent: 0 }));
        });

        it('sends successfully to all subscriptions', async () => {
            const subs = [{ endpoint: 'e1' }, { endpoint: 'e2' }];
            PushSubscriptionService.getSubscriptions.mockResolvedValue(subs);
            webPush.sendNotification.mockResolvedValue(true);

            const result = await WebPushService.sendPushNotification('IR1', { title: 'x' });
            expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
            expect(result).toEqual(expect.objectContaining({ success: true, sent: 2, total: 2 }));
        });

        it('removes invalid subscription on 410 and still reports partial success', async () => {
            const subs = [{ endpoint: 'e1' }, { endpoint: 'e2' }];
            PushSubscriptionService.getSubscriptions.mockResolvedValue(subs);
            webPush.sendNotification
                .mockRejectedValueOnce({ statusCode: 410, message: 'gone' })
                .mockResolvedValueOnce(true);

            const result = await WebPushService.sendPushNotification('IR1', { title: 'x' });
            expect(PushSubscriptionService.deleteSubscription).toHaveBeenCalledWith('e1');
            expect(result).toEqual(expect.objectContaining({ success: true, sent: 1, total: 2 }));
        });

        it('does not remove subscription for non-404/410 error', async () => {
            PushSubscriptionService.getSubscriptions.mockResolvedValue([{ endpoint: 'e1' }]);
            webPush.sendNotification.mockRejectedValue({ statusCode: 500, message: 'server error' });

            const result = await WebPushService.sendPushNotification('IR1', { title: 'x' });
            expect(PushSubscriptionService.deleteSubscription).not.toHaveBeenCalled();
            expect(result.success).toBe(false);
        });
    });

    describe('wrapper payload methods', () => {
        it('sendNoShowAlert forwards NO_SHOW payload', async () => {
            const spy = jest.spyOn(WebPushService, 'sendPushNotification').mockResolvedValue({ success: true });
            await WebPushService.sendNoShowAlert('IR1', { pnr: 'P1', berth: 'S1-10' });
            expect(spy).toHaveBeenCalledWith('IR1', expect.objectContaining({
                title: expect.stringContaining('NO-SHOW'),
                data: expect.objectContaining({ type: 'NO_SHOW_MARKED', pnr: 'P1' })
            }));
            spy.mockRestore();
        });

        it('sendUpgradeOfferAlert forwards UPGRADE_OFFER payload', async () => {
            const spy = jest.spyOn(WebPushService, 'sendPushNotification').mockResolvedValue({ success: true });
            await WebPushService.sendUpgradeOfferAlert('IR1', { pnr: 'P1', berth: 'S1-10', offerId: 'O1' });
            expect(spy).toHaveBeenCalledWith('IR1', expect.objectContaining({
                data: expect.objectContaining({ type: 'UPGRADE_OFFER', offerId: 'O1' })
            }));
            spy.mockRestore();
        });

        it('sendNoShowRevertedAlert forwards NO_SHOW_REVERTED payload', async () => {
            const spy = jest.spyOn(WebPushService, 'sendPushNotification').mockResolvedValue({ success: true });
            await WebPushService.sendNoShowRevertedAlert('IR1', { pnr: 'P1' });
            expect(spy).toHaveBeenCalledWith('IR1', expect.objectContaining({
                data: expect.objectContaining({ type: 'NO_SHOW_REVERTED', pnr: 'P1' })
            }));
            spy.mockRestore();
        });

        it('sendUpgradeOfferToPassenger forwards dual-approval payload', async () => {
            const spy = jest.spyOn(WebPushService, 'sendPushNotification').mockResolvedValue({ success: true });
            await WebPushService.sendUpgradeOfferToPassenger('IR1', {
                pnr: 'P1',
                currentBerth: 'RAC 1',
                offeredBerth: 'S1-10',
                offeredBerthType: 'Lower',
                offeredCoach: 'S1'
            });
            expect(spy).toHaveBeenCalledWith('IR1', expect.objectContaining({
                data: expect.objectContaining({ type: 'DUAL_APPROVAL_UPGRADE_OFFER', pnr: 'P1' })
            }));
            spy.mockRestore();
        });
    });

    describe('broadcast methods', () => {
        it('sendPushToAllTTEs handles empty subscriptions', async () => {
            PushSubscriptionService.getAllTTESubscriptions.mockResolvedValue([]);
            const result = await WebPushService.sendPushToAllTTEs({ title: 'x' });
            expect(result).toEqual({ sent: 0, failed: 0 });
        });

        it('sendPushToAllTTEs handles mixed success/fail', async () => {
            PushSubscriptionService.getAllTTESubscriptions.mockResolvedValue([{ endpoint: 'e1' }, { endpoint: 'e2' }]);
            webPush.sendNotification
                .mockResolvedValueOnce(true)
                .mockRejectedValueOnce(new Error('push fail'));
            const result = await WebPushService.sendPushToAllTTEs({ title: 'x' });
            expect(result).toEqual({ sent: 1, failed: 1 });
        });

        it('sendPushToAllAdmins handles empty subscriptions', async () => {
            PushSubscriptionService.getAllAdminSubscriptions.mockResolvedValue([]);
            const result = await WebPushService.sendPushToAllAdmins({ title: 'x' });
            expect(result).toEqual({ sent: 0, failed: 0 });
        });

        it('sendPushToAllAdmins handles mixed success/fail', async () => {
            PushSubscriptionService.getAllAdminSubscriptions.mockResolvedValue([{ endpoint: 'e1' }, { endpoint: 'e2' }]);
            webPush.sendNotification
                .mockResolvedValueOnce(true)
                .mockRejectedValueOnce(new Error('push fail'));
            const result = await WebPushService.sendPushToAllAdmins({ title: 'x' });
            expect(result).toEqual({ sent: 1, failed: 1 });
        });
    });

    describe('higher-level wrappers', () => {
        it('sendRACApprovalRequestToTTEs calls TTE broadcast helper', async () => {
            const spy = jest.spyOn(WebPushService, 'sendPushToAllTTEs').mockResolvedValue({ sent: 1, failed: 0 });
            await WebPushService.sendRACApprovalRequestToTTEs({ count: 2, station: 'RJY' });
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ type: 'RAC_APPROVAL_REQUIRED', count: 2, station: 'RJY' })
            }));
            spy.mockRestore();
        });

        it('sendApprovalNotificationToAdmins calls admin broadcast helper', async () => {
            const spy = jest.spyOn(WebPushService, 'sendPushToAllAdmins').mockResolvedValue({ sent: 1, failed: 0 });
            await WebPushService.sendApprovalNotificationToAdmins({
                passengerName: 'A',
                pnr: 'P1',
                berth: 'S1-10'
            });
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ type: 'RAC_UPGRADE_APPROVED', pnr: 'P1' })
            }));
            spy.mockRestore();
        });
    });

    it('returns VAPID public key', () => {
        expect(WebPushService.getVapidPublicKey()).toBe('pub_key');
    });
});
