// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v25';
const BASE = ['app.html', 'cardapio.html', 'estilo.css?v=3', 'taberna.css?v=2', 'cardapio.css?v=3', 'simbolo.png?v=1', 'icone-192.png?v=1',
  'app.js?v=25', 'nucleo.js?v=25', 'loja.js?v=25', 'dados.js?v=25', 'ui.js?v=25', 'pix.js?v=25', 'opcoes.js?v=25', 'salao.js?v=25', 'cozinha.js?v=25',
  'caixa.js?v=25', 'pedidos.js?v=25', 'mais.js?v=25', 'gestao.js?v=25', 'cliente.js?v=25', '../base/qr.js'];
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
