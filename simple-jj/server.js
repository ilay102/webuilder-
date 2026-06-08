/**
 * Simple JJ v4 — full tag pipeline (BUILD / CHECKOUT / MEETING / PAID / ESCALATE / INTAKE_DONE)
 * Based on v3 (retry logic, Hebrew slugs, Baileys on 3003) + new dispatcher layer.
 */

const express = require('express');
const https   = require('https');
const http    = require('http');
const fs      = require('fs');
const path    = require('path');

const app = express();
app.use(express.json());

// ─── Config ───────────────────────────────────────────────────────
const PORT          = 3002;
const SOUL_PATH     = '/root/simple-jj/soul.md';
const HISTORY_DIR   = '/root/simple-jj/history';
const LEADS_PATH    = '/root/.openclaw/workspace/leads.json';
const QUEUE_PATH    = '/root/.openclaw/workspace/demo_queue.json';
const MEETINGS_PATH = '/root/.openclaw/workspace/meetings.json';
const PILOT_PATH    = '/root/.openclaw/workspace/pilot-results.json';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('[FATAL] GEMINI_API_KEY env var not set. Run: pm2 set simple-jj:GEMINI_API_KEY <key> && pm2 restart simple-jj --update-env');
  process.exit(1);
}
const GEMINI_MODEL  = 'gemini-2.5-flash';

// Next.js / Vercel — used by CHECKOUT dispatcher to create Polar links
const SITE_BASE = process.env.SITE_BASE || 'https://webuilder-liart.vercel.app';

// Owner WhatsApp — receives [ESCALATE] pings (972XXXXXXXXX, no +)
const OWNER_WHATSAPP = process.env.OWNER_WHATSAPP || '972534638880';

if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });

// ─── Humanizer: natural reply delay ───────────────────────────────
// Real people don't reply instantly. Delay outgoing messages so JJ feels human.
// Components: 1.5s "reading" pause + ~35ms typing per character + 0-2s jitter.
// Clamped to [2s, 15s] so short replies don't feel instant and long pricing
// breakdowns feel like real typing time (not always capped at the same value).
function naturalDelayMs(text) {
  const len = (text || '').length;
  const base = 1500 + len * 35 + Math.random() * 2000;
  return Math.min(15000, Math.max(2000, Math.round(base)));
}

// ─── Send WhatsApp via Baileys (local, port 3003) ─────────────────
function sendWhatsApp(phone, message) {
  return new Promise((resolve) => {
    const cleanPhone = String(phone).replace(/\D/g, '');
    const body = JSON.stringify({ phone: cleanPhone, message });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3003,
      path: '/send',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          if (r.ok) { console.log('[SENT]  +' + cleanPhone + ':', message.substring(0, 80)); resolve(true); }
          else       { console.error('[SEND ERR]', r.error); resolve(false); }
        } catch { resolve(false); }
      });
    });
    req.on('error', (e) => { console.error('[SEND ERR] Baileys unreachable:', e.message); resolve(false); });
    req.write(body);
    req.end();
  });
}

// ─── Phone normalization ─────────────────────────────────────────
// Scout writes Israeli domestic format ("03-523-2414"). Baileys delivers
// international ("97235232414"). Normalize both to the international
// "972XXXXXXXXX" canonical form before comparing.
//
//   "03-523-2414"  → "97235232414"   (drop leading 0, prepend 972)
//   "+972-50-1234567" → "972501234567"
//   "97235232414"  → "97235232414"   (already canonical)
function canonPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('972')) return d;
  if (d.startsWith('0'))   return '972' + d.slice(1);   // domestic 0XX → 972XX
  return d;
}

// ─── Lead filtering ───────────────────────────────────────────────
function isLead(phone) {
  try {
    const leads = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf-8'));
    const cp = canonPhone(phone);
    return leads.some(l => canonPhone(l.phone) === cp);
  } catch { return false; }
}

// ─── Auto-reply detection ─────────────────────────────────────────
const BOT_PATTERNS = [
  'כרטיס ביקור דיגיטלי','שעות הפעילות','אם אין מענה כאן',
  'הודעה אוטומטית','auto reply','automatic reply','out of office',
  'אני כרגע לא זמין','נשוב אליך בהקדם','תגובה אוטומטית',
  'הצוות שלנו יחזור','להסרה מהרשימה','להסרה מרשימת התפוצה',
  // Common WhatsApp Business greeting templates — almost every clinic in
  // Israel uses one of these. Treat as auto-reply and stay silent until
  // the human actually engages.
  'תודה שיצרת קשר','תודה על פנייתך','איך אפשר לעזור',
  'נחזור אליך בהקדם','קיבלנו את הודעתך','פנייתך התקבלה',
  'נחזור אליכם בהקדם','איש צוות יחזור','נציג יחזור אליך',
  'הודעתך נשלחה בהצלחה','קיבלתי את הודעתך',
];
function isAutoReply(message) {
  const lower = message.toLowerCase();
  for (const p of BOT_PATTERNS) if (lower.includes(p.toLowerCase())) return true;
  if ((message.match(/\d{9,}/g) || []).length >= 3) return true;
  return false;
}

// ─── Dedup ────────────────────────────────────────────────────────
const seenMessages = new Map();
function isDuplicate(phone, message) {
  const key = phone + ':' + message.trim();
  const last = seenMessages.get(key);
  if (last && Date.now() - last < 120000) return true;
  seenMessages.set(key, Date.now());
  return false;
}

// ─── History ──────────────────────────────────────────────────────
function historyPath(phone) { return path.join(HISTORY_DIR, phone + '.json'); }
function getHistory(phone) {
  try { return JSON.parse(fs.readFileSync(historyPath(phone), 'utf-8')); }
  catch { return []; }
}
function saveHistory(phone, userMsg, aiMsg) {
  let h = getHistory(phone);
  h.push({ role: 'user',  parts: [{ text: userMsg }] });
  h.push({ role: 'model', parts: [{ text: aiMsg }] });
  if (h.length > 40) h = h.slice(-40);
  fs.writeFileSync(historyPath(phone), JSON.stringify(h, null, 2));
}
function appendToHistory(phone, role, text) {
  let h = getHistory(phone);
  h.push({ role, parts: [{ text }] });
  if (h.length > 40) h = h.slice(-40);
  fs.writeFileSync(historyPath(phone), JSON.stringify(h, null, 2));
}

// ─── Funnel state machine ─────────────────────────────────────────
const FUNNEL_STAGES = [
  'cold','contacted','demo-queued','demo-sent','demo-feedback',
  'meeting-booked','checkout-sent','paid','intake-completed','live','closed-lost',
];
function stageRank(s) { return FUNNEL_STAGES.indexOf(s ?? 'cold'); }

function setFunnelStage(phone, stage, extra = {}) {
  try {
    const leads = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf-8'));
    const cp  = canonPhone(phone);
    const idx = leads.findIndex(l => canonPhone(l.phone) === cp);
    if (idx === -1) return;
    const current = leads[idx].funnelStage || 'contacted';
    if (stage !== 'closed-lost' && stageRank(stage) <= stageRank(current)) return;
    leads[idx].funnelStage   = stage;
    leads[idx].funnelStageAt = new Date().toISOString();
    Object.assign(leads[idx], extra);
    fs.writeFileSync(LEADS_PATH, JSON.stringify(leads, null, 2));
    console.log('[FUNNEL] +' + phone + ' ' + current + ' → ' + stage);
  } catch (e) { console.error('[FUNNEL] error:', e.message); }
}

// ─── Lead helpers ─────────────────────────────────────────────────
function findLead(phone) {
  try {
    const leads = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf-8'));
    const cp = canonPhone(phone);
    return leads.find(l => canonPhone(l.phone) === cp) || null;
  } catch { return null; }
}

const HEBREW_MAP = {
  'מרפאת':'marpaat','מרפאה':'marpaa','שיניים':'shinayim','רופא':'rofe',
  'דוקטור':'doctor','עו"ד':'orekh-din','עורך':'orekh','דין':'din',
  'רואה':'roe','חשבון':'heshbon','מכון':'machon','מרכז':'merkaz',
  'קליניקה':'clinica','בית':'beit','ספר':'sefer','מספרה':'mispara',
  'מוסך':'mosach','פתח':'petach','תקווה':'tikva','רמת':'ramat','גן':'gan',
  'ראשון':'rishon','לציון':'lezion','חיפה':'haifa','ירושלים':'jerusalem',
  'תל':'tel','אביב':'aviv','אילת':'eilat','אשדוד':'ashdod','באר':'beer','שבע':'sheva'
};

const TRANSLIT = {
  'א':'a','ב':'b','ג':'g','ד':'d','ה':'h','ו':'v','ז':'z','ח':'ch','ט':'t','י':'i','כ':'k','ך':'ch','ל':'l','מ':'m','ם':'m','נ':'n','ן':'n','ס':'s','ע':'a','פ':'p','ף':'p','צ':'tz','ץ':'tz','ק':'k','ר':'r','ש':'sh','ת':'t'
};

function makeSlug(lead) {
  let base = (lead.company || 'site').trim().toLowerCase();
  for (const [heb, eng] of Object.entries(HEBREW_MAP)) {
    base = base.replace(new RegExp(heb, 'g'), eng);
  }
  // Transliterate remaining Hebrew characters to English phonetics
  base = base.split('').map(char => TRANSLIT[char] || char).join('');
  base = base.replace(/\s+/g, '-');
  let slug = base.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!slug || slug.length < 2) slug = 'lead-' + Date.now().toString().slice(-6);
  return slug + '-demo';
}

// ─── Industry → template mapping ──────────────────────────────────
// Scout writes lead.industry as the Hebrew query it used. Carti/new-demo.ts
// expect a short English template id matching the folder name under app/
// and public/pool/.
//
// Important: barber (men's) vs salon (women's) are intentionally separate
// templates with distinct photo pools and gendered copy. Use the most
// specific Hebrew term in the Scout query to land on the right one
// ("מספרת גברים" / "ברבר" → barber; "סלון יופי" / "מספרה לנשים" → salon).
// Generic "מספרה" defaults to barber.
function templateForIndustry(industry, companyName = '') {
  const s = String(industry || '').toLowerCase();
  const c = String(companyName || '').toLowerCase();
  
  // 1. Dental
  if (s.includes('רופא שיניים') || s.includes('מרפאת שיניים') || s.includes('dental') ||
      c.includes('רופא שיניים') || c.includes('מרפאת שיניים') || c.includes('dental')) {
    return 'dental';
  }
  
  // 2. Garage
  if (s.includes('מוסך') || s.includes('garage') || s.includes('פחחות') ||
      c.includes('מוסך') || c.includes('garage') || c.includes('פחחות')) {
    return 'garage';
  }
  
  // 3. Beauty / Cosmetics / Nails (must check before hair to avoid misclassifying cosmetics salons as hair salons)
  const beautyKeywords = [
    'קוסמטיקה', 'קוסמטיקאית', 'לק ג\'ל', 'מניקור', 'פדיקור', 'איפור', 'גבות', 'טיפולי פנים', 'מכון יופי',
    'cosmetics', 'beauty', 'nails', 'nail', 'skincare', 'clinic'
  ];
  if (beautyKeywords.some(k => s.includes(k) || c.includes(k))) {
    return 'beauty';
  }
  
  // 4. Barber (men's)
  if (s.includes('ברבר') || s.includes('מספרת גברים') || s.includes('מספרה לגברים') || s.includes('barber') ||
      c.includes('ברבר') || c.includes('מספרת גברים') || c.includes('מספרה לגברים') || c.includes('barber')) {
    return 'barber';
  }
  
  // 5. Salon (women's hair)
  if (s.includes('סלון שיער') || s.includes('מספרה לנשים') || s.includes('מעצב שיער') || s.includes('מעצבת שיער') || s.includes('צבעי שיער') || s.includes('hair salon') ||
      c.includes('סלון שיער') || c.includes('מספרה לנשים') || c.includes('מעצב שיער') || c.includes('מעצבת שיער') || c.includes('צבעי שיער') || c.includes('hair salon')) {
    return 'salon';
  }
  
  // If it's a generic "מספרה" (hair salon / barbershop)
  if (s.includes('מספרה') || s.includes('ספרות') || c.includes('מספרה') || c.includes('ספרות')) {
    return 'barber';
  }
  
  // If it's a generic "סלון יופי", default to beauty (cosmetics)
  if (s.includes('סלון יופי') || c.includes('סלון יופי') || s.includes('salon') || c.includes('salon')) {
    return 'beauty';
  }
  
  return 'dental'; // fallback
}

// ─── Tag dispatchers ──────────────────────────────────────────────

async function dispatchBuild(phone) {
  const lead = findLead(phone);
  if (!lead) { console.log('[BUILD] Lead not found for', phone); return { ok: false }; }

  let queue = [];
  try { queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8')); } catch {}

  const cp = canonPhone(phone);
  const already = queue.find(e =>
    canonPhone(e.leadPhone) === cp &&
    (e.status === 'pending' || e.status === 'pending_send' || e.status === 'building' || e.status === 'done')
  );
  if (already) {
    if (already.status === 'done' && already.demoUrl) {
      console.log('[BUILD] Already done for', cp, '— resending link');
      const msg = 'הנה הלינק לאתר שלכם: ' + already.demoUrl;
      setTimeout(() => sendWhatsApp(cp, msg), 5000);
      appendToHistory(cp, 'model', msg);
    } else {
      console.log('[BUILD] Already pending/building for', cp, '— skipping');
    }
    return { ok: true };
  }

  const hasPreBuilt = !!lead.demo_url;
  const route = hasPreBuilt ? lead.demo_url.split('/').pop() : makeSlug(lead);
  const template = templateForIndustry(lead.industry || lead.type, lead.company);
  const status = hasPreBuilt ? 'pending_send' : 'pending';
  const demoUrl = hasPreBuilt ? lead.demo_url : undefined;

  console.log('[BUILD] +' + phone + ' lead.industry="' + (lead.industry || '?') + '" → template=' + template + ', prebuilt=' + hasPreBuilt);
  queue.push({
    id: 'jj-' + Date.now(), status, template, route, demoUrl,
    businessName: lead.company, city: lead.city, phone: lead.phone,
    hours: 'Sun-Thu 9:00-18:00', calLink: 'ilay-lankin/15min',
    clientEmail: 'ilay1bgu@gmail.com', clientWhatsapp: '972534638880',
    leadPhone: lead.phone, leadName: lead.owner_name || lead.company,
    requestedAt: new Date().toISOString(),
  });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
  setFunnelStage(phone, 'demo-queued');
  console.log('[BUILD] Queued demo for', lead.company, '→ route:', route + ', status: ' + status);
  return { ok: true };
}

async function dispatchCheckout(phone, product = 'site') {
  const lead = findLead(phone);
  if (!lead) return { ok: false, reason: 'lead_not_found' };
  const slug = makeSlug(lead);
  try {
    const res = await fetch(SITE_BASE + '/api/polar/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug, product,
        name:  lead.owner_name || lead.company,
        email: lead.email || 'ilay1bgu@gmail.com',
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.url) {
      console.error('[CHECKOUT] failed:', res.status, json);
      return { ok: false, reason: 'checkout_' + res.status };
    }
    setFunnelStage(phone, 'checkout-sent', { lastCheckoutUrl: json.url });
    console.log('[CHECKOUT] +' + phone + ' ' + product + ' → ' + json.url);
    return { ok: true, replacements: { '{{CHECKOUT_URL}}': json.url } };
  } catch (e) {
    console.error('[CHECKOUT] error:', e.message);
    return { ok: false, reason: e.message };
  }
}

function dispatchMeeting(phone) {
  const lead = findLead(phone);
  if (!lead) return { ok: false };
  try {
    let meetings = [];
    try { meetings = JSON.parse(fs.readFileSync(MEETINGS_PATH, 'utf-8')); } catch {}
    meetings.push({ phone, slug: makeSlug(lead), company: lead.company, requestedAt: new Date().toISOString() });
    fs.writeFileSync(MEETINGS_PATH, JSON.stringify(meetings, null, 2));
    setFunnelStage(phone, 'meeting-booked');
    console.log('[MEETING] +' + phone + ' ' + lead.company);
    // Owner ping — they may need to actually take the call
    const ownerMsg = [
      '📅 MEETING — לקוח ביקש שיחה',
      '',
      'עסק: ' + (lead.company || '?'),
      'איש קשר: ' + (lead.owner_name || '?'),
      'טלפון: +' + phone,
      'עיר: ' + (lead.city || '?'),
      '',
      'הלקוח קיבל את הלינק https://cal.com/ilay-lankin/15min',
    ].join('\n');
    sendWhatsApp(OWNER_WHATSAPP, ownerMsg);
    return { ok: true };
  } catch (e) { return { ok: false, reason: e.message }; }
}

function dispatchPaid(phone) {
  setFunnelStage(phone, 'paid', { paidAt: new Date().toISOString() });
  console.log('[PAID] +' + phone + ' → funnelStage=paid');
  return { ok: true };
}

async function dispatchEscalate(phone) {
  const lead = findLead(phone);
  const company = lead?.company || 'לקוח לא מזוהה';
  const recent = getHistory(phone).slice(-6).map(h => {
    const who = h.role === 'user' ? 'לקוח' : 'JJ';
    return who + ': ' + (h.parts?.[0]?.text || '').slice(0, 150);
  }).join('\n');
  const msg = [
    '⚠️ ESCALATION — JJ נתקע', '',
    'עסק: ' + company, 'טלפון: +' + phone, '',
    '6 הודעות אחרונות:', recent, '',
    'עבור לוואטסאפ של הלקוח כדי להמשיך ידנית.',
  ].join('\n');
  await sendWhatsApp(OWNER_WHATSAPP, msg);
  console.log('[ESCALATE] +' + phone + ' → owner notified');
  return { ok: true };
}

function dispatchIntakeDone(phone) {
  setFunnelStage(phone, 'intake-completed', { intakeCompletedAt: new Date().toISOString() });
  console.log('[INTAKE_DONE] +' + phone + ' → funnelStage=intake-completed');
  return { ok: true };
}

// ─── Pilot dispatchers (PILOT MODE — no money flowing yet) ────────
function loadPilot() {
  try { return JSON.parse(fs.readFileSync(PILOT_PATH, 'utf-8')); }
  catch { return []; }
}
function savePilot(data) {
  fs.writeFileSync(PILOT_PATH, JSON.stringify(data, null, 2));
}

function dispatchWaitlist(phone, tier) {
  const lead = findLead(phone) || {};
  const data = loadPilot();
  const cp = String(phone).replace(/\D/g, '');

  // Idempotent — skip if this phone already on the waitlist
  if (data.some(e => e.phone === cp && e.kind === 'waitlist')) {
    console.log('[WAITLIST] +' + cp + ' already on waitlist, skipping');
    return { ok: true };
  }

  data.push({
    kind:      'waitlist',
    phone:     cp,
    tier,
    company:   lead.company || null,
    ownerName: lead.owner_name || null,
    city:      lead.city || null,
    ts:        new Date().toISOString(),
  });
  savePilot(data);
  setFunnelStage(phone, 'checkout-sent', { waitlistTier: tier, waitlistAt: new Date().toISOString() });
  console.log('[WAITLIST] +' + cp + ' tier=' + tier + ' company=' + (lead.company || '?'));
  // Owner ping — highest-value pilot signal (real intent to buy)
  const tierLabel = tier === 'premium' ? 'פרימיום (1,600 + 140/חודש)' : 'בסיס (700 + 70/חודש)';
  const ownerMsg = [
    '🎯 WAITLIST — לקוח מעוניין לשלם!',
    '',
    'חבילה: ' + tierLabel,
    'עסק: ' + (lead.company || '?'),
    'איש קשר: ' + (lead.owner_name || '?'),
    'טלפון: +' + cp,
    'עיר: ' + (lead.city || '?'),
    '',
    'JJ אמר לו ששומר לו מקום ראשון בתור עד שהבטא תיפתח לתשלומים.',
  ].join('\n');
  sendWhatsApp(OWNER_WHATSAPP, ownerMsg);
  return { ok: true };
}

function dispatchStop(phone, cleanedBody) {
  const histText = getHistory(phone).map(h => h.parts?.[0]?.text || '').join('\n');
  // Engaged = demo URL sent OR price discussed (so the client has actually invested).
  const wasEngaged = /webuilder|vercel\.app|polar\.sh|1[,.]?600|700|פרימיום|בסיס|הקמה|חודשי/.test(histText);
  const hasBody = (cleanedBody || '').trim().length > 0;

  // GUARD: post-demo / post-pricing [STOP] with empty body = Gemini misfire.
  // We don't want to lose an engaged lead silently. Instead: keep the lead open,
  // force-send a "why?" probe so we capture price-feedback data, and let the next
  // turn handle the real close.
  if (wasEngaged && !hasBody) {
    const probe = 'מבין. רק עוזר לי להתפתח — מה הסיבה? המחיר, המוצר עצמו, או הזמן?';
    console.log('[STOP-BLOCKED] +' + phone + ' bare [STOP] in engaged stage — probing instead, lead kept open');
    // Lead is NOT closed-lost. Main handler will use replaceReply as both the
    // outgoing message and the model turn saved to history (instead of "[STOP]").
    return { ok: true, blocked: true, replaceReply: probe };
  }

  setFunnelStage(phone, 'closed-lost', { closedAt: new Date().toISOString() });
  console.log('[STOP] +' + phone + ' closed-lost (engaged=' + wasEngaged + ')');
  // Owner ping ONLY for engaged-stage stops — cold stops are noise.
  if (wasEngaged) {
    const lead = findLead(phone) || {};
    const recent = getHistory(phone).slice(-6).map(h => {
      const who = h.role === 'user' ? 'לקוח' : 'JJ';
      return who + ': ' + (h.parts?.[0]?.text || '').slice(0, 120);
    }).join('\n');
    const ownerMsg = [
      '🛑 STOP — לקוח שראה דמו סגר',
      '',
      'עסק: ' + (lead.company || '?'),
      'איש קשר: ' + (lead.owner_name || '?'),
      'טלפון: +' + phone,
      '',
      '6 הודעות אחרונות:',
      recent,
    ].join('\n');
    sendWhatsApp(OWNER_WHATSAPP, ownerMsg);
  }
  // Cold (never saw demo) and bare [STOP] → drop message body (silent close).
  return { ok: true, suppressMessage: !wasEngaged };
}

function dispatchPriceFeedback(phone, priceStr) {
  const lead = findLead(phone) || {};
  const data = loadPilot();
  const cp = String(phone).replace(/\D/g, '');

  // Parse "500+50" → setup=500 monthly=50
  let setup = null, monthly = null;
  const m = String(priceStr || '').match(/^(\d+)(?:\+(\d+))?/);
  if (m) {
    setup   = Number(m[1]);
    monthly = m[2] ? Number(m[2]) : null;
  }

  data.push({
    kind:      'price_feedback',
    phone:     cp,
    setup,
    monthly,
    raw:       priceStr,
    company:   lead.company || null,
    ownerName: lead.owner_name || null,
    city:      lead.city || null,
    ts:        new Date().toISOString(),
  });
  savePilot(data);
  console.log('[PRICE_FEEDBACK] +' + cp + ' setup=' + setup + ' monthly=' + monthly);
  return { ok: true };
}

// ─── Tag parser ───────────────────────────────────────────────────
const TAG_RE = /^\s*\[(BUILD|CHECKOUT(?::[a-zA-Z_]+)?|WAITLIST(?::[a-zA-Z_]+)?|PRICE_FEEDBACK(?::[0-9+]+)?|MEETING|PAID|ESCALATE|INTAKE_DONE|STOP)\]\s*$/gm;

function parseTags(reply) {
  const tags = [];
  for (const m of reply.matchAll(TAG_RE)) tags.push(m[1]);
  const cleaned = reply.replace(TAG_RE, '').replace(/^\n+/, '').trim();
  return { tags, cleaned };
}

async function runDispatchers(phone, tags, cleanedBody) {
  const replacements = {};
  for (const tag of tags) {
    let result;
    if      (tag === 'BUILD')            result = await dispatchBuild(phone);
    else if (tag.startsWith('CHECKOUT')) {
      // 2-tier launch. Accept: [CHECKOUT], [CHECKOUT:site|basic|premium|maintenance].
      // 'standard' folds into premium (Polar product 1,600).
      const raw = tag.includes(':') ? tag.split(':')[1].toLowerCase() : 'basic';
      const product = (raw === 'site' || raw === '')      ? 'basic'
                    : (raw === 'standard')                ? 'premium'
                    : ['basic','premium','maintenance'].includes(raw) ? raw
                    : 'basic';
      result = await dispatchCheckout(phone, product);
    }
    else if (tag.startsWith('WAITLIST')) {
      // PILOT MODE — captures high-intent leads who would have paid.
      const raw = tag.includes(':') ? tag.split(':')[1].toLowerCase() : 'basic';
      const tier = (raw === 'premium') ? 'premium' : 'basic';
      result = dispatchWaitlist(phone, tier);
    }
    else if (tag.startsWith('PRICE_FEEDBACK')) {
      // PILOT MODE — captures the price the lead would say yes at.
      const raw = tag.includes(':') ? tag.split(':')[1] : '';
      result = dispatchPriceFeedback(phone, raw);
    }
    else if (tag === 'MEETING')          result = dispatchMeeting(phone);
    else if (tag === 'PAID')             result = dispatchPaid(phone);
    else if (tag === 'ESCALATE')         result = await dispatchEscalate(phone);
    else if (tag === 'INTAKE_DONE')      result = dispatchIntakeDone(phone);
    else if (tag === 'STOP')             result = dispatchStop(phone, cleanedBody);
    if (result?.suppressMessage) replacements.__suppress = true;
    if (result?.replaceReply)    replacements.__replaceReply = result.replaceReply;
    if (result?.replacements) Object.assign(replacements, result.replacements);
  }
  return replacements;
}

function applyReplacements(text, replacements) {
  let out = text;
  for (const [k, v] of Object.entries(replacements)) out = out.split(k).join(v);
  return out;
}

// ─── Gemini ───────────────────────────────────────────────────────
function callGemini(soul, history, message, nudge, temperature) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      system_instruction: { parts: [{ text: soul + (nudge ? '\n\n---\n## RETRY NUDGE\n' + nudge : '') }] },
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      generationConfig: { temperature: temperature || 0.7, maxOutputTokens: 2500 },
    });
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + GEMINI_API_KEY,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (!text) {
            console.error('[GEMINI] No text. finishReason:', json.candidates?.[0]?.finishReason, 'blockReason:', json.promptFeedback?.blockReason);
            console.error('[GEMINI] Raw:', JSON.stringify(json).substring(0, 400));
          }
          resolve(text || null);
        } catch (e) { reject(new Error('Gemini parse error: ' + data.substring(0, 300))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Deferred retry (after immediate Gemini failures) ────────────
// Runs the full message pipeline again — re-checks closed-lost, lead state,
// Gemini, tag dispatch, send. Used when the initial /respond got 3 empty
// replies in a row (typical of a Gemini 503 spike). Fires 90s later so the
// quota / region usually clears by then.
async function deferredRetry(cleanPhone, message) {
  try {
    // Re-check the lead state — owner may have replied manually, or [STOP] may
    // have fired from another path in the meantime.
    const lead = findLead(cleanPhone);
    if (!lead) return;
    if (lead.funnelStage === 'closed-lost') {
      console.log('[LATE-SKIP] +' + cleanPhone + ' lead closed in the meantime');
      return;
    }
    const soul    = fs.readFileSync(SOUL_PATH, 'utf-8');
    const history = getHistory(cleanPhone);
    // Skip if this message was already answered by a more recent /respond — i.e.
    // the user re-sent something ("שולח?") and JJ replied while we were waiting.
    // Heuristic: the most recent user turn in history is NOT this message.
    const lastUserTurn = [...history].reverse().find(h => h.role === 'user');
    if (lastUserTurn && lastUserTurn.parts?.[0]?.text !== message) {
      console.log('[LATE-SKIP] +' + cleanPhone + ' message already superseded — skipping retry');
      return;
    }

    let reply = await callGemini(soul, history, message);
    if (!reply) reply = await callGemini(soul, history, message,
      'Earlier attempt returned empty due to a transient API spike. Read the last user message and respond now — short, warm, Hebrew. Never empty.', 0.9);
    if (!reply) {
      console.log('[LATE-FAIL] +' + cleanPhone + ' delayed retry also failed — escalating');
      await dispatchEscalate(cleanPhone);
      return;
    }

    const { tags, cleaned } = parseTags(reply);
    let outgoing = cleaned;
    let suppressed = false;
    let replaceReply = null;
    if (tags.length > 0) {
      console.log('[LATE-TAGS] +' + cleanPhone + ' ' + tags.join(', '));
      const replacements = await runDispatchers(cleanPhone, tags, cleaned);
      suppressed   = !!replacements.__suppress;
      replaceReply = replacements.__replaceReply || null;
      delete replacements.__suppress;
      delete replacements.__replaceReply;
      outgoing = applyReplacements(cleaned, replacements);
      if (outgoing.includes('{{CHECKOUT_URL}}')) {
        console.error('[LATE-TAGS] +' + cleanPhone + ' placeholder unresolved — dropping');
        return;
      }
    }
    if (replaceReply) { outgoing = replaceReply; reply = replaceReply; suppressed = false; }

    saveHistory(cleanPhone, message, reply);

    if (suppressed) {
      console.log('[LATE-STOP-SILENT] +' + cleanPhone);
      return;
    }
    if (tags.includes('STOP') && (!outgoing || outgoing.trim() === '')) {
      console.log('[LATE-STOP-SILENT] +' + cleanPhone + ' [STOP] empty body');
      return;
    }

    const delay = naturalDelayMs(outgoing);
    console.log('[LATE-DELAY] +' + cleanPhone + ' ' + delay + 'ms');
    setTimeout(() => {
      sendWhatsApp(cleanPhone, outgoing);
      console.log('[LATE-OUT] +' + cleanPhone + ':', outgoing.substring(0, 120));
    }, delay);
  } catch (e) {
    console.error('[LATE-ERR] +' + cleanPhone + ':', e.message);
  }
}

// ─── Inbound message coalescing ───────────────────────────────────
// When a lead types fast ("מה" then "כן" within seconds), we want JJ to reply
// ONCE to the combined intent — not twice with conflicting answers. Buffer
// inbound messages per phone; (re)set a 3s timer; on quiet, flush as one.
// Also serves as a serialization gate: only one processInbound runs per phone.
const COALESCE_MS = 3000;
const inboundBuf  = new Map(); // phone → { messages: [], timer: TimeoutID }
const inFlight    = new Map(); // phone → Promise (currently processing)

function flushInbound(cleanPhone) {
  const buf = inboundBuf.get(cleanPhone);
  if (!buf) return;
  inboundBuf.delete(cleanPhone);
  const msgs = buf.messages;
  const combined = msgs.length === 1 ? msgs[0] : msgs.join('\n');
  if (msgs.length > 1) {
    console.log('[COALESCE] +' + cleanPhone + ' merged ' + msgs.length + ' msgs → "' + combined.substring(0, 60) + '"');
  }
  // Chain after any in-flight processing for this phone (serialize per lead)
  const prev = inFlight.get(cleanPhone) || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => processInbound(cleanPhone, combined))
    .catch(e => console.error('[PROCESS-ERR] +' + cleanPhone + ':', e.message))
    .finally(() => { if (inFlight.get(cleanPhone) === next) inFlight.delete(cleanPhone); });
  inFlight.set(cleanPhone, next);
}

// Runs the full pipeline for ONE (possibly coalesced) inbound message.
// Extracted from the original /respond body so it can also be re-invoked by
// deferred retries and the coalescer.
async function processInbound(cleanPhone, message) {
  console.log('[IN]    +' + cleanPhone + ':', message.substring(0, 80));
  try {
    // Re-check lead state: between buffering and flushing (or during an
    // earlier in-flight batch) the lead may have been closed (e.g. operator
    // closed manually, [STOP] fired from a prior batch). Don't process if so.
    const leadNow = findLead(cleanPhone);
    if (leadNow?.funnelStage === 'closed-lost') {
      console.log('[CLOSED-LATE] +' + cleanPhone + ' lead closed during buffer/flight, dropping');
      return;
    }
    const soul    = fs.readFileSync(SOUL_PATH, 'utf-8');
    const history = getHistory(cleanPhone);
    let reply = await callGemini(soul, history, message);

    // 3-retry policy (kept from v3)
    if (!reply) {
      console.log('[RETRY-1] +' + cleanPhone + ' — Gemini empty, retrying with nudge');
      reply = await callGemini(soul, history, message,
        'You returned an empty response. The user is waiting. Read their last message carefully and respond per Phase 1/2/3 logic in soul.md. Output a real Hebrew reply now — never empty, never bot-style.',
        0.85);
    }
    if (!reply) {
      console.log('[RETRY-2] +' + cleanPhone + ' — still empty, simplifying context');
      reply = await callGemini(soul, history.slice(-6), message,
        'Earlier context may be confusing you. Focus only on this last user message and the most recent few turns. Decide which playbook entry from soul.md best fits, OR synthesize a short, warm Hebrew reply (max 2 sentences) per Phase 3. Reply must be non-empty.',
        1.0);
    }
    if (!reply) {
      // Gemini failed all 3 immediate retries — most often a transient 503.
      // Schedule ONE more attempt 90 seconds out. If that also fails, escalate.
      // We respond to HTTP now so Baileys isn't blocked.
      console.log('[SILENT-FINAL] +' + cleanPhone + ' — 3 immediate retries empty, scheduling 90s retry');
      setTimeout(() => deferredRetry(cleanPhone, message), 90 * 1000);
      return;
    }

    // ─── Tag pipeline ─────────────────────────────────────────────
    const { tags, cleaned } = parseTags(reply);
    let outgoing = cleaned;

    let suppressed = false;
    let replaceReply = null;
    if (tags.length > 0) {
      console.log('[TAGS]  +' + cleanPhone + ' ' + tags.join(', '));
      const replacements = await runDispatchers(cleanPhone, tags, cleaned);
      suppressed   = !!replacements.__suppress;
      replaceReply = replacements.__replaceReply || null;
      delete replacements.__suppress;
      delete replacements.__replaceReply;
      outgoing = applyReplacements(cleaned, replacements);
      if (outgoing.includes('{{CHECKOUT_URL}}')) {
        console.error('[TAGS]  +' + cleanPhone + ' placeholder unresolved — dropping');
        return;
      }
    }

    if (replaceReply) { outgoing = replaceReply; reply = replaceReply; suppressed = false; }

    saveHistory(cleanPhone, message, reply);

    if (suppressed) {
      console.log('[STOP-SILENT] +' + cleanPhone + ' message suppressed (cold-stage close)');
      return;
    }
    if (tags.includes('STOP') && (!outgoing || outgoing.trim() === '')) {
      console.log('[STOP-SILENT] +' + cleanPhone + ' [STOP] with empty body');
      return;
    }

    const delay = naturalDelayMs(outgoing);
    console.log('[DELAY] +' + cleanPhone + ' ' + delay + 'ms');
    setTimeout(() => {
      sendWhatsApp(cleanPhone, outgoing);
      console.log('[OUT]   +' + cleanPhone + ':', outgoing.substring(0, 120));
    }, delay);
  } catch (err) {
    console.error('[ERR]   processInbound +' + cleanPhone + ':', err.message);
  }
}

// ─── Main respond endpoint ────────────────────────────────────────
// Lightweight: applies gates and buffers messages. Actual Gemini work happens
// in processInbound (via the 3s coalescer in flushInbound).
app.post('/respond', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) return res.json({ reply: null, error: 'missing phone or message' });

  const cleanPhone = String(phone).replace(/\D/g, '');

  if (!isLead(cleanPhone)) {
    console.log('[SKIP]  +' + cleanPhone + ' not in leads.json');
    return res.json({ reply: null, reason: 'not_a_lead' });
  }
  const closedLead = findLead(cleanPhone);
  if (closedLead?.funnelStage === 'closed-lost') {
    console.log('[CLOSED] +' + cleanPhone + ' lead is closed-lost, skipping');
    return res.json({ reply: null, reason: 'closed-lost' });
  }
  if (isAutoReply(message)) {
    console.log('[BOT]   +' + cleanPhone + ' auto-reply, skipping');
    return res.json({ reply: null, reason: 'auto-reply' });
  }
  if (isDuplicate(cleanPhone, message)) {
    console.log('[DUP]   +' + cleanPhone + ':', message.substring(0, 30));
    return res.json({ reply: null, reason: 'duplicate' });
  }

  // Push into the per-phone coalescing buffer. If another message arrives
  // within COALESCE_MS, we restart the timer and merge them on flush.
  let buf = inboundBuf.get(cleanPhone);
  if (!buf) {
    buf = { messages: [], timer: null };
    inboundBuf.set(cleanPhone, buf);
  }
  buf.messages.push(message);
  if (buf.timer) clearTimeout(buf.timer);
  buf.timer = setTimeout(() => flushInbound(cleanPhone), COALESCE_MS);
  console.log('[BUFFER] +' + cleanPhone + ' (' + buf.messages.length + ' queued): ' + message.substring(0, 60));

  res.json({ reply: null, buffered: true, queueDepth: buf.messages.length });
});

// ─── System events (called by webhooks, NOT clients) ─────────────
// Used by: Polar webhook ([PAID]), intake route ([INTAKE_DONE]).
// Injects a system event into JJ's history and runs the dispatcher.
app.post('/system-event', async (req, res) => {
  const { phone, event } = req.body || {};
  if (!phone || !event) return res.status(400).json({ error: 'missing phone or event' });
  const cp = String(phone).replace(/\D/g, '');

  appendToHistory(cp, 'user', event);

  const { tags } = parseTags(event);
  if (tags.length) await runDispatchers(cp, tags);

  console.log('[SYS-EVENT] +' + cp + ' ' + event);
  res.json({ ok: true, tags });
});

// ─── Notify-sent: Carti calls this after sending demo URL ─────────
// So JJ knows the demo link exists in history (won't re-trigger BUILD).
app.post('/notify-sent', (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) return res.json({ ok: false, error: 'missing phone or message' });
  const cp = String(phone).replace(/\D/g, '');
  appendToHistory(cp, 'model', message);
  setFunnelStage(cp, 'demo-sent');
  console.log('[NOTIFY] +' + cp + ' demo link logged + funnelStage=demo-sent');

  // Proactive feedback prompt — 8s after demo URL. Skip if:
  //   • lead became closed-lost
  //   • lead advanced past demo-sent (intake/paid)
  //   • the question is already in recent history (we asked, Carti asked, or JJ asked)
  //   • the user already replied to the demo URL — their reply will trigger JJ
  //     organically via the normal /respond pipeline, so a forced nudge would
  //     just duplicate Gemini's natural feedback question
  const histLenAtNotify = getHistory(cp).length;
  setTimeout(() => {
    const lead = findLead(cp);
    if (!lead || lead.funnelStage === 'closed-lost') return;
    if (stageRank(lead.funnelStage) > stageRank('demo-sent')) return;
    const histNow = getHistory(cp);
    if (histNow.length > histLenAtNotify &&
        histNow.slice(histLenAtNotify).some(h => h.role === 'user')) {
      console.log('[FEEDBACK-PROMPT] +' + cp + ' user replied within 8s — skipping nudge');
      return;
    }
    const recent = histNow.slice(-6).map(h => h.parts?.[0]?.text || '').join('\n');
    if (/מה חשבת|יצא לך לשחק/.test(recent)) return;
    const prompt = 'יצא לך לשחק עם זה קצת? מה חשבת?';
    appendToHistory(cp, 'model', prompt);
    sendWhatsApp(cp, prompt);
    console.log('[FEEDBACK-PROMPT] +' + cp + ' sent post-demo feedback nudge');
  }, 8 * 1000);

  res.json({ ok: true });
});

// ─── Pilot results endpoint — read by Mission Control /pilot panel ────
app.get('/pilot', (_, res) => {
  const data = loadPilot();
  // Roll up summary
  const waitlist  = data.filter(d => d.kind === 'waitlist');
  const feedback  = data.filter(d => d.kind === 'price_feedback');
  const tierCount = { basic: 0, premium: 0 };
  for (const w of waitlist) {
    if (tierCount[w.tier] !== undefined) tierCount[w.tier]++;
  }
  res.json({
    summary: {
      total_events:      data.length,
      waitlist_total:    waitlist.length,
      waitlist_basic:    tierCount.basic,
      waitlist_premium:  tierCount.premium,
      price_feedbacks:   feedback.length,
      avg_setup_offered: feedback.length ? Math.round(feedback.reduce((s, f) => s + (f.setup || 0), 0) / feedback.length) : 0,
      avg_monthly_offered: feedback.filter(f => f.monthly).length
        ? Math.round(feedback.filter(f => f.monthly).reduce((s, f) => s + f.monthly, 0) / feedback.filter(f => f.monthly).length)
        : 0,
    },
    events: data.slice().reverse(),
  });
});

// ─── Management endpoints ─────────────────────────────────────────
app.get('/conversations', (_, res) => {
  const files = fs.readdirSync(HISTORY_DIR).filter(f => f.endsWith('.json'));
  res.json(files.map(f => {
    const phone = f.replace('.json', '');
    return { phone, messages: getHistory(phone).length / 2, isLead: isLead(phone) };
  }));
});
app.get('/history/:phone', (req, res) => {
  const h = getHistory(req.params.phone);
  res.json({ phone: req.params.phone, messages: h.length / 2, history: h });
});
app.delete('/history/:phone', (req, res) => {
  const f = historyPath(req.params.phone);
  if (fs.existsSync(f)) { fs.unlinkSync(f); res.json({ cleared: true }); }
  else res.json({ cleared: false });
});
app.delete('/history', (_, res) => {
  const files = fs.readdirSync(HISTORY_DIR).filter(f => f.endsWith('.json'));
  files.forEach(f => fs.unlinkSync(path.join(HISTORY_DIR, f)));
  res.json({ cleared: files.length });
});
app.get('/health', (_, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()), model: GEMINI_MODEL, soul: SOUL_PATH, version: 'v4-tag-pipeline' });
});

app.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  Simple JJ v4 — full tag pipeline                     ║');
  console.log('║  Port: ' + PORT + ' | Gemini 2.5-flash | maxTokens:1500    ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
});
