// Service Worker per PWA - Softair Event App
const CACHE_NAME = 'softair-event-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/components.css',
  '/css/screens.css',
  '/js/app.js',
  '/js/lib/supabase.js',
  '/js/lib/auth.js',
  '/js/lib/utils.js',
  '/js/components/navigation.js',
  '/js/screens/login.js',
  '/js/screens/events.js',
  '/js/screens/event-detail.js',
  '/js/screens/documents.js',
  '/js/screens/profile.js',
  '/js/screens/admin.js',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then((fetchResponse) => {
            // Clone response to cache it
            return caches.open(CACHE_NAME).then((cache) => {
              // Only cache GET requests
              if (event.request.method === 'GET') {
                cache.put(event.request, fetchResponse.clone());
              }
              return fetchResponse;
            });
          });
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendance());
  }
});

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Softair Event';
  const options = {
    body: data.body || 'Nuova notifica',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: data
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});

// Helper function for background sync (to be implemented)
async function syncAttendance() {
  // This will be implemented to sync offline attendance changes
  console.log('Syncing attendance data...');
  return Promise.resolve();
}
