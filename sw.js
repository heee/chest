/* Offline support: caches the whole app on first load, then serves it from the cache.
   Do not edit VERSION by hand: the publish workflow replaces "dev" with the commit it publishes,
   so every release gets a new cache and iPads pick up the new copy automatically. */
var VERSION = "chess-coach-0770db5fbffe";
var FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "js/engine.js",
  "js/pieces.js",
  "js/app.js",
  "fonts/outfit-latin.woff2",
  "img/veins-light.webp",
  "img/veins-dark.webp",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(caches.match("index.html").then(function (hit) { return hit || fetch(req); }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
