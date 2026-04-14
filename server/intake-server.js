/**
 * intake-server.js — Webuilder Intake API
 * Runs on port 3001 (independent of Mission Control on 3000)
 *
 * Endpoints:
 *   POST /api/intake  { slug, biz, services }   → updates content.json + git push
 *   POST /api/photo   (raw binary, headers: x-phone, x-slot, x-intake-secret)
 *                                                → saves photo + updates content.json + git push
 *   GET  /health                                 → { ok: true }
 *
 * Required env vars on VPS:
 *   INTAKE_SECRET   — must match Vercel's INTAKE_SECRET
 *   PORT            — optional override (default 3001)
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const { execSync } = require('child_process');

const app  = express();
const PORT = process.env.PORT || 3004;

const INTAKE_SECRET  = process.env.INTAKE_SECRET  || '';
const REPO_ROOT      = path.resolve(__dirname, '..');
const DEFAULT_PHOTOS = ['/dental-hero.png', '/dental-consult.png', '/dental-smile.png', '/dental-reception.png'];

app.use(express.json());

// ── Auth middleware ──────────────────────────────────────────────────────────
function auth(req, res, next) {
  if (INTAKE_SECRET && req.headers['x-intake-secret'] !== INTAKE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function findRouteByPhone(phone) {
  const normalized = String(phone).replace(/\D/g, '');
  const appDir = path.join(REPO_ROOT, 'app');

  for (const entry of fs.readdirSync(appDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const contentPath = path.join(appDir, entry.name, 'content.json');
    if (!fs.existsSync(contentPath)) continue;
    const c = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
    const stored = String(c.biz?.alertWhatsapp ?? '').replace(/\D/g, '');
    if (stored === normalized) return { dir: path.join(appDir, entry.name), slug: entry.name };
  }
  return null;
}

function gitPush(relPath, message) {
  execSync(`git add "${relPath}"`,                      { cwd: REPO_ROOT, stdio: 'pipe' });
  execSync(`git commit -m "${message}" --allow-empty`, { cwd: REPO_ROOT, stdio: 'pipe' });
  execSync('git push',                                  { cwd: REPO_ROOT, stdio: 'pipe' });
}

// ── POST /api/intake ─────────────────────────────────────────────────────────
app.post('/api/intake', auth, (req, res) => {
  const { slug, biz, services } = req.body;
  if (!slug) return res.status(400).json({ error: 'slug required' });

  const contentPath = path.join(REPO_ROOT, 'app', slug, 'content.json');
  if (!fs.existsSync(contentPath)) {
    return res.status(404).json({ error: `No content.json found for route: ${slug}` });
  }

  try {
    const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
    if (biz)      content.biz      = { ...content.biz, ...biz };
    if (services) content.services = services;

    fs.writeFileSync(contentPath, JSON.stringify(content, null, 2) + '\n');
    console.log(`[intake] Updated ${slug}/content.json`);

    const rel = `app/${slug}/content.json`;
    gitPush(rel, `intake: ${slug}`);
    console.log(`[intake] Pushed — Vercel rebuilding ${slug}`);

    const url = `https://webuilder-liart.vercel.app/${slug}`;
    res.json({ ok: true, url });
  } catch (err) {
    console.error('[intake] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/photo ──────────────────────────────────────────────────────────
app.post('/api/photo', auth, express.raw({ type: '*/*', limit: '25mb' }), (req, res) => {
  const phone = String(req.headers['x-phone'] ?? '').replace(/\D/g, '');
  let   slot  = String(req.headers['x-slot']  ?? 'auto').toLowerCase();

  if (!phone) return res.status(400).json({ error: 'x-phone header required' });
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: 'Empty body' });
  }

  const found = findRouteByPhone(phone);
  if (!found) return res.status(404).json({ error: `No client found for phone ${phone}` });

  const { dir: routeDir, slug } = found;
  const contentPath = path.join(routeDir, 'content.json');
  const content     = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
  const photos      = content.photos || {};

  // Auto-detect best slot if not specified
  if (slot === 'auto') {
    if (!photos.hero   || DEFAULT_PHOTOS.includes(photos.hero))   slot = 'hero';
    else if (!photos.about   || DEFAULT_PHOTOS.includes(photos.about))   slot = 'about';
    else if (!photos.results || DEFAULT_PHOTOS.includes(photos.results)) slot = 'results';
    else slot = 'gallery';
  }

  try {
    const clientPublicDir = path.join(REPO_ROOT, 'public', 'clients', slug);
    fs.mkdirSync(clientPublicDir, { recursive: true });

    let fileName, publicPath;
    if (slot === 'gallery') {
      const gallery = photos.gallery ?? [];
      fileName   = `gallery-${gallery.length + 1}.jpg`;
      publicPath = `/clients/${slug}/${fileName}`;
      content.photos = { ...photos, gallery: [...gallery, publicPath] };
    } else {
      fileName   = `${slot}.jpg`;
      publicPath = `/clients/${slug}/${fileName}`;
      content.photos = { ...photos, [slot]: publicPath };
    }

    fs.writeFileSync(path.join(clientPublicDir, fileName), req.body);
    fs.writeFileSync(contentPath, JSON.stringify(content, null, 2) + '\n');
    console.log(`[photo] Saved ${publicPath} for ${slug}`);

    const relImg  = `public/clients/${slug}/${fileName}`;
    const relJson = `app/${slug}/content.json`;
    execSync(`git add "${relImg}" "${relJson}"`,                { cwd: REPO_ROOT, stdio: 'pipe' });
    execSync(`git commit -m "photos: ${slot} for ${slug}"`,    { cwd: REPO_ROOT, stdio: 'pipe' });
    execSync('git push',                                        { cwd: REPO_ROOT, stdio: 'pipe' });
    console.log(`[photo] Pushed — Vercel rebuilding ${slug}`);

    res.json({ ok: true, slot, path: publicPath });
  } catch (err) {
    console.error('[photo] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime(), port: PORT }));

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n[intake-server] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[intake-server] Repo root: ${REPO_ROOT}`);
  console.log(`[intake-server] Auth: ${INTAKE_SECRET ? 'enabled' : 'DISABLED (set INTAKE_SECRET)'}\n`);
});
