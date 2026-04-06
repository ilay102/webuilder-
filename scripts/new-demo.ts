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

const BASE_URL = 'https://webuilder-liart.vercel.app';

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
  };
}

// ─── Queue mode ───────────────────────────────────────────────────

function processQueue(queuePath: string): void {
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
    const url = buildDemo(pending);

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

// ─── Core build logic ─────────────────────────────────────────────

function buildDemo(c: DemoConfig): string {
  const templatePath = path.join(process.cwd(), 'app', c.template, 'page.tsx');
  const outDir       = path.join(process.cwd(), 'app', c.route);
  const outPath      = path.join(outDir, 'page.tsx');

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: app/${c.template}/page.tsx`);
  }

  // Read base template
  let code = fs.readFileSync(templatePath, 'utf-8');

  // Apply all replacements
  const replacements = getReplacements(c);
  for (const [pattern, replacement] of replacements) {
    code = code.replace(pattern, replacement);
  }

  // Write new route
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, code);

  // TypeScript check
  try {
    execSync('npx tsc --noEmit', { cwd: process.cwd(), stdio: 'pipe' });
  } catch (e: any) {
    throw new Error(`TypeScript error in generated page: ${e.stderr?.toString()}`);
  }

  // Git push → Vercel auto-deploys
  execSync(
    `git add app/${c.route} && git commit -m "demo: ${c.route}" && git push`,
    { cwd: process.cwd(), stdio: 'pipe' }
  );

  return `${BASE_URL}/${c.route}`;
}

// ─── BIZ block replace (two-tier config) ──────────────────────────
// Templates use a BIZ const block. We replace it entirely —
// no regex hunting, no missed fields, no fragile string matching.

function buildBizBlock(c: DemoConfig): string {
  return `const BIZ = {
  name:          '${c.businessName}',
  tagline:       '${c.tagline || 'Professional ' + c.template + ' care in ' + c.city}',
  city:          '${c.city}',
  address:       '${c.city}',
  phone:         '${c.phone}',
  email:         '${c.clientEmail}',
  hours:         '${c.hours}',
  calLink:       '${c.calLink}',
  alertEmail:    '${c.clientEmail}',
  alertWhatsapp: '${c.clientWhatsapp}',
} as const;`;
}

function getReplacements(c: DemoConfig): [RegExp, string][] {
  return [
    // One replace: the entire BIZ block. That's it.
    [/const BIZ = \{[\s\S]*?\} as const;/, buildBizBlock(c)],
  ];
}

// ─── Output helper (always JSON to stdout) ────────────────────────

function out(data: object): void {
  process.stdout.write(JSON.stringify(data) + '\n');
}

// ─── Entry point ──────────────────────────────────────────────────

function main() {
  const { values } = parseArgs({
    options: { queue: { type: 'string' } },
    strict: false,
  });

  if (values.queue) {
    processQueue(values.queue as string);
    return;
  }

  const config = parseCliArgs();
  if (!config) {
    out({ success: false, error: 'No config provided' });
    process.exit(1);
  }

  try {
    const url = buildDemo(config);
    out({ success: true, route: config.route, url });
  } catch (err: any) {
    out({ success: false, error: err.message });
    process.exit(1);
  }
}

main();
