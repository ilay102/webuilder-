/**
 * Client Portal — /portal/[slug]?t=<token>
 *
 * Self-service editor scoped to a single client. The slug is taken from the URL
 * path; the token is verified server-side before rendering. All edits flow
 * through /api/portal/[slug] (also URL-scoped) so a malicious POST cannot pivot.
 */

import { notFound, redirect } from 'next/navigation';
import { verifyPortalToken }  from '@/lib/portal-token';
import PortalClient           from './PortalClient';

const VPS = process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000';

export const dynamic = 'force-dynamic';

export default async function PortalPage({
  params,
  searchParams,
}: {
  params:       { slug: string };
  searchParams: { t?: string };
}) {
  const slug = params.slug.toLowerCase();
  const token = searchParams?.t || '';

  const auth = verifyPortalToken(slug, token);
  if (!auth.ok) {
    return (
      <main style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0E0E0E', color: '#fff', padding: 24, direction: 'rtl',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>הקישור לא תקף</h1>
          <p style={{ color: '#aaa', fontSize: 15, lineHeight: 1.7 }}>
            הקישור לפורטל פג תוקף או לא תואם. בדוק שיש לך את הקישור העדכני שקיבלת ב-WhatsApp,
            או צור קשר וניצור לך קישור חדש.
          </p>
          <p style={{ color: '#666', fontSize: 12, marginTop: 16 }}>קוד שגיאה: {auth.reason}</p>
        </div>
      </main>
    );
  }

  const res = await fetch(`${VPS}/api/clients/${slug}`, { cache: 'no-store' });
  if (!res.ok) notFound();
  const client = await res.json();

  return (
    <PortalClient
      slug={slug}
      token={token}
      initial={{
        siteContent:  client.siteContent || null,
        subscription: client.subscription || null,
        tier:         client.tier || client.siteContent?.tier || 'basic',
        paidAt:       client.paidAt || null,
      }}
    />
  );
}
