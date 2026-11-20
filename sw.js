// SKATE RUSH service worker: офлайн-режим после первого запуска
const VERSION = 'skaterush-v3';
const LOCAL = ['./', './index.html', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];
const REMOTE = ['https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(LOCAL);
    for (const u of REMOTE) { try { const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 8000); const r = await fetch(u, { mode: 'cors', signal: ac.signal }); clearTimeout(tm); if (r.ok) await c.put(u, r); } catch (err) {} }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Страница: сначала сеть (чтобы получать обновления), без сети — из кэша
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try { const r = await fetch(req); const c = await caches.open(VERSION); c.put('./index.html', r.clone()); return r; }
      catch (err) { return (await caches.match('./index.html')) || (await caches.match('./')); }
    })());
    return;
  }
  // Three.js, шрифты и файлы игры: из кэша, при отсутствии — сеть + сохранить
  const cacheable = url.origin === location.origin || /cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url.host);
  if (!cacheable) return;
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const r = await fetch(req);
      if (r.ok || r.type === 'opaque') { const c = await caches.open(VERSION); c.put(req, r.clone()); }
      return r;
    } catch (err) { return hit || Response.error(); }
  })());
});
