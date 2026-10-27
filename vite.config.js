import { defineConfig } from 'vite';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

// Writes dist/sw.js with a precache list of every built file, so the web/PWA build plays fully offline.
function offlineServiceWorker() {
  return {
    name: 'offline-sw', apply: 'build',
    closeBundle() {
      const out = 'dist'; const files = [];
      const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else files.push(relative(out, p).split('\\').join('/')); } };
      walk(out);
      const list = files.filter((f) => f !== 'sw.js' && !f.endsWith('.map'));
      const hash = createHash('sha1').update(list.join('|') + list.map((f) => statSync(join(out, f)).size).join(',')).digest('hex').slice(0, 10);
      // Shell-only precache (hashed bundles + HTML). Full addAll of every voice/music file
      // often fails on iPhone quota and leaves the old SW forever — Sean then never gets new JS.
      const shell = list.filter((f) => f === 'index.html' || f.endsWith('.css') || /^assets\/index-/.test(f) || f === 'manifest.webmanifest' || f === 'icon-192.png' || f === 'icon-180.png');
      writeFileSync(join(out, 'sw.js'), `// Blackspire offline service worker (generated at build time)
const CACHE = 'blackspire-${hash}';
const SHELL = ${JSON.stringify(['./', ...shell.map((f) => './' + f)])};
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const f of SHELL) { try { await c.add(f); } catch (err) { /* one miss must not block update */ } }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('blackspire-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);
  const path = url.pathname;
  const isNav = req.mode === 'navigate' || path.endsWith('/') || path.endsWith('/index.html') || /index-[A-Za-z0-9_-]+\.js$/.test(path);
  // HTML + main bundle: always try network first so deploys are not stuck behind an old cache.
  if (isNav) {
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? './' : req, cp)); }
      return r;
    }).catch(() => caches.match(req.mode === 'navigate' ? './' : req)));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok && (path.includes('/assets/') || path.includes('/music/') || path.includes('/voice/') || path.includes('/portraits/') || path.includes('/models/'))) {
      const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp));
    }
    return r;
  })));
});
`);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [offlineServiceWorker()],
  build: {
    outDir: 'dist', target: 'es2022', chunkSizeWarningLimit: 700,
    rollupOptions: { output: { manualChunks(id) { if (id.includes('node_modules/three/build')) return 'three-core'; } } },
  },
  test: { include: ['tests/**/*.test.js'] },
});
