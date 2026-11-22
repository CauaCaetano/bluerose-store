// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v54';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=54', 'cardapio.css?v=54', 'simbolo.png?v=2', 'icone-192.png?v=2',
  'app.js?v=54', 'nucleo.js?v=54', 'loja.js?v=54', 'dados.js?v=54', 'ui.js?v=54', 'som.js?v=54', 'pix.js?v=54', 'opcoes.js?v=54', 'imprimir.js?v=54', 'salao.js?v=54', 'pedidos.js?v=54',
  'cozinha.js?v=54', 'caixa.js?v=54', 'gestao.js?v=54', 'cadastro.js?v=54', 'relatorios.js?v=54', 'inicio.js?v=54', 'cliente.js?v=54', 'configuracoes.js?v=54', 'menu.js?v=54', 'conta-cliente.js?v=54', 'equipe.js?v=54', 'primeiro-acesso.js?v=54', 'nota-fiscal.js?v=54', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
