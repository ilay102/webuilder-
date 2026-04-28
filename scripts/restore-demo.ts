/**
 * restore-demo.ts — Rebuild a client's siteContent from existing pool
 * allocations, without touching the pool (no re-allocation, no churn).
 *
 * Use case: someone (or a buggy script) overwrote a client's siteContent on
 * the VPS with template defaults. The pool still remembers which hero,
 * patient and text pack belong to that client — we just need to re-compose
 * the JSON and PATCH it back.
 *
 * Usage:
 *   npx ts-node scripts/restore-demo.ts <slug>
 */
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: path.join(process.cwd(), '.env') });

import { getImagesForSlug }        from '../lib/pool-manager';
import { getTextPacksForSlug }     from '../lib/text-pool-manager';
import { getTextPack }             from '../lib/text-packs';
import { pickVariant }             from '../lib/variance';
import { composeSiteContent }      from '../lib/demo-builder';

const VPS = process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000';

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: ts-node scripts/restore-demo.ts <slug>');
    process.exit(1);
  }

  // 1. Fetch current client record from VPS (for biz fields)
  const res = await fetch(`${VPS}/api/clients/${slug}`);
  if (!res.ok) {
    console.error(`[restore] VPS returned ${res.status} for ${slug}`);
    process.exit(1);
  }
  const client = await res.json();

  // 2. Find this slug's allocated images + text pack
  const images = getImagesForSlug(slug).filter(i => i.status !== 'available');
  const hero    = images.find(i => i.type === 'hero');
  const patient = images.find(i => i.type === 'patient');
  if (!hero || !patient) {
    console.error(`[restore] Pool has no hero/patient assigned to ${slug}`);
    console.error('  Found:', images);
    process.exit(1);
  }

  const textRecords = getTextPacksForSlug(slug).filter(p => p.status !== 'available');
  if (textRecords.length === 0) {
    console.error(`[restore] Text pool has no pack assigned to ${slug}`);
    process.exit(1);
  }
  const textPack = getTextPack(textRecords[0].id);
  if (!textPack) {
    console.error(`[restore] Pack id "${textRecords[0].id}" not in text-packs.ts`);
    process.exit(1);
  }

  // 3. Recover biz fields from existing record (or its prior siteContent)
  const prior = client.siteContent?.biz ?? {};
  const variant = pickVariant(slug, client.template ?? 'dental', client.city ?? prior.city ?? '');

  const siteContent = composeSiteContent({
    biz: {
      name:           client.name           || prior.name           || slug,
      city:           prior.city            || client.city          || '',
      address:        prior.address         || '',
      phone:          client.phone          || prior.phone          || '',
      hours:          prior.hours           || 'Sun–Thu 9:00–18:00',
      clientEmail:    client.email          || prior.email          || '',
      clientWhatsapp: client.whatsapp       || prior.alertWhatsapp  || '',
      calLink:        prior.calLink         || 'ilay-lankin/15min',
      domain:         client.domain         || prior.domain         || null,
      template:       client.template       || prior.template       || 'dental',
    },
    hero,
    patient,
    textPack,
    designPackId: variant.packId,
  });

  // 4. PATCH back to VPS
  const patch = await fetch(`${VPS}/api/clients/${slug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteContent }),
  });
  if (!patch.ok) {
    console.error(`[restore] PATCH failed: ${patch.status} ${await patch.text()}`);
    process.exit(1);
  }

  console.log(`[restore] ✅ ${slug} restored.`);
  console.log(`  hero    = ${hero.id}`);
  console.log(`  patient = ${patient.id}`);
  console.log(`  text    = ${textPack.id}`);
  console.log(`  design  = ${variant.packId}`);
}

main().catch(e => { console.error(e); process.exit(1); });
