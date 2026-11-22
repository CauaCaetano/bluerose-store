// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v56';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=56', 'cardapio.css?v=56', 'simbolo.png?v=2', 'icone-192.png?v=2',
  'app.js?v=56', 'nucleo.js?v=56', 'loja.js?v=56', 'dados.js?v=56', 'ui.js?v=56', 'som.js?v=56', 'pix.js?v=56', 'opcoes.js?v=56', 'imprimir.js?v=56', 'salao.js?v=56', 'pedidos.js?v=56',
  'cozinha.js?v=56', 'caixa.js?v=56', 'gestao.js?v=56', 'cadastro.js?v=56', 'relatorios.js?v=56', 'inicio.js?v=56', 'cliente.js?v=56', 'configuracoes.js?v=56', 'menu.js?v=56', 'conta-cliente.js?v=56', 'equipe.js?v=56', 'primeiro-acesso.js?v=56', 'nota-fiscal.js?v=56', 'ifood.js?v=56', 'marmita.js?v=56', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
