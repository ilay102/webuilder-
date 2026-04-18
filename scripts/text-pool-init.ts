/**
 * text-pool-init.ts — One-time initializer for the text pack pool.
 *
 * Reads pack ids from lib/text-packs.ts and registers each as 'available'
 * in text-pool-state.json. Idempotent — already-registered ids are skipped.
 *
 * Usage:
 *   npm run text-pool:init
 *
 * After running, review text-pool-state.json then:
 *   git add text-pool-state.json && git commit -m "text-pool: init"
 */

import { TEXT_PACKS } from '../lib/text-packs';
import { registerTextPack, textPoolStats } from '../lib/text-pool-manager';

console.log('\n╔══════════════════════════════════════════╗');
console.log('║   Webuilder · Text Pool Initializer      ║');
console.log('╚══════════════════════════════════════════╝\n');

let added   = 0;
let skipped = 0;

for (const pack of TEXT_PACKS) {
  try {
    registerTextPack(pack.id);
    console.log(`  ✓ registered  ${pack.id.padEnd(22)}  (${pack.vibe})`);
    added++;
  } catch (e: any) {
    if (e.message.includes('already registered')) {
      console.log(`  — skipped     ${pack.id.padEnd(22)}  (already in pool)`);
      skipped++;
    } else {
      console.error(`  ✗ ERROR       ${pack.id}: ${e.message}`);
    }
  }
}

const stats = textPoolStats();

console.log(`
──────────────────────────────────────────
  Results
    Added   : ${added} new packs
    Skipped : ${skipped} already registered

  Pool health after init
    available: ${stats.available}  /  in-use: ${stats.inUse}  /  locked: ${stats.locked}  /  total: ${stats.total}

  ${stats.available < 3 ? '⚠  WARNING: text pool is low — add more packs to lib/text-packs.ts' : '✓  Text pool OK'}
──────────────────────────────────────────

Next steps:
  1. Review text-pool-state.json
  2. git add text-pool-state.json
  3. git commit -m "text-pool: init (${added} packs)"
`);
