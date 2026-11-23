// Tecton · funciona sem internet: guarda as telas; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'tecton-v4';
const BASE = ['app.html', 'cliente.html', 'tecton.css?v=4', 'simbolo-128.png?v=1', 'icone-192.png?v=1', 'app.js?v=4', 'nucleo.js?v=4', 'dados.js?v=4', 'comum.js?v=4', 'construtora.js?v=4', 'loja.js?v=4', 'imobiliaria.js?v=4', 'ajuste.js?v=4', 'nota.js?v=4', 'importar.js?v=4', 'cliente.js?v=1',
  '../base/assinatura.js?v=2', '../base/assinatura.css?v=1', '../base/qr.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
// rede primeiro (sempre a versão nova), cache quando estiver sem internet
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (/[?&]v=\d/.test(u.search)) {
    e.respondWith(caches.match(e.request).then((m) => m || fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); } return r; })));
    return;
  }
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: false }).then((r) => r || caches.match(e.request, { ignoreSearch: true }))));
});
