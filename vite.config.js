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
      writeFileSync(join(out, 'sw.js'), `// GrokWizard offline service worker (generated at build time)
const CACHE = 'grokwizard-${hash}';
const FILES = ${JSON.stringify(['./', ...list.map((f) => './' + f)])};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('grokwizard-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') { e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('./', cp)); return r; }).catch(() => caches.match('./'))); return; }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; })));
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
