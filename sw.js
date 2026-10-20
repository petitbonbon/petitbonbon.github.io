// Service worker minimal : rend l'app installable et garde l'écran de base
// disponible hors connexion. Les données (Supabase) ne sont jamais mises en cache.
const CACHE = 'pb-v39';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'config.js', 'icon.svg', 'icon-192.png', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Réseau d'abord (pour toujours avoir la dernière version), cache en secours.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    // no-cache : on redemande toujours au serveur s'il y a une nouvelle version
    fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
