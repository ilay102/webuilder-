/**
 * WhatsApp Baileys Server
 * - Connects to WhatsApp (scan QR once)
 * - Receives messages → forwards to Simple JJ (port 3002)
 * - POST /send { phone, message } → sends WhatsApp message
 * - GET /status → connection status
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys');
const express = require('express');
const https = require('https');
const http = require('http');
const P = require('pino');
const QRCode = require('qrcode');

const app = express();
app.use(express.json());

const PORT = 3003;
const AUTH_DIR = '/root/whatsapp-baileys/auth';
const SIMPLE_JJ_URL = 'http://127.0.0.1:3002/respond';
const VPS_SERVER_URL = process.env.VPS_SERVER_URL || 'http://127.0.0.1:3004';
const INTAKE_SECRET  = process.env.INTAKE_SECRET  || '';

let sock = null;
let isConnected = false;
let qrCode = null;
const lidToPhone = new Map(); // LID → real phone number

// Load LID mappings from saved auth files on startup
function loadLidMappings() {
  try {
    const files = require('fs').readdirSync(AUTH_DIR).filter(f => f.startsWith('lid-mapping-') && f.endsWith('_reverse.json'));
    for (const f of files) {
      const lid = f.replace('lid-mapping-', '').replace('_reverse.json', '');
      const phone = JSON.parse(require('fs').readFileSync(require('path').join(AUTH_DIR, f), 'utf-8'));
      lidToPhone.set(lid, String(phone).replace(/\D/g, ''));
      console.log(`[LID] Loaded: ${lid} → +${phone}`);
    }
  } catch(e) { console.log('[LID] No mappings loaded:', e.message); }
}
loadLidMappings();

// ─── Forward to Simple JJ ────────────────────────────────────────
function forwardToJJ(phone, message) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ phone, message });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3002,
      path: '/respond',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', (e) => {
      console.error('[JJ FWD ERR]', e.message);
      resolve(null);
    });
    req.write(body);
    req.end();
  });
}

// ─── Start WhatsApp connection ────────────────────────────────────
async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  console.log(`[WA] Using Baileys v${version.join('.')}`);

  sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: 'silent' }),
    browser: ['Chad-JJ', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: false,
  });

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds);

  // Build LID → phone map from contacts
  sock.ev.on('contacts.upsert', (contacts) => {
    for (const c of contacts) {
      if (c.id && c.lid) {
        const phone = c.id.split('@')[0].replace(/\D/g, '');
        const lid = c.lid.split('@')[0].replace(/\D/g, '');
        if (phone && lid) {
          lidToPhone.set(lid, phone);
          console.log(`[MAP] ${lid} → +${phone}`);
        }
      }
    }
  });

  sock.ev.on('contacts.update', (contacts) => {
    for (const c of contacts) {
      if (c.id && c.lid) {
        const phone = c.id.split('@')[0].replace(/\D/g, '');
        const lid = c.lid.split('@')[0].replace(/\D/g, '');
        if (phone && lid) lidToPhone.set(lid, phone);
      }
    }
  });

  // Connection status
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCode = qr;
      console.log('[WA] QR ready — open http://204.168.207.116:3003/qr to scan');
    }

    if (connection === 'open') {
      isConnected = true;
      qrCode = null;
      console.log('[WA] ✅ Connected to WhatsApp!');
    }

    if (connection === 'close') {
      isConnected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log('[WA] Connection closed. Code:', code, '| Reconnect:', shouldReconnect);
      if (shouldReconnect) {
        console.log('[WA] Reconnecting in 5s...');
        setTimeout(startWhatsApp, 5000);
      } else {
        console.log('[WA] Logged out. Delete auth folder and restart to re-link.');
      }
    }
  });

  // Incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log(`[MSG] upsert type=${type} count=${messages.length}`);

    for (const msg of messages) {
      const jid = msg.key.remoteJid || '';
      console.log(`[MSG] jid=${jid} fromMe=${msg.key.fromMe} type=${type}`);

      // Skip groups
      if (jid.includes('@g.us')) continue;

      // Skip messages sent by us (Simple JJ already saves its own via saveHistory)
      if (msg.key.fromMe) continue;

      // Extract phone — handle both @s.whatsapp.net and @lid
      let phone = jid.split('@')[0].replace(/\D/g, '');
      // If it's a LID, resolve to real phone number
      if (jid.includes('@lid')) {
        if (lidToPhone.has(phone)) {
          phone = lidToPhone.get(phone);
          console.log(`[LID] Resolved to +${phone}`);
        } else {
          // Try store contacts
          const contacts = Object.values(store.contacts || {});
          const match = contacts.find(c => c.lid && c.lid.split('@')[0].replace(/\D/g,'') === phone);
          if (match) {
            const resolved = match.id.split('@')[0].replace(/\D/g,'');
            lidToPhone.set(phone, resolved);
            phone = resolved;
            console.log(`[LID] Store resolved to +${phone}`);
          } else {
            console.log(`[LID] Cannot resolve ${phone} — skipping`);
            continue;
          }
        }
      }
      if (!phone || phone.length < 7) continue;

      // Get message text
      const text = msg.message?.conversation
        || msg.message?.extendedTextMessage?.text
        || msg.message?.imageMessage?.caption
        || msg.message?.buttonsResponseMessage?.selectedDisplayText
        || '';

      const isImage = !!(msg.message?.imageMessage);

      console.log(`[IN]  +${phone}: "${text.substring(0, 80)}" isImage=${isImage}`);

      // ── Handle incoming photo ─────────────────────────────────
      if (isImage) {
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          const slot   = text.toLowerCase().includes('hero')  ? 'hero'
                       : text.toLowerCase().includes('about') ? 'about'
                       : 'auto';

          // POST raw buffer to VPS server
          const photoRes = await fetch(`${VPS_SERVER_URL}/api/photo`, {
            method:  'POST',
            headers: {
              'Content-Type':    'image/jpeg',
              'x-phone':         phone,
              'x-slot':          slot,
              'x-intake-secret': INTAKE_SECRET,
            },
            body: buffer,
          });
          const result = await photoRes.json().catch(() => ({}));

          if (result.ok) {
            console.log(`[IMG] Saved ${result.slot} for phone ${phone}`);
            // Confirm to client on WhatsApp
            const jidStr = phone + '@s.whatsapp.net';
            await sock.sendMessage(jidStr, {
              text: `✅ התמונה עלתה לאתר שלך! (${result.slot})\nהאתר יתעדכן תוך ~30 שניות 🚀`,
            });
          } else {
            console.log(`[IMG] Server returned: ${JSON.stringify(result)}`);
          }
        } catch (err) {
          console.error('[IMG] Failed to process image:', err.message);
        }
        // If no caption text, skip forwarding to JJ
        if (!text) continue;
      }

      if (!text) continue;

      // Forward to Simple JJ
      await forwardToJJ(phone, text);
    }
  });
}

// ─── HTTP API ─────────────────────────────────────────────────────

// Send a WhatsApp message
app.post('/send', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'phone and message required' });
  if (!isConnected || !sock) return res.status(503).json({ error: 'WhatsApp not connected' });

  try {
    const jid = phone.replace(/\D/g, '') + '@s.whatsapp.net';
    await sock.sendMessage(jid, { text: message });
    console.log(`[SENT] +${phone}: ${message.substring(0, 80)}`);
    res.json({ ok: true, phone, preview: message.substring(0, 50) });
  } catch (err) {
    console.error('[SEND ERR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// QR Code page — open in browser and scan
app.get('/qr', async (_, res) => {
  if (isConnected) {
    return res.send('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>✅ Already Connected!</h2><p>WhatsApp is linked and running.</p></body></html>');
  }
  if (!qrCode) {
    return res.send('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>⏳ Waiting for QR...</h2><p>Refresh in a few seconds.</p><script>setTimeout(()=>location.reload(),3000)</script></body></html>');
  }
  try {
    const qrImage = await QRCode.toDataURL(qrCode);
    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#fff">
      <h2>📱 Scan with WhatsApp</h2>
      <p>WhatsApp → Menu → Linked Devices → Link a Device</p>
      <img src="${qrImage}" style="width:300px;height:300px;border:2px solid #ccc;border-radius:8px"/>
      <p style="color:gray;font-size:12px">Page auto-refreshes every 20s</p>
      <script>setTimeout(()=>location.reload(),20000)</script>
    </body></html>`);
  } catch (e) {
    res.send('<html><body><p>QR error: ' + e.message + '</p></body></html>');
  }
});

// Status
app.get('/status', (_, res) => {
  res.json({
    connected: isConnected,
    qrPending: !!qrCode,
    uptime: Math.round(process.uptime())
  });
});

// Health
app.get('/health', (_, res) => {
  res.json({ ok: true, connected: isConnected, uptime: Math.round(process.uptime()) });
});

// Start
app.listen(PORT, () => {
  console.log(`\n╔═══════════════════════════════════════╗`);
  console.log(`║  WhatsApp Baileys Server               ║`);
  console.log(`║  HTTP API: http://localhost:${PORT}       ║`);
  console.log(`║  POST /send  { phone, message }        ║`);
  console.log(`║  GET  /status                          ║`);
  console.log(`╚═══════════════════════════════════════╝\n`);
  startWhatsApp();
});
