// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v59';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=59', 'cardapio.css?v=59', 'simbolo.png?v=2', 'icone-192.png?v=2',
  'app.js?v=59', 'nucleo.js?v=59', 'loja.js?v=59', 'dados.js?v=59', 'ui.js?v=59', 'som.js?v=59', 'pix.js?v=59', 'opcoes.js?v=59', 'imprimir.js?v=59', 'salao.js?v=59', 'pedidos.js?v=59',
  'cozinha.js?v=59', 'caixa.js?v=59', 'gestao.js?v=59', 'cadastro.js?v=59', 'relatorios.js?v=59', 'inicio.js?v=59', 'cliente.js?v=59', 'configuracoes.js?v=59', 'menu.js?v=59', 'conta-cliente.js?v=59', 'equipe.js?v=59', 'primeiro-acesso.js?v=59', 'nota-fiscal.js?v=59', 'ifood.js?v=59', 'marmita.js?v=59', 'importar.js?v=59', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
