/**
 * pool-manager.ts — Unified image lifecycle tracker for Webuilder.
 *
 * Source of truth: pool-state.json at repo root (git-tracked).
 * Used by: new-demo.ts (TypeScript / ts-node)
 * Mirrored inline in: server/intake-server.js (CJS, see freePoolImage there)
 *
 * State machine:
 *   available  →  in-use    allocateImage()      demo created, image assigned
 *   in-use     →  available freeImages()          client churned / demo expired
 *   in-use     →  available freeImageByPath()     client replaced this slot via intake
 *   in-use     →  locked    lockImages()          client paid + kept default image
 *
 * Allocation is FIFO (oldest addedAt first) so the pool wears evenly.
 * Exhaustion throws — caller must surface this clearly (no silent fallbacks).
 */

import fs   from 'fs';
import path from 'path';
import { withFileLock } from './file-lock';

// ─── Types ─────────────────────────────────────────────────────────────────

export type ImageType   = 'hero' | 'patient';
export type ImageStatus = 'available' | 'in-use' | 'locked';
/**
 * Industry / template namespace for images. Multi-industry pivot:
 *  - dental  → /public/pool/dental/...   (original)
 *  - garage  → /public/pool/garage/...   (auto-repair shops)
 *  - barber  → /public/pool/barber/...   (men's barbershops)
 *  - salon   → /public/pool/salon/...    (women's hair salons)
 * Add more by populating /public/pool/<name>/heroes & /patients,
 * registering them in pool-state.json with this industry tag.
 */
export type Industry = 'dental' | 'garage' | 'barber' | 'salon';
export const DEFAULT_INDUSTRY: Industry = 'dental';

export interface PoolImage {
  /** Stable unique key — path relative to /pool/<industry>/, e.g. "heroes/warm-01.jpg" */
  id:         string;
  type:       ImageType;
  /** Industry/template the image belongs to. Older records may be missing this —
   *  see normalizeIndustry(). */
  industry?:  Industry;
  /** Full public path that goes into content.json, e.g. "/pool/dental/heroes/warm-01.jpg" */
  path:       string;
  status:     ImageStatus;
  /** Slug that currently holds this image, or null if available/unclaimed */
  assignedTo: string | null;
  /** ISO timestamp of last allocation */
  assignedAt: string | null;
  /** ISO timestamp of permanent lock — set when client pays + keeps this image */
  lockedAt:   string | null;
  /** ISO timestamp when image entered pool — drives FIFO ordering */
  addedAt:    string;
  notes:      string;
}

/** Best-effort: if .industry is missing, derive from the path. */
function normalizeIndustry(img: PoolImage): Industry {
  if (img.industry) return img.industry;
  const m = img.path.match(/^\/pool\/([^/]+)\//);
  if (m && (['dental','garage','barber','salon'] as Industry[]).includes(m[1] as Industry)) {
    return m[1] as Industry;
  }
  return DEFAULT_INDUSTRY;
}

interface PoolState {
  updatedAt: string;
  images:    PoolImage[];
}

// ─── Internal ──────────────────────────────────────────────────────────────

// Resolves to repo root when invoked via ts-node from repo root (standard usage).
const POOL_PATH = path.join(process.cwd(), 'pool-state.json');

function readPool(): PoolState {
  if (!fs.existsSync(POOL_PATH)) {
    return { updatedAt: new Date().toISOString(), images: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(POOL_PATH, 'utf-8'));
  } catch {
    throw new Error(
      `[pool-manager] pool-state.json is malformed — fix it before running demos.\n` +
      `  Path: ${POOL_PATH}`,
    );
  }
}

function writePool(pool: PoolState): void {
  pool.updatedAt = new Date().toISOString();
  fs.writeFileSync(POOL_PATH, JSON.stringify(pool, null, 2) + '\n');
}

// ─── Core API ──────────────────────────────────────────────────────────────

/**
 * Allocate the oldest available image of the given type+industry to a slug.
 *
 * Throws with a detailed error message if the pool has no available images
 * matching both type and industry. Caller rolls back via freeImages(slug).
 *
 * @param type     'hero' | 'patient'
 * @param slug     destination demo slug (e.g. "cohen-dental-demo")
 * @param industry which industry's pool to pull from. Defaults to 'dental'
 *                 for backward compatibility with the original single-industry
 *                 callers.
 */
export function allocateImage(
  type: ImageType,
  slug: string,
  industry: Industry = DEFAULT_INDUSTRY,
): PoolImage {
  return withFileLock(POOL_PATH, () => {
    const pool = readPool();

    const candidates = pool.images
      .filter(img =>
        img.type === type &&
        img.status === 'available' &&
        normalizeIndustry(img) === industry,
      )
      .sort((a, b) => a.addedAt.localeCompare(b.addedAt)); // FIFO

    if (candidates.length === 0) {
      const s = poolStatsUnlocked(pool, industry);
      throw new Error(
        `No available ${type} images in ${industry} pool.\n` +
        `  heroes   → available: ${s.hero.available}, in-use: ${s.hero.inUse}, locked: ${s.hero.locked}\n` +
        `  patients → available: ${s.patient.available}, in-use: ${s.patient.inUse}, locked: ${s.patient.locked}\n` +
        `  Add images to /public/pool/${industry}/${type === 'hero' ? 'heroes' : 'patients'}/ and register them in pool-state.json`,
      );
    }

    // Mutate in-place (find the record in the original array, not the sorted copy)
    const record = pool.images.find(i => i.id === candidates[0].id && normalizeIndustry(i) === industry)!;
    record.status     = 'in-use';
    record.assignedTo = slug;
    record.assignedAt = new Date().toISOString();
    // Backfill industry on legacy rows
    if (!record.industry) record.industry = industry;
    writePool(pool);

    return { ...record }; // return a snapshot, not a mutable reference
  });
}

/**
 * Free ALL in-use images assigned to slug back to available.
 *
 * Called on: client churn, demo expiry, git-push failure rollback.
 * Does NOT touch locked images. Safe to call when nothing is assigned.
 */
export function freeImages(slug: string): PoolImage[] {
  return withFileLock(POOL_PATH, () => {
    const pool  = readPool();
    const freed: PoolImage[] = [];

    for (const img of pool.images) {
      if (img.assignedTo === slug && img.status === 'in-use') {
        img.status     = 'available';
        img.assignedTo = null;
        img.assignedAt = null;
        freed.push({ ...img });
      }
    }

    if (freed.length > 0) writePool(pool);
    return freed;
  });
}

/**
 * Free one specific pool image for a slug.
 *
 * Called when client replaces a single photo slot via the intake form or
 * WhatsApp bot — only the replaced slot's pool image is freed, not all of them.
 *
 * Returns true if the image was found and freed, false if not found /
 * not owned by this slug / already available or locked.
 */
export function freeImageByPath(slug: string, imagePath: string): boolean {
  if (!imagePath || !imagePath.startsWith('/pool/')) return false;

  return withFileLock(POOL_PATH, () => {
    const pool = readPool();
    const img  = pool.images.find(
      i => i.assignedTo === slug &&
           i.path       === imagePath &&
           i.status     === 'in-use',
    );
    if (!img) return false;

    img.status     = 'available';
    img.assignedTo = null;
    img.assignedAt = null;
    writePool(pool);
    return true;
  });
}

/**
 * Permanently lock all in-use images for a slug.
 *
 * Called when a client pays AND keeps the default pool images (confirmed sale).
 * Locked images are never returned to the available pool.
 */
export function lockImages(slug: string): PoolImage[] {
  return withFileLock(POOL_PATH, () => {
    const pool   = readPool();
    const locked: PoolImage[] = [];

    for (const img of pool.images) {
      if (img.assignedTo === slug && img.status === 'in-use') {
        img.status   = 'locked';
        img.lockedAt = new Date().toISOString();
        locked.push({ ...img });
      }
    }

    if (locked.length > 0) writePool(pool);
    return locked;
  });
}

/**
 * Add a newly approved image to the pool (available immediately).
 *
 * Called after manually approving a cron-generated image in Mission Control.
 * Idempotent within an industry: throws if (id, industry) already exists.
 * The `id` is derived from the path by stripping the `/pool/<industry>/` prefix.
 */
export function addImage(
  type:       ImageType,
  publicPath: string,
  notes:      string = '',
  industry:   Industry = DEFAULT_INDUSTRY,
): PoolImage {
  return withFileLock(POOL_PATH, () => {
    const pool = readPool();
    const prefix = `/pool/${industry}/`;
    const id     = publicPath.startsWith(prefix)
      ? publicPath.slice(prefix.length)
      : publicPath.replace(/^\/pool\/[^/]+\//, ''); // tolerate any /pool/X/...

    if (pool.images.find(i => i.id === id && normalizeIndustry(i) === industry)) {
      throw new Error(`[pool-manager] Image already registered in ${industry} pool: ${id}`);
    }

    const img: PoolImage = {
      id,
      type,
      industry,
      path:       publicPath,
      status:     'available',
      assignedTo: null,
      assignedAt: null,
      lockedAt:   null,
      addedAt:    new Date().toISOString(),
      notes,
    };
    pool.images.push(img);
    writePool(pool);
    return img;
  });
}

/**
 * Pool health snapshot — used for Mission Control dashboard and low-stock alerts.
 * Pass an industry to scope the snapshot; omit for legacy dental-only stats.
 */
export function poolStats(industry?: Industry) {
  return poolStatsUnlocked(readPool(), industry);
}

function poolStatsUnlocked(pool: PoolState, industry?: Industry) {
  const zero = () => ({ available: 0, inUse: 0, locked: 0, total: 0 });
  const out  = { hero: zero(), patient: zero() };

  for (const img of pool.images) {
    if (industry && normalizeIndustry(img) !== industry) continue;
    const b = img.type === 'hero' ? out.hero : out.patient;
    b.total++;
    if      (img.status === 'available') b.available++;
    else if (img.status === 'in-use')    b.inUse++;
    else if (img.status === 'locked')    b.locked++;
  }

  return out;
}

/**
 * List all images currently assigned to a slug (for audit / Mission Control view).
 */
export function getImagesForSlug(slug: string): PoolImage[] {
  return readPool().images.filter(i => i.assignedTo === slug);
}
