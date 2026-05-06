/**
 * POST /api/polar/webhook
 *
 * Polar.sh webhook handler (Standard Webhooks spec).
 *
 * On successful payment (order.created):
 *   1. Verify signature using POLAR_WEBHOOK_SECRET.
 *   2. Extract slug from order metadata.
 *   3. Lock the client's pool assets (images + text pack → never recycled).
 *   4. Mark client as paid on VPS.
 *   5. Send intake link to the client via WhatsApp so they can personalize
 *      their site now that payment is confirmed.
 *
 * Env vars:
 *   POLAR_WEBHOOK_SECRET     — signing secret from Polar dashboard
 *   NEXT_PUBLIC_API_URL      — VPS API base (http://204.168.207.116:3000)
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse }    from 'next/server'

const VPS_BASE    = process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000'
// JJ (the WhatsApp closer bot) runs on its own port on the same VPS — see simple-jj/server.js
const JJ_BASE     = process.env.JJ_BASE || 'http://204.168.207.116:3002'
const SITE_BASE   = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'https://webuilder-liart.vercel.app'

// ── Standard Webhooks signature verification ──────────────────────────────────
// Spec: https://www.standardwebhooks.com/
// Polar header: webhook-signature = "v1,<base64-hmac-sha256>"
// Signed content: "{webhook-id}.{webhook-timestamp}.{rawBody}"

function verifyPolarSignature(
  rawBody:   string,
  headers:   Headers,
  secret:    string,
): boolean {
  try {
    const msgId        = headers.get('webhook-id')        || ''
    const msgTimestamp = headers.get('webhook-timestamp') || ''
    const sigHeader    = headers.get('webhook-signature') || ''

    if (!msgId || !msgTimestamp || !sigHeader) return false

    // Reject timestamps older than 5 minutes (replay attack protection)
    const ts = Number(msgTimestamp)
    if (Math.abs(Date.now() / 1000 - ts) > 300) {
      console.warn('[polar/webhook] Timestamp too old — possible replay attack')
      return false
    }

    const toSign = `${msgId}.${msgTimestamp}.${rawBody}`
    const digest = createHmac('sha256', secret).update(toSign).digest('base64')

    // sigHeader may contain multiple signatures: "v1,sig1 v1,sig2"
    const sigs = sigHeader.split(' ').map(s => s.replace(/^v1,/, ''))
    return sigs.some(sig => {
      try {
        return timingSafeEqual(Buffer.from(digest, 'base64'), Buffer.from(sig, 'base64'))
      } catch { return false }
    })
  } catch { return false }
}

// ── VPS helpers ───────────────────────────────────────────────────────────────

async function lockClient(slug: string) {
  const res = await fetch(`${VPS_BASE}/api/clients/${slug}/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Lock failed for ${slug}: ${await res.text()}`)
  return res.json()
}

async function markClientPaid(slug: string, meta: Record<string, unknown> = {}) {
  await fetch(`${VPS_BASE}/api/clients/${slug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'paid', paidAt: new Date().toISOString(), ...meta }),
  })
}

// ── WhatsApp intake link sender ───────────────────────────────────────────────
// Sends a WhatsApp message to the client with their intake form link.
// Uses the JJ/Baileys server running on the VPS.

// Drop a [PAID] system event into JJ's conversation history so the next
// model turn knows the payment was already processed and does NOT try to
// re-send the intake link. JJ's [PAID] PROTOCOL in soul.md handles this tag.
async function notifyJJPaid(slug: string, whatsapp: string) {
  if (!whatsapp) return
  const phone = whatsapp.replace(/\D/g, '').replace(/^0/, '972')
  try {
    await fetch(`${JJ_BASE}/system-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, event: `[PAID] ${slug}` }),
    })
  } catch (e: any) {
    console.warn(`[polar/webhook] JJ notify failed: ${e.message}`)
  }
}

async function sendIntakeWhatsapp(slug: string, whatsapp: string) {
  if (!whatsapp) {
    console.warn(`[polar/webhook] No whatsapp number for ${slug} — skipping intake WA`)
    return
  }

  // Normalise to 972xxxxxxxxx format
  const number = whatsapp.replace(/\D/g, '').replace(/^0/, '972')
  const intakeUrl = `${SITE_BASE}/intake/${slug}`
  const message = [
    `✅ *תשלום התקבל — תודה רבה!*`,
    ``,
    `עכשיו ממלאים פרטים ואתר שלך עולה לאוויר תוך 60 שניות 🚀`,
    ``,
    `👇 לחץ כאן להשלמת הפרטים:`,
    intakeUrl,
  ].join('\n')

  // Send via JJ's /send-message proxy (port 3002). The previous /api/whatsapp/send
  // on port 3000 doesn't exist — JJ already owns the Baileys connection and exposes
  // a thin proxy for inbound senders like this webhook.
  try {
    const res = await fetch(`${JJ_BASE}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: number, message }),
    })
    if (!res.ok) {
      console.warn(`[polar/webhook] WA send returned ${res.status}`)
    } else {
      console.log(`[polar/webhook] ✓ Intake WA sent to ${number} for ${slug}`)
    }
  } catch (e: any) {
    console.warn(`[polar/webhook] WA send error: ${e.message}`)
  }
}

// ── Webhook handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const secret  = process.env.POLAR_WEBHOOK_SECRET || ''

  // Verify signature when secret is configured (always in production)
  if (secret) {
    if (!verifyPolarSignature(rawBody, req.headers, secret)) {
      console.warn('[polar/webhook] Signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else {
    console.warn('[polar/webhook] POLAR_WEBHOOK_SECRET not set — skipping verification (dev only)')
  }

  let payload: any
  try { payload = JSON.parse(rawBody) }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const eventType: string = payload?.type || ''
  const data:      any    = payload?.data || {}
  const metadata: Record<string, string> = data?.metadata || {}
  const slug = metadata?.slug || ''

  console.log(`[polar/webhook] Event: ${eventType} | slug: ${slug || '(none)'}`)

  // ── Only handle confirmed payment events ─────────────────────────────────
  const isPaidEvent = eventType === 'order.created' || eventType === 'checkout.order_created'
  if (!isPaidEvent) {
    return NextResponse.json({ ok: true, skipped: eventType })
  }

  // Guard against refunded / pending orders
  const orderStatus: string = data?.status || data?.billing_reason || ''
  if (orderStatus && !['paid', 'complete', 'succeeded', ''].includes(orderStatus)) {
    console.log(`[polar/webhook] Order status="${orderStatus}" — skipping`)
    return NextResponse.json({ ok: true, skipped: `status=${orderStatus}` })
  }

  if (!slug) {
    console.error('[polar/webhook] No slug in metadata — cannot identify client')
    return NextResponse.json({ ok: false, error: 'No slug in metadata' })
  }

  try {
    // 1. Lock pool assets
    const lockResult = await lockClient(slug)

    // 2. Mark paid on VPS
    await markClientPaid(slug, {
      polarOrderId: data?.id,
      polarEvent:   eventType,
      polarAmount:  data?.amount,
      polarProduct: metadata?.product,
    })

    // 3. Fetch client record to get their WhatsApp number
    const clientRes = await fetch(`${VPS_BASE}/api/clients/${slug}`)
    const client    = clientRes.ok ? await clientRes.json() : null
    const whatsapp  = client?.whatsapp || client?.siteContent?.biz?.alertWhatsapp || ''

    // 4. Send intake link via WhatsApp (server is the source of truth for this — NOT JJ)
    await sendIntakeWhatsapp(slug, whatsapp)

    // 5. Notify JJ so the model marks funnelStage=paid and stops trying to send the intake itself
    await notifyJJPaid(slug, whatsapp)

    console.log(`[polar/webhook] ✅ Locked + paid + WA sent + JJ notified: ${slug}`)
    return NextResponse.json({ ok: true, slug, lockResult })

  } catch (err: any) {
    console.error(`[polar/webhook] Error processing ${slug}:`, err.message)
    // Return 500 → Polar will retry (it has exponential backoff)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
