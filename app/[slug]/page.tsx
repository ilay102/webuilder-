/**
 * app/[slug]/page.tsx — Universal Client Site Route
 *
 * Content resolution order (first match wins):
 *   1. VPS  GET /api/clients/:slug  →  client.siteContent  (VPS-registered clients)
 *   2. Disk app/{slug}/content.json                         (legacy static clients, removed after migration)
 *   3. 404                                                  (unknown slug)
 *
 * This single route replaces all per-client hardcoded folders.
 * New clients are registered via Mission Control → no git commit required.
 * Photos are served from /public/pool/dental/ (static, committed once).
 */

import { readFile } from 'fs/promises';
import path         from 'path';
import { notFound } from 'next/navigation';
import DentalTemplate, { type SiteContent } from '@/components/DentalTemplate';

const VPS = process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000';

// ── Revalidate every 60 s so content changes propagate quickly without SSG staleness ──
export const revalidate = 60;

export default async function ClientSitePage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  let content: SiteContent | null = null;

  // ── 1. VPS: primary source of truth ───────────────────────────────────
  try {
    const res = await fetch(`${VPS}/api/clients/${slug}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const client = await res.json();
      if (client?.siteContent) {
        content = client.siteContent as SiteContent;
      }
    }
  } catch {
    // VPS unreachable — fall through to disk
  }

  // ── 2. Disk fallback: legacy per-folder content.json ──────────────────
  if (!content) {
    try {
      const filePath = path.join(process.cwd(), 'app', slug, 'content.json');
      content = JSON.parse(await readFile(filePath, 'utf-8')) as SiteContent;
    } catch {
      // File not found — fall through to 404
    }
  }

  // ── 3. Nothing found → 404 ────────────────────────────────────────────
  if (!content) {
    notFound();
  }

  return <DentalTemplate content={content} />;
}
