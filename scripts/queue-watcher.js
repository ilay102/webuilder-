const fs = require('fs');
const { exec } = require('child_process');

const QUEUE_PATH = '/root/.openclaw/workspace/demo_queue.json';
let isBuilding = false;
const sentIds = new Set();

console.log('Carti Watcher started');

fs.watchFile(QUEUE_PATH, { interval: 3000 }, function() {
  if (isBuilding) return;
  try {
    const raw = fs.readFileSync(QUEUE_PATH, 'utf-8');
    const queue = JSON.parse(raw);
    const pending = queue.find(function(i) { return i.status === 'pending' && !sentIds.has(i.id); });
    if (!pending) return;
    isBuilding = true;
    sentIds.add(pending.id);
    console.log('Building for: ' + pending.businessName);
    // --skip-git: VPS owns pool-state.json at runtime; never block on git network I/O.
    // WEBUILDER_SKIP_GIT=1 is a belt-and-braces fallback in case the flag isn't parsed.
    exec('WEBUILDER_SKIP_GIT=1 npx ts-node --transpile-only /root/webuilder/scripts/new-demo.ts --queue ' + QUEUE_PATH + ' --skip-git', { cwd: '/root/webuilder', timeout: 120000, env: { ...process.env, WEBUILDER_SKIP_GIT: '1' } }, function(err, stdout, stderr) {
      try {
        // dotenv (and friends) print banners to stdout before our JSON.
        // Extract the LAST line that parses as JSON instead of assuming
        // stdout.trim() is pure JSON.
        const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
        let result = null;
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].startsWith('{')) {
            try { result = JSON.parse(lines[i]); break; } catch {}
          }
        }
        if (!result) throw new Error('no JSON line in stdout');
        if (result.success && result.url) {
          console.log('Build done: ' + result.url);
          const phone = result.leadPhone || pending.leadPhone || pending.phone;
          const msg = 'הנה הלינק לסקיצה: ' + result.url;
          exec('openclaw message send --target +' + phone + ' --message "' + msg + '" --json', function(e2, o2) {
            console.log('Sent: ' + (e2 ? e2.message : o2.substring(0, 80)));
          });
        } else {
          console.error('Build failed: ' + (result.error || stderr.substring(0, 300)));
        }
      } catch(e) { console.error('Raw output: ' + stdout.substring(0, 300)); }
      isBuilding = false;
    });
  } catch(e) { console.error('Watcher error: ' + e.message); isBuilding = false; }
});

process.stdin.resume();
