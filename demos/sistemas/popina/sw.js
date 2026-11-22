// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v53';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=53', 'cardapio.css?v=53', 'simbolo.png?v=2', 'icone-192.png?v=2',
  'app.js?v=53', 'nucleo.js?v=53', 'loja.js?v=53', 'dados.js?v=53', 'ui.js?v=53', 'som.js?v=53', 'pix.js?v=53', 'opcoes.js?v=53', 'imprimir.js?v=53', 'salao.js?v=53', 'pedidos.js?v=53',
  'cozinha.js?v=53', 'caixa.js?v=53', 'gestao.js?v=53', 'cadastro.js?v=53', 'relatorios.js?v=53', 'inicio.js?v=53', 'cliente.js?v=53', 'configuracoes.js?v=53', 'menu.js?v=53', 'conta-cliente.js?v=53', 'equipe.js?v=53', 'primeiro-acesso.js?v=53', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
