// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v51';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=51', 'cardapio.css?v=51', 'simbolo.png?v=2', 'icone-192.png?v=2',
  'app.js?v=51', 'nucleo.js?v=51', 'loja.js?v=51', 'dados.js?v=51', 'ui.js?v=51', 'pix.js?v=51', 'opcoes.js?v=51', 'imprimir.js?v=51', 'salao.js?v=51', 'pedidos.js?v=51',
  'cozinha.js?v=51', 'caixa.js?v=51', 'gestao.js?v=51', 'cadastro.js?v=51', 'relatorios.js?v=51', 'inicio.js?v=51', 'cliente.js?v=51', 'configuracoes.js?v=51', 'menu.js?v=51', 'conta-cliente.js?v=51', 'equipe.js?v=51', 'primeiro-acesso.js?v=51', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
