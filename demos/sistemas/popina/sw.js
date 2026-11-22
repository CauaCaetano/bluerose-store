// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v47';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=47', 'cardapio.css?v=47', 'simbolo.png?v=1', 'icone-192.png?v=1',
  'app.js?v=47', 'nucleo.js?v=47', 'loja.js?v=47', 'dados.js?v=47', 'ui.js?v=47', 'pix.js?v=47', 'opcoes.js?v=47', 'imprimir.js?v=47', 'salao.js?v=47', 'pedidos.js?v=47',
  'cozinha.js?v=47', 'caixa.js?v=47', 'gestao.js?v=47', 'cadastro.js?v=47', 'relatorios.js?v=47', 'inicio.js?v=47', 'cliente.js?v=47', 'configuracoes.js?v=47', 'primeiro-acesso.js?v=47', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
