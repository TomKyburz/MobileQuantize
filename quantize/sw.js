// Quantize Service Worker

const CACHE_VERSION = 'v1';
const CACHE_ASSETS = [
  '/quantize/picontrol/index.html',
  '/quantize/picontrol/style.css',
  '/quantize/picontrol/function.js',
  '/quantize/manifest.json'
];

// Install: cache essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(CACHE_ASSETS))
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_VERSION && caches.delete(key)))
    )
  );
});

// Fetch: serve from cache or network
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const resClone = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(event.request, resClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Handle push events
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');

  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  const title = data.title || 'Notification';
  const body = data.body || 'You have a new message!';
  const icon = '/favicon/android-chrome-192x192.png';  // small left icon
  const badge = '/favicon/android-chrome-192x192.png'; // small grayscale badge

  // "image" = large preview image on the right or top → OMIT IT
  // so Chrome doesn't show a big picture

  const options = {
    body,
    icon,
    badge,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    renotify: true,
    tag: 'message',
    data: { url: '/' },
    // control truncation by not providing too-long title/body
    // Chrome auto-ellipsizes long titles
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
      for (const client of clientsArr) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

});
