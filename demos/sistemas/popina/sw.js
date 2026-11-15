// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v2';
const BASE = ['app.html', 'cardapio.html', 'estilo.css?v=1', 'cardapio.css?v=1', 'simbolo.png?v=1', 'icone-192.png?v=1',
  'app.js?v=1', 'nucleo.js?v=1', 'loja.js?v=1', 'dados.js?v=1', 'ui.js?v=1', 'pix.js?v=1', 'salao.js?v=1', 'cozinha.js?v=1',
  'caixa.js?v=1', 'pedidos.js?v=1', 'mais.js?v=1', 'cliente.js?v=1', '../base/qr.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
// rede primeiro (sempre a versão nova), cache quando estiver sem internet
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: false }).then((r) => r || caches.match(e.request, { ignoreSearch: true }))));
});
