/**
 * Deterministic variance — same slug always gets the same design.
 * Two different slugs → different pack + different hero photo (almost certainly).
 */

import { PACK_IDS } from './design-packs'

// Pool of hero photo candidates (relative to /public). Expand as more are added.
// These are industry-agnostic neutral stocks used until the client uploads a real photo.
export const HERO_POOL: Record<string, string[]> = {
  dental: [
    '/dental-hero.png',
    '/dental-consult.png',
    '/dental-smile.png',
    '/dental-reception.png',
    // add /pool/dental/hero-05.jpg … hero-10.jpg as generated
  ],
  accountant: [
    '/acc-hero.png',
    '/acc-data.png',
    '/acc-portrait.png',
    '/acc-team.png',
  ],
  lawyer: [
    '/lawyer-handshake.png',
    '/lawyer-portrait.png',
    '/office-bg.png',
  ],
}

/** djb2 hash — stable across JS runtimes. */
export function hashString(s: string): number {
  let h = 5381
  for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0
  return h
}

/**
 * Pick a design pack + hero image deterministically from a slug.
 * Optional `city` spreads the hash further so same-slug collisions across cities
 * would still differ (rarely useful but cheap insurance).
 */
export function pickVariant(slug: string, template: string = 'dental', city: string = '') {
  const h     = hashString(`${slug}|${city}`)
  const pool  = HERO_POOL[template] ?? HERO_POOL.dental
  const packId = PACK_IDS[h % PACK_IDS.length]
  const heroPhoto = pool[Math.floor(h / 31) % pool.length]

  // Spread additional picks so fields don't all hash-move together
  return {
    packId,
    heroPhoto,
    aboutPhoto:   pool[Math.floor(h / 97)  % pool.length],
    resultsPhoto: pool[Math.floor(h / 211) % pool.length],
    ctaPhoto:     pool[Math.floor(h / 509) % pool.length],
  }
}
