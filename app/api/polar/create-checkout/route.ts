/**
 * POST /api/polar/create-checkout
 *
 * Creates a Polar.sh checkout session and returns the hosted checkout URL.
 * The client slug + tier are stored in metadata so the webhook can identify
 * which client paid, which tier they bought, and send them the right delivery.
 *
 * Body: {
 *   slug:      string   — client slug
 *   product?:  'site' | 'basic' | 'standard' | 'premium' | 'maintenance'
 *               'site' is treated as 'basic' for back-compat.
 *   email?:    string   — pre-fill buyer email
 *   name?:     string   — pre-fill buyer name
 * }
 *
 * Env vars (all optional — fallback to baked-in product IDs):
 *   POLAR_API_KEY                 — polar_oat_...
 *   POLAR_PRODUCT_BASIC_ID        — basic site (700)
 *   POLAR_PRODUCT_STANDARD_ID     — standard site (1200) — falls back to BASIC
 *   POLAR_PRODUCT_PREMIUM_ID      — premium site (1900) — falls back to BASIC
 *   POLAR_PRODUCT_MONTHLY_ID      — monthly maintenance subscription
 */

import { NextRequest, NextResponse } from 'next/server'

const POLAR_API = 'https://api.polar.sh/v1'

type Tier = 'basic' | 'standard' | 'premium';

function resolveProductId(product: string): { productId: string; tier: Tier | 'maintenance' } {
  // Back-compat: 'site' was the old way of saying basic
  const normalized = product === 'site' ? 'basic' : product;

  const FALLBACK_BASIC = 'b7d6b913-2f7e-4625-bf67-104203449ec5';

  if (normalized === 'maintenance') {
    return {
      productId: process.env.POLAR_PRODUCT_MONTHLY_ID || '36ff799a-5b98-49af-a1c4-9af2bd7c7185',
      tier: 'maintenance',
    };
  }
  if (normalized === 'standard') {
    return {
      productId: process.env.POLAR_PRODUCT_STANDARD_ID || process.env.POLAR_PRODUCT_BASIC_ID || FALLBACK_BASIC,
      tier: 'standard',
    };
  }
  if (normalized === 'premium') {
    return {
      productId: process.env.POLAR_PRODUCT_PREMIUM_ID || process.env.POLAR_PRODUCT_BASIC_ID || FALLBACK_BASIC,
      tier: 'premium',
    };
  }
  // basic (default)
  return {
    productId: process.env.POLAR_PRODUCT_BASIC_ID || process.env.POLAR_PRODUCT_SITE_ID || FALLBACK_BASIC,
    tier: 'basic',
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { slug, product = 'basic', email, name } = body

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  const apiKey = process.env.POLAR_API_KEY || ''
  if (!apiKey) {
    return NextResponse.json(
      { error: 'POLAR_API_KEY is not set in env vars' },
      { status: 500 },
    )
  }

  const { productId, tier } = resolveProductId(String(product));

  const siteBase = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://webuilder-liart.vercel.app'

  const checkoutBody: Record<string, unknown> = {
    // Polar v1 expects `products` array (the older `product_id` returns 405)
    products:     [productId],
    // Redirect the buyer directly to their intake form — client-facing, NOT mission control.
    success_url:  `${siteBase}/intake/${encodeURIComponent(slug)}?paid=1`,
    // Embed slug + tier in metadata → webhook reads it to update client record + send intake
    metadata: { slug, product, tier },
    // Pre-fill buyer info if available
    ...(email ? { customer_email: email } : {}),
    ...(name  ? { customer_name:  name  } : {}),
  }

  try {
    // Polar v1 endpoint is /v1/checkouts/ (the older /checkouts/custom
     // was renamed; calling the old path returns 405 Method Not Allowed)
    const res = await fetch(`${POLAR_API}/checkouts/`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutBody),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.error('[polar/create-checkout] API error:', JSON.stringify(data))
      const msg = data?.detail || data?.error || `Polar API ${res.status}`
      return NextResponse.json({ error: msg }, { status: res.status })
    }

    // Polar returns `url` at the top level
    const url: string = data?.url || data?.checkout_url
    if (!url) {
      console.error('[polar/create-checkout] No URL in response:', JSON.stringify(data))
      return NextResponse.json({ error: 'No checkout URL in Polar response' }, { status: 500 })
    }

    console.log(`[polar/create-checkout] ✓ ${slug} → ${product} → ${url}`)
    return NextResponse.json({ ok: true, url })

  } catch (err: any) {
    console.error('[polar/create-checkout] fetch error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
