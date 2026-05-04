// TeleMed Service Worker — handles background notifications & click routing
const CACHE = 'telemed-v1';

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Allow the page to ask the SW to display a notification (works even when tab is hidden / app backgrounded on supporting browsers)
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, url, icon } = data.payload || {};
    self.registration.showNotification(title || 'TeleMed', {
      body: body || '',
      tag: tag || undefined,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      data: { url: url || '/' },
      vibrate: [120, 60, 120],
      renotify: true,
      requireInteraction: false,
    });
  }
});

// Web Push (when server push is configured later)
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { title: 'TeleMed', body: event.data?.text() || '' }; }
  const { title = 'TeleMed', body = '', tag, url = '/', icon } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body, tag, icon: icon || '/favicon.ico', badge: '/favicon.ico',
      data: { url }, vibrate: [120, 60, 120],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
