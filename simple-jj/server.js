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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDs9ym7isUAvvV-edKM00Aq4MX9FrAOW3w';
const GEMINI_MODEL  = 'gemini-2.5-flash';

// Next.js / Vercel — used by CHECKOUT dispatcher to create Polar links
const SITE_BASE = process.env.SITE_BASE || 'https://webuilder-liart.vercel.app';

// Owner WhatsApp — receives [ESCALATE] pings (972XXXXXXXXX, no +)
const OWNER_WHATSAPP = process.env.OWNER_WHATSAPP || '972534638880';

if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });

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

// ─── Lead filtering ───────────────────────────────────────────────
function isLead(phone) {
  try {
    const leads = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf-8'));
    const cp = String(phone).replace(/\D/g, '');
    return leads.some(l => String(l.phone).replace(/\D/g, '') === cp);
  } catch { return false; }
}

// ─── Auto-reply detection ─────────────────────────────────────────
const BOT_PATTERNS = [
  'כרטיס ביקור דיגיטלי','שעות הפעילות','אם אין מענה כאן',
  'הודעה אוטומטית','auto reply','automatic reply','out of office',
  'אני כרגע לא זמין','נשוב אליך בהקדם','תגובה אוטומטית',
  'הצוות שלנו יחזור','להסרה מהרשימה','להסרה מרשימת התפוצה',
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
    const cp  = String(phone).replace(/\D/g, '');
    const idx = leads.findIndex(l => String(l.phone).replace(/\D/g, '') === cp);
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
    const cp = String(phone).replace(/\D/g, '');
    return leads.find(l => String(l.phone).replace(/\D/g, '') === cp) || null;
  } catch { return null; }
}

const HEBREW_MAP = {
  'מרפאת':'marpaat','מרפאה':'marpaa','שיניים':'shinayim','רופא':'rofe',
  'דוקטור':'doctor','עו"ד':'lawyer','עורך':'orekh','דין':'din',
  'רואה':'roe','חשבון':'heshbon','מכון':'machon','מרכז':'merkaz',
  'קליניקה':'clinica','בית':'beit','ספר':'sefer','מספרה':'mispara',
};

function makeSlug(lead) {
  let base = (lead.company || 'site').trim().toLowerCase();
  for (const [heb, eng] of Object.entries(HEBREW_MAP)) base = base.replace(new RegExp(heb, 'g'), eng);
  base = base.replace(/\s+/g, '-');
  let slug = base.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!slug || slug.length < 2) slug = 'lead-' + Date.now().toString().slice(-6);
  return slug + '-demo';
}

// ─── Tag dispatchers ──────────────────────────────────────────────

async function dispatchBuild(phone) {
  const lead = findLead(phone);
  if (!lead) { console.log('[BUILD] Lead not found for', phone); return { ok: false }; }

  let queue = [];
  try { queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8')); } catch {}

  const cp = String(phone).replace(/\D/g, '');
  const already = queue.find(e =>
    String(e.leadPhone).replace(/\D/g, '') === cp &&
    (e.status === 'pending' || e.status === 'building' || e.status === 'done')
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

  const route = makeSlug(lead);
  queue.push({
    id: 'jj-' + Date.now(), status: 'pending', template: 'dental', route,
    businessName: lead.company, city: lead.city, phone: lead.phone,
    hours: 'Sun-Thu 9:00-18:00', calLink: 'ilay-lankin/15min',
    clientEmail: 'ilay1bgu@gmail.com', clientWhatsapp: '972534638880',
    leadPhone: lead.phone, leadName: lead.owner_name || lead.company,
    requestedAt: new Date().toISOString(),
  });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
  setFunnelStage(phone, 'demo-queued');
  console.log('[BUILD] Queued demo for', lead.company, '→ route:', route);
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

// ─── Tag parser ───────────────────────────────────────────────────
const TAG_RE = /^\s*\[(BUILD|CHECKOUT(?::[a-zA-Z_]+)?|MEETING|PAID|ESCALATE|INTAKE_DONE)\]\s*$/gm;

function parseTags(reply) {
  const tags = [];
  for (const m of reply.matchAll(TAG_RE)) tags.push(m[1]);
  const cleaned = reply.replace(TAG_RE, '').replace(/^\n+/, '').trim();
  return { tags, cleaned };
}

async function runDispatchers(phone, tags) {
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
    else if (tag === 'MEETING')          result = dispatchMeeting(phone);
    else if (tag === 'PAID')             result = dispatchPaid(phone);
    else if (tag === 'ESCALATE')         result = await dispatchEscalate(phone);
    else if (tag === 'INTAKE_DONE')      result = dispatchIntakeDone(phone);
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

// ─── Main respond endpoint ────────────────────────────────────────
app.post('/respond', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) return res.json({ reply: null, error: 'missing phone or message' });

  const cleanPhone = String(phone).replace(/\D/g, '');

  if (!isLead(cleanPhone)) {
    console.log('[SKIP]  +' + cleanPhone + ' not in leads.json');
    return res.json({ reply: null, reason: 'not_a_lead' });
  }
  if (isAutoReply(message)) {
    console.log('[BOT]   +' + cleanPhone + ' auto-reply, skipping');
    return res.json({ reply: null, reason: 'auto-reply' });
  }
  if (isDuplicate(cleanPhone, message)) {
    console.log('[DUP]   +' + cleanPhone + ':', message.substring(0, 30));
    return res.json({ reply: null, reason: 'duplicate' });
  }

  console.log('[IN]    +' + cleanPhone + ':', message.substring(0, 80));

  try {
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
      console.log('[SILENT-FINAL] +' + cleanPhone + ' — Gemini failed 3x, giving up');
      return res.json({ reply: null });
    }

    // ─── Tag pipeline ─────────────────────────────────────────────
    // 1. Parse all [TAG] lines from the model reply.
    // 2. Dispatch each (side effects: queue build, create Polar checkout, log meeting, etc).
    // 3. Apply any placeholder replacements ({{CHECKOUT_URL}} → live Polar URL).
    // 4. Safety: if {{CHECKOUT_URL}} still unresolved (Polar call failed), drop message.
    // 5. Send the CLEANED reply to the client via Baileys.
    // 6. Save the ORIGINAL tagged reply to history so the model sees its own tags next turn.
    const { tags, cleaned } = parseTags(reply);
    let outgoing = cleaned;

    if (tags.length > 0) {
      console.log('[TAGS]  +' + cleanPhone + ' ' + tags.join(', '));
      const replacements = await runDispatchers(cleanPhone, tags);
      outgoing = applyReplacements(cleaned, replacements);

      if (outgoing.includes('{{CHECKOUT_URL}}')) {
        console.error('[TAGS]  +' + cleanPhone + ' placeholder unresolved — suppressing message');
        return res.json({ reply: null, error: 'checkout_placeholder_unresolved' });
      }
    }

    // Save original (with tags) so next Gemini turn sees what JJ did
    saveHistory(cleanPhone, message, reply);
    sendWhatsApp(cleanPhone, outgoing);

    console.log('[OUT]   +' + cleanPhone + ':', outgoing.substring(0, 120));
    res.json({ reply: outgoing, sent: true });

  } catch (err) {
    console.error('[ERR]   Gemini error:', err.message);
    res.json({ reply: null, error: err.message });
  }
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
  res.json({ ok: true });
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
