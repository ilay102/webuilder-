/**
 * new-demo.ts — Webuilder Demo Generator
 *
 * TWO MODES:
 *
 * 1. CLI mode (Builder agent / manual):
 *    npx ts-node scripts/new-demo.ts \
 *      --template dental \
 *      --route cohen-dental \
 *      --name "Dr. Cohen Dental" \
 *      --city "Tel Aviv" \
 *      --phone "03-123-4567" \
 *      --email "cohen@gmail.com" \
 *      --whatsapp "972501234567" \
 *      --tagline "Gentle care for every smile" \
 *      --hours "Sun–Thu 9:00–18:00" \
 *      --cal "ilay-lankin/15min"
 *
 * 2. Queue mode (Builder agent reads from demo_queue.json):
 *    npx ts-node scripts/new-demo.ts --queue /path/to/demo_queue.json
 *
 * OUTPUT (stdout, always valid JSON):
 *   { "success": true, "route": "cohen-dental", "url": "https://webuilder-liart.vercel.app/cohen-dental" }
 *   { "success": false, "error": "Template not found" }
 */

import fs   from 'fs';
import path from 'path';
import { execSync }  from 'child_process';
import { parseArgs } from 'node:util';
import { config as dotenvConfig } from 'dotenv';

// Load .env from repo root (picks up GEMINI_API_KEY, etc.)
dotenvConfig({ path: path.join(process.cwd(), '.env') });
import { pickVariant }                                from '../lib/variance';
import { getPack }                                   from '../lib/design-packs';
import { allocateImage, freeImages, type PoolImage } from '../lib/pool-manager';
import { allocateTextPack, freeTextPack }            from '../lib/text-pool-manager';
import { composeSiteContent }                         from '../lib/demo-builder';

const BASE_URL        = 'https://webuilder-liart.vercel.app';
const VERCEL_TOKEN    = process.env.VERCEL_TOKEN ?? '';
const VERCEL_PROJECT  = 'prj_JAZsukTRQkgJQ1lyYCoEafQfZwrI';
const VERCEL_TEAM     = 'team_fpBcoKvlkv3AffiuMNDZJ0Xb';

// ─── Types ────────────────────────────────────────────────────────

interface DemoConfig {
  template:       'dental' | 'accountant' | 'lawyer';
  route:          string;
  businessName:   string;
  tagline?:       string;
  city:           string;
  phone:          string;
  hours:          string;
  calLink:        string;
  clientEmail:    string;
  clientWhatsapp: string;
  domain?:        string;   // e.g. "cohen-dental.co.il"
}

interface QueueEntry extends DemoConfig {
  id:           string;
  status:       'pending' | 'building' | 'done' | 'failed';
  leadPhone?:   string;   // client's WhatsApp number (for JJ to message back)
  leadName?:    string;   // client's first name (for JJ greeting)
  requestedAt:  string;
  demoUrl?:     string;
  deployedAt?:  string;
  error?:       string;
}

// ─── CLI argument parsing ─────────────────────────────────────────

function parseCliArgs(): DemoConfig | null {
  const { values } = parseArgs({
    options: {
      template: { type: 'string' },
      route:    { type: 'string' },
      name:     { type: 'string' },
      tagline:  { type: 'string' },
      city:     { type: 'string' },
      phone:    { type: 'string' },
      hours:    { type: 'string' },
      cal:      { type: 'string' },
      email:    { type: 'string' },
      whatsapp: { type: 'string' },
      domain:   { type: 'string' },
      queue:    { type: 'string' },
    },
    strict: false,
  });

  if (values.queue) return null; // queue mode

  const required = ['template', 'route', 'name', 'city', 'phone', 'email', 'whatsapp'];
  for (const key of required) {
    if (!values[key]) {
      out({ success: false, error: `Missing required argument: --${key}` });
      process.exit(1);
    }
  }

  return {
    template:       values.template as DemoConfig['template'],
    route:          values.route    as string,
    businessName:   values.name     as string,
    tagline:        (values.tagline  as string) || 'Professional service you can trust',
    city:           values.city     as string,
    phone:          values.phone    as string,
    hours:          (values.hours   as string) || 'Sun–Thu 9:00–18:00',
    calLink:        (values.cal     as string) || 'ilay-lankin/15min',
    clientEmail:    values.email    as string,
    clientWhatsapp: values.whatsapp as string,
    domain:         (values.domain  as string) || undefined,
  };
}

// ─── Queue mode ───────────────────────────────────────────────────

async function processQueue(queuePath: string): Promise<void> {
  if (!fs.existsSync(queuePath)) {
    out({ success: false, error: `Queue file not found: ${queuePath}` });
    process.exit(1);
  }

  const queue: QueueEntry[] = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
  const pending = queue.find(e => e.status === 'pending');

  if (!pending) {
    out({ success: false, error: 'No pending entries in queue' });
    process.exit(0);
  }

  // Mark as building
  pending.status = 'building';
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

  try {
    const url = await buildDemo(pending);

    // Mark as done
    pending.status    = 'done';
    pending.demoUrl   = url;
    pending.deployedAt = new Date().toISOString();
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

    out({
      success:    true,
      id:         pending.id,
      route:      pending.route,
      url,
      leadPhone:  pending.leadPhone,
      leadName:   pending.leadName,
    });

  } catch (err: any) {
    pending.status = 'failed';
    pending.error  = err.message;
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
    out({ success: false, id: pending.id, error: err.message });
    process.exit(1);
  }
}

// ─── Domain helpers ───────────────────────────────────────────────

/** Add domain → slug mapping to domains.json */
function registerDomain(domain: string, slug: string): void {
  const domainsPath = path.join(process.cwd(), 'domains.json');
  const map: Record<string, string> = fs.existsSync(domainsPath)
    ? JSON.parse(fs.readFileSync(domainsPath, 'utf-8'))
    : {};
  map[domain] = slug;
  // Also register www. variant
  map[`www.${domain}`] = slug;
  fs.writeFileSync(domainsPath, JSON.stringify(map, null, 2) + '\n');
}

/** Call Vercel API to add domain to the project (auto-provisions SSL) */
async function addDomainToVercel(domain: string): Promise<void> {
  if (!VERCEL_TOKEN) {
    process.stderr.write('[domain] VERCEL_TOKEN not set — skipping Vercel API call\n');
    return;
  }

  for (const d of [domain, `www.${domain}`]) {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT}/domains?teamId=${VERCEL_TEAM}`,
      {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: d }),
      }
    );
    const json = await res.json() as any;
    if (res.ok || json.error?.code === 'domain_already_in_use') {
      process.stderr.write(`[domain] ✅ ${d} added to Vercel\n`);
    } else {
      process.stderr.write(`[domain] ⚠️  ${d}: ${json.error?.message ?? JSON.stringify(json)}\n`);
    }
  }
}

// ─── Core build logic ─────────────────────────────────────────────

async function buildDemo(c: DemoConfig): Promise<string> {
  const templateDir  = path.join(process.cwd(), 'app', c.template);
  const templatePage = path.join(templateDir, 'page.tsx');
  const outDir       = path.join(process.cwd(), 'app', c.route);

  if (!fs.existsSync(templatePage)) {
    throw new Error(`Template not found: app/${c.template}/page.tsx`);
  }

  fs.mkdirSync(outDir, { recursive: true });

  // Copy page.tsx as-is (it reads from content.json — no patching needed)
  fs.copyFileSync(templatePage, path.join(outDir, 'page.tsx'));

  // Build content.json from template defaults, patching biz fields
  const templateContentPath = path.join(templateDir, 'content.json');
  const baseContent = fs.existsSync(templateContentPath)
    ? JSON.parse(fs.readFileSync(templateContentPath, 'utf-8'))
    : { biz: {}, services: [], photos: {}, testimonials: [], stats: [] };

  // ── Design pack: deterministic hash from slug (vibe flag can restrict later) ──
  const variant = pickVariant(c.route, c.template, c.city);
  const pack    = getPack(variant.packId);

  // ── Image pool: allocate hero + patient from unified library (FIFO) ──────────
  let hero!:    PoolImage;
  let patient!: PoolImage;
  try {
    hero    = allocateImage('hero',    c.route);
    patient = allocateImage('patient', c.route);
  } catch (e: any) {
    freeImages(c.route); // roll back any partial image allocation
    throw new Error(`Image pool exhausted — ${e.message}`);
  }

  // ── Text pool: allocate one pack (FIFO). Same lifecycle as images. ──────────
  let textAlloc;
  try {
    textAlloc = allocateTextPack(c.route);
  } catch (e: any) {
    freeImages(c.route);    // give the images back
    freeTextPack(c.route);  // safety: nothing to free, but keeps rollback symmetric
    throw new Error(`Text pool exhausted — ${e.message}`);
  }
  const textPack = textAlloc.pack;

  process.stderr.write(
    `[pool] ${c.route} → design=${pack.id}  text=${textPack.id}  ` +
    `hero=${hero.id}  patient=${patient.id}\n`,
  );

  // Assemble content from ONLY: intake + design pack + text pack + pool images.
  // NO template inheritance — guarantees zero cross-demo contamination.
  const siteContent = composeSiteContent({
    biz: {
      name:           c.businessName,
      city:           c.city,
      address:        c.city,
      phone:          c.phone,
      hours:          c.hours,
      clientEmail:    c.clientEmail,
      clientWhatsapp: c.clientWhatsapp,
      calLink:        c.calLink,
      domain:         c.domain,
      template:       c.template,
    },
    hero,
    patient,
    textPack,
    designPackId: pack.id,
  });
  // Local mutable copy used downstream (and written to disk for legacy folder mode)
  Object.assign(baseContent, siteContent);

  fs.writeFileSync(
    path.join(outDir, 'content.json'),
    JSON.stringify(baseContent, null, 2) + '\n',
  );

  // ── Domain setup ──────────────────────────────────────────────
  if (c.domain) {
    const domain = c.domain.replace(/^www\./, '').toLowerCase();
    registerDomain(domain, c.route);
    await addDomainToVercel(domain);
  }

  // ── Domain setup ──────────────────────────────────────────────
  // (already handled above — just git commit pool-state + domains, NOT app folder)

  // ── Git: commit only pool state + domains (NOT the app/{route}/ folder) ───────
  // The site content is now stored on VPS (siteContent field) — no Vercel rebuild
  // needed for new clients. We only commit pool-state.json + text-pool-state.json
  // + domains.json so the image/text allocations survive future git pulls.
  try {
    execSync('git pull --rebase --autostash', { cwd: process.cwd(), stdio: 'pipe' });
  } catch (rebaseErr: any) {
    freeImages(c.route);
    freeTextPack(c.route);
    throw new Error(`git pull --rebase failed (pools released): ${rebaseErr.message}`);
  }

  try {
    execSync(
      `git add pool-state.json text-pool-state.json domains.json && ` +
      `(git diff --staged --quiet || git commit -m "pool: allocate ${c.route}")`,
      { cwd: process.cwd(), stdio: 'pipe' },
    );
    execSync('git push', { cwd: process.cwd(), stdio: 'pipe' });
  } catch (gitErr: any) {
    // Pool commit failed — rollback allocations so they can be reused
    freeImages(c.route);
    freeTextPack(c.route);
    throw new Error(`Git push failed (pools released): ${gitErr.message}`);
  }

  const siteUrl = c.domain
    ? `https://${c.domain.replace(/^www\./, '')}`
    : `${BASE_URL}/${c.route}`;

  // ── Register client + push siteContent to VPS in one PATCH ────────────
  // The dynamic route at app/[slug]/page.tsx reads siteContent from VPS —
  // the site is live within seconds, no Vercel redeploy needed.
  const VPS_API = process.env.VPS_API_URL ?? 'http://204.168.207.116:3000';
  try {
    // Create client record (or update if already exists)
    const createRes = await fetch(`${VPS_API}/api/clients`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug:     c.route,
        name:     c.businessName,
        phone:    c.phone,
        email:    c.clientEmail,
        whatsapp: c.clientWhatsapp,
        template: c.template,
        domain:   c.domain ?? null,
        siteUrl,
        status:   'active',
        plan:     'trial',
      }),
    });
    if (!createRes.ok) {
      process.stderr.write(`[clients] POST /api/clients returned ${createRes.status}\n`);
    }

    // Push the full siteContent so the dynamic route serves it immediately
    const patchRes = await fetch(`${VPS_API}/api/clients/${c.route}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ siteContent: baseContent }),
    });
    if (patchRes.ok) {
      process.stderr.write(`[vps] siteContent pushed for ${c.route} — site live at ${siteUrl}\n`);
    } else {
      process.stderr.write(`[vps] PATCH siteContent returned ${patchRes.status}\n`);
    }
  } catch (e: any) {
    process.stderr.write(`[clients] VPS registration failed: ${e.message}\n`);
  }

  return siteUrl;
}

// ─── Output helper (always JSON to stdout) ────────────────────────

function out(data: object): void {
  process.stdout.write(JSON.stringify(data) + '\n');
}

// ─── Entry point ──────────────────────────────────────────────────

async function main() {
  const { values } = parseArgs({
    options: { queue: { type: 'string' } },
    strict: false,
  });

  if (values.queue) {
    await processQueue(values.queue as string);
    return;
  }

  const config = parseCliArgs();
  if (!config) {
    out({ success: false, error: 'No config provided' });
    process.exit(1);
  }

  try {
    const url = await buildDemo(config);
    out({ success: true, route: config.route, url });
  } catch (err: any) {
    out({ success: false, error: err.message });
    process.exit(1);
  }
}

main();
