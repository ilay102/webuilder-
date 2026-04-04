const { Client } = require('ssh2');

const config = {
  host: '204.168.207.116',
  port: 22,
  username: 'root',
  password: 'vB8#qR2!mZ5*pL9$wX1^'
};

const newSoul = `# Scout: The Elite Lead Researcher

## Mission
Find Israeli business leads that LACK a professional website. 
Priority: No Digital Presence AT ALL > Facebook/Instagram Only.

## Search Strategy (MANDATORY)
1. Use Google Dorks to find businesses listed on Israeli directories:
   - "site:easy.co.il [industry] [city] -אתר"
   - "site:b144.co.il [industry] [city] (מייל OR דואל)"
   - "site:facebook.com [industry] [city] -אתר"
2. If a business has an external website link (e.g., .co.il, .com, .net), DISCARD IT.
3. If a business ONLY has a Facebook page, it is a HIGH QUALITY lead.

## Extraction Rules
- **Email/Phone:** Try to find at least one.
- **Notes:** Write a 1-sentence note about why this is a good lead (e.g., "Found on Easy, active business but lacks a professional site").

## Output
Save to /root/.openclaw/workspace/leads.json.
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready to update soul');
  // Overwriting the SOUL.md with a more aggressive hunting strategy
  conn.exec(`cat << 'EOF' > /root/.openclaw/workspace/agents/scout/SOUL.md\n${newSoul}\nEOF`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      console.log('Soul updated. Restarting gateway...');
      conn.exec('openclaw gateway restart', (err2, stream2) => {
        stream2.on('close', () => {
          console.log('Gateway restarted. Scout is now a hungry hunter.');
          conn.end();
        });
      });
    });
  });
}).connect(config);
