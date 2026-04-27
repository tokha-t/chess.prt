const CACHE_NAME = "chesspulse-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./vendor/chess.js",
  "./assets/favicon.svg",
  "./assets/pieces/wP.svg",
  "./assets/pieces/wN.svg",
  "./assets/pieces/wB.svg",
  "./assets/pieces/wR.svg",
  "./assets/pieces/wQ.svg",
  "./assets/pieces/wK.svg",
  "./assets/pieces/bP.svg",
  "./assets/pieces/bN.svg",
  "./assets/pieces/bB.svg",
  "./assets/pieces/bR.svg",
  "./assets/pieces/bQ.svg",
  "./assets/pieces/bK.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
