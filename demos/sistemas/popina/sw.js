// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v50';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=50', 'cardapio.css?v=50', 'simbolo.png?v=1', 'icone-192.png?v=1',
  'app.js?v=50', 'nucleo.js?v=50', 'loja.js?v=50', 'dados.js?v=50', 'ui.js?v=50', 'pix.js?v=50', 'opcoes.js?v=50', 'imprimir.js?v=50', 'salao.js?v=50', 'pedidos.js?v=50',
  'cozinha.js?v=50', 'caixa.js?v=50', 'gestao.js?v=50', 'cadastro.js?v=50', 'relatorios.js?v=50', 'inicio.js?v=50', 'cliente.js?v=50', 'configuracoes.js?v=50', 'menu.js?v=50', 'conta-cliente.js?v=50', 'equipe.js?v=50', 'primeiro-acesso.js?v=50', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
