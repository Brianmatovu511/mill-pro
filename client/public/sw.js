/* MillPro service worker — minimal v1.
   Strategy: network-first passthrough. Future: add offline cache + write-queue.
   Bumping CACHE_VER will force all clients to refresh installed SW on next load. */
const CACHE_VER = "millpro-v1";

self.addEventListener("install", (e) => {
  // Activate immediately on first install (no waiting for tabs to close).
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    // Drop any old caches.
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_VER).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  // Network-first, no fallback. SW is currently a passthrough that exists
  // mainly to make the app installable. Offline caching lives behind a future
  // feature flag.
  return;
});
