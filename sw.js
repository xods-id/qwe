// Service Worker untuk Blogspot PWA
const CACHE_NAME = 'blogspot-pwa-cache-v1';
const urlsToCache = [
  '/',
  '/favicon.ico'
];

// Install event
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Cache First strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }
        
        // Otherwise fetch from network
        console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response to cache it
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('[SW] Fetch failed:', error);
            // Return offline page for HTML requests
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/');
            }
          });
      })
  );
});

// Background sync (optional)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-posts') {
    console.log('[SW] Background sync for posts');
    event.waitUntil(syncPosts());
  }
});

// Push notifications (optional)
self.addEventListener('push', event => {
  const options = {
    body: 'New content available on the blog!',
    icon: 'https://cdn-icons-png.flaticon.com/512/2091/2091557.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/2091/2091557.png',
    tag: 'blog-update'
  };
  
  event.waitUntil(
    self.registration.showNotification('Blog Update', options)
  );
});

// Helper function for background sync
function syncPosts() {
  return new Promise((resolve, reject) => {
    console.log('[SW] Syncing in background');
    resolve();
  });
}
