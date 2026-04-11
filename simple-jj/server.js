/**
 * Simple JJ — Stateless WhatsApp Reply Bot
 * - Reads SOUL.md fresh on every message (no caching ever)
 * - Calls Gemini API directly
 * - Per-phone conversation history (remembers full context)
 * - Lead filtering (only responds to leads in leads.json)
 * - Hard deduplication
 * - Auto-reply bot detection
 * - Trigger demo builds when client says yes/כן
 */

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// ─── Config ───────────────────────────────────────────────────────
const PORT = 3002;
const SOUL_PATH = '/root/simple-jj/soul.md';
const HISTORY_DIR = '/root/simple-jj/history';
const LEADS_PATH = '/root/.openclaw/workspace/leads.json';
const QUEUE_PATH = '/root/.openclaw/workspace/demo_queue.json';
const GEMINI_API_KEY = 'AIzaSyCFhau6wAMbm3QW3p61Jzdp_65ZPMrYaOA';
const GEMINI_MODEL = 'gemini-2.5-flash';

if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });

// ─── Lead filtering ──────────────────────────────────────────────
function isLead(phone) {
  try {
    const leads = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf-8'));
    const cleanPhone = String(phone).replace(/\D/g, '');
    return leads.some(l => String(l.phone).replace(/\D/g, '') === cleanPhone);
  } catch {
    return false;
  }
}

// ─── Auto-reply / bot detection ──────────────────────────────────
const BOT_PATTERNS = [
  'כרטיס ביקור דיגיטלי',
  'שעות הפעילות',
  'אם אין מענה כאן',
  'הודעה אוטומטית',
  'auto reply',
  'automatic reply',
  'out of office',
  'אני כרגע לא זמין',
  'נשוב אליך בהקדם',
  'תגובה אוטומטית',
  'הצוות שלנו יחזור',
  'להסרה מהרשימה',
  'להסרה מרשימת התפוצה',
];

function isAutoReply(message) {
  const lower = message.toLowerCase();
  for (const pattern of BOT_PATTERNS) {
    if (lower.includes(pattern.toLowerCase())) return true;
  }
  const phoneMatches = (message.match(/\d{9,}/g) || []).length;
  if (phoneMatches >= 3) return true;
  return false;
}

// ─── Dedup cache ─────────────────────────────────────────────────
const seenMessages = new Map();

function isDuplicate(phone, message) {
  const key = `${phone}:${message.trim()}`;
  const last = seenMessages.get(key);
  if (last && Date.now() - last < 120000) return true;
  seenMessages.set(key, Date.now());
  return false;
}

// ─── Conversation history ─────────────────────────────────────────
function historyPath(phone) {
  return path.join(HISTORY_DIR, `${phone}.json`);
}

function getHistory(phone) {
  try { return JSON.parse(fs.readFileSync(historyPath(phone), 'utf-8')); }
  catch { return []; }
}

function saveHistory(phone, userMsg, aiMsg) {
  let h = getHistory(phone);
  h.push({ role: 'user', parts: [{ text: userMsg }] });
  h.push({ role: 'model', parts: [{ text: aiMsg }] });
  if (h.length > 30) h = h.slice(-30);
  fs.writeFileSync(historyPath(phone), JSON.stringify(h, null, 2));
}

// ─── Build triggering ──────────────────────────────────────────────
function triggerBuildIfNeeded(phone, message) {
  const normalized = message.toLowerCase().trim();
  if (!['כן', 'yes', 'ok', 'בטח', 'כמובן', 'כל הכבוד'].includes(normalized)) return;

  try {
    const leads = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf-8'));
    const cleanPhone = String(phone).replace(/\D/g, '');
    const lead = leads.find(l => String(l.phone).replace(/\D/g, '') === cleanPhone);
    if (!lead) return;

    let queue = [];
    try { queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8')); } catch (e) {}

    // Generate slug: convert to kebab-case, handle Hebrew
    const slugBase = (lead.company || 'site').trim().replace(/\s+/g, '-').toLowerCase();
    const slug = slugBase.replace(/[^a-z0-9\u0590-\u05FF-]/g, ''); // Keep Hebrew + alphanumeric + dash
    const entry = {
      id: `jj-${Date.now()}`,
      status: 'pending',
      template: 'dental',
      route: `${slug}-demo`,
      businessName: lead.company,
      city: lead.city,
      phone: lead.phone,
      hours: "Sun–Thu 9:00–18:00",
      calLink: "ilay-lankin/15min",
      clientEmail: "ilay1bgu@gmail.com",
      clientWhatsapp: "972534638880",
      leadPhone: lead.phone,
      leadName: lead.owner_name || lead.company,
      requestedAt: new Date().toISOString()
    };

    queue.push(entry);
    fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
    console.log(`[BUILD] Queued demo for ${lead.company}`);
  } catch (e) {
    console.error(`[BUILD] Error:`, e.message);
  }
}

// ─── Gemini API ───────────────────────────────────────────────────
function callGemini(soul, history, message) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      system_instruction: { parts: [{ text: soul }] },
      contents: [
        ...history,
        { role: 'user', parts: [{ text: message }] }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          resolve(text || null);
        } catch (e) {
          reject(new Error('Gemini parse error: ' + data.substring(0, 300)));
        }
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

  if (!phone || !message) {
    return res.json({ reply: null, error: 'missing phone or message' });
  }

  // Lead check
  if (!isLead(phone)) {
    console.log(`[SKIP]  +${phone} not in leads.json`);
    return res.json({ reply: null, reason: 'not_a_lead' });
  }

  // Bot detection
  if (isAutoReply(message)) {
    console.log(`[BOT]  +${phone} auto-reply detected, skipping`);
    return res.json({ reply: null, reason: 'auto-reply' });
  }

  // Dedup
  if (isDuplicate(phone, message)) {
    console.log(`[DUP]  +${phone}: ${message.substring(0, 30)}`);
    return res.json({ reply: null, reason: 'duplicate' });
  }

  console.log(`[IN]   +${phone}: ${message.substring(0, 80)}`);

  try {
    const soul = fs.readFileSync(SOUL_PATH, 'utf-8');
    const history = getHistory(phone);
    const reply = await callGemini(soul, history, message);

    if (!reply) {
      console.log(`[SILENT] +${phone} — no reply generated`);
      return res.json({ reply: null });
    }

    // Check if we should trigger a build
    triggerBuildIfNeeded(phone, message);

    saveHistory(phone, message, reply);
    console.log(`[OUT]  +${phone}: ${reply.substring(0, 100)}`);

    res.json({ reply });

  } catch (err) {
    console.error(`[ERR]  Gemini error:`, err.message);
    res.json({ reply: null, error: err.message });
  }
});

// ─── Management endpoints ─────────────────────────────────────────

app.get('/conversations', (_, res) => {
  const files = fs.readdirSync(HISTORY_DIR).filter(f => f.endsWith('.json'));
  const convos = files.map(f => {
    const phone = f.replace('.json', '');
    const h = getHistory(phone);
    return { phone, messages: h.length / 2, isLead: isLead(phone) };
  });
  res.json(convos);
});

app.get('/history/:phone', (req, res) => {
  const h = getHistory(req.params.phone);
  res.json({ phone: req.params.phone, messages: h.length / 2, history: h });
});

app.delete('/history/:phone', (req, res) => {
  const f = historyPath(req.params.phone);
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    console.log(`[RESET] Cleared history for +${req.params.phone}`);
    res.json({ cleared: true, phone: req.params.phone });
  } else {
    res.json({ cleared: false, error: 'No history found' });
  }
});

app.delete('/history', (_, res) => {
  const files = fs.readdirSync(HISTORY_DIR).filter(f => f.endsWith('.json'));
  files.forEach(f => fs.unlinkSync(path.join(HISTORY_DIR, f)));
  console.log(`[RESET] Cleared ALL conversation history (${files.length} files)`);
  res.json({ cleared: files.length });
});

app.get('/health', (_, res) => {
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    conversations: fs.readdirSync(HISTORY_DIR).filter(f => f.endsWith('.json')).length,
    model: GEMINI_MODEL,
    soul: SOUL_PATH
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║  Simple JJ running on port ${PORT}                    ║
║  Model: ${GEMINI_MODEL}                      ║
║  Soul: ${SOUL_PATH.split('/').pop()}                                 ║
║  Lead filtering: YES                           ║
╚══════════════════════════════════════════════════╝
  `);
});
