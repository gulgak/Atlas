/* 경혈 Atlas — service worker (offline + actualización fiable) */
const CACHE = 'gyeol-atlas-v2';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // no interceptar POST (p.ej. API Gemini)
  const isHTML = req.mode === 'navigate' || req.destination === 'document' || /\.html($|\?)/.test(req.url);
  if (isHTML) {
    // PRIMERO RED: siempre intenta la última versión; si no hay internet, usa la caché
    e.respondWith(
      fetch(req).then(res => {
        try { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); } catch (_) {}
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
  } else {
    // PRIMERO CACHÉ para estáticos (iconos, manifest)
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        try { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); } catch (_) {}
        return res;
      }))
    );
  }
});
