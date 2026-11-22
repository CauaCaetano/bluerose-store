// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v52';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=52', 'cardapio.css?v=52', 'simbolo.png?v=2', 'icone-192.png?v=2',
  'app.js?v=52', 'nucleo.js?v=52', 'loja.js?v=52', 'dados.js?v=52', 'ui.js?v=52', 'som.js?v=52', 'pix.js?v=52', 'opcoes.js?v=52', 'imprimir.js?v=52', 'salao.js?v=52', 'pedidos.js?v=52',
  'cozinha.js?v=52', 'caixa.js?v=52', 'gestao.js?v=52', 'cadastro.js?v=52', 'relatorios.js?v=52', 'inicio.js?v=52', 'cliente.js?v=52', 'configuracoes.js?v=52', 'menu.js?v=52', 'conta-cliente.js?v=52', 'equipe.js?v=52', 'primeiro-acesso.js?v=52', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
