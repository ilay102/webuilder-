/**
 * POST /api/demo/create
 *
 * Mission Control "Create Demo" endpoint.
 *
 * What it does (matches scripts/new-demo.ts buildDemo, minus git push):
 *   1. Validates the requested slug (lowercase, hyphenated, 3–48 chars).
 *   2. Atomically allocates ONE hero + ONE patient image and ONE text pack.
 *   3. Composes a SiteContent JSON via lib/demo-builder.composeSiteContent.
 *   4. Registers the client on the VPS and PATCHes the siteContent.
 *   5. Returns { url } — the demo is live within seconds via app/[slug]/page.tsx.
 *
 * What it deliberately does NOT do:
 *   - git pull/push of pool-state.json. That's a CLI concern (run new-demo.ts
 *     from a workstation when you want the pool state committed to the repo).
 *     Inside Mission Control we treat the running process's pool-state.json
 *     as authoritative; concurrent button clicks are protected by
 *     lib/file-lock.ts so two demos never grab the same image.
 *   - Mutate the per-route folder. The dynamic [slug] route serves siteContent
 *     directly from VPS — no rebuild required.
 */
import { NextRequest, NextResponse } from 'next/server';
import { allocateImage, freeImages }     from '@/lib/pool-manager';
import { allocateTextPack, freeTextPack } from '@/lib/text-pool-manager';
import { composeSiteContent }             from '@/lib/demo-builder';
import { pickVariant }                    from '@/lib/variance';
import { getPack }                        from '@/lib/design-packs';

export const dynamic = 'force-dynamic';

const VPS_API = process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000';
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;

interface CreateDemoBody {
  template?:    'dental' | 'accountant' | 'lawyer';
  slug:         string;
  businessName: string;
  city?:        string;
  phone?:       string;
  hours?:       string;
  calLink?:     string;
  email?:       string;
  whatsapp?:    string;
  domain?:      string | null;
}

export async function POST(req: NextRequest) {
  let body: CreateDemoBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // ── Validation ────────────────────────────────────────────────────────
  const slug = (body.slug ?? '').trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: 'Invalid slug — use 3–48 chars, lowercase letters/digits/hyphens, no leading/trailing hyphen' },
      { status: 400 },
    );
  }
  if (!body.businessName?.trim()) {
    return NextResponse.json({ error: 'businessName is required' }, { status: 400 });
  }
  const template = body.template ?? 'dental';
  if (!['dental', 'accountant', 'lawyer'].includes(template)) {
    return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 });
  }

  // Refuse to overwrite an existing client
  try {
    const existing = await fetch(`${VPS_API}/api/clients/${slug}`, { cache: 'no-store' });
    if (existing.ok) {
      const json = await existing.json().catch(() => ({}));
      if (json && (json.slug === slug)) {
        return NextResponse.json(
          { error: `Slug already exists on VPS: ${slug}` },
          { status: 409 },
        );
      }
    }
  } catch { /* VPS unreachable — allow attempt and let the registration step fail loudly */ }

  // ── Allocate pool resources atomically ────────────────────────────────
  let hero, patient, textAlloc;
  try {
    hero    = allocateImage('hero',    slug);
    patient = allocateImage('patient', slug);
    textAlloc = allocateTextPack(slug);
  } catch (e: any) {
    // Roll back any partial allocation so the slug doesn't hold pool state forever
    freeImages(slug);
    freeTextPack(slug);
    return NextResponse.json({ error: e.message }, { status: 503 });
  }

  const variant = pickVariant(slug, template, body.city ?? '');
  const pack    = getPack(variant.packId);

  const siteContent = composeSiteContent({
    biz: {
      name:           body.businessName.trim(),
      city:           body.city  ?? '',
      address:        body.city  ?? '',
      phone:          body.phone ?? '',
      hours:          body.hours ?? 'Sun–Thu 9:00–18:00',
      clientEmail:    body.email    ?? '',
      clientWhatsapp: body.whatsapp ?? '',
      calLink:        body.calLink  ?? 'ilay-lankin/15min',
      domain:         body.domain   ?? null,
      template,
    },
    hero,
    patient,
    textPack: textAlloc.pack,
    designPackId: pack.id,
  });

  // ── Register client on VPS + push siteContent ─────────────────────────
  const siteUrl = body.domain
    ? `https://${body.domain.replace(/^www\./, '')}`
    : `https://webuilder-liart.vercel.app/${slug}`;

  try {
    const createRes = await fetch(`${VPS_API}/api/clients`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        name:     body.businessName.trim(),
        phone:    body.phone    ?? '',
        email:    body.email    ?? '',
        whatsapp: body.whatsapp ?? '',
        template,
        domain:   body.domain ?? null,
        siteUrl,
        status:   'active',
        plan:     'trial',
      }),
    });
    if (!createRes.ok && createRes.status !== 409) {
      throw new Error(`VPS POST /api/clients returned ${createRes.status}`);
    }

    const patchRes = await fetch(`${VPS_API}/api/clients/${slug}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ siteContent }),
    });
    if (!patchRes.ok) {
      throw new Error(`VPS PATCH siteContent returned ${patchRes.status}`);
    }
  } catch (e: any) {
    // Registration failed — release the pool so the next attempt can reuse the assets
    freeImages(slug);
    freeTextPack(slug);
    return NextResponse.json(
      { error: `VPS registration failed (pool released): ${e.message}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success:   true,
    slug,
    url:       siteUrl,
    intakeUrl: `/intake/${slug}`,
    allocations: {
      hero:    hero.id,
      patient: patient.id,
      text:    textAlloc.pack.id,
      design:  pack.id,
    },
  });
}
