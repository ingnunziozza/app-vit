const CACHE_NAME = 'vit-app-offline-v9'; // Versione aggiornata per forzare il ricaricamento
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icona.png',
  './bootstrap.min.css',
  './umd.js',        
  './html2pdf.bundle.min.js', 
  './jszip.min.js',
  './css/style.css',     // <-- MANCAVA
  './js/app.js'          // <-- MANCAVA
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
