self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'VIVIEN', {
      body: data.body || '',
      icon: '/prehled/icon-192.png',
      data: { url: data.url || '/prehled' },
    }),
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/prehled';
  event.waitUntil(self.clients.openWindow(url));
});
