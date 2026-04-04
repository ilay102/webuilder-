const { Client } = require('ssh2');

const config = {
  host: '204.168.207.116',
  port: 22,
  username: 'root',
  password: 'vB8#qR2!mZ5*pL9$wX1^'
};

const inputMessage = process.argv.slice(2).join(' ');

if (!inputMessage) {
  console.log("Usage: node closer_chat.js \"<The customer's message>\"");
  console.log("Example: node closer_chat.js \"למה בחינם? יש קאץ'?\"");
  process.exit(1);
}

console.log(`💬 Lead said: "${inputMessage}"\n`);
console.log("⏳ Closer is typing...");

const conn = new Client();
conn.on('ready', () => {
  // Use openclaw CLI via SSH just like Chad/Scout scripts
  const cmd = `openclaw agent --agent closer --message "The lead replied: ${inputMessage.replace(/"/g, '\\"')}. Reply according to your Closer specific persona rules. Hebrew only, 2-3 sentences max."`;
  
  let resultStr = "";
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log("\n🎯 Closer's Response:");
      console.log(resultStr.trim());
      conn.end();
    }).on('data', (data) => {
      resultStr += data.toString();
    }).stderr.on('data', (data) => {
      // ignore stderr so it doesn't pollute the chat stdout
    });
  });
}).on('error', (err) => {
  console.error("SSH Connection Error:", err);
}).connect(config);
