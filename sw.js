const CACHE_NAME = 'vit-app-offline-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
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

// Usa i file salvati se manca internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se trova il file in cache lo restituisce, altrimenti usa internet
        return response || fetch(event.request);
      })
  );
});