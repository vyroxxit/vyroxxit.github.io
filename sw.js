const V = "vx-v4";
const ASSETS = ["/", "/index.html", "/legal.html", "/legal.js", "/vx-doc.js", "/manifest.json", "/favicon-192.png", "/favicon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(V).then((c) => Promise.all(ASSETS.map((u) => c.add(u).catch(() => {}))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  if (/\.(apk|zip|msix|msixbundle|appxbundle)$/i.test(new URL(r.url).pathname)) return;
  if (r.mode === "navigate" || /\.(js|json)$/i.test(new URL(r.url).pathname)) {
    e.respondWith(
      fetch(r).then((res) => {
        const copy = res.clone();
        caches.open(V).then((c) => c.put(r, copy));
        return res;
      }).catch(() => caches.match(r).then((m) => m || (r.mode === "navigate" ? caches.match("/index.html") : undefined)))
    );
    return;
  }
  e.respondWith(
    caches.match(r).then((m) => {
      const net = fetch(r).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put(r, copy)); }
        return res;
      }).catch(() => m);
      return m || net;
    })
  );
});
