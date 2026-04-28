/**
 * POST /api/polar/create-checkout
 *
 * Creates a Polar.sh checkout session and returns the hosted checkout URL.
 * The client slug is stored in metadata so the webhook can identify which
 * client paid and send them the intake link.
 *
 * Body: {
 *   slug:      string   — client slug
 *   product?:  'site' | 'maintenance'  — defaults to 'site' (700₪ one-time)
 *   email?:    string   — pre-fill buyer email
 *   name?:     string   — pre-fill buyer name
 * }
 *
 * Env vars:
 *   POLAR_API_KEY              — polar_oat_...
 *   POLAR_PRODUCT_SITE_ID      — b7d6b913-2f7e-4625-bf67-104203449ec5
 *   POLAR_PRODUCT_MONTHLY_ID   — 36ff799a-5b98-49af-a1c4-9af2bd7c7185
 */

import { NextRequest, NextResponse } from 'next/server'

const POLAR_API = 'https://api.polar.sh/v1'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { slug, product = 'site', email, name } = body

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

  // Pick the right product ID based on what's being sold
  const productId =
    product === 'maintenance'
      ? (process.env.POLAR_PRODUCT_MONTHLY_ID || '36ff799a-5b98-49af-a1c4-9af2bd7c7185')
      : (process.env.POLAR_PRODUCT_SITE_ID    || 'b7d6b913-2f7e-4625-bf67-104203449ec5')

  const siteBase = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://webuilder-liart.vercel.app'

  const checkoutBody: Record<string, unknown> = {
    product_id:   productId,
    success_url:  `${siteBase}/clients?payment=success&slug=${encodeURIComponent(slug)}`,
    // Embed slug in metadata → webhook reads it to send the intake link
    metadata: { slug, product },
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
