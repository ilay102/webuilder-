/**
 * /api/portal/[slug]
 *
 * Self-service Client Portal API. Authenticated by signed token (?t=...).
 * The slug is taken from the URL path — never the body — so a malicious
 * payload cannot pivot to another client's record.
 *
 * GET   → returns the client's current siteContent + subscription
 * PATCH → merges partial siteContent updates
 *
 * Allowed PATCH fields (whitelisted to prevent abuse):
 *   biz: { name, tagline, phone, email, address, hours, calLink, logo }
 *   copy: { h1, heroSubtitle, tagline, about, ctaMain, ctaSecondary, sectionLabel }
 *   design: { packId, textPackId }
 *   testimonials: Array<{ quote, name, detail }>
 *   photos: { hero, about, results, cta, gallery }
 *   stats: Array<{ value, label }>
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyPortalToken }         from '@/lib/portal-token';

const VPS_API = process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000';
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;

function authError(reason: string) {
  return NextResponse.json({ error: 'Unauthorized', reason }, { status: 401 });
}

function tokenFrom(req: NextRequest): string {
  const url = new URL(req.url);
  return url.searchParams.get('t')
      || req.headers.get('x-portal-token')
      || '';
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const slug = (params.slug ?? '').toLowerCase();
  if (!SLUG_RE.test(slug)) return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });

  const auth = verifyPortalToken(slug, tokenFrom(req));
  if (!auth.ok) return authError(auth.reason);

  const res = await fetch(`${VPS_API}/api/clients/${slug}`, { cache: 'no-store' });
  if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const client = await res.json();

  return NextResponse.json({
    slug,
    siteContent:  client.siteContent || null,
    subscription: client.subscription || null,
    tier:         client.tier || client.siteContent?.tier || 'basic',
    paidAt:       client.paidAt || null,
  });
}

const ALLOWED_BIZ_KEYS  = ['name', 'tagline', 'phone', 'email', 'address', 'hours', 'calLink', 'logo'];
const ALLOWED_COPY_KEYS = ['h1', 'heroSubtitle', 'tagline', 'about', 'ctaMain', 'ctaSecondary', 'sectionLabel'];
const ALLOWED_PHOTO_KEYS = ['hero', 'about', 'results', 'cta'];

function pickKeys<T extends Record<string, unknown>>(src: any, keys: string[]): Partial<T> {
  if (!src || typeof src !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in src) out[k] = src[k];
  return out as Partial<T>;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const slug = (params.slug ?? '').toLowerCase();
  if (!SLUG_RE.test(slug)) return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });

  const auth = verifyPortalToken(slug, tokenFrom(req));
  if (!auth.ok) return authError(auth.reason);

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Pull current siteContent
  const cur = await fetch(`${VPS_API}/api/clients/${slug}`, { cache: 'no-store' });
  if (!cur.ok) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  const client = await cur.json();
  const existing: any = client.siteContent || {};

  // Whitelist merge
  const next: any = { ...existing };
  if (body.biz)          next.biz    = { ...(existing.biz || {}),  ...pickKeys(body.biz,  ALLOWED_BIZ_KEYS)  };
  if (body.copy)         next.copy   = { ...(existing.copy || {}), ...pickKeys(body.copy, ALLOWED_COPY_KEYS) };
  if (body.design)       next.design = { ...(existing.design || {}), ...pickKeys(body.design, ['packId', 'textPackId']) };
  if (body.photos) {
    const incomingGallery = Array.isArray(body.photos.gallery) ? body.photos.gallery.map(String) : null;
    next.photos = {
      ...(existing.photos || {}),
      ...pickKeys(body.photos, ALLOWED_PHOTO_KEYS),
      ...(incomingGallery ? { gallery: incomingGallery.slice(0, 24) } : {}),
    };
  }
  if (Array.isArray(body.testimonials)) {
    next.testimonials = body.testimonials
      .slice(0, 12)
      .map((t: any) => ({
        quote:  String(t?.quote  || '').slice(0, 400),
        name:   String(t?.name   || '').slice(0, 60),
        detail: String(t?.detail || '').slice(0, 80),
      }))
      .filter((t: any) => t.quote && t.name);
  }
  if (Array.isArray(body.stats)) {
    next.stats = body.stats
      .slice(0, 8)
      .map((s: any) => ({
        value: String(s?.value || '').slice(0, 20),
        label: String(s?.label || '').slice(0, 40),
      }))
      .filter((s: any) => s.value && s.label);
  }

  const patch = await fetch(`${VPS_API}/api/clients/${slug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteContent: next }),
  });
  if (!patch.ok) {
    const txt = await patch.text().catch(() => '');
    return NextResponse.json({ error: `VPS PATCH failed (${patch.status}): ${txt.slice(0,200)}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, siteContent: next });
}
