/* Dedale Inventory — Service Worker v1.0 */
const CACHE_NAME = 'dedale-inventory-v1';
const CACHE_URLS = [
  '/Dedale-Inventory/',
  '/Dedale-Inventory/index.html',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://alcdn.msauth.net/browser/2.38.0/js/msal-browser.min.js'
];

/* Install — cache app shell */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS.filter(function(url) {
        return !url.startsWith('https://alcdn') && !url.startsWith('https://fonts');
      }));
    }).catch(function(err) { console.log('SW cache failed:', err); })
  );
  self.skipWaiting();
});

/* Activate — clean old caches */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) {
        return k !== CACHE_NAME;
      }).map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

/* Fetch — network first, fall back to cache */
self.addEventListener('fetch', function(e) {
  /* Don't intercept Graph API or MSAL auth calls */
  if (e.request.url.includes('graph.microsoft.com') ||
      e.request.url.includes('login.microsoftonline.com') ||
      e.request.url.includes('msauth.net')) {
    return;
  }

  e.respondWith(
    fetch(e.request).then(function(response) {
      /* Cache successful GET responses */
      if (e.request.method === 'GET' && response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function() {
      /* Network failed — try cache */
      return caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        /* For navigation requests, return cached index.html */
        if (e.request.mode === 'navigate') {
          return caches.match('/Dedale-Inventory/index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
