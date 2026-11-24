/* Belfort · Repose TRV · service worker : la page s'ouvre sans réseau. */
var CACHE = 'brt-v1.1';
var FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;   // Apps Script : réseau direct
  if (req.mode === 'navigate') {
    // Page : réseau d'abord (version à jour), cache si pas de réseau ou réseau trop lent (3 s)
    e.respondWith(new Promise(function (res) {
      var done = false;
      function fromCache() {
        caches.match('./index.html').then(function (h) { if (!done && h) { done = true; res(h); } });
      }
      var t = setTimeout(fromCache, 3000);
      fetch(req).then(function (r) {
        if (r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put('./index.html', cp); }); }
        if (!done) { done = true; clearTimeout(t); res(r); }
      }).catch(function () {
        clearTimeout(t);
        caches.match('./index.html').then(function (h) { if (!done) { done = true; res(h || Response.error()); } });
      });
    }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(req).then(function (r) {
      var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); });
      return r;
    });
  }));
});
