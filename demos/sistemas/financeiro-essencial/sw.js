// Veltria Financeiro Essencial · abre sem internet: lança agora, sobe quando a conexão voltar.
const CACHE = 'financeiro-essencial-v50';
// precisa bater com as versões que o app.html pede (tools/testes-financeiro/essencial-sw.test.mjs confere)
const ARQUIVOS = ['app.html', 'app.js?v=9', 'nucleo.js', '../financeiro-comum/dinheiro.js', 'estilo.css?v=7', '../base/versoes.js?v=42', '../base/conta-nuvem.js?v=47', '../base/camada.js?v=16', '../base/pix.js', '../base/qr.js', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((l) => Promise.all(l.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('app.html'))));
});
