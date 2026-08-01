self.addEventListener("install", (event) => {
  console.log("Service Worker installed.");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activated.");
  return self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Pass through all requests - caching can be added later if needed
  event.respondWith(fetch(event.request));
});
