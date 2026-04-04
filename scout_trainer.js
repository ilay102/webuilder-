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

const missions = [
  "Find a cleaning company in Rishon LeZion without a website. Save to leads.json.",
  "Find a garage (מוסך) in Petah Tikva without a website. Save to leads.json.",
  "Find an accounting firm (רואי חשבון) in Tel Aviv without a website but with an email. Save to leads.json.",
  "Find roofers (זיפות גגות) in Haifa with a phone number but no website. Save to leads.json.",
  "Find plumbers (אינסטלטורים) in Ashdod without a website. Save to leads.json."
];

async function startTraining() {
  console.log("--- Starting Scout Autonomous Training Loop ---");
  
  // 1. Initial State Check
  const initialState = await runSshCommand('cat /root/.openclaw/workspace/leads.json');
  console.log("Initial Leads:", initialState.data);

  for (let i = 0; i < missions.length; i++) {
    console.log(`\n--- MISSION ${i+1}: ${missions[i]} ---`);
    const cmd = `openclaw agent --agent scout --session-id training-run-${i+1} --message "${missions[i]}"`;
    
    try {
      const result = await runSshCommand(cmd);
      console.log(`Mission ${i+1} Result:`, result.data);
      if (result.errData) console.error(`Mission ${i+1} Errors:`, result.errData);
    } catch (e) {
      console.error(`Mission ${i+1} Failed:`, e);
    }

    if (i < missions.length - 1) {
      console.log("Waiting 70 seconds to respect rate limits...");
      await sleep(70000);
    }
  }

  console.log("\n--- Final Audit ---");
  const finalState = await runSshCommand('cat /root/.openclaw/workspace/leads.json');
  console.log("Final Leads List:", finalState.data);
  console.log("Training Complete.");
}

startTraining();
