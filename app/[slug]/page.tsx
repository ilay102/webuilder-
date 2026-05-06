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

import { readFile }     from 'fs/promises';
import path             from 'path';
import type { Metadata } from 'next';
import { notFound }     from 'next/navigation';
import DentalTemplate, { type SiteContent } from '@/components/DentalTemplate';

const VPS = process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000';

// ── Revalidate every 60 s so content changes propagate quickly without SSG staleness ──
export const revalidate = 60;

async function loadContent(slug: string): Promise<SiteContent | null> {
  try {
    const res = await fetch(`${VPS}/api/clients/${slug}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const c = await res.json();
      if (c?.siteContent) return c.siteContent as SiteContent;
    }
  } catch {}
  try {
    const filePath = path.join(process.cwd(), 'app', slug, 'content.json');
    return JSON.parse(await readFile(filePath, 'utf-8')) as SiteContent;
  } catch {}
  return null;
}

// ── Per-client SEO ───────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const content = await loadContent(params.slug);
  if (!content) return { title: 'אתר' };
  const biz = content.biz;
  const title = biz.name + (biz.city ? ` · ${biz.city}` : '');
  const description = content.copy?.heroSubtitle
    || biz.tagline
    || `מרפאת שיניים מקצועית${biz.city ? ` ב${biz.city}` : ''}. ${biz.phone ? 'התקשרו: ' + biz.phone : ''}`;
  const ogImage = content.photos?.hero;
  return {
    title,
    description,
    openGraph: {
      title, description,
      images: ogImage ? [ogImage] : [],
      locale: 'he_IL',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: `https://webuilder-liart.vercel.app/${params.slug}` },
  };
}

export default async function ClientSitePage({
  params,
}: {
  params: { slug: string };
}) {
  const content = await loadContent(params.slug);
  if (!content) notFound();
  return <DentalTemplate content={content} />;
}
