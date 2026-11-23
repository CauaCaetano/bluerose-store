// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v57';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=57', 'cardapio.css?v=57', 'simbolo.png?v=2', 'icone-192.png?v=2',
  'app.js?v=57', 'nucleo.js?v=57', 'loja.js?v=57', 'dados.js?v=57', 'ui.js?v=57', 'som.js?v=57', 'pix.js?v=57', 'opcoes.js?v=57', 'imprimir.js?v=57', 'salao.js?v=57', 'pedidos.js?v=57',
  'cozinha.js?v=57', 'caixa.js?v=57', 'gestao.js?v=57', 'cadastro.js?v=57', 'relatorios.js?v=57', 'inicio.js?v=57', 'cliente.js?v=57', 'configuracoes.js?v=57', 'menu.js?v=57', 'conta-cliente.js?v=57', 'equipe.js?v=57', 'primeiro-acesso.js?v=57', 'nota-fiscal.js?v=57', 'ifood.js?v=57', 'marmita.js?v=57', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
