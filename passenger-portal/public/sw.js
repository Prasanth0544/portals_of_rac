// Service Worker for Passenger Portal
// Handles push notifications even when browser is closed

self.addEventListener('install', (event) => {
    console.log('📦 Service Worker installing...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker activated');
    event.waitUntil(clients.claim());
});

// Listen for push events from server
self.addEventListener('push', (event) => {
    console.log('📨 Push notification received');

    if (!event.data) {
        console.log('❌ No data in push event');
        return;
    }

    const data = event.data.json();
    console.log('📨 Push data:', data);

    const options = {
        body: data.body || 'You have a new notification',
        icon: '/logo192.png',
        badge: '/badge72.png',
        tag: data.tag || 'notification',
        requireInteraction: true,
        data: {
            url: data.url || 'http://localhost:5175',
            pnr: data.pnr
        },
        actions: data.actions || [
            { action: 'view', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'RAC Notification', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ Notification clicked:', event.action);

    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    const urlToOpen = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if a window is already open
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window if none exists
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
    console.log('🔄 Push subscription changed');
    // Could re-subscribe here if needed
});
