const https = require('https')
const fs = require('fs')
const net = require('net')

const API_KEY = 'AIzaSyAxBZ0khCz8Uxhi9dOzPeWjBKOT7b4lNcQ'
const LEADS_PATH = '/root/.openclaw/workspace/leads.json'
const ERRORS_PATH = '/root/.openclaw/workspace/ERRORS.md'

const industry = process.argv[2] || 'מוסך'
const city = process.argv[3] || 'תל אביב'
const limit = parseInt(process.argv[4] || '1', 10)
const query = encodeURIComponent(`${industry} ${city}`)

function logError(msg) {
  const line = `\n- [${new Date().toISOString()}] ${msg}`
  try { fs.appendFileSync(ERRORS_PATH, line) } catch {}
  console.log(`❌ ERROR: ${msg}`)
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch(e) { reject(new Error('Bad JSON: ' + data.slice(0, 100))) }
      })
    }).on('error', reject)
  })
}

function classifyLead(website) {
  if (!website) return { tier: 'gold', score: 90, label: '🥇 GOLD' }
  const social = ['facebook.com','fb.com','instagram.com','waze.com','maps.google','linktr.ee','bizportal','pages.google']
  const isSocial = social.some(d => website.toLowerCase().includes(d))
  if (isSocial) return { tier: 'silver', score: 70, label: '🥈 SILVER (social only)' }
  return { tier: 'bronze', score: 50, label: '🥉 BRONZE (has website)' }
}

function checkWhatsApp(phone) {
  return new Promise((resolve) => {
    const cleanPhone = String(phone).replace(/\D/g, '');
    const body = JSON.stringify({ phone: cleanPhone });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3003,
      path: '/check-whatsapp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(!!parsed.exists);
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

// Ensure http module is available for local Baileys queries
const http = require('http');

function checkDomainAvailability(domain) {
  return new Promise((resolve) => {
    const socket = net.createConnection(43, 'whois.isoc.org.il', () => {
      socket.write(domain + '\r\n');
    });

    let data = '';
    socket.on('data', (chunk) => {
      data += chunk.toString();
    });

    socket.on('end', () => {
      const isAvailable = data.includes('No data was found to match the request criteria');
      resolve(isAvailable);
    });

    socket.on('error', () => {
      resolve(false);
    });
  });
}

const HEBREW_MAP = {
  'מרפאת':'marpaat','מרפאה':'marpaa','שיניים':'shinayim','רופא':'rofe',
  'דוקטור':'doctor','עו"ד':'orekh-din','עורך':'orekh','דין':'din',
  'רואה':'roe','חשבון':'heshbon','מכון':'machon','מרכז':'merkaz',
  'קליניקה':'clinica','בית':'beit','ספר':'sefer','מספרה':'mispara',
  'מוסך':'mosach','פתח':'petach','תקווה':'tikva','רמת':'ramat','גן':'gan',
  'ראשון':'rishon','לציון':'lezion','חיפה':'haifa','ירושלים':'jerusalem',
  'תל':'tel','אביב':'aviv','אילת':'eilat','אשדוד':'ashdod','באר':'beer','שבע':'sheva'
};

const TRANSLIT = {
  'א':'a','ב':'b','ג':'g','ד':'d','ה':'h','ו':'v','ז':'z','ח':'ch','ט':'t','י':'i','כ':'k','ך':'ch','ל':'l','מ':'m','ם':'m','נ':'n','ן':'n','ס':'s','ע':'a','פ':'p','ף':'p','צ':'tz','ץ':'tz','ק':'k','ר':'r','ש':'sh','ת':'t'
};

function generateSlug(name) {
  let base = (name || 'site').trim().toLowerCase();
  for (const [heb, eng] of Object.entries(HEBREW_MAP)) {
    base = base.replace(new RegExp(heb, 'g'), eng);
  }
  // Transliterate any remaining Hebrew characters to English phonetics
  base = base.split('').map(char => TRANSLIT[char] || char).join('');
  base = base.replace(/\s+/g, '-');
  let slug = base.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!slug || slug.length < 2) slug = 'lead-' + Date.now().toString().slice(-6);
  return slug;
}

async function run() {
  console.log(`🔍 Searching: ${industry} in ${city}...`)

  let search
  try {
    search = await get(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&region=il&language=iw&key=${API_KEY}`
    )
  } catch(e) {
    logError(`Maps API textsearch failed: ${e.message}`)
    process.exit(1)
  }

  if (!search.results?.length) {
    logError(`No results for: ${industry} ${city}`)
    process.exit(1)
  }

  // Load existing leads for duplicate check
  let leads = []
  try { leads = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf8')) } catch {}
  const existingPhones = new Set(leads.map(l => l.phone).filter(Boolean))

  let savedCount = 0;
  for (const place of search.results) {
    if (savedCount >= limit) {
      console.log(`🏁 Reached limit of ${limit} saved leads. Stopping.`);
      process.exit(0);
    }

    let details
    try {
      details = await get(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,website,formatted_address,rating,user_ratings_total&region=il&key=${API_KEY}`
      )
    } catch(e) {
      logError(`Place details failed for ${place.name}: ${e.message}`)
      continue
    }

    const r = details.result
    if (!r.formatted_phone_number) {
      console.log(`  Skip (no phone): ${r.name}`)
      continue
    }

    // Review Filters
    const ratingsCount = r.user_ratings_total || 0;
    const ratingValue = r.rating || 0;
    if (ratingsCount < 5) {
      console.log(`  Skip (low reviews count: ${ratingsCount}): ${r.name}`);
      continue;
    }
    if (ratingValue < 3.5) {
      console.log(`  Skip (low rating: ${ratingValue}): ${r.name}`);
      continue;
    }

    // MOBILE-ONLY filter — WhatsApp only delivers to mobile (Israeli 05X).
    // Reject landlines (02/03/04/08/09), 1-700/1-800, *XXX service numbers.
    const phoneDigits = String(r.formatted_phone_number).replace(/\D/g, '');
    const canon = phoneDigits.startsWith('972') ? phoneDigits.slice(3)
                : phoneDigits.startsWith('0')   ? phoneDigits.slice(1)
                : phoneDigits;
    if (!/^5[0-9]{8}$/.test(canon)) {
      console.log(`  Skip (non-mobile ${r.formatted_phone_number}): ${r.name}`);
      continue;
    }

    // WhatsApp presence check
    console.log(`  Checking WhatsApp for ${r.name} (${r.formatted_phone_number})...`);
    const onWhatsApp = await checkWhatsApp(r.formatted_phone_number);
    if (!onWhatsApp) {
      console.log(`  Skip (not on WhatsApp): ${r.name} (${r.formatted_phone_number})`);
      continue;
    }

    // Duplicate check
    if (existingPhones.has(r.formatted_phone_number)) {
      console.log(`  Skip (duplicate): ${r.name} ${r.formatted_phone_number}`)
      continue
    }

    const { tier, score, label } = classifyLead(r.website)

    // Skip bronze unless no gold/silver found after all results
    if (tier === 'bronze') {
      console.log(`  Skip bronze for now: ${r.name}`)
      continue
    }

    // Check domain availability
    const slug = generateSlug(r.name);
    const domain = `${slug}.co.il`;
    console.log(`  Checking domain availability for ${domain}...`);
    const isDomainAvailable = await checkDomainAvailability(domain);
    console.log(`  Domain ${domain} available: ${isDomainAvailable}`);

    const lead = {
      id: `lead-${Date.now()}`,
      company: r.name,
      contact: r.formatted_phone_number || null,
      phone: r.formatted_phone_number,
      address: r.formatted_address || city,
      website: r.website || null,
      industry,
      city,
      tier,
      score,
      status: 'new',
      agent: 'Scout',
      found_at: new Date().toISOString(),
      notes: `${label} | Found via Maps API. ${r.website ? 'Website: ' + r.website : 'No website found.'} Ready for Pen.`,
      suggested_domain: domain,
      domain_available: isDomainAvailable,
      rating: ratingValue,
      reviews: ratingsCount
    }

    leads.push(lead)
    existingPhones.add(r.formatted_phone_number)
    fs.writeFileSync(LEADS_PATH, JSON.stringify(leads, null, 2))

    console.log(`\n${label}`)
    console.log(`  Company : ${r.name}`)
    console.log(`  Phone   : ${r.formatted_phone_number}`)
    console.log(`  Address : ${r.formatted_address}`)
    console.log(`  Website : ${r.website || 'NONE'}`)
    console.log(`  Score   : ${score}/100`)
    console.log(`  Domain  : ${domain} (available: ${isDomainAvailable})`)
    console.log(`💾 Saved to leads.json`)
    
    savedCount++;
  }

  if (savedCount > 0) {
    console.log(`\n✅ Done! Saved ${savedCount} new leads to leads.json`);
    process.exit(0);
  }

  logError(`No gold/silver leads found for: ${industry} ${city}. Try different search.`)
  console.log('💡 Tip: Try a different city or industry')
  process.exit(1)
}

run().catch(e => {
  logError(e.message)
  process.exit(1)
})
