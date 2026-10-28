// Veltria Obras Essencial · funciona sem internet: guarda as telas no aparelho e atualiza quando a rede volta.
const CACHE = 'obras-essencial-v5';
const ARQUIVOS = ['app.html', 'app.js?v=5', 'estilo.css?v=4', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((l) => Promise.all(l.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
// rede primeiro (pega a versão nova); sem rede, usa a cópia guardada
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: false }).then((r) => r || caches.match('app.html'))));
});
