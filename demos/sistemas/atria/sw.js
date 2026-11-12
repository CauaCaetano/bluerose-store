// Atria · abre sem internet: o app inteiro fica guardado no celular; o que precisa de rede (mapa, buscas) volta quando a conexão voltar.
const CACHE = 'atria-v18';
const ARQUIVOS = ['app.html', 'app.js?v=14', 'base.js?v=14', 'gestao.js?v=14', 'oficios.js?v=14', 'cenas.js?v=14', 'pix.js?v=14', 'ferramentas.js?v=14', '../base/qr.js', '../base/versoes.js?v=48', '../base/conta-nuvem.js?v=56', '../../../js/envio-demo.js?v=1', 'estilo.css?v=8', 'conceitos.css?v=5', 'conceitos.js?v=14', 'extras.js?v=14', 'mais.js?v=14', 'mais.css?v=4', 'postar.js?v=14', 'midia.js?v=14', 'logo.svg?v=2', 'logo-horizontal.svg?v=2', 'favicon.svg?v=2', 'favicon-32.png?v=2', 'apple-touch-icon.png?v=2', 'manifest.webmanifest', 'icone-192.png?v=2', 'icone-512.png?v=2', 'icone-192-maskable.png?v=2', 'icone-512-maskable.png?v=2', 'simbolo.svg?v=2', 'simbolo-claro.svg?v=2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((l) => Promise.all(l.filter((k) => k !== CACHE && k.startsWith('atria-')).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then((r) => r || caches.match('app.html'))));
});
