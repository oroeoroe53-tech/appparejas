/* Service worker for US.
 *
 * Privacy first: this worker NEVER caches HTML pages, API responses or letters.
 * It only (1) caches static, content-hashed build assets and icons, (2) serves a small offline
 * page when a navigation fails, and (3) handles Web Push + notification clicks.
 */
const VERSION = "v1";
const STATIC_CACHE = `us-static-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/badge-96.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      // A new worker only caches public static files, so activating it immediately is safe.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("us-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Page navigations: always the network (authenticated, private). Only fall back to the offline page.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())));
    return;
  }

  // Immutable, hashed build output and icons are safe to cache.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then(
          (hit) =>
            hit ||
            fetch(request).then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            }),
        ),
      ),
    );
  }
  // Everything else (API, RSC payloads, images from elsewhere) goes straight to the network.
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === "string" && data.title ? data.title : "US";
  const options = {
    body: typeof data.body === "string" ? data.body : (String(self.navigator.language).startsWith("en") ? "You have something waiting." : "Tienes algo esperándote."),
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/badge-96.png",
    tag: data.tag || undefined, // same tag => the OS replaces rather than duplicates
    image: typeof data.image === "string" && data.image.startsWith("https://") ? data.image : undefined,
    vibrate: Array.isArray(data.vibrate) ? data.vibrate.filter((n) => typeof n === "number" && n >= 0 && n <= 1000).slice(0, 9) : undefined,
    data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/home" },
  };
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // A dot/number on the app icon where the platform supports it.
      self.navigator && self.navigator.setAppBadge ? self.navigator.setAppBadge().catch(() => undefined) : Promise.resolve(),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/home", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          // Reuse the open app window; the app itself enforces authentication.
          return client.focus().then((c) => (c && "navigate" in c ? c.navigate(target) : c));
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

// The browser rotated or expired the subscription: try to renew it using the same server key.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const key = event.oldSubscription && event.oldSubscription.options && event.oldSubscription.options.applicationServerKey;
      if (!key) return;
      const subscription = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(subscription.toJSON()),
      });
    })().catch(() => undefined),
  );
});
