// Atria · abre sem internet: o app inteiro fica guardado no celular; o que precisa de rede (mapa, buscas) volta quando a conexão voltar.
const CACHE = 'atria-v28';
const ARQUIVOS = ['app.html', 'app.js?v=20', 'base.js?v=19', 'gestao.js?v=19', 'oficios.js?v=19', 'cenas.js?v=19', 'pix.js?v=19', 'ferramentas.js?v=19', '../base/qr.js', '../base/versoes.js?v=49', '../base/conta-nuvem.js?v=62', '../base/assinatura.js?v=1', '../base/assinatura.css?v=1', '../../../js/envio-demo.js?v=1', 'estilo.css?v=12', 'conceitos.css?v=7', 'conceitos.js?v=19', 'extras.js?v=19', 'mais.js?v=19', 'mais.css?v=7', 'postar.js?v=19', 'midia.js?v=19', 'logo.svg?v=2', 'logo-horizontal.svg?v=2', 'favicon.svg?v=2', 'favicon-32.png?v=2', 'apple-touch-icon.png?v=2', 'manifest.webmanifest', 'icone-192.png?v=2', 'icone-512.png?v=2', 'icone-192-maskable.png?v=2', 'icone-512-maskable.png?v=2', 'simbolo.svg?v=2', 'simbolo-claro.svg?v=2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((l) => Promise.all(l.filter((k) => k !== CACHE && k.startsWith('atria-')).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then((r) => r || caches.match('app.html'))));
});
