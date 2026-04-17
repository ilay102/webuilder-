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

// Legacy default photos (old pool before library model)
const DEFAULT_PHOTOS = ['/dental-hero.png', '/dental-consult.png', '/dental-smile.png', '/dental-reception.png'];

// ── Pool Manager (inline CJS — mirrors lib/pool-manager.ts) ─────────────────
// intake-server is plain CommonJS; this avoids a TS compile dependency.
// Schema matches pool-state.json exactly — keep in sync with lib/pool-manager.ts.

const POOL_STATE_PATH = path.join(REPO_ROOT, 'pool-state.json');

function _readPool() {
  if (!fs.existsSync(POOL_STATE_PATH)) return { updatedAt: new Date().toISOString(), images: [] };
  try   { return JSON.parse(fs.readFileSync(POOL_STATE_PATH, 'utf-8')); }
  catch { return { updatedAt: new Date().toISOString(), images: [] }; }
}

function _writePool(pool) {
  pool.updatedAt = new Date().toISOString();
  fs.writeFileSync(POOL_STATE_PATH, JSON.stringify(pool, null, 2) + '\n');
}

/**
 * Release a pool image back to 'available' when a client replaces it
 * with their own upload via the intake form or WhatsApp bot.
 *
 * @param {string} slug       - the client's route slug
 * @param {string} imagePath  - the /pool/... path that was in content.json before replacement
 * @returns {boolean}         - true if the image was found and freed
 */
function freePoolImage(slug, imagePath) {
  if (!imagePath || !imagePath.startsWith('/pool/')) return false;
  const pool = _readPool();
  const img  = pool.images.find(
    i => i.assignedTo === slug && i.path === imagePath && i.status === 'in-use',
  );
  if (!img) return false;
  img.status     = 'available';
  img.assignedTo = null;
  img.assignedAt = null;
  _writePool(pool);
  console.log(`[pool] Freed ${img.id} ← ${slug} replaced it with own photo`);
  return true;
}

/**
 * Returns true for any photo path that is a system-assigned default
 * (old stock OR pool library) — i.e. one the client hasn't personally uploaded.
 * Used by auto-slot detection to decide which slot to fill next.
 */
function isDefaultPhoto(photoPath) {
  return !photoPath ||
    DEFAULT_PHOTOS.includes(photoPath) ||
    photoPath.startsWith('/pool/');
}

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
  execSync('git pull --rebase',                         { cwd: REPO_ROOT, stdio: 'pipe' });
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

  // Auto-detect best slot — fills the first slot that still has a system default
  // (either the old stock photos OR a pool-library image the client hasn't replaced yet)
  if (slot === 'auto') {
    if      (isDefaultPhoto(photos.hero))    slot = 'hero';
    else if (isDefaultPhoto(photos.about))   slot = 'about';
    else if (isDefaultPhoto(photos.results)) slot = 'results';
    else                                     slot = 'gallery';
  }

  try {
    const clientPublicDir = path.join(REPO_ROOT, 'public', 'clients', slug);
    fs.mkdirSync(clientPublicDir, { recursive: true });

    // Capture the current path for this slot BEFORE overwriting —
    // needed to release it from the pool if it was a library image.
    const oldSlotPath = (slot !== 'gallery') ? (photos[slot] || null) : null;

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

    // Release the old pool image if the client replaced a library default
    freePoolImage(slug, oldSlotPath);

    const relImg  = `public/clients/${slug}/${fileName}`;
    const relJson = `app/${slug}/content.json`;
    // pool-state.json is always staged — git add is a no-op if unchanged
    execSync(`git add "${relImg}" "${relJson}" "pool-state.json"`, { cwd: REPO_ROOT, stdio: 'pipe' });
    execSync(`git commit -m "photos: ${slot} for ${slug}"`,        { cwd: REPO_ROOT, stdio: 'pipe' });
    execSync('git push',                                            { cwd: REPO_ROOT, stdio: 'pipe' });
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
