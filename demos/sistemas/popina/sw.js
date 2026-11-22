// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v46';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=46', 'cardapio.css?v=46', 'simbolo.png?v=1', 'icone-192.png?v=1',
  'app.js?v=46', 'nucleo.js?v=46', 'loja.js?v=46', 'dados.js?v=46', 'ui.js?v=46', 'pix.js?v=46', 'opcoes.js?v=46', 'imprimir.js?v=46', 'salao.js?v=46', 'pedidos.js?v=46',
  'cozinha.js?v=46', 'caixa.js?v=46', 'gestao.js?v=46', 'cadastro.js?v=46', 'relatorios.js?v=46', 'inicio.js?v=46', 'cliente.js?v=46', 'configuracoes.js?v=46', 'primeiro-acesso.js?v=46', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
