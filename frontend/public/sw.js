// Fastory Service Worker - Passthrough only, no caching or fetch interception

self.addEventListener("install", () => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

// Do NOT add a fetch event listener - this lets the browser handle all requests
// natively without any SW interception, preventing redirect loops with manifest.json
