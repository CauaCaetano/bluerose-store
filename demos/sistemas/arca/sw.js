// Arca · abre sem internet: lança agora, sobe quando a conexão voltar (rede primeiro, cópia guardada se cair).
const CACHE = 'arca-v3';
const ARQUIVOS = ['app.html', 'app.js?v=2', 'nucleo.js', '../financeiro-comum/dinheiro.js', 'arca.css?v=3', '../base/versoes.js?v=50', '../base/conta-nuvem.js?v=61', '../base/pix.js', '../base/qr.js', 'manifest.webmanifest', 'img/louro-moedas.webp', 'img/louro-prata.webp', '../../../img/logos/arca/arca-completa-escura-480.png?v=1', '../../../img/logos/arca/arca-simbolo-256.png?v=1'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((l) => Promise.all(l.filter((k) => k !== CACHE && k.startsWith('arca-')).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('app.html'))));
});
