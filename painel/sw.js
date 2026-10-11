/*
 * Service worker do app do Escritório: guarda a casca do app para abrir rápido,
 * mostra as notificações e cuida das atualizações. Quando este arquivo muda
 * (nova VERSAO), o app mostra "Nova atualização disponível"; ao tocar, troca na hora.
 * Os dados (Supabase) nunca ficam guardados aqui.
 */
var VERSAO = '1.0.0';
var CACHE = 'escritorio-' + VERSAO;
var CASCA = ['./', 'index.html', 'app.css?v=1', 'app.js?v=1', 'manifest.webmanifest', 'icone-96.png', 'icone-192.png', 'icone-512.png', '../fonts/geist-latin.woff2'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CASCA); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('escritorio-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('message', function (e) { if (e.data === 'atualizar') self.skipWaiting(); });

// casca: rede primeiro (pega a versão nova se houver), cache se estiver sem internet
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    if (r.ok && u.pathname.indexOf('/painel/') === 0) { var copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copia); }); }
    return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: false }).then(function (r) { return r || caches.match('index.html'); }); }));
});

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { titulo: 'Escritório', texto: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Escritório Blue Rose', {
    body: d.texto || '', icon: 'icone-192.png', badge: 'icone-96.png', tag: d.tag || undefined, renotify: !!d.tag,
    data: { url: d.url || './' }, vibrate: [80, 40, 80],
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var alvo = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (l) {
    for (var i = 0; i < l.length; i++) if (l[i].url.indexOf(self.registration.scope) === 0) { l[i].focus(); return l[i].navigate ? l[i].navigate(alvo) : null; }
    return self.clients.openWindow(alvo);
  }));
});
