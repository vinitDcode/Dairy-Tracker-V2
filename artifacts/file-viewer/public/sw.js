/* ═══════════════════════════════════════════════════════════════════════
   BHULLAR DAIRY — SERVICE WORKER  v16
   
   ARCHITECTURE (Red-Team Hardened):
   ┌─ STATIC ASSETS (content-hashed)  ── CacheFirst (hash = immutable)
   ├─ NAVIGATION (HTML)               ── NetworkFirst → cache fallback
   ├─ PATCH/OVERRIDE FILES            ── NetworkOnly (always fresh)
   ├─ SUPABASE REST/RPC (GET)         ── NetworkFirst (live data)
   └─ SUPABASE POST/PATCH/DELETE      ── Network + Background Sync queue
                                           (cloned & replayed on reconnect)
   
   OFFLINE QUEUE: Uses IndexedDB via a lean purpose-built adapter.
   Requests are stored with full headers (including Authorization JWT)
   so they replay with the exact same auth context when 4G restores.
   
   STALE-WHILE-REVALIDATE: Applied to override/patch JS files so
   the farmer always sees the cached version instantly while the SW
   fetches and stores the latest in the background.
═══════════════════════════════════════════════════════════════════════ */

'use strict';

var CACHE_VERSION  = 'bhullar-v17';
var QUEUE_DB_NAME  = 'bdf-sync-queue';
var QUEUE_STORE    = 'mutations';
var QUEUE_DB_VER   = 1;

/* ── STATIC ASSETS: content-hashed → CacheFirst (immutable by hash) ── */
var CACHE_FIRST = [
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
  '/icons/icon-512x512-maskable.png',
  '/icons/apple-touch-icon.png',
];

/* ── PATCH/OVERRIDE FILES: Stale-While-Revalidate ─────────────────── */
/* Show cached version instantly; update cache in background.
   These are NOT content-hashed so SWR ensures updates propagate fast. */
var STALE_WHILE_REVALIDATE = [
  '/aero.js',
  '/aero.css',
  '/patch.css',
  '/patch-security.js',
  '/error-resilience.js',
  '/theme-bootstrap.js',
  '/genetics-boost.js',
  '/supabase-config.js',
  '/offline-queue-ui.js',
  '/manifest.json',
];

/* ── PREWARM CACHE ─────────────────────────────────────────────────── */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(CACHE_FIRST.concat(['/', '/manifest.json']));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ── PURGE OLD CACHES ──────────────────────────────────────────────── */
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_VERSION; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ═══════════════════════════════════════════════════════════════════
   INDEXEDDB QUEUE — lean purpose-built adapter (no CDN dependency)
   Stores cloned request metadata: url, method, headers, body, ts.
   Full headers preserved so Authorization JWT replays correctly.
═══════════════════════════════════════════════════════════════════ */

function openQueueDB() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(QUEUE_DB_NAME, QUEUE_DB_VER);
    req.onupgradeneeded = function (e) {
      e.target.result.createObjectStore(QUEUE_STORE, {
        keyPath: 'id', autoIncrement: true,
      });
    };
    req.onsuccess  = function (e) { resolve(e.target.result); };
    req.onerror    = function (e) { reject(e.target.error); };
  });
}

function queueMutation(entry) {
  return openQueueDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx    = db.transaction(QUEUE_STORE, 'readwrite');
      var store = tx.objectStore(QUEUE_STORE);
      var req   = store.add(entry);
      req.onsuccess = function () { resolve(req.result); };
      req.onerror   = function () { reject(req.error); };
    });
  });
}

function getAllQueued() {
  return openQueueDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx    = db.transaction(QUEUE_STORE, 'readonly');
      var store = tx.objectStore(QUEUE_STORE);
      var req   = store.getAll();
      req.onsuccess = function () { resolve(req.result); };
      req.onerror   = function () { reject(req.error); };
    });
  });
}

function deleteQueued(id) {
  return openQueueDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx    = db.transaction(QUEUE_STORE, 'readwrite');
      var store = tx.objectStore(QUEUE_STORE);
      var req   = store.delete(id);
      req.onsuccess = function () { resolve(); };
      req.onerror   = function () { reject(req.error); };
    });
  });
}

/* Replay all queued mutations in insertion order. On success, delete
   from queue and notify all clients. On failure, stop and leave the
   remainder in the queue for the next sync attempt. */
function flushQueue() {
  return getAllQueued().then(function (entries) {
    if (!entries || !entries.length) return;

    return entries.reduce(function (chain, entry) {
      return chain.then(function () {
        var headers = new Headers(entry.headers || {});
        var init = { method: entry.method, headers: headers, credentials: 'omit' };
        if (entry.body) init.body = entry.body;

        return fetch(entry.url, init).then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return deleteQueued(entry.id).then(function () {
            /* Notify all clients that a queued mutation was flushed */
            return self.clients.matchAll().then(function (clients) {
              clients.forEach(function (c) {
                c.postMessage({
                  type: 'BDF_SYNC_FLUSHED',
                  url: entry.url,
                  queuedAt: entry.ts,
                });
              });
            });
          });
        });
      });
    }, Promise.resolve());
  }).catch(function (err) {
    console.warn('[SW] Queue flush error:', err);
  });
}

/* ── BACKGROUND SYNC ──────────────────────────────────────────────── */
self.addEventListener('sync', function (e) {
  if (e.tag === 'bdf-mutation-sync') {
    e.waitUntil(flushQueue());
  }
});

/* Also attempt flush on connectivity restoration via fetch success */
var _syncScheduled = false;
function scheduleFlush() {
  if (_syncScheduled) return;
  _syncScheduled = true;
  setTimeout(function () {
    _syncScheduled = false;
    flushQueue();
  }, 500);
}

/* ═══════════════════════════════════════════════════════════════════
   FETCH HANDLER
═══════════════════════════════════════════════════════════════════ */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  var url;
  try { url = new URL(req.url); } catch (_) { return; }

  /* ── SUPABASE API CALLS ─────────────────────────────────────────
     GET:              NetworkFirst (live data, short timeout)
     POST/PATCH/DELETE: Attempt network; if offline → queue and return
                        a synthetic 202 so the app doesn't hard-error.
  ─────────────────────────────────────────────────────────────────*/
  if (url.hostname.indexOf('supabase.co') !== -1) {
    if (req.method === 'GET' || req.method === 'HEAD') {
      /* Network-first for live Supabase reads */
      e.respondWith(
        fetchWithTimeout(req.clone(), 8000).catch(function () {
          return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json',
                        'X-BDF-Source': 'sw-offline' },
          });
        })
      );
      return;
    }

    if (req.method === 'POST' || req.method === 'PATCH' ||
        req.method === 'PUT'  || req.method === 'DELETE') {
      e.respondWith(
        req.text().then(function (body) {
          /* Capture all headers (including Authorization JWT) */
          var headers = {};
          req.headers.forEach(function (val, key) {
            headers[key] = val;
          });

          return fetchWithTimeout(
            new Request(req.url, {
              method:      req.method,
              headers:     headers,
              body:        req.method !== 'DELETE' ? body : undefined,
              credentials: 'omit',
            }),
            10000
          ).then(function (res) {
            /* Online and successful — opportunistically flush any backlog */
            scheduleFlush();
            return res;
          }).catch(function () {
            /* Offline — queue mutation for replay */
            return queueMutation({
              url:     req.url,
              method:  req.method,
              headers: headers,
              body:    body || null,
              ts:      Date.now(),
            }).then(function () {
              /* Notify clients of new queued item */
              return self.clients.matchAll().then(function (clients) {
                clients.forEach(function (c) {
                  c.postMessage({ type: 'BDF_MUTATION_QUEUED', url: req.url });
                });
              });
            }).then(function () {
              /* Return a synthetic 202 Accepted so the app continues */
              return new Response(JSON.stringify({
                queued: true, message: 'Offline — mutation queued for sync',
              }), {
                status: 202,
                headers: { 'Content-Type': 'application/json',
                            'X-BDF-Source': 'sw-queue' },
              });
            });
          });
        })
      );
      return;
    }
    /* Other Supabase methods: pass through */
    return;
  }

  /* ── SAME-ORIGIN ONLY from here ──────────────────────────────── */
  if (url.origin !== self.location.origin) return;

  /* ── STALE-WHILE-REVALIDATE (patch/override files) ──────────── */
  var pathname = url.pathname;
  if (STALE_WHILE_REVALIDATE.indexOf(pathname) !== -1) {
    e.respondWith(
      caches.open(CACHE_VERSION).then(function (cache) {
        return cache.match(req).then(function (cached) {
          var networkFetch = fetch(req).then(function (res) {
            if (res.ok) cache.put(req, res.clone());
            return res;
          }).catch(function () { return null; });

          /* Return cached immediately; update silently in background */
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  /* ── NAVIGATION (HTML) — NetworkFirst, cache fallback ────────── */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetchWithTimeout(req, 5000).then(function (res) {
        var clone = res.clone();
        caches.open(CACHE_VERSION).then(function (c) { c.put(req, clone); });
        return res;
      }).catch(function () {
        return caches.match('/').then(function (cached) {
          return cached || new Response(
            '<!doctype html><html><body><p>Offline — open the app when connected.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        });
      })
    );
    return;
  }

  /* ── CACHE-FIRST (content-hashed static assets) ─────────────── */
  if (CACHE_FIRST.indexOf(pathname) !== -1) {
    e.respondWith(
      caches.match(req).then(function (cached) {
        if (cached) return cached;
        return fetch(req).then(function (res) {
          if (res.ok) {
            caches.open(CACHE_VERSION).then(function (c) { c.put(req, res.clone()); });
          }
          return res;
        });
      })
    );
    return;
  }

  /* ── DEFAULT: NetworkFirst for everything else ───────────────── */
  e.respondWith(
    fetch(req).catch(function () { return caches.match(req); })
  );
});

/* ── HELPER: fetch with timeout ──────────────────────────────────── */
function fetchWithTimeout(req, ms) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error('timeout')); }, ms);
    fetch(req).then(
      function (res) { clearTimeout(timer); resolve(res); },
      function (err) { clearTimeout(timer); reject(err); }
    );
  });
}

/* ── MESSAGE BUS: clients can request queue status or force flush ── */
self.addEventListener('message', function (e) {
  if (!e.data) return;
  if (e.data.type === 'BDF_FLUSH_NOW') {
    flushQueue();
  }
  if (e.data.type === 'BDF_QUEUE_COUNT') {
    getAllQueued().then(function (entries) {
      e.source.postMessage({ type: 'BDF_QUEUE_COUNT_REPLY', count: entries.length });
    });
  }
});
