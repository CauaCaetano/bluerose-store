// Peplo · abre sem internet: vende agora, sobe quando a conexão voltar.
const CACHE = 'peplo-v17';
const ARQUIVOS = ['app.html', 'app.js?v=12', 'estilo.css?v=5', 'boutique.css?v=8', '../base/assinatura.css?v=1', '../base/assinatura.js?v=1', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png', 'simbolo.svg',
  'img/menu-tecido.webp', 'img/menu-traco.webp', 'img/logo-vestido.webp', 'img/cena-loja.webp', 'img/etiqueta.webp', 'img/sacola-topo.webp', 'img/alfinete.webp', 'img/titulo-traco.webp', 'img/pecas-dobradas.webp'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((l) => Promise.all(l.filter((k) => k !== CACHE && k.startsWith('peplo-')).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('app.html'))));
});
