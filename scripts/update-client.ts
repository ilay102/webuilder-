/**
 * update-client.ts
 * Updates a client's content.json, then git add + commit + push to trigger Vercel rebuild.
 *
 * Usage (ts-node):
 *   npx ts-node scripts/update-client.ts <phone> '<json patch>'
 *
 * Or import and call programmatically:
 *   import { updateClient } from './update-client'
 *   await updateClient('972501112222', { biz: { phone: '050-999-8888' } })
 *   await updateClient('972501112222', { services: { add: { icon: '○', title: 'Root Canal', desc: 'Painless.' } } })
 *   await updateClient('972501112222', { services: { remove: 'Root Canal' } })
 */

import fs   from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ── Types ────────────────────────────────────────────────────────────────────

interface BizData {
  name?: string;
  tagline?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  hours?: string;
  calLink?: string;
  alertEmail?: string;
  alertWhatsapp?: string;
}

interface ServiceItem {
  icon: string;
  title: string;
  desc: string;
}

interface TestimonialItem {
  quote: string;
  name: string;
  detail: string;
}

interface StatItem {
  value: string;
  label: string;
}

interface PhotoData {
  hero?: string;
  about?: string;
  results?: string;
  cta?: string;
}

interface ContentJson {
  biz: Required<BizData>;
  services: ServiceItem[];
  photos: PhotoData;
  testimonials: TestimonialItem[];
  stats: StatItem[];
}

type ServicesPatch =
  | { add: ServiceItem }
  | { remove: string }      // remove by title
  | { update: { title: string } & Partial<ServiceItem> };

interface UpdatePatch {
  biz?:          Partial<BizData>;
  services?:     ServicesPatch | ServiceItem[];   // replace all or add/remove/update one
  photos?:       Partial<PhotoData>;
  testimonials?: TestimonialItem[];
  stats?:        StatItem[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');

/** Find the app/<route> folder whose content.json has the matching phone. */
function findClientRoute(phone: string): string {
  const appDir = path.join(ROOT, 'app');
  const entries = fs.readdirSync(appDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const contentPath = path.join(appDir, entry.name, 'content.json');
    if (!fs.existsSync(contentPath)) continue;

    const c: ContentJson = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
    const normalized = (c.biz.alertWhatsapp ?? '').replace(/\D/g, '');
    if (normalized === phone.replace(/\D/g, '')) {
      return path.join(appDir, entry.name);
    }
  }

  throw new Error(`No client found with phone ${phone}`);
}

function loadContent(routeDir: string): ContentJson {
  return JSON.parse(fs.readFileSync(path.join(routeDir, 'content.json'), 'utf-8'));
}

function saveContent(routeDir: string, content: ContentJson) {
  fs.writeFileSync(
    path.join(routeDir, 'content.json'),
    JSON.stringify(content, null, 2) + '\n',
    'utf-8',
  );
}

function applyServicesPatch(current: ServiceItem[], patch: ServicesPatch | ServiceItem[]): ServiceItem[] {
  // Replace all
  if (Array.isArray(patch)) return patch;

  if ('add' in patch) {
    return [...current, patch.add];
  }
  if ('remove' in patch) {
    return current.filter(s => s.title !== patch.remove);
  }
  if ('update' in patch) {
    return current.map(s =>
      s.title === patch.update.title ? { ...s, ...patch.update } : s,
    );
  }
  return current;
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function updateClient(phone: string, patch: UpdatePatch): Promise<void> {
  const routeDir = findClientRoute(phone);
  const content  = loadContent(routeDir);

  if (patch.biz) {
    content.biz = { ...content.biz, ...patch.biz };
  }
  if (patch.services !== undefined) {
    content.services = applyServicesPatch(content.services, patch.services);
  }
  if (patch.photos) {
    content.photos = { ...content.photos, ...patch.photos };
  }
  if (patch.testimonials !== undefined) {
    content.testimonials = patch.testimonials;
  }
  if (patch.stats !== undefined) {
    content.stats = patch.stats;
  }

  saveContent(routeDir, content);
  console.log(`[update-client] Saved ${path.relative(ROOT, routeDir)}/content.json`);

  const rel = path.relative(ROOT, path.join(routeDir, 'content.json'));
  execSync(`git add "${rel}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync(`git commit -m "content: update ${path.basename(routeDir)}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync('git push', { cwd: ROOT, stdio: 'inherit' });

  console.log(`[update-client] Pushed — Vercel rebuilding ${path.basename(routeDir)} now (~30s)`);
}

// ── CLI entrypoint ───────────────────────────────────────────────────────────

if (require.main === module) {
  const [phone, patchJson] = process.argv.slice(2);
  if (!phone || !patchJson) {
    console.error('Usage: ts-node scripts/update-client.ts <phone> \'<json patch>\'');
    process.exit(1);
  }
  updateClient(phone, JSON.parse(patchJson))
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}
