// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v41';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=2', 'cardapio.css?v=30', 'simbolo.png?v=1', 'icone-192.png?v=1',
  'app.js?v=41', 'nucleo.js?v=41', 'loja.js?v=41', 'dados.js?v=41', 'ui.js?v=41', 'pix.js?v=41', 'opcoes.js?v=41', 'imprimir.js?v=41', 'salao.js?v=41', 'pedidos.js?v=41',
  'cozinha.js?v=41', 'caixa.js?v=41', 'gestao.js?v=41', 'cadastro.js?v=41', 'relatorios.js?v=41', 'inicio.js?v=41', 'cliente.js?v=41', 'configuracoes.js?v=41', '../base/qr.js', '../base/assinatura.js?v=1', '../base/assinatura.css?v=1'];
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
