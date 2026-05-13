const CACHE_NAME = 'hopperru-v2';
const STATIC_CACHE = 'hopperru-static-v2';
const API_CACHE = 'hopperru-api-v2';

const APP_SHELL_URLS = ['/', '/search', '/dashboard'];

const OFFLINE_PAGE = '/';

// Install: cache core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API requests: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && event.request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || new Response(
              JSON.stringify({ error: 'Offline', message: 'Нет подключения к интернету' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Static/page requests: cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        // Revalidate in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return response;
      }
      return fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.method === 'GET'
        ) {
          const responseClone = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_PAGE);
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Push notifications handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'HopperRU',
      body: event.data.text(),
      icon: '/icons/icon-192.png',
    };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    tag: data.tag || 'hopperru-notification',
    data: data.data || {},
    vibrate: [200, 100, 200],
    actions: [],
  };

  // Add context-specific actions based on notification type
  if (data.data?.type === 'price-alert') {
    options.actions = [
      { action: 'book', title: 'Забронировать' },
      { action: 'freeze', title: 'Заморозить' },
    ];
  } else if (data.data?.type === 'booking-update') {
    options.actions = [
      { action: 'view', title: 'Подробнее' },
    ];
  } else if (data.data?.type === 'price-drop') {
    options.actions = [
      { action: 'view', title: 'Посмотреть возврат' },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'HopperRU', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  if (data.type === 'price-alert') {
    if (event.action === 'book' || event.action === 'freeze') {
      url = `/search?route=${data.alert?.routeFrom}-${data.alert?.routeTo}`;
    } else {
      url = '/dashboard';
    }
  } else if (data.type === 'booking-update') {
    url = `/booking/${data.booking?.bookingId || ''}`;
  } else if (data.type === 'price-drop') {
    url = '/dashboard';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new tab
      return self.clients.openWindow(url);
    })
  );
});
