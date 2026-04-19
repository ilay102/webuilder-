/**
 * POST /api/ls/create-checkout
 *
 * Creates a Lemon Squeezy checkout session for a client and returns the
 * hosted checkout URL. The client slug is embedded as custom_data so the
 * webhook can identify the client on payment.
 *
 * Body: { slug: string, email?: string, name?: string }
 *
 * Env vars required:
 *   LEMON_SQUEEZY_API_KEY       — your LS API key
 *   LEMON_SQUEEZY_STORE_ID      — numeric store ID
 *   LEMON_SQUEEZY_VARIANT_ID    — numeric variant ID to purchase
 */

import { NextRequest, NextResponse } from 'next/server'

const LS_API = 'https://api.lemonsqueezy.com/v1'

export async function POST(req: NextRequest) {
  const { slug, email, name } = await req.json().catch(() => ({}))

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  const apiKey    = process.env.LEMON_SQUEEZY_API_KEY    || ''
  const storeId   = process.env.LEMON_SQUEEZY_STORE_ID   || ''
  const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID || ''

  if (!apiKey || !storeId || !variantId) {
    console.error('[ls/create-checkout] Missing env vars: LEMON_SQUEEZY_API_KEY / STORE_ID / VARIANT_ID')
    return NextResponse.json(
      { error: 'Lemon Squeezy is not configured — set LEMON_SQUEEZY_API_KEY, STORE_ID, VARIANT_ID in Vercel env vars.' },
      { status: 500 },
    )
  }

  const siteBase = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://webuilder-liart.vercel.app'

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        custom_data: { slug },
        product_options: {
          redirect_url: `${siteBase}/clients?payment=success&slug=${slug}`,
          receipt_link_url: `${siteBase}/clients?payment=success&slug=${slug}`,
          receipt_thank_you_note: `תודה! האתר של ${name || slug} יהיה מוכן תוך זמן קצר. 🎉`,
          enabled_variants: [Number(variantId)],
        },
        checkout_options: {
          button_color: '#7c3aed',
          logo: false,
        },
        // Pre-fill buyer info if available
        checkout_data: {
          ...(email ? { email }   : {}),
          ...(name  ? { name }    : {}),
          custom: { slug },
        },
        expires_at: null, // no expiry
      },
      relationships: {
        store:   { data: { type: 'stores',   id: String(storeId) } },
        variant: { data: { type: 'variants', id: String(variantId) } },
      },
    },
  }

  try {
    const res = await fetch(`${LS_API}/checkouts`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/vnd.api+json',
        Accept:         'application/vnd.api+json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[ls/create-checkout] LS API error:', JSON.stringify(data))
      const msg = data?.errors?.[0]?.detail || `LS API ${res.status}`
      return NextResponse.json({ error: msg }, { status: res.status })
    }

    const url: string = data?.data?.attributes?.url
    if (!url) {
      return NextResponse.json({ error: 'No checkout URL in response' }, { status: 500 })
    }

    console.log(`[ls/create-checkout] Created checkout for ${slug}: ${url}`)
    return NextResponse.json({ ok: true, url })

  } catch (err: any) {
    console.error('[ls/create-checkout] Fetch error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
