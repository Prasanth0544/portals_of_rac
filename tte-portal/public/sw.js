// Service Worker for TTE Portal
// Handles push notifications for offline passenger upgrades

self.addEventListener('install', (event) => {
    console.log('📦 TTE Service Worker installing...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('✅ TTE Service Worker activated');
    event.waitUntil(clients.claim());
});

// Listen for push events
self.addEventListener('push', (event) => {
    console.log('📨 TTE Push notification received');

    if (!event.data) {
        console.log('❌ No data in push event');
        return;
    }

    const data = event.data.json();
    console.log('📨 TTE Push data:', data);

    const options = {
        body: data.body || 'Offline passenger has upgrade offer',
        icon: '/logo192.png',
        badge: '/badge72.png',
        tag: data.tag || 'tte-notification',
        requireInteraction: true,
        data: {
            url: data.url || 'http://localhost:5173',
            pnr: data.pnr
        },
        actions: data.actions || [
            { action: 'view', title: 'View Details' },
            { action: 'dismiss', title: 'Dismiss' }
        ],
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'TTE Notification', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ TTE Notification clicked:', event.action);

    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    const urlToOpen = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if TTE portal window is already open
                for (const client of clientList) {
                    if (client.url.includes('5173') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open TTE portal if not open
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
