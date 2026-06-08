const fs = require('fs');
const path = require('path');
const http = require('http');

const WORKSPACE = process.env.WORKSPACE_PATH || path.join(process.env.HOME || '', '.openclaw', 'workspace');
const APPROVALS_FILE = path.join(WORKSPACE, 'approvals.json');
const BAILEYS_URL = 'http://127.0.0.1:3003';

// ─── Send via Baileys (approval gate enforced here) ───────────────
function sendWhatsApp(phone, message) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ phone, message });
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
        try { resolve(JSON.parse(data)); }
        catch { resolve({ ok: false, error: 'parse error' }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log("📨 Approval Bridge: Checking for 'approved' messages...");
  if (!fs.existsSync(APPROVALS_FILE)) { console.log("No approvals file."); return; }

  let approvals = JSON.parse(fs.readFileSync(APPROVALS_FILE, 'utf8'));
  let sentCount = 0;

  for (let item of approvals) {
    if (item.status === 'approved') {
      let phone = String(item.phone).replace(/[^0-9]/g, '');
      if (phone.startsWith('0')) phone = '972' + phone.slice(1);

      console.log(`📤 Sending to +${phone} (${item.title})...`);
      try {
        const result = await sendWhatsApp(phone, item.body);
        if (result.ok) {
          console.log('✅ Sent via Baileys to +' + phone);
          item.status = 'sent';
          item.sent_at = new Date().toISOString();
          sentCount++;
        } else {
          console.error('❌ Baileys error:', result.error);
          item.status = 'failed';
          item.error = result.error;
        }
      } catch (err) {
        console.error(`❌ Failed:`, err.message);
        item.status = 'failed';
        item.error = err.message;
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  if (sentCount > 0 || approvals.some(a => a.status === 'failed')) {
    fs.writeFileSync(APPROVALS_FILE, JSON.stringify(approvals, null, 2));
    console.log(`✅ Done. Sent: ${sentCount}`);
  } else {
    console.log("No approved messages to send.");
  }
}

async function start() {
  console.log("🚀 Starting Approval Bridge Daemon...");
  while (true) {
    try {
      await run();
    } catch (e) {
      console.error("Error in Approval Bridge loop:", e.message);
    }
    // Sleep for 10 seconds before checking again
    await new Promise(r => setTimeout(r, 10000));
  }
}

start();
