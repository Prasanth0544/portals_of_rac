// Push Notification Manager for Passenger Portal
// Handles subscription, permission, and communication with backend

import api from '../api';

/**
 * Convert base64 VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Request notification permission and subscribe to push
 * @param irctcId - Passenger's IRCTC ID
 * @returns Success status
 */
export async function requestPushPermission(irctcId: string): Promise<boolean> {
    try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('❌ Notifications not supported');
            return false;
        }

        // Check if service workers are supported
        if (!('serviceWorker' in navigator)) {
            console.log('❌ Service Workers not supported');
            return false;
        }

        // Request permission
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            console.log(`❌ Notification permission: ${permission}`);
            return false;
        }

        console.log('✅ Notification permission granted');

        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;
        console.log('✅ Service Worker ready');

        // Get VAPID public key from backend
        const vapidResponse = await api.get<{ publicKey: string }>('/push/vapid-public-key');
        const { publicKey } = vapidResponse.data;

        // Check existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            console.log('✅ Found existing push subscription');
        } else {
            // Subscribe to push notifications
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer
            });
            console.log('✅ Created new push subscription');
        }

        // ALWAYS send subscription to backend (it uses upsert in MongoDB)
        console.log('[OUT] Sending subscription to backend for:', irctcId);
        const response = await api.post('/passenger/push-subscribe', {
            irctcId,
            subscription: subscription.toJSON()
        });

        const result = response.data;
        if (result.success) {
            console.log('✅ Push subscription registered with backend (MongoDB)');
        } else {
            console.error('❌ Backend rejected subscription:', result.message);
        }
        return true;

    } catch (error) {
        console.error('❌ Push permission error:', error);
        return false;
    }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(irctcId: string): Promise<boolean> {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();

            // Notify backend
            await api.post('/passenger/push-unsubscribe', { irctcId });

            console.log('✅ Unsubscribed from push notifications');
            return true;
        }

        return false;
    } catch (error) {
        console.error('❌ Unsubscribe error:', error);
        return false;
    }
}

/**
 * Check if already subscribed
 */
export async function isPushSubscribed(): Promise<boolean> {
    try {
        if (!('serviceWorker' in navigator)) return false;

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        return !!subscription;
    } catch (error) {
        return false;
    }
}
