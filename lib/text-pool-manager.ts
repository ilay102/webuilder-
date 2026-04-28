/**
 * text-pool-manager.ts — Lifecycle tracker for the static Text Pool.
 *
 * Mirrors lib/pool-manager.ts (image pool) one-to-one. Same state model,
 * same FIFO allocation, same lock/free semantics.
 *
 * Source of truth: text-pool-state.json at repo root (git-tracked).
 * Pack DEFINITIONS live in lib/text-packs.ts (immutable).
 * This file only manages STATE (which pack is in-use / locked / available).
 *
 * State machine:
 *   available  →  in-use    allocateTextPack()   demo created, pack assigned
 *   in-use     →  available freeTextPack()        client churned / git rollback
 *   in-use     →  locked    lockTextPack()        client paid (confirmed sale)
 *
 * Allocation is FIFO (oldest addedAt first) so packs wear evenly.
 * Exhaustion throws — caller surfaces it (no silent fallbacks).
 */

import fs   from 'fs';
import path from 'path';
import { TEXT_PACKS, getTextPack, type TextPack } from './text-packs';
import { withFileLock } from './file-lock';

// ─── Types ─────────────────────────────────────────────────────────────────

export type TextPackStatus = 'available' | 'in-use' | 'locked';

export interface TextPackRecord {
  /** Stable id matching a pack in lib/text-packs.ts (e.g. "calm-trust") */
  id:         string;
  status:     TextPackStatus;
  /** Slug currently holding this pack, or null */
  assignedTo: string | null;
  assignedAt: string | null;
  lockedAt:   string | null;
  /** When this pack id was first registered — drives FIFO ordering */
  addedAt:    string;
}

interface TextPoolState {
  updatedAt: string;
  packs:     TextPackRecord[];
}

/** What allocateTextPack returns: state metadata + pack content together */
export interface AllocatedTextPack {
  record: TextPackRecord;
  pack:   TextPack;
}

// ─── Internal ──────────────────────────────────────────────────────────────

const STATE_PATH = path.join(process.cwd(), 'text-pool-state.json');

function readState(): TextPoolState {
  if (!fs.existsSync(STATE_PATH)) {
    return { updatedAt: new Date().toISOString(), packs: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    throw new Error(
      `[text-pool-manager] text-pool-state.json is malformed — fix it before running demos.\n` +
      `  Path: ${STATE_PATH}`,
    );
  }
}

function writeState(state: TextPoolState): void {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

// ─── Core API ──────────────────────────────────────────────────────────────

/**
 * Allocate the oldest available text pack to a slug.
 *
 * Throws with a detailed error if the pool has no available packs.
 * Caller is responsible for rolling back via freeTextPack(slug) before re-throw.
 */
export function allocateTextPack(slug: string): AllocatedTextPack {
  return withFileLock(STATE_PATH, () => {
    const state = readState();

    const candidates = state.packs
      .filter(p => p.status === 'available')
      .sort((a, b) => a.addedAt.localeCompare(b.addedAt)); // FIFO

    if (candidates.length === 0) {
      const s = statsUnlocked(state);
      throw new Error(
        `No available text packs in pool.\n` +
        `  available: ${s.available}, in-use: ${s.inUse}, locked: ${s.locked}, total: ${s.total}\n` +
        `  Add new packs to lib/text-packs.ts and run npm run text-pool:init`,
      );
    }

    const record = state.packs.find(p => p.id === candidates[0].id)!;
    record.status     = 'in-use';
    record.assignedTo = slug;
    record.assignedAt = new Date().toISOString();
    writeState(state);

    const pack = getTextPack(record.id);
    if (!pack) {
      record.status     = 'available';
      record.assignedTo = null;
      record.assignedAt = null;
      writeState(state);
      throw new Error(
        `[text-pool-manager] State references unknown pack id "${record.id}".\n` +
        `  Either restore the pack in lib/text-packs.ts or remove it from text-pool-state.json.`,
      );
    }

    return { record: { ...record }, pack };
  });
}

/**
 * Free ALL in-use text packs assigned to slug back to available.
 *
 * Called on: client churn, git push failure rollback.
 * Does NOT touch locked packs. Safe to call when nothing is assigned.
 */
export function freeTextPack(slug: string): TextPackRecord[] {
  return withFileLock(STATE_PATH, () => {
    const state = readState();
    const freed: TextPackRecord[] = [];

    for (const p of state.packs) {
      if (p.assignedTo === slug && p.status === 'in-use') {
        p.status     = 'available';
        p.assignedTo = null;
        p.assignedAt = null;
        freed.push({ ...p });
      }
    }

    if (freed.length > 0) writeState(state);
    return freed;
  });
}

/**
 * Permanently lock the in-use text pack(s) for a slug.
 *
 * Called when a client pays — they keep their pack forever, never recycled.
 */
export function lockTextPack(slug: string): TextPackRecord[] {
  return withFileLock(STATE_PATH, () => {
    const state  = readState();
    const locked: TextPackRecord[] = [];

    for (const p of state.packs) {
      if (p.assignedTo === slug && p.status === 'in-use') {
        p.status   = 'locked';
        p.lockedAt = new Date().toISOString();
        locked.push({ ...p });
      }
    }

    if (locked.length > 0) writeState(state);
    return locked;
  });
}

/**
 * Register a new text pack id in the state file (available immediately).
 *
 * Called by scripts/text-pool-init.ts. Idempotent: throws if id is already
 * registered (init script catches and skips).
 */
export function registerTextPack(id: string): TextPackRecord {
  return withFileLock(STATE_PATH, () => {
    const state = readState();
    if (state.packs.find(p => p.id === id)) {
      throw new Error(`[text-pool-manager] Pack already registered: ${id}`);
    }
    if (!getTextPack(id)) {
      throw new Error(`[text-pool-manager] Pack id "${id}" does not exist in lib/text-packs.ts`);
    }

    const record: TextPackRecord = {
      id,
      status:     'available',
      assignedTo: null,
      assignedAt: null,
      lockedAt:   null,
      addedAt:    new Date().toISOString(),
    };
    state.packs.push(record);
    writeState(state);
    return record;
  });
}

/**
 * Pool health snapshot — for Mission Control + low-stock alerts.
 */
export function textPoolStats() {
  return statsUnlocked(readState());
}

function statsUnlocked(state: TextPoolState) {
  const out = { available: 0, inUse: 0, locked: 0, total: 0 };

  for (const p of state.packs) {
    out.total++;
    if      (p.status === 'available') out.available++;
    else if (p.status === 'in-use')    out.inUse++;
    else if (p.status === 'locked')    out.locked++;
  }

  return out;
}

/**
 * List all packs currently assigned to a slug.
 */
export function getTextPacksForSlug(slug: string): TextPackRecord[] {
  return readState().packs.filter(p => p.assignedTo === slug);
}

/** Re-export for convenience */
export { TEXT_PACKS };
