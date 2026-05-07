/**
 * middleware.ts — Custom Domain Router
 *
 * Routes incoming requests from client custom domains to the correct
 * Next.js route slug. Two-layer lookup:
 *
 *   1. domains.json — static map, fastest, hand-maintained
 *      (auto-updated by scripts/new-demo.ts)
 *   2. VPS /api/clients lookup — dynamic, picks up domains added via
 *      the operator's `domain-live.sh` script without redeploying.
 *
 * Example:
 *   cohen-dental.co.il      →  /cohen-dental
 *   www.hadar-beauty.co.il  →  /hadar-beauty
 *
 * Excluded from rewriting: /api/*, /_next/*, /favicon.ico, /public/*
 */

import { NextRequest, NextResponse } from 'next/server';
import domains from './domains.json';

const DOMAIN_MAP = domains as Record<string, string>;
const VPS_BASE   = process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000';

// In-memory cache of VPS lookups (per edge instance).
const dynCache = new Map<string, { slug: string | null; expires: number }>();
const TTL_MS = 60_000;

async function lookupSlug(hostname: string): Promise<string | null> {
  // 1. Static map first
  if (DOMAIN_MAP[hostname]) return DOMAIN_MAP[hostname];

  // 2. Dynamic lookup with cache
  const hit = dynCache.get(hostname);
  if (hit && hit.expires > Date.now()) return hit.slug;

  let slug: string | null = null;
  try {
    const r = await fetch(`${VPS_BASE}/api/clients/by-domain?host=${encodeURIComponent(hostname)}`, {
      next: { revalidate: 60 },
    });
    if (r.ok) {
      const j: any = await r.json();
      if (j?.slug) slug = String(j.slug);
    }
  } catch { /* network error → no rewrite, fall through */ }

  dynCache.set(hostname, { slug, expires: Date.now() + TTL_MS });
  return slug;
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const hostname = host.split(':')[0].replace(/^www\./, '').toLowerCase();

  // Bypass our own brand domains
  if (hostname.endsWith('.vercel.app') || hostname === 'localhost') {
    return NextResponse.next();
  }

  const slug = await lookupSlug(hostname);
  if (!slug) return NextResponse.next();

  const url = req.nextUrl.clone();
  if (url.pathname === '/') {
    url.pathname = `/${slug}`;
    return NextResponse.rewrite(url);
  }

  // sub-paths still serve the client site
  url.pathname = `/${slug}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|_next/webpack|favicon.ico|clients|intake|portal|scope|terms|privacy|gmb|approvals|admin).*)'],
};
