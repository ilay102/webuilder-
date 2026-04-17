/**
 * pool-init.ts — One-time pool initializer for Webuilder image library.
 *
 * Scans /public/pool/dental/{heroes,patients}/ and registers every image
 * file as 'available' in pool-state.json.
 *
 * Idempotent: already-registered files are skipped, not duplicated.
 * Safe to re-run after adding new images to the pool folders.
 *
 * Usage:
 *   npx ts-node scripts/pool-init.ts
 *
 * After running, review pool-state.json then:
 *   git add pool-state.json && git commit -m "pool: init image pool"
 */

import fs   from 'fs';
import path from 'path';
import { addImage, poolStats } from '../lib/pool-manager';

const POOL_ROOT = path.join(process.cwd(), 'public', 'pool', 'dental');
const IMAGE_EXT = /\.(jpg|jpeg|png|webp)$/i;

interface ScanResult { added: number; skipped: number; files: string[] }

function scanDir(
  dir:    string,
  type:   'hero' | 'patient',
  subdir: string,
): ScanResult {
  const result: ScanResult = { added: 0, skipped: 0, files: [] };

  if (!fs.existsSync(dir)) {
    console.warn(`  [warn] Directory not found, skipping: ${dir}`);
    return result;
  }

  const files = fs.readdirSync(dir).filter(f => IMAGE_EXT.test(f)).sort();

  for (const file of files) {
    const publicPath = `/pool/dental/${subdir}/${file}`;
    result.files.push(file);
    try {
      addImage(type, publicPath);
      console.log(`  ✓ ${type.padEnd(8)}  ${file}`);
      result.added++;
    } catch (e: any) {
      // Already registered — skip silently unless it's a real error
      if (e.message.includes('already registered')) {
        console.log(`  — skipped  ${file}  (already in pool)`);
        result.skipped++;
      } else {
        console.error(`  ✗ ERROR    ${file}: ${e.message}`);
      }
    }
  }

  return result;
}

// ─── Main ──────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════╗');
console.log('║   Webuilder · Pool Initializer           ║');
console.log('╚══════════════════════════════════════════╝\n');

console.log('Scanning /public/pool/dental/heroes/ ...');
const heroes = scanDir(path.join(POOL_ROOT, 'heroes'), 'hero', 'heroes');

console.log('\nScanning /public/pool/dental/patients/ ...');
const patients = scanDir(path.join(POOL_ROOT, 'patients'), 'patient', 'patients');

const stats = poolStats();
const totalAdded   = heroes.added   + patients.added;
const totalSkipped = heroes.skipped + patients.skipped;

console.log(`
──────────────────────────────────────────
  Results
    Added   : ${totalAdded} new images
    Skipped : ${totalSkipped} already registered

  Pool health after init
    heroes   → ${stats.hero.available} available  /  ${stats.hero.inUse} in-use  /  ${stats.hero.locked} locked
    patients → ${stats.patient.available} available  /  ${stats.patient.inUse} in-use  /  ${stats.patient.locked} locked

  ${stats.hero.available < 3 ? '⚠  WARNING: hero pool is low — add more images before running demos' : '✓  Hero pool OK'}
  ${stats.patient.available < 3 ? '⚠  WARNING: patient pool is low — add more images before running demos' : '✓  Patient pool OK'}
──────────────────────────────────────────

Next steps:
  1. Review pool-state.json (check all paths look correct)
  2. git add pool-state.json
  3. git commit -m "pool: init image pool (${totalAdded} images)"
  4. Test: npx ts-node scripts/new-demo.ts --template dental --route test-pool-demo \\
           --name "Test Clinic" --city "Tel Aviv" --phone "03-000-0000" \\
           --email "test@test.com" --whatsapp "972500000000"
  5. Verify pool-state.json shows one hero + one patient as 'in-use' for test-pool-demo
`);
