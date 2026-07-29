const CACHE_NAME = "entreno-nico-v2";
const APP_SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/data.js",
  "./js/animations.js",
  "./js/app.js",
  "./icons/icon.svg",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
  "./icons/icon-maskable.svg",
  "./media/manifest.json",
];

// fetch con cache:"reload" para evitar que una respuesta HTTP vieja del
// propio navegador se cuele en el precache al actualizar de versión.
async function fetchFresh(url) {
  return fetch(url, { cache: "reload" });
}

async function precache(cache, url) {
  try {
    const res = await fetchFresh(url);
    if (res && res.ok) await cache.put(url, res);
  } catch (err) {
    console.error("No se pudo precachear:", url, err);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(APP_SHELL_FILES.map((url) => precache(cache, url)));
      // Fotos de ejercicios: se precachean aparte para que el shell instale
      // rápido incluso si alguna imagen tarda o falla puntualmente.
      try {
        const manifestRes = await fetchFresh("./media/manifest.json");
        const mediaFiles = await manifestRes.json();
        await Promise.allSettled(mediaFiles.map((url) => precache(cache, url)));
      } catch (err) {
        console.error("No se pudo precachear el media manifest:", err);
      }
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first con actualización en segundo plano (stale-while-revalidate)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
