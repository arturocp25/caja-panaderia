// Guarda la app en el teléfono para que abra sin internet.
// Al publicar una versión nueva, cambia el número de CACHE.
const CACHE = 'panaderia-v2.0.0';
const FUENTES = 'panaderia-fuentes';
const BASE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== FUENTES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Primero lo guardado (abre al instante y sin señal); se actualiza en segundo plano.
    e.respondWith(caches.open(CACHE).then(async c => {
      const guardado = (await c.match(req, { ignoreSearch: true })) ||
        (req.mode === 'navigate' ? await c.match('./index.html') : undefined);
      const red = fetch(req).then(r => {
        if (r && r.ok) c.put(req.mode === 'navigate' ? './index.html' : req, r.clone());
        return r;
      }).catch(() => undefined);
      if (guardado) { e.waitUntil(red); return guardado; }
      return (await red) || new Response('Sin conexión', { status: 503 });
    }));
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FUENTES).then(async c => {
      const m = await c.match(req);
      if (m) return m;
      try { const r = await fetch(req); c.put(req, r.clone()); return r; }
      catch (err) { return url.hostname === 'fonts.googleapis.com' ? new Response('', { headers: { 'Content-Type': 'text/css' } }) : Response.error(); }
    }));
  }
  // Las llamadas a Google Apps Script pasan directo (la app guarda sus datos aparte).
});
