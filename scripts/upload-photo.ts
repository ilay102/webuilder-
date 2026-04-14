/**
 * upload-photo.ts
 * Saves a photo buffer to /public/clients/<slug>/<slot>.jpg,
 * updates the client's content.json photos field, then git pushes to trigger Vercel rebuild.
 *
 * Usage (ts-node):
 *   npx ts-node scripts/upload-photo.ts <phone> <slot> <file-path>
 *   # slot: hero | about | results | cta | gallery
 *
 * Or import and call programmatically (e.g. from Baileys image handler):
 *   import { uploadPhoto } from './upload-photo'
 *   await uploadPhoto('972501112222', imageBuffer, 'hero')
 *   await uploadPhoto('972501112222', imageBuffer, 'gallery')  // appends to gallery
 */

import fs   from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ── Types ────────────────────────────────────────────────────────────────────

type PhotoSlot = 'hero' | 'about' | 'results' | 'cta' | string; // string = gallery index or custom

interface ContentJson {
  biz: { alertWhatsapp?: string; [k: string]: unknown };
  photos: {
    hero?: string;
    about?: string;
    results?: string;
    cta?: string;
    gallery?: string[];
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');

function findClientRoute(phone: string): { routeDir: string; slug: string } {
  const appDir = path.join(ROOT, 'app');
  const entries = fs.readdirSync(appDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const contentPath = path.join(appDir, entry.name, 'content.json');
    if (!fs.existsSync(contentPath)) continue;

    const c: ContentJson = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
    const normalized = String(c.biz.alertWhatsapp ?? '').replace(/\D/g, '');
    if (normalized === phone.replace(/\D/g, '')) {
      return { routeDir: path.join(appDir, entry.name), slug: entry.name };
    }
  }
  throw new Error(`No client found with phone ${phone}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function uploadPhoto(
  phone: string,
  imageData: Buffer,
  slot: PhotoSlot = 'hero',
): Promise<string> {
  const { routeDir, slug } = findClientRoute(phone);
  const contentPath = path.join(routeDir, 'content.json');
  const content: ContentJson = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));

  // Save image file
  const clientPublicDir = path.join(ROOT, 'public', 'clients', slug);
  fs.mkdirSync(clientPublicDir, { recursive: true });

  let fileName: string;
  let publicPath: string;

  if (slot === 'gallery') {
    const gallery = content.photos.gallery ?? [];
    const index   = gallery.length + 1;
    fileName  = `gallery-${index}.jpg`;
    publicPath = `/clients/${slug}/${fileName}`;
    content.photos.gallery = [...gallery, publicPath];
  } else {
    fileName  = `${slot}.jpg`;
    publicPath = `/clients/${slug}/${fileName}`;
    content.photos[slot] = publicPath;
  }

  const filePath = path.join(clientPublicDir, fileName);
  fs.writeFileSync(filePath, imageData);
  console.log(`[upload-photo] Saved ${path.relative(ROOT, filePath)}`);

  // Update content.json
  fs.writeFileSync(contentPath, JSON.stringify(content, null, 2) + '\n', 'utf-8');
  console.log(`[upload-photo] Updated content.json photos.${slot}`);

  // Git push
  const relImg     = path.relative(ROOT, filePath);
  const relContent = path.relative(ROOT, contentPath);
  execSync(`git add "${relImg}" "${relContent}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync(`git commit -m "photos: upload ${slot} for ${slug}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync('git push', { cwd: ROOT, stdio: 'inherit' });

  console.log(`[upload-photo] Pushed — Vercel rebuilding ${slug} now (~30s). Path: ${publicPath}`);
  return publicPath;
}

// ── CLI entrypoint ───────────────────────────────────────────────────────────

if (require.main === module) {
  const [phone, slot, filePath] = process.argv.slice(2);
  if (!phone || !slot || !filePath) {
    console.error('Usage: ts-node scripts/upload-photo.ts <phone> <slot> <file-path>');
    console.error('  slot: hero | about | results | cta | gallery');
    process.exit(1);
  }
  const buf = fs.readFileSync(filePath);
  uploadPhoto(phone, buf, slot)
    .then(p => { console.log('Public path:', p); process.exit(0); })
    .catch(err => { console.error(err); process.exit(1); });
}
