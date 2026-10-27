#!/usr/bin/env node
/** Serve dist/ under /blackspire/ so base-relative asset URLs match GitHub Pages. */
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
const root = new URL('../dist/', import.meta.url).pathname;
const PORT = +(process.env.PORT || 4177);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.webmanifest': 'application/manifest+json' };
createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/' || u === '') { res.writeHead(302, { Location: '/blackspire/' }); return res.end(); }
  if (!u.startsWith('/blackspire')) { res.writeHead(404); return res.end('not under /blackspire'); }
  let rel = u.slice('/blackspire'.length);
  if (rel === '' || rel === '/') rel = '/index.html';
  const file = join(root, rel.replace(/^\//, ''));
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    // SPA fallback
    const idx = join(root, 'index.html');
    if (existsSync(idx) && !extname(rel)) { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(readFileSync(idx)); }
    res.writeHead(404); return res.end('missing ' + rel);
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(PORT, () => console.log(`blackspire subpath http://127.0.0.1:${PORT}/blackspire/`));
