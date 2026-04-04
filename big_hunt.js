const { Client } = require('ssh2');

const config = {
  host: '204.168.207.116',
  port: 22,
  username: 'root',
  password: 'vB8#qR2!mZ5*pL9$wX1^'
};

const sshCommand = (cmd) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        stream.on('close', (code, signal) => {
          conn.end();
          resolve();
        }).on('data', (data) => {
          process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
          process.stderr.write(data.toString());
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect(config);
  });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const transparencyPrompt = `\n\nCRITICAL INSTRUCTION: We are tracking your logic. You MUST be 100% transparent. In the 'notes' field, document EVERY step of your thought process (e.g., 'Searched Google Docs for X -> Found Y -> Saw they have a website -> Ignored -> Searched Easy.co.il -> Found Z -> No website -> Kept'). Prioritize searching site:easy.co.il and site:b144.co.il.`;

const missions = [
  "Find a cleaning company in Rishon LeZion without a website." + transparencyPrompt,
  "Find a garage (מוסך) in Petah Tikva without a website." + transparencyPrompt,
  "Find an accounting firm (רואי חשבון) in Tel Aviv without a website but with an email." + transparencyPrompt,
  "Find roofers (זיפות גגות) in Haifa with a phone number but no website." + transparencyPrompt,
  "Find plumbers (אינסטלטורים) in Ashdod without a website." + transparencyPrompt
];

async function runBigHunt() {
  console.log("=== STARTING THE BIG HUNT (5 MISSIONS) ===\n");

  for (let i = 0; i < missions.length; i++) {
    console.log(`\n\n>>> STARTING MISSION ${i + 1} OF 5 <<<`);
    console.log(`Goal: ${missions[i]}\n`);
    
    // Create a unqiue session ID for each run to avoid caching issues
    const sessionId = `hunt-transparent-${Date.now()}`;
    const cmd = `openclaw agent --agent scout --session-id ${sessionId} --message "${missions[i]}"`;
    
    try {
      await sshCommand(cmd);
      console.log(`\n>>> MISSION ${i + 1} FINISHED <<<`);
    } catch (e) {
      console.error(`\n>>> MISSION ${i + 1} FAILED WITH ERROR: ${e} <<<`);
    }

    if (i < missions.length - 1) {
      console.log("\nWaiting 75 seconds for API cooldown to avoid Google/Cloudfare blocks...");
      await sleep(75000);
    }
  }
  console.log("\n=== ALL MISSIONS COMPLETED! ===");
}

runBigHunt();
