const { Client } = require('ssh2');

const config = {
  host: '204.168.207.116',
  port: 22,
  username: 'root',
  password: 'vB8#qR2!mZ5*pL9$wX1^'
};

const conn = new Client();
conn.on('ready', () => {
  const mission = "Find a cleaning company in Rishon LeZion without a website. Save to leads.json.";
  const cmd = `openclaw agent --agent scout --session-id training-run-1 --message "${mission}"`;
  console.log(`Running: ${cmd}`);
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect(config);
