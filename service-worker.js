const CACHE_PREFIX = `workout-app:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}2026.10.12.2`;
const APP_SHELL = [
  "./index.html", "./style.css?v=backup-1", "./script.js?v=order-1",
  "./backup-core.js?v=backup-1", "./backup-ui.js?v=backup-1", "./manifest.json",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) =>
    cache.addAll(APP_SHELL.map((url) => new Request(new URL(url, self.registration.scope), { cache: "reload" })))
  ));
});

// Updates wait until old windows close, or the user explicitly applies them.
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(
    names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name))
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !url.href.startsWith(self.registration.scope)) return;
  const entry = new URL("./index.html", self.registration.scope).href;
  if (event.request.mode === "navigate" && (url.pathname === new URL(entry).pathname || url.pathname === new URL(self.registration.scope).pathname)) {
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) => (await cache.match(entry)) || fetch(event.request)));
    return;
  }
  // Cache only the app shell; unrelated pages and responses are untouched.
  if (!APP_SHELL.some((path) => new URL(path, self.registration.scope).href === url.href)) return;
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => (await cache.match(event.request)) || fetch(event.request)));
});
