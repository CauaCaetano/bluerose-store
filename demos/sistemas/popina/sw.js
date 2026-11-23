// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v61';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=61', 'cardapio.css?v=61', 'simbolo.png?v=2', 'icone-192.png?v=2',
  'app.js?v=61', 'nucleo.js?v=61', 'loja.js?v=61', 'dados.js?v=61', 'ui.js?v=61', 'som.js?v=61', 'pix.js?v=61', 'opcoes.js?v=61', 'imprimir.js?v=61', 'salao.js?v=61', 'pedidos.js?v=61',
  'cozinha.js?v=61', 'caixa.js?v=61', 'gestao.js?v=61', 'cadastro.js?v=61', 'relatorios.js?v=61', 'inicio.js?v=61', 'cliente.js?v=61', 'configuracoes.js?v=61', 'menu.js?v=61', 'conta-cliente.js?v=61', 'equipe.js?v=61', 'primeiro-acesso.js?v=61', 'nota-fiscal.js?v=61', 'ifood.js?v=61', 'marmita.js?v=61', 'importar.js?v=61', 'balanca.js?v=61', 'quilo.js?v=61', 'maquininha.js?v=61', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
