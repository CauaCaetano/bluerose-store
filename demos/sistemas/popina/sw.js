// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v48';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=48', 'cardapio.css?v=48', 'simbolo.png?v=1', 'icone-192.png?v=1',
  'app.js?v=48', 'nucleo.js?v=48', 'loja.js?v=48', 'dados.js?v=48', 'ui.js?v=48', 'pix.js?v=48', 'opcoes.js?v=48', 'imprimir.js?v=48', 'salao.js?v=48', 'pedidos.js?v=48',
  'cozinha.js?v=48', 'caixa.js?v=48', 'gestao.js?v=48', 'cadastro.js?v=48', 'relatorios.js?v=48', 'inicio.js?v=48', 'cliente.js?v=48', 'configuracoes.js?v=48', 'menu.js?v=48', 'conta-cliente.js?v=48', 'equipe.js?v=48', 'primeiro-acesso.js?v=48', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
