/* vivien-uklid-sw 2026-10-30 */
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
    data = { body: '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'VIVIEN Úklid', {
      body: data.body || '',
      icon: '/prehled/icon-192.png',
      data: { url: data.url || '/uklid' },
    }),
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/uklid';
  event.waitUntil(self.clients.openWindow(url));
});
