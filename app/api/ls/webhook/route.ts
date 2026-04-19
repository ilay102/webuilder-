/**
 * POST /api/ls/webhook
 *
 * Lemon Squeezy webhook handler.
 * Listens for order_created (one-time) and subscription_payment_success (future).
 * On payment confirmed → lock pool assets + mark client as paid.
 *
 * Env vars required:
 *   LEMON_SQUEEZY_WEBHOOK_SECRET   — signing secret from LS dashboard
 *   NEXT_PUBLIC_API_URL            — VPS API base (default: http://204.168.207.116:3000)
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const VPS_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000'

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const digest = createHmac('sha256', secret).update(rawBody).digest('hex')
    return timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

// ── Lock client on VPS ────────────────────────────────────────────────────────

async function lockClient(slug: string) {
  const lockRes = await fetch(`${VPS_BASE}/api/clients/${slug}/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!lockRes.ok) {
    const err = await lockRes.text()
    throw new Error(`Lock failed for ${slug}: ${err}`)
  }
  return lockRes.json()
}

async function markClientPaid(slug: string, meta: Record<string, unknown> = {}) {
  await fetch(`${VPS_BASE}/api/clients/${slug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'paid', paidAt: new Date().toISOString(), ...meta }),
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature') || ''
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || ''

  // Reject if secret is configured but signature is missing/wrong
  if (secret) {
    if (!signature) {
      console.warn('[ls/webhook] Missing X-Signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }
    if (!verifySignature(rawBody, signature, secret)) {
      console.warn('[ls/webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventName: string = payload?.meta?.event_name || ''
  const customData: Record<string, string> = payload?.meta?.custom_data || {}
  const slug = customData?.slug || customData?.client_slug || ''

  console.log(`[ls/webhook] Event: ${eventName} | slug: ${slug || '(none)'}`)

  // ── Events we care about ──────────────────────────────────────────────────
  const isPaidEvent =
    eventName === 'order_created' ||
    eventName === 'subscription_payment_success' ||
    eventName === 'subscription_created'

  if (!isPaidEvent) {
    // Acknowledge silently — we don't need to act on other events
    return NextResponse.json({ ok: true, skipped: eventName })
  }

  // Verify status is actually paid (guard against refunded / pending)
  const orderStatus: string = payload?.data?.attributes?.status || ''
  if (orderStatus && orderStatus !== 'paid') {
    console.log(`[ls/webhook] Order status is "${orderStatus}" — skipping lock`)
    return NextResponse.json({ ok: true, skipped: `status=${orderStatus}` })
  }

  if (!slug) {
    console.error('[ls/webhook] No slug in custom_data — cannot lock client')
    // Still return 200 so LS doesn't retry endlessly
    return NextResponse.json({ ok: false, error: 'No slug in custom_data' })
  }

  try {
    const lockResult = await lockClient(slug)
    await markClientPaid(slug, {
      lsOrderId:   payload?.data?.id,
      lsEventName: eventName,
      lsTotal:     payload?.data?.attributes?.total,
      lsCurrency:  payload?.data?.attributes?.currency,
    })

    console.log(`[ls/webhook] ✓ Locked + marked paid: ${slug}`, lockResult)
    return NextResponse.json({ ok: true, slug, lockResult })
  } catch (err: any) {
    console.error(`[ls/webhook] Error locking ${slug}:`, err.message)
    // Return 500 so LS retries (it has retry logic)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
