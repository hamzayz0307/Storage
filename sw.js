// Box Finder service worker: lets the app open without a connection.
// Pages are network-first (new deploys show up right away) with a cached fallback.
// Fonts, icons, libraries: served from cache, refreshed in the background.
// Supabase (database, sign-in, photos, AI) is never cached.
const CACHE = 'bf-shell-v2';
const SHELL = [
  '/', '/config.js', '/manifest.webmanifest', '/fonts/fonts.css', '/vendor/qrcode.js', '/vendor/jsQR.js',
  '/js/i18n.js', '/js/app.js', '/js/offline.js', '/js/records.js', '/js/moving.js', '/js/spaces.js', '/js/extras.js',
  '/privacy.html', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/icons/icon.svg'
];
const STATIC_HOSTS = ['unpkg.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;

  // The page and config: network first, cached copy when offline.
  if (req.mode === 'navigate' || url.pathname === '/config.js' || url.pathname.startsWith('/js/')) {
    const key = req.mode === 'navigate' ? (url.pathname === '/privacy.html' || url.pathname === '/s.html' ? url.pathname : '/') : url.pathname;
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); }
          return res;
        })
        .catch(() => caches.match(key).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  if (url.origin === self.location.origin || STATIC_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          const fresh = fetch(req)
            .then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; })
            .catch(() => hit);
          return hit || fresh;
        })
      )
    );
  }
});
