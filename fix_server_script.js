const { Client } = require('ssh2');

const config = {
  host: '204.168.207.116',
  port: 22,
  username: 'root',
  password: 'vB8#qR2!mZ5*pL9$wX1^'
};

const serverCode = `
const { exec } = require('child_process');
const missions = [
  "Find a cleaning company in Rishon LeZion without a website.",
  "Find a garage in Petah Tikva without a website.",
  "Find an accounting firm in Tel Aviv with email but no website.",
  "Find roofers in Haifa with phone but no website.",
  "Find plumbers in Ashdod without a website."
];

async function run() {
  const transparency = "\\n\\nCRITICAL: Be 100% transparent. Document logic in 'notes'. Use site:easy.co.il and site:b144.co.il.";
  for (let i = 0; i < missions.length; i++) {
    console.log("Starting Mission " + (i+1));
    const sessionId = "vps-hunt-" + Date.now();
    const cmd = "openclaw agent --agent scout --session-id " + sessionId + " --message \\\"" + missions[i] + transparency + "\\\"";
    
    await new Promise(resolve => {
      exec(cmd, (err, out, stderr) => {
        if (err) console.error("Error in mission " + (i+1) + ":", stderr);
        console.log("Result for mission " + (i+1) + ":", out);
        resolve();
      });
    });

    if (i < missions.length - 1) {
      console.log("Cooling down for 75 seconds...");
      await new Promise(r => setTimeout(r, 75000));
    }
  }
  console.log("All missions completed.");
}
run();
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('Fixing the script on the server...');
  conn.exec(`cat << 'EOF' > /root/big_hunt_server.js\n${serverCode}\nEOF`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      console.log('File fixed. Starting background process...');
      // Killing potential old attempts and starting clean
      conn.exec('pkill -f big_hunt_server.js || true', () => {
        conn.exec('nohup node /root/big_hunt_server.js > /root/hunt.log 2>&1 &', (err3, stream3) => {
          stream3.on('close', () => {
             console.log('Background process started successfully!');
             conn.end();
          });
        });
      });
    });
  });
}).connect(config);
