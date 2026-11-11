// O Fortis agora se chama Atria: este service worker limpa o cache antigo e se desliga.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((l) => Promise.all(l.filter((k) => k.startsWith('fortis-')).map((k) => caches.delete(k)))).then(() => self.registration.unregister())); });
