/* ═══════════════════════════════════════════════════════════
   BHULLAR DAIRY — SERVICE WORKER  v8  (neon green)
   Cache-first for static assets, network-first for navigation.
   
   v8 changes:
   - Added genetics-boost.js and supabase-config.js to
     BYPASS_CACHE so new versions roll out immediately.
   - Bumped cache name to bhullar-v8 (clears v7 cache).
═══════════════════════════════════════════════════════════ */

var CACHE = 'bhullar-v15';

/* Only cache content-hashed bundles and static icons.
   All override/patch/intelligence files are network-only. */
var STATIC = [
  '/',
  '/assets/index-CrpyjvbJ.js',
  '/assets/index-B1BBlUQ6.css',
  '/favicon.svg',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(STATIC);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

/* Paths that must always come from the network — never serve stale */
var BYPASS_CACHE = [
  '/aero.js',
  '/aero.css',
  '/patch.css',
  '/patch-security.js',
  '/theme-bootstrap.js',
  '/genetics-boost.js',
  '/supabase-config.js',
  '/manifest.json',
  '/sw.js',
];

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* Always fetch fresh for override/intelligence files */
  if (BYPASS_CACHE.indexOf(url.pathname) !== -1) {
    e.respondWith(fetch(req));
    return;
  }

  /* Navigation: network-first, cache fallback */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var clone = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, clone); });
        return res;
      }).catch(function () { return caches.match('/'); })
    );
    return;
  }

  /* Assets: cache-first */
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res.ok) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); });
        }
        return res;
      });
      return cached || network;
    })
  );
});
