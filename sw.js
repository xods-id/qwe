// sw.js untuk Blogspot PWA Dark Mode
const CACHE_NAME = 'blog-dark-pwa-v1';
const OFFLINE_PAGE = '/';
const CACHE_URLS = [
  OFFLINE_PAGE,
  '/favicon.ico',
  'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/icon-brand-blogger.svg'
];

// Install Service Worker
self.addEventListener('install', function(event) {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] Caching app shell');
        return cache.addAll(CACHE_URLS);
      })
      .then(function() {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch Strategy: Cache First, then Network
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  // For HTML pages: Network First, fallback to cache
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // Clone the response to cache it
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(function() {
          // If network fails, try cache
          return caches.match(event.request)
            .then(function(cachedResponse) {
              if (cachedResponse) {
                return cachedResponse;
              }
              // If no cache, show offline page
              return caches.match(OFFLINE_PAGE);
            });
        })
    );
    return;
  }
  
  // For CSS, JS, Images: Cache First, then Network
  event.respondWith(
    caches.match(event.request)
      .then(function(cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(event.request)
          .then(function(response) {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response to cache it
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(function(error) {
            console.log('[SW] Fetch failed:', error);
            // For images, return a placeholder
            if (event.request.destination === 'image') {
              return new Response(
                '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#222"/><text x="200" y="150" text-anchor="middle" fill="#666" font-family="Arial" font-size="16">Image Not Available Offline</text></svg>',
                {
                  headers: {'Content-Type': 'image/svg+xml'}
                }
              );
            }
          });
      })
  );
});

// Background Sync (if supported)
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-posts') {
    console.log('[SW] Background sync for posts');
    event.waitUntil(syncPosts());
  }
});

function syncPosts() {
  // Implementation for background sync
  console.log('[SW] Syncing posts in background');
  return Promise.resolve();
}

// Push Notifications (if supported)
self.addEventListener('push', function(event) {
  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/icon-brand-blogger.svg',
    badge: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/icon-brand-blogger.svg',
    tag: 'blog-update',
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Buka Blog'
      },
      {
        action: 'close',
        title: 'Tutup'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Blog Update', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
