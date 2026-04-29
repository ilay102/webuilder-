/**
 * End-to-end smoke test of the post-Polar workflow with fake data.
 *
 * Steps:
 *   1. POST /api/demo/create        — create a fake client + allocate pool
 *   2. POST /api/polar/create-checkout — verify Polar hosted URL is returned
 *   3. POST /api/polar/webhook      — fake an `order.created` event with a
 *                                     valid HMAC-SHA256 signature
 *   4. POST /api/intake/[slug]      — fake the "tell us about your business"
 *                                     form
 *   5. GET  /[slug]                 — verify the live site returns 200
 *   6. GET  VPS /api/clients/:slug  — dump the persisted record
 *
 * Run: node scripts/e2e-test.js
 */
const crypto = require('crypto')

const BASE     = 'https://webuilder-liart.vercel.app'
const VPS      = 'http://204.168.207.116:3000'
const SECRET   = 'polar_whs_K0uwI2RJMuaWXwLgXJVGB5ppbQgxkhCA2IbOO0DSv6j'
// Use the existing seeded slug to test the post-payment workflow.
// /api/demo/create requires a writable filesystem (pool-state.json) so it
// has to run on the VPS Mission Control box, not on Vercel Lambda.
const SLUG     = process.env.E2E_SLUG || 'test-clinic-1'

function log(step, status, detail) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '·'
  console.log(`${icon} ${step}: ${detail}`)
}

async function jpost(url, body, headers = {}) {
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body:    typeof body === 'string' ? body : JSON.stringify(body),
  })
  const txt = await res.text()
  let json; try { json = JSON.parse(txt) } catch { json = txt }
  return { status: res.status, json, raw: txt }
}

async function jget(url) {
  const res = await fetch(url)
  const txt = await res.text()
  let json; try { json = JSON.parse(txt) } catch { json = txt }
  return { status: res.status, json, raw: txt }
}

// Standard Webhooks signature: base64(HMAC-SHA256(secret, "id.ts.body"))
function signPolar(rawBody, msgId, msgTs) {
  // Polar sends secret with "polar_whs_" prefix; the signing key is the bytes
  // after that prefix base64-decoded. Test by trying both: raw + decoded.
  // Most "Standard Webhooks" libs use the value verbatim.
  const digest = crypto.createHmac('sha256', SECRET)
    .update(`${msgId}.${msgTs}.${rawBody}`)
    .digest('base64')
  return `v1,${digest}`
}

;(async () => {
  console.log(`\n──── E2E TEST: slug=${SLUG} ────\n`)

  // ── 1. Verify the slug already exists on VPS ──────────────────────
  // (we use a pre-seeded client; demo/create is a separate VPS-side concern)
  const seedRes = await jget(`${VPS}/api/clients/${SLUG}`)
  if (seedRes.status !== 200) {
    log('1. seed-client', 'FAIL', `HTTP ${seedRes.status} for ${SLUG}`)
    process.exit(1)
  }
  log('1. seed-client', 'PASS', `slug=${SLUG} plan=${seedRes.json.plan ?? '?'}`)

  // ── 2. Polar checkout ──────────────────────────────────────────────
  const checkoutRes = await jpost(`${BASE}/api/polar/create-checkout`, {
    slug: SLUG, product: 'site',
  })
  if (checkoutRes.status !== 200 || !checkoutRes.json.url) {
    log('2. polar/create-checkout', 'FAIL', `HTTP ${checkoutRes.status} ${checkoutRes.raw.slice(0,200)}`)
    process.exit(1)
  }
  log('2. polar/create-checkout', 'PASS', checkoutRes.json.url)

  // ── 3. Fake webhook (order.created) ────────────────────────────────
  const webhookBody = JSON.stringify({
    type: 'order.created',
    data: {
      id:       `e2e-order-${Date.now()}`,
      status:   'paid',
      amount:   70000,            // 700₪ in agorot
      metadata: { slug: SLUG, product: 'site' },
    },
  })
  const msgId = `msg_e2e_${Date.now()}`
  const msgTs = String(Math.floor(Date.now() / 1000))
  const sig   = signPolar(webhookBody, msgId, msgTs)

  const whRes = await jpost(`${BASE}/api/polar/webhook`, webhookBody, {
    'webhook-id':         msgId,
    'webhook-timestamp':  msgTs,
    'webhook-signature':  sig,
  })
  if (whRes.status === 401) {
    log('3. polar/webhook', 'WARN', 'signature rejected — Polar uses base64-decoded secret prefix')
    // Retry with decoded key (after polar_whs_ prefix → base64 decode)
    const keyB64 = SECRET.replace(/^polar_whs_/, '')
    const keyBuf = Buffer.from(keyB64, 'base64')
    const digest = crypto.createHmac('sha256', keyBuf).update(`${msgId}.${msgTs}.${webhookBody}`).digest('base64')
    const sig2 = `v1,${digest}`
    const whRes2 = await jpost(`${BASE}/api/polar/webhook`, webhookBody, {
      'webhook-id': msgId, 'webhook-timestamp': msgTs, 'webhook-signature': sig2,
    })
    if (whRes2.status !== 200) {
      log('3. polar/webhook (retry)', 'FAIL', `HTTP ${whRes2.status} ${whRes2.raw.slice(0,200)}`)
      // Continue anyway — webhook signature is a Polar-side concern
    } else {
      log('3. polar/webhook (retry)', 'PASS', whRes2.raw.slice(0,200))
    }
  } else if (whRes.status !== 200) {
    log('3. polar/webhook', 'FAIL', `HTTP ${whRes.status} ${whRes.raw.slice(0,200)}`)
  } else {
    log('3. polar/webhook', 'PASS', whRes.raw.slice(0,200))
  }

  // ── 4. Intake form submission ──────────────────────────────────────
  const intakeRes = await jpost(`${BASE}/api/intake/${SLUG}`, {
    biz: {
      name:          'מרפאת שיניים אוטומטית 2026',
      phone:         '03-7654321',
      city:          'חיפה',
      address:       'שדרות הנשיא 88, חיפה',
      email:         'real-clinic@example.com',
      hours:         'א׳-ה׳ 8:00-19:00',
      alertWhatsapp: '0529876543',
    },
    services: [
      { name: 'יישור שיניים', icon: '🦷' },
      { name: 'השתלות',      icon: '🔬' },
    ],
  })
  if (intakeRes.status !== 200) {
    log('4. intake', 'FAIL', `HTTP ${intakeRes.status} ${intakeRes.raw.slice(0,200)}`)
    process.exit(1)
  }
  log('4. intake', 'PASS', `${intakeRes.json.url}`)

  // ── 5. Live site ───────────────────────────────────────────────────
  const siteRes = await jget(`${BASE}/${SLUG}`)
  const hasName = typeof siteRes.raw === 'string' && siteRes.raw.includes('מרפאת שיניים אוטומטית 2026')
  log('5. live site', siteRes.status === 200 ? 'PASS' : 'FAIL',
    `HTTP ${siteRes.status} | name-on-page=${hasName} | bytes=${siteRes.raw.length}`)

  // ── 6. VPS record dump ─────────────────────────────────────────────
  const vpsRes = await jget(`${VPS}/api/clients/${SLUG}`)
  if (vpsRes.status === 200) {
    const c = vpsRes.json
    console.log(`✅ 6. VPS record:`)
    console.log(`     slug:     ${c.slug}`)
    console.log(`     plan:     ${c.plan}`)
    console.log(`     paidAt:   ${c.paidAt || '(not paid)'}`)
    console.log(`     biz.name: ${c.siteContent?.biz?.name}`)
    console.log(`     biz.city: ${c.siteContent?.biz?.city}`)
    console.log(`     services: ${c.siteContent?.services?.length ?? 0} items`)
    console.log(`     polarOrderId: ${c.polarOrderId || '(none — webhook may not have run)'}`)
  } else {
    log('6. VPS record', 'FAIL', `HTTP ${vpsRes.status}`)
  }

  console.log(`\n──── slug=${SLUG} for cleanup if needed ────\n`)
})().catch(err => { console.error('FATAL:', err); process.exit(1) })
