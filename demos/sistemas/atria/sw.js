// Atria · abre sem internet: o app inteiro fica guardado no celular; o que precisa de rede (mapa, buscas) volta quando a conexão voltar.
const CACHE = 'atria-v17';
const ARQUIVOS = ['app.html', 'app.js?v=13', 'base.js?v=13', 'gestao.js?v=13', 'oficios.js?v=13', 'cenas.js?v=13', 'pix.js?v=13', 'ferramentas.js?v=13', '../base/qr.js', '../base/versoes.js?v=48', '../base/conta-nuvem.js?v=56', '../../../js/envio-demo.js?v=1', 'estilo.css?v=8', 'conceitos.css?v=5', 'conceitos.js?v=13', 'extras.js?v=13', 'mais.js?v=13', 'mais.css?v=4', 'postar.js?v=13', 'midia.js?v=13', 'logo.svg?v=2', 'logo-horizontal.svg?v=2', 'favicon.svg?v=2', 'favicon-32.png?v=2', 'apple-touch-icon.png?v=2', 'manifest.webmanifest', 'icone-192.png?v=2', 'icone-512.png?v=2', 'icone-192-maskable.png?v=2', 'icone-512-maskable.png?v=2', 'simbolo.svg?v=2', 'simbolo-claro.svg?v=2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((l) => Promise.all(l.filter((k) => k !== CACHE && k.startsWith('atria-')).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then((r) => r || caches.match('app.html'))));
});
