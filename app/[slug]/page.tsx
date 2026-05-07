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

interface ClientLoad {
  content:      SiteContent | null;
  subscription: any | null;
  paidAt:       string | null;
}

async function loadClient(slug: string): Promise<ClientLoad> {
  try {
    const res = await fetch(`${VPS}/api/clients/${slug}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const c = await res.json();
      if (c?.siteContent) {
        return {
          content:      c.siteContent as SiteContent,
          subscription: c.subscription || null,
          paidAt:       c.paidAt || null,
        };
      }
    }
  } catch {}
  try {
    const filePath = path.join(process.cwd(), 'app', slug, 'content.json');
    const content  = JSON.parse(await readFile(filePath, 'utf-8')) as SiteContent;
    return { content, subscription: null, paidAt: null };
  } catch {}
  return { content: null, subscription: null, paidAt: null };
}

// ── Subscription gate ─────────────────────────────────────────────────────
// Hide the live site if the client has cancelled or past-due for >7 days.
// Static disk-backed legacy clients (no subscription record) are exempt — they're paid one-off.
const GRACE_DAYS = 7;

function isSiteSuspended(sub: any): boolean {
  if (!sub) return false;
  if (sub.status === 'active' || sub.status === 'no-subscription') return false;
  // Cancelled with current period still in the future → grace period applies
  const now = Date.now();
  const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).getTime() : 0;
  if (sub.status === 'canceled' && periodEnd > now) return false;       // still inside paid window
  if (sub.canceledAt) {
    const since = (now - new Date(sub.canceledAt).getTime()) / 86_400_000;
    if (since < GRACE_DAYS) return false;
  }
  if (sub.status === 'past_due') {
    const lastEvent = sub.lastEventAt ? new Date(sub.lastEventAt).getTime() : 0;
    const since = (now - lastEvent) / 86_400_000;
    if (since < GRACE_DAYS) return false;
  }
  return true;
}

// Backwards-compat helper used by generateMetadata
async function loadContent(slug: string): Promise<SiteContent | null> {
  return (await loadClient(slug)).content;
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
  const { content, subscription } = await loadClient(params.slug);
  if (!content) notFound();

  if (isSiteSuspended(subscription)) {
    return (
      <main style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#FAF8F4', color: '#1A1A1A', padding: 24, direction: 'rtl',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>⏸️</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>האתר זמנית לא זמין</h1>
          <p style={{ color: '#666', fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
            האתר של {content.biz?.name || 'העסק'} נמצא כעת במצב השהיה.
            לפרטים — צרו קשר ישירות עם בעלי העסק{content.biz?.phone ? ' בטלפון ' + content.biz.phone : ''}.
          </p>
          {content.biz?.phone && (
            <a
              href={`tel:${content.biz.phone.replace(/[^0-9+]/g, '')}`}
              style={{ display: 'inline-block', background: '#2D6B55', color: '#fff', padding: '12px 32px', borderRadius: 99, textDecoration: 'none', fontWeight: 700 }}
            >
              📞 {content.biz.phone}
            </a>
          )}
        </div>
      </main>
    );
  }

  return <DentalTemplate content={content} />;
}
