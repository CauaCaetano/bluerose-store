// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v62';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=62', 'cardapio.css?v=62', 'simbolo.png?v=2', 'icone-192.png?v=2',
  'app.js?v=62', 'nucleo.js?v=62', 'loja.js?v=62', 'dados.js?v=62', 'ui.js?v=62', 'som.js?v=62', 'pix.js?v=62', 'opcoes.js?v=62', 'imprimir.js?v=62', 'salao.js?v=62', 'pedidos.js?v=62',
  'cozinha.js?v=62', 'caixa.js?v=62', 'gestao.js?v=62', 'cadastro.js?v=62', 'relatorios.js?v=62', 'inicio.js?v=62', 'cliente.js?v=62', 'configuracoes.js?v=62', 'menu.js?v=62', 'conta-cliente.js?v=62', 'equipe.js?v=62', 'primeiro-acesso.js?v=62', 'nota-fiscal.js?v=62', 'ifood.js?v=62', 'marmita.js?v=62', 'importar.js?v=62', 'balanca.js?v=62', 'quilo.js?v=62', 'maquininha.js?v=62', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
