const { Client } = require('ssh2');

const config = {
  host: '204.168.207.116',
  port: 22,
  username: 'root',
  password: 'vB8#qR2!mZ5*pL9$wX1^'
};

const runSshCommand = (cmd) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      let data = '';
      let errData = '';
      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        stream.on('close', (code, signal) => {
          conn.end();
          resolve({ data, errData, code });
        }).on('data', (chunk) => {
          data += chunk;
        }).stderr.on('data', (chunk) => {
          errData += chunk;
        });
      });
    }).on('error', (err) => reject(err)).connect(config);
  });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function startAutonomousChad() {
  console.log("WAITING 60 SECONDS FOR API CALMDOWN...");
  await sleep(61000); // 61 sec safety

  const missions = [
    "Chad, instruct Scout to find a cleaning company in Rishon LeZion without a website. Confirm Pen drafts an email to approvals.json.",
    "Chad, instruct Scout to find a garage in Petah Tikva without a website. Confirm contact info is in leads.json.",
    "Chad, find an accounting firm in Tel Aviv with an email but no website. Use Scout.",
    "Chad, find roofers in Haifa with a phone number but no website. Use Scout.",
    "Chad, find plumbers in Ashdod without a website. Use Scout."
  ];

  for (let i = 0; i < missions.length; i++) {
    console.log(`\n--- CHAD MISSION ${i+1}: ${missions[i]} ---`);
    const cmd = `openclaw agent --agent chad --session-id chad-autonomous-${i+1} --message "${missions[i]}"`;
    
    try {
      const result = await runSshCommand(cmd);
      console.log(`Chad Result ${i+1}:`, result.data);
    } catch (e) {
      console.error(`Chad Mission ${i+1} Failed:`, e);
    }

    if (i < missions.length - 1) {
      console.log("Cooling down for 70 seconds...");
      await sleep(70000);
    }
  }
}

startAutonomousChad();
