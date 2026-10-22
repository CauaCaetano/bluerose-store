// Veltria · service worker (gerado por tools/gerar_pwa.py)
const CACHE = 'nexo-app-v2';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('nexo-app-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (!u.pathname.startsWith('/app/') && !u.pathname.startsWith('/demos/sistemas/')) return;
  // rede primeiro (sempre a versão mais nova); sem internet, usa a cópia guardada
  // cache: 'no-cache' confere com o servidor toda vez (o GitHub Pages guarda 10 min no navegador e o celular abria a versão velha)
  const novo = e.request.mode === 'navigate' ? fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(new Request(e.request, { cache: 'no-cache' }));
  e.respondWith(novo.then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match(new URL('./', e.request.url)))));
});
