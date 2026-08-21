const CACHE_NAME = 'money-tracker-v2';

const ASSETS = [
    './',
    './index.html',
    './manifest.json'
];

// ================================
// INSTALLAZIONE
// ================================
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ================================
// ATTIVAZIONE
// ================================
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(
                    keys
                        .filter(key => key !== CACHE_NAME)
                        .map(key => caches.delete(key))
                );
            })
            .then(() => self.clients.claim())
    );
});

// ================================
// FETCH
// ================================
self.addEventListener('fetch', (event) => {

    // Gestiamo solo richieste GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Per la pagina principale:
    // NETWORK FIRST
    //
    // 1. prova a prendere la versione più recente da GitHub Pages
    // 2. se Internet non è disponibile, usa la versione in cache
    if (event.request.mode === 'navigate') {

        event.respondWith(
            fetch(event.request)
                .then(response => {

                    // Salva la nuova versione nella cache
                    if (response && response.status === 200) {
                        const responseClone = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseClone);
                            });
                    }

                    return response;
                })
                .catch(() => {
                    // Nessuna connessione:
                    // usa la versione offline
                    return caches.match('./index.html');
                })
        );

        return;
    }

    // Per le altre risorse:
    // CACHE FIRST
    //
    // Se sono già in cache le usa.
    // Altrimenti le scarica dalla rete e le salva.
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {

                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then(response => {

                        if (
                            !response ||
                            response.status !== 200 ||
                            response.type === 'opaque'
                        ) {
                            return response;
                        }

                        const responseClone = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseClone);
                            });

                        return response;
                    });
            })
            .catch(() => {
                return undefined;
            })
    );
});
