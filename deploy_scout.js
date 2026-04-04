const { Client } = require('ssh2');

const config = {
  host: '204.168.207.116',
  port: 22,
  username: 'root',
  password: 'vB8#qR2!mZ5*pL9$wX1^'
};

const missionTarget = process.argv[2] || "barbershop in Petah Tikva";

// The Middleware Node.js Script (Deduplication + Faster Parsing)
const huntToolScript = `
const https = require('https')
const fs = require('fs')

const API_KEY = 'AIzaSyAxBZ0khCz8Uxhi9dOzPeWjBKOT7b4lNcQ'
const LEADS_PATH = '/root/.openclaw/workspace/leads.json'

const queryArg = process.argv[2] || 'barbershop in Petah Tikva'
const query = encodeURIComponent(queryArg)

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(JSON.parse(data)))
    }).on('error', reject)
  })
}

async function run() {
  console.log('Hunting for unique leads: ' + queryArg)
  
  let existingLeads = []
  try { existingLeads = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf8')) } catch {}
  const usedIds = new Set(existingLeads.map(l => l.place_id || l.company))

  const search = await get(\`https://maps.googleapis.com/maps/api/place/textsearch/json?query=\${query}&key=\${API_KEY}\`)

  if (!search.results?.length) {
    console.log('No results found.');
    process.exit(1);
  }

  for (const place of search.results) {
    if (usedIds.has(place.place_id)) {
        console.log('Skip duplicate: ' + place.name);
        continue;
    }

    const details = await get(\`https://maps.googleapis.com/maps/api/place/details/json?place_id=\${place.place_id}&fields=name,formatted_phone_number,website,formatted_address,rating&key=\${API_KEY}\`)
    const r = details.result
    
    if (!r || !r.formatted_phone_number) continue;

    const lead = {
      id: "lead-" + Date.now(),
      place_id: place.place_id,
      company: r.name,
      phone: r.formatted_phone_number,
      address: r.formatted_address,
      website: r.website || null,
      status: 'new',
      agent: 'Scout',
      found_at: new Date().toISOString(),
      notes: "Scout 3.0 Hybrid - Unique Lead Found."
    };

    existingLeads.push(lead);
    fs.writeFileSync(LEADS_PATH, JSON.stringify(existingLeads, null, 2));

    console.log('RESULT: ' + r.name + ' (' + r.formatted_phone_number + ')');
    process.exit(0);
  }

  console.log('No new leads found.');
}

run().catch(console.error);
`;

const scoutSoul = `# Scout 3.0: The Hybrid Engine
## My Identity
I am an ultra-efficient lead generation manager.
## Process (Mandatory)
I do NOT parse raw JSON. To find a unique lead, I run:
  node /root/scout-find-lead.js "[TARGET]"

I just report the output of that command.
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('--- DEPLOYING SCOUT 3.0 (FIXED) ---');
  
  const setupScript = "cat << 'EOF' > /root/scout-find-lead.js\n" + huntToolScript + "\nEOF";
  const setupSoul = "cat << 'EOF' > /root/.openclaw/workspace/agents/scout/SOUL.md\n" + scoutSoul + "\nEOF";
  const finalCmd = setupScript + " && " + setupSoul + " && openclaw gateway restart && echo '--- DEPLOYED! ---'";

  conn.exec(finalCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      console.log('READY! Now run this in your SSH terminal:');
      console.log('openclaw agent --agent scout --message "Hunt for ' + missionTarget + '"');
      conn.end();
    }).on('data', (data) => process.stdout.write(data.toString()));
  });
}).connect(config);
