/* vivien-prehled-sw 2026-11-02 */
self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? String(event.data.text()) : '' };
  }
  var title = data.title || 'VIVIEN';
  var body = data.body || '';
  var url = data.url || '/prehled';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: '/prehled/icon-192.png',
      badge: '/prehled/icon-192.png',
      data: { url: url },
      requireInteraction: true,
      tag: 'vivien-prehled',
      renotify: true,
      vibrate: [120, 60, 120],
    }),
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/prehled';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (klienti) {
      for (var i = 0; i < klienti.length; i++) {
        var c = klienti[i];
        if (c.url && c.url.indexOf('/prehled') !== -1 && 'focus' in c) {
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
