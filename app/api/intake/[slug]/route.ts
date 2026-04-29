/**
 * POST /api/intake/[slug]
 *
 * Slug-scoped intake endpoint. The slug is taken from the URL path —
 * NEVER from the request body. This is the only authority for which
 * client record gets updated, so a malicious or buggy form submission
 * can never write into a different slug's siteContent.
 *
 * Pipeline:
 *   1. Validate `slug` from URL.
 *   2. Forward to the VPS intake server with `{ ...body, slug: <urlSlug> }`
 *      so the upstream gets the authoritative slug.
 *   3. PATCH the VPS client record's siteContent with the merged biz fields,
 *      again using ONLY the URL slug.
 */
import { NextRequest, NextResponse } from 'next/server';

const VPS_API = process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000';
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const slug = (params.slug ?? '').toLowerCase();
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // ── Force the slug from the URL path; ignore anything in the body ───
  const safeBody = { ...body, slug };
  if (body?.slug && body.slug !== slug) {
    console.warn(`[intake/${slug}] body.slug="${body.slug}" rejected; URL slug enforced`);
  }

  // ── Verify this slug exists on the VPS ──────────────────────────────
  // Stops a curl POST to a never-provisioned slug from polluting the VPS.
  const exists = await fetch(`${VPS_API}/api/clients/${slug}`, { cache: 'no-store' });
  if (!exists.ok) {
    return NextResponse.json(
      { error: `Unknown slug: ${slug}. Create the demo first.` },
      { status: 404 },
    );
  }

  // ── PATCH siteContent directly on Mission Control (no legacy forward) ──
  // Skips the deprecated intake-server.js (port 3004) which still does
  // git push + folder rewrites. siteContent lives on the VPS now.
  try {
    await updateSiteContent(slug, safeBody);
  } catch (e: any) {
    console.error(`[intake/${slug}] siteContent update failed:`, e);
    return NextResponse.json({ error: e.message }, { status: 502 });
  }

  const url = `https://webuilder-liart.vercel.app/${slug}`;
  return NextResponse.json({ ok: true, slug, url });
}

async function updateSiteContent(slug: string, formData: any): Promise<void> {
  const clientRes = await fetch(`${VPS_API}/api/clients/${slug}`, { cache: 'no-store' });
  if (!clientRes.ok) {
    console.warn(`[intake/${slug}] client not found on VPS — skipping siteContent update`);
    return;
  }
  const client = await clientRes.json();
  const existing: any = client.siteContent ?? {};
  const existingBiz = existing.biz ?? {};

  // The IntakeForm posts a nested `biz` object; older callers post flat fields.
  // Accept both shapes but never let body.slug leak into siteContent.
  const flat = formData.biz ?? formData;

  const updatedBiz = {
    ...existingBiz,
    name:          flat.name          ?? existingBiz.name,
    phone:         flat.phone         ?? existingBiz.phone,
    city:          flat.city          ?? existingBiz.city,
    address:       flat.address       ?? existingBiz.address,
    email:         flat.email         ?? existingBiz.email,
    hours:         flat.hours         ?? existingBiz.hours,
    alertWhatsapp: flat.alertWhatsapp ?? existingBiz.alertWhatsapp,
    alertEmail:    flat.email         ?? existingBiz.alertEmail,
  };

  const updatedServices = Array.isArray(formData.services) && formData.services.length > 0
    ? formData.services
    : (existing.services ?? []);

  const updatedContent = {
    ...existing,
    biz:      updatedBiz,
    services: updatedServices,
  };

  const patchRes = await fetch(`${VPS_API}/api/clients/${slug}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ siteContent: updatedContent }),
  });
  if (!patchRes.ok) {
    const txt = await patchRes.text().catch(() => '');
    throw new Error(`VPS PATCH failed (${patchRes.status}): ${txt.slice(0, 200)}`);
  }

  console.log(`[intake/${slug}] siteContent updated`);
}
