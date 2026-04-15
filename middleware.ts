/**
 * middleware.ts — Custom Domain Router
 *
 * Routes incoming requests from client custom domains to the correct
 * Next.js route slug. Mapping lives in domains.json (auto-updated by
 * scripts/new-demo.ts on each new client).
 *
 * Example:
 *   cohen-dental.co.il  →  /cohen-dental
 *   www.hadar-beauty.co.il  →  /hadar-beauty
 *
 * Excluded from rewriting: /api/*, /_next/*, /favicon.ico, /public/*
 */

import { NextRequest, NextResponse } from 'next/server';
import domains from './domains.json';

const DOMAIN_MAP = domains as Record<string, string>;

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  // Strip port (dev) and www prefix
  const hostname = host.split(':')[0].replace(/^www\./, '');

  const slug = DOMAIN_MAP[hostname];

  // Not a known custom domain → pass through normally
  if (!slug) return NextResponse.next();

  const url = req.nextUrl.clone();

  // Rewrite root → /slug, keep sub-paths as-is
  if (url.pathname === '/') {
    url.pathname = `/${slug}`;
    return NextResponse.rewrite(url);
  }

  // e.g. /some-anchor or unknown path — still serve the client site
  url.pathname = `/${slug}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip Next.js internals, API routes, and static files
  matcher: ['/((?!api|_next/static|_next/image|_next/webpack|favicon.ico|clients|intake).*)'],
};
