/**
 * app/api/intake/route.ts
 *
 * 1. Forwards the intake form payload to the VPS intake server.
 * 2. On success, fetches the current client record from VPS, merges the
 *    updated biz fields into siteContent, and PATCHes it back — so
 *    app/[slug]/page.tsx picks up the changes without a git commit.
 *
 * Required env vars:
 *   VPS_INTAKE_URL   = http://VPS_IP:PORT/api/intake
 *   NEXT_PUBLIC_API_URL  = http://VPS_IP:3000          (VPS main API)
 *   INTAKE_SECRET    = shared secret (optional)
 */
import { NextRequest, NextResponse } from 'next/server';

const VPS_API = process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000';

export async function POST(req: NextRequest) {
  const vpsUrl = process.env.VPS_INTAKE_URL;
  const secret = process.env.INTAKE_SECRET;

  if (!vpsUrl) {
    return NextResponse.json({ error: 'VPS_INTAKE_URL not configured' }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[intake] secret present:', !!secret, '| length:', secret?.length ?? 0);

  // ── 1. Forward to VPS intake server ──────────────────────────────────
  let upstreamData: any = {};
  let upstreamStatus = 200;
  try {
    const upstream = await fetch(vpsUrl, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-intake-secret': secret ?? '',
      },
      body: JSON.stringify(body),
    });
    upstreamData   = await upstream.json().catch(() => ({}));
    upstreamStatus = upstream.status;
  } catch (err: any) {
    return NextResponse.json({ error: `VPS unreachable: ${err.message}` }, { status: 502 });
  }

  // ── 2. Merge updated biz fields into siteContent on VPS ──────────────
  // Do this async — don't block the response on success/failure.
  const slug: string | undefined = body?.slug;
  if (slug && upstreamStatus >= 200 && upstreamStatus < 300) {
    updateSiteContent(slug, body).catch((e) =>
      console.error('[intake] siteContent update failed:', e),
    );
  }

  return NextResponse.json(upstreamData, { status: upstreamStatus });
}

/**
 * Fetch the current siteContent from VPS, merge in the new biz fields
 * supplied by the intake form, and PATCH it back.
 */
async function updateSiteContent(slug: string, formData: any): Promise<void> {
  // Get current client record (may have siteContent from new-demo.ts)
  const clientRes = await fetch(`${VPS_API}/api/clients/${slug}`);
  if (!clientRes.ok) {
    console.warn(`[intake] client ${slug} not found on VPS — skipping siteContent update`);
    return;
  }
  const client = await clientRes.json();
  const existing: any = client.siteContent ?? {};

  // Merge intake form fields into biz section
  const updatedBiz = {
    ...(existing.biz ?? {}),
    name:          formData.name          ?? existing.biz?.name,
    phone:         formData.phone         ?? existing.biz?.phone,
    city:          formData.city          ?? existing.biz?.city,
    address:       formData.address       ?? existing.biz?.address,
    email:         formData.email         ?? existing.biz?.email,
    hours:         formData.hours         ?? existing.biz?.hours,
    alertWhatsapp: formData.alertWhatsapp ?? existing.biz?.alertWhatsapp,
    alertEmail:    formData.email         ?? existing.biz?.alertEmail,
  };

  // Merge services if provided
  const updatedServices = (formData.services && formData.services.length > 0)
    ? formData.services
    : (existing.services ?? []);

  const updatedContent = {
    ...existing,
    biz:      updatedBiz,
    services: updatedServices,
  };

  // PATCH the VPS client record
  await fetch(`${VPS_API}/api/clients/${slug}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ siteContent: updatedContent }),
  });

  console.log(`[intake] siteContent updated for slug=${slug}`);
}
