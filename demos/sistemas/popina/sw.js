// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v63';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=63', 'cardapio.css?v=63', 'simbolo.png?v=2', 'icone-192.png?v=2',
  'app.js?v=63', 'nucleo.js?v=63', 'loja.js?v=63', 'dados.js?v=63', 'ui.js?v=63', 'som.js?v=63', 'pix.js?v=63', 'opcoes.js?v=63', 'imprimir.js?v=63', 'salao.js?v=63', 'pedidos.js?v=63',
  'cozinha.js?v=63', 'caixa.js?v=63', 'gestao.js?v=63', 'cadastro.js?v=63', 'relatorios.js?v=63', 'inicio.js?v=63', 'cliente.js?v=63', 'configuracoes.js?v=63', 'menu.js?v=63', 'conta-cliente.js?v=63', 'equipe.js?v=63', 'primeiro-acesso.js?v=63', 'nota-fiscal.js?v=63', 'ifood.js?v=63', 'marmita.js?v=63', 'importar.js?v=63', 'balanca.js?v=63', 'quilo.js?v=63', 'maquininha.js?v=63', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
