/**
 * migrate-routes.ts
 * One-shot script: migrates all hardcoded dental routes to content.json pattern.
 *
 * For each route that has a page.tsx with a hardcoded BIZ block:
 *   1. Extracts BIZ data from the existing page.tsx
 *   2. Copies app/dental/page.tsx (which imports content.json) as the new page.tsx
 *   3. Creates app/{route}/content.json using dental defaults + extracted BIZ
 *
 * Run: npx ts-node scripts/migrate-routes.ts
 */

import fs             from 'fs';
import path           from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const ROOT        = path.resolve(__dirname, '..');
const APP_DIR     = path.join(ROOT, 'app');
const TEMPLATE_PAGE    = path.join(APP_DIR, 'dental', 'page.tsx');
const TEMPLATE_CONTENT = path.join(APP_DIR, 'dental', 'content.json');

// Routes to migrate (skip 'dental' — it's already done)
const ROUTES = [
  'levi-dental',
  'levy-dental',
  'stern-dental',
  'ariel-dental-demo',
  'ariel-dental-v2',
  'ariel-dental-v3',
  'ariel-dental-final-test',
];

// ── Extract BIZ fields from a hardcoded page.tsx ───────────────────
function extractBiz(src: string): Record<string, string> {
  const blockMatch = src.match(/const BIZ = \{([\s\S]*?)\} as const;/);
  if (!blockMatch) return {};

  const biz: Record<string, string> = {};
  const fieldRe = /(\w+):\s*['"]([^'"]*)['"]/g;
  let m;
  while ((m = fieldRe.exec(blockMatch[1])) !== null) {
    biz[m[1]] = m[2];
  }
  return biz;
}

// ── Main ───────────────────────────────────────────────────────────
const templatePage    = fs.readFileSync(TEMPLATE_PAGE,    'utf-8');
const templateContent = JSON.parse(fs.readFileSync(TEMPLATE_CONTENT, 'utf-8'));

let migrated = 0;
let skipped  = 0;

for (const route of ROUTES) {
  const routeDir  = path.join(APP_DIR, route);
  const pagePath  = path.join(routeDir, 'page.tsx');
  const jsonPath  = path.join(routeDir, 'content.json');

  // Already migrated
  if (fs.existsSync(jsonPath)) {
    console.log(`  skip  ${route}  (content.json already exists)`);
    skipped++;
    continue;
  }

  if (!fs.existsSync(pagePath)) {
    console.log(`  skip  ${route}  (no page.tsx found)`);
    skipped++;
    continue;
  }

  const oldPage = fs.readFileSync(pagePath, 'utf-8');
  const biz     = extractBiz(oldPage);

  if (!biz.name) {
    console.log(`  skip  ${route}  (could not extract BIZ block)`);
    skipped++;
    continue;
  }

  // Build content.json — dental defaults + this client's BIZ
  const content = {
    ...templateContent,
    biz: {
      ...templateContent.biz,
      ...biz,
    },
  };

  // Write content.json
  fs.writeFileSync(jsonPath, JSON.stringify(content, null, 2) + '\n', 'utf-8');

  // Overwrite page.tsx with the updated template (imports content.json)
  fs.writeFileSync(pagePath, templatePage, 'utf-8');

  console.log(`  ✓  migrated  ${route}  →  "${biz.name}" / ${biz.city}`);
  migrated++;
}

console.log(`\nDone — ${migrated} migrated, ${skipped} skipped.\n`);
