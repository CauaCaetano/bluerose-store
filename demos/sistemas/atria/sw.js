// Atria · abre sem internet: o app inteiro fica guardado no celular; o que precisa de rede (mapa, buscas) volta quando a conexão voltar.
const CACHE = 'atria-v10';
const ARQUIVOS = ['app.html', 'app.js?v=4', 'base.js', 'gestao.js', 'oficios.js', 'cenas.js', 'pix.js', 'ferramentas.js', '../base/qr.js', '../base/versoes.js?v=47', '../base/conta-nuvem.js?v=53', '../../../js/envio-demo.js?v=1', 'estilo.css?v=4', 'conceitos.css?v=4', 'conceitos.js', 'extras.js', 'mais.js', 'mais.css?v=2', 'postar.js', 'logo.svg', 'logo-horizontal.svg', 'favicon.svg', 'apple-touch-icon.png', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png', 'simbolo.svg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((l) => Promise.all(l.filter((k) => k !== CACHE && k.startsWith('atria-')).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then((r) => r || caches.match('app.html'))));
});
