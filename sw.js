const CACHE_NAME = 'vit-app-offline-v3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icona.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

// Installa il Service Worker e salva i file in memoria
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('File salvati in cache per uso offline');
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercetta le richieste di rete e restituisce i file dalla memoria se offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Ritorna la risposta dalla cache se trovata, altrimenti fa la richiesta di rete
        return response || fetch(event.request);
      })
  );
});

// Pulizia delle vecchie versioni della cache
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
