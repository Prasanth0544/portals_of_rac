// Service Worker for RAC Portals (Unified)
// Handles push notifications for all portals: Admin, TTE, and Passenger

self.addEventListener('install', (event) => {
    console.log('📦 RAC Service Worker installing...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('✅ RAC Service Worker activated');
    event.waitUntil(clients.claim());
});

/**
 * Determine the portal path from a notification type.
 * Returns the URL path the user should be navigated to.
 */
function getPortalPath(data) {
    const type = data?.data?.type || data?.type || '';

    switch (type) {
        // Admin notifications
        case 'RAC_UPGRADE_APPROVED':
        case 'ADMIN_ALERT':
            return '/admin';

        // TTE notifications
        case 'NO_SHOW_MARKED':
        case 'BOARDING_VERIFICATION':
        case 'TTE_ALERT':
        case 'PENDING_REALLOCATION':
            return '/tte';

        // Passenger notifications
        case 'UPGRADE_OFFER':
        case 'UPGRADE_CONFIRMED':
        case 'UPGRADE_REJECTED':
        case 'UPGRADE_EXPIRED':
        case 'BOARDING_STATUS':
        case 'PASSENGER_ALERT':
            return '/passenger';

        default:
            return '/';
    }
}

// Listen for push events
self.addEventListener('push', (event) => {
    console.log('📨 Push notification received');

    if (!event.data) {
        console.log('❌ No data in push event');
        return;
    }

    const data = event.data.json();
    console.log('📨 Push data:', data);

    const portalPath = getPortalPath(data);

    const options = {
        body: data.body || 'RAC system notification',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.tag || 'rac-notification',
        requireInteraction: true,
        data: {
            url: data.url || (self.location.origin + portalPath),
            type: data.data?.type || 'GENERAL',
            portalPath,
            ...data.data
        },
        actions: [
            { action: 'view', title: 'View Details' },
            { action: 'dismiss', title: 'Dismiss' }
        ],
        vibrate: [200, 100, 200]
    };

    // Show notification
    event.waitUntil(
        self.registration.showNotification(data.title || 'RAC Notification', options)
            .then(() => {
                // Broadcast refresh message to all matching portal clients
                const refreshTypes = [
                    'RAC_UPGRADE_APPROVED',
                    'UPGRADE_OFFER',
                    'UPGRADE_CONFIRMED',
                    'UPGRADE_REJECTED',
                    'NO_SHOW_MARKED',
                    'BOARDING_STATUS'
                ];

                const notifType = data.data?.type;
                if (refreshTypes.includes(notifType)) {
                    return self.clients.matchAll({ type: 'window' }).then((windowClients) => {
                        windowClients.forEach((client) => {
                            client.postMessage({
                                type: 'REFRESH_PAGE',
                                data: data.data
                            });
                        });
                    });
                }
            })
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ Notification clicked:', event.action);

    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    const urlToOpen = event.notification.data?.url || self.location.origin;
    const portalPath = event.notification.data?.portalPath || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if a matching portal window is already open
                for (const client of clientList) {
                    if (client.url.includes(portalPath) && 'focus' in client) {
                        // Send refresh message before focusing
                        client.postMessage({
                            type: 'REFRESH_PAGE',
                            data: event.notification.data
                        });
                        return client.focus();
                    }
                }

                // Check if any app window is open
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.postMessage({
                            type: 'NAVIGATE',
                            url: portalPath
                        });
                        return client.focus();
                    }
                }

                // Open new window if nothing is open
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
