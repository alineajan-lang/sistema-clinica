// Service worker: deixa o app instalável e abre mais rápido. Dados de pacientes NUNCA são guardados aqui.
const V = "essatlas-v10";
const CDN = ["cdn.jsdelivr.net", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];
self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === location.origin) { // site: tenta a rede (sempre a versão nova); sem internet, usa a cópia
    e.respondWith(fetch(r, { cache: "no-cache" }).then(res => { const c = res.clone(); caches.open(V).then(ch => ch.put(r, c)); return res; }).catch(() => caches.match(r).then(m => m || caches.match("./index.html"))));
  } else if (CDN.includes(u.hostname)) { // bibliotecas públicas: cópia primeiro
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const c = res.clone(); caches.open(V).then(ch => ch.put(r, c)); return res; })));
  } // supabase.co (dados) nunca passa pelo cache
});
