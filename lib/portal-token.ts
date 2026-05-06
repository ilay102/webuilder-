/**
 * Portal token helper — signed slug + issued-at timestamp.
 *
 * Used to authenticate the self-service Client Portal at /portal/[slug]?t=<token>.
 * The token is generated when payment clears (in the Polar webhook) and sent
 * to the client via WhatsApp alongside the intake link. Server-side only —
 * never expose PORTAL_SECRET to the browser.
 *
 * Format: <slug>.<issuedAtMs>.<base64url(hmac-sha256)>
 *
 * Verification rules:
 *   - HMAC must match
 *   - slug in URL must match slug in token
 *   - token age must be ≤ MAX_TOKEN_AGE_DAYS (default 365)
 */

import { createHmac, timingSafeEqual } from 'crypto';

const MAX_TOKEN_AGE_DAYS = 365;
const SECRET = process.env.PORTAL_SECRET || 'dev-only-change-me';

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(str: string): Buffer {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export function signPortalToken(slug: string, issuedAtMs: number = Date.now()): string {
  const payload = `${slug}.${issuedAtMs}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest();
  return `${payload}.${b64url(sig)}`;
}

export function verifyPortalToken(slug: string, token: string): { ok: true } | { ok: false; reason: string } {
  if (!token || typeof token !== 'string') return { ok: false, reason: 'missing token' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [tokSlug, issuedStr, sigStr] = parts;

  if (tokSlug !== slug) return { ok: false, reason: 'slug mismatch' };

  const issuedAt = Number(issuedStr);
  if (!Number.isFinite(issuedAt)) return { ok: false, reason: 'bad issuedAt' };

  const ageMs = Date.now() - issuedAt;
  if (ageMs < 0) return { ok: false, reason: 'future-dated' };
  if (ageMs > MAX_TOKEN_AGE_DAYS * 86_400_000) return { ok: false, reason: 'expired' };

  const expected = createHmac('sha256', SECRET).update(`${tokSlug}.${issuedStr}`).digest();
  let provided: Buffer;
  try { provided = fromB64url(sigStr); } catch { return { ok: false, reason: 'bad sig encoding' }; }
  if (provided.length !== expected.length) return { ok: false, reason: 'sig length' };
  if (!timingSafeEqual(provided, expected)) return { ok: false, reason: 'sig mismatch' };

  return { ok: true };
}

export function portalUrl(siteBase: string, slug: string): string {
  return `${siteBase.replace(/\/$/, '')}/portal/${encodeURIComponent(slug)}?t=${signPortalToken(slug)}`;
}
