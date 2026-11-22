// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v55';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=55', 'cardapio.css?v=55', 'simbolo.png?v=2', 'icone-192.png?v=2',
  'app.js?v=55', 'nucleo.js?v=55', 'loja.js?v=55', 'dados.js?v=55', 'ui.js?v=55', 'som.js?v=55', 'pix.js?v=55', 'opcoes.js?v=55', 'imprimir.js?v=55', 'salao.js?v=55', 'pedidos.js?v=55',
  'cozinha.js?v=55', 'caixa.js?v=55', 'gestao.js?v=55', 'cadastro.js?v=55', 'relatorios.js?v=55', 'inicio.js?v=55', 'cliente.js?v=55', 'configuracoes.js?v=55', 'menu.js?v=55', 'conta-cliente.js?v=55', 'equipe.js?v=55', 'primeiro-acesso.js?v=55', 'nota-fiscal.js?v=55', 'ifood.js?v=55', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
