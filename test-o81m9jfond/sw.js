// Service worker: lets the game run without internet after the first visit.
// Pages and code: network first (updates arrive at once), cached copy when offline.
// Pictures, sounds, fonts: cache first. Music/ambience streams (<audio> range requests) are left to the network.
const VERSION = "rnv-beta-2";
const CORE = ["./", "index.html", "game.js", "sprites.js", "style.css", "manifest.webmanifest",
  "assets/fonts/russo-one-cyrillic-400-normal.woff2", "assets/fonts/press-start-2p-cyrillic-400-normal.woff2",
  "assets/ui/logo.png", "assets/ui/dk_logo.png", "assets/ui/favicon_32.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.headers.has("range") || req.destination === "audio" || req.destination === "video") return;
  const url = new URL(req.url);
  const isCode = req.mode === "navigate" || /\.(html|js|css|webmanifest)$/.test(url.pathname) || url.pathname.endsWith("/");
  if (isCode) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  })));
});
