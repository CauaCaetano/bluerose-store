// Popina · funciona sem internet: guarda as telas e as fotos; os dados ficam no aparelho e sobem quando a rede volta.
const CACHE = 'popina-v60';
const BASE = ['app.html', 'cardapio.html', 'popina.css?v=60', 'cardapio.css?v=60', 'simbolo.png?v=2', 'icone-192.png?v=2',
  'app.js?v=60', 'nucleo.js?v=60', 'loja.js?v=60', 'dados.js?v=60', 'ui.js?v=60', 'som.js?v=60', 'pix.js?v=60', 'opcoes.js?v=60', 'imprimir.js?v=60', 'salao.js?v=60', 'pedidos.js?v=60',
  'cozinha.js?v=60', 'caixa.js?v=60', 'gestao.js?v=60', 'cadastro.js?v=60', 'relatorios.js?v=60', 'inicio.js?v=60', 'cliente.js?v=60', 'configuracoes.js?v=60', 'menu.js?v=60', 'conta-cliente.js?v=60', 'equipe.js?v=60', 'primeiro-acesso.js?v=60', 'nota-fiscal.js?v=60', 'ifood.js?v=60', 'marmita.js?v=60', 'importar.js?v=60', 'balanca.js?v=60', 'quilo.js?v=60', 'maquininha.js?v=60', '../base/qr.js', '../base/assinatura.js?v=2', '../base/assinatura.css?v=1'];
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
