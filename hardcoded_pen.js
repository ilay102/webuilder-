const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const MAX_DAILY_OUTBOUND = 5; // Safe daily quota
const WORKSPACE = process.env.WORKSPACE_PATH || '/root/.openclaw/workspace';
const LEADS_FILE = path.join(WORKSPACE, 'leads.json');
const APPROVALS_FILE = path.join(WORKSPACE, 'approvals.json');

// Hebrew slug mapping (mirrors simple-jj)
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
  // Transliterate remaining Hebrew characters to English phonetics
  base = base.split('').map(char => TRANSLIT[char] || char).join('');
  base = base.replace(/\s+/g, '-');
  let slug = base.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!slug || slug.length < 2) slug = 'lead-' + Date.now().toString().slice(-6);
  return slug + '-demo';
}

function templateForIndustry(industry, companyName = '') {
  const s = String(industry || '').toLowerCase();
  const c = String(companyName || '').toLowerCase();
  
  // 1. Dental
  if (s.includes('רופא שיניים') || s.includes('מרפאת שיניים') || s.includes('dental') ||
      c.includes('רופא שיניים') || c.includes('מרפאת שיניים') || c.includes('dental')) {
    return 'dental';
  }
  
  // 2. Garage
  if (s.includes('מוסך') || s.includes('garage') || s.includes('פחחות') ||
      c.includes('מוסך') || c.includes('garage') || c.includes('פחחות')) {
    return 'garage';
  }
  
  // 3. Beauty / Cosmetics / Nails (must check before hair to avoid misclassifying cosmetics salons as hair salons)
  const beautyKeywords = [
    'קוסמטיקה', 'קוסמטיקאית', 'לק ג\'ל', 'מניקור', 'פדיקור', 'איפור', 'גבות', 'טיפולי פנים', 'מכון יופי',
    'cosmetics', 'beauty', 'nails', 'nail', 'skincare', 'clinic'
  ];
  if (beautyKeywords.some(k => s.includes(k) || c.includes(k))) {
    return 'beauty';
  }
  
  // 4. Barber (men's)
  if (s.includes('ברבר') || s.includes('מספרת גברים') || s.includes('מספרה לגברים') || s.includes('barber') ||
      c.includes('ברבר') || c.includes('מספרת גברים') || c.includes('מספרה לגברים') || c.includes('barber')) {
    return 'barber';
  }
  
  // 5. Salon (women's hair)
  if (s.includes('סלון שיער') || s.includes('מספרה לנשים') || s.includes('מעצב שיער') || s.includes('מעצבת שיער') || s.includes('צבעי שיער') || s.includes('hair salon') ||
      c.includes('סלון שיער') || c.includes('מספרה לנשים') || c.includes('מעצב שיער') || c.includes('מעצבת שיער') || c.includes('צבעי שיער') || c.includes('hair salon')) {
    return 'salon';
  }
  
  // If it's a generic "מספרה" (hair salon / barbershop)
  if (s.includes('מספרה') || s.includes('ספרות') || c.includes('מספרה') || c.includes('ספרות')) {
    return 'barber';
  }
  
  // If it's a generic "סלון יופי", default to beauty (cosmetics)
  if (s.includes('סלון יופי') || c.includes('סלון יופי') || s.includes('salon') || c.includes('salon')) {
    return 'beauty';
  }
  
  return 'dental'; // fallback
}

function hebrewSafeName(name) {
  if (!name) return '';
  const cleaned = String(name).replace(/[^[\u0590-\u05FF\s\-'"\.]+/g, '').replace(/\s+/g, ' ').trim();
  return (cleaned.length >= 2) ? cleaned : '';
}

// Only companies with these types/industries will be contacted
const ALLOWED_INDUSTRIES = [
  'רופא שיניים', 'מרפאת שיניים', 'dental', 
  'מוסך', 'garage', 'פחחות', 
  'ברבר', 'מספרת גברים', 'מספרה לגברים', 'barber', 'מספרה', 'ספרות', 
  'סלון יופי', 'סלון שיער', 'מספרה לנשים', 'מעצב שיער', 'מעצבת שיער', 'salon', 'hair',
  'קוסמטיקה', 'קוסמטיקאית', 'לק ג\'ל', 'מניקור', 'פדיקור', 'מכון יופי', 'beauty', 'cosmetics', 'nails'
];

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

async function run() {
  console.log(`🚀 Starting Hardcoded Outreach Engine (Limit: ${MAX_DAILY_OUTBOUND}/day)`);
  
  if (!fs.existsSync(LEADS_FILE)) {
    console.error("❌ Error: leads.json not found.");
    return;
  }

  const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  let approvals = [];
  if (fs.existsSync(APPROVALS_FILE)) {
    approvals = JSON.parse(fs.readFileSync(APPROVALS_FILE, 'utf8'));
  }

  // Count how many we've already drafted/sent TODAY in approvals
  const today = getTodayString();
  const todayCount = approvals.filter(a => a.timestamp && a.timestamp.startsWith(today)).length;

  if (todayCount >= MAX_DAILY_OUTBOUND) {
    console.log(`🛑 Daily limit reached (${todayCount}/${MAX_DAILY_OUTBOUND}). Stopping.`);
    return;
  }

  let quotaRemaining = MAX_DAILY_OUTBOUND - todayCount;
  let newDrafts = 0;

  for (const lead of leads) {
    if (quotaRemaining <= 0) break;

    // Skip if already processed or manual override
    if (lead.status !== 'new' && lead.status !== 'fresh') continue;
    if (lead.manual_override === true) continue;

    // Check if already in approvals queue
    if (approvals.some(a => a.lead_id === lead.id)) continue;

    // Industry Filter
    const leadType = (lead.industry || lead.type || "").toLowerCase();
    const isAllowed = ALLOWED_INDUSTRIES.some(ind => leadType.includes(ind.toLowerCase()) || (lead.company && lead.company.includes(ind)));
    if (!isAllowed) {
      console.log(`⏩ Skipping lead ${lead.id} (${lead.company}) - Industry '${leadType}' not supported.`);
      continue;
    }

    // 1. Auto-build demo at draft time
    const route = generateSlug(lead.company);
    const template = templateForIndustry(lead.industry || lead.type, lead.company);
    
    // Check if demo already exists on disk
    const demoPath = `/root/webuilder/app/${route}/content.json`;
    let demoUrl = `https://webuilder-liart.vercel.app/${route}`;
    let buildSuccess = false;

    try {
      console.log(`🔨 Building demo for ${lead.company} (${route}) using template ${template}...`);
      const cmd = `WEBUILDER_SKIP_GIT=1 npx ts-node --transpile-only /root/webuilder/scripts/new-demo.ts --skip-git --template ${template} --route ${route} --name "${lead.company.replace(/"/g, '\\"')}" --city "${lead.city || ''}" --phone "${lead.phone}" --email "ilay1bgu@gmail.com" --whatsapp "${lead.phone}"`;
      execSync(cmd, { cwd: '/root/webuilder', timeout: 30000 });
      console.log(`✅ Demo successfully generated at: ${demoUrl}`);
      buildSuccess = true;
    } catch (err) {
      console.error(`❌ Failed to build demo for ${lead.company}:`, err.message);
      // Skip if build fails (e.g. pool exhausted) to keep messages from having dead links
      continue;
    }

    if (!buildSuccess) continue;

    // 2. Draft personalized outreach message
    const cleanName = hebrewSafeName(lead.owner_name || lead.company || '');
    const greeting = cleanName ? `היי ${cleanName}` : `היי`;
    const typeLabel = lead.type || "העסק";
    const cityLabel = lead.city || "האזור";

    let actionLabel = "תור";
    if (template === 'dental') actionLabel = "תור לבדיקה";
    else if (template === 'garage') actionLabel = "טיפול לרכב";
    else if (template === 'barber' || template === 'salon') actionLabel = "תור לתספורת";
    else if (template === 'beauty') actionLabel = "תור לטיפול";

    let message = "";
    if (lead.tier === 'silver' || (lead.website && (lead.website.includes('facebook.com') || lead.website.includes('instagram.com')))) {
      message = `${greeting}, רציתי לקבוע אצלכם ${actionLabel} ושמתי לב שיש לכם רק פייסבוק/אינסטגרם ואין אתר מסודר בגוגל.
אני סטודנט להנדסה, והכנתי לכם דוגמא לאתר עצמאי שיכול לעזור לעסק שלכם. מתאים? (אם פחות זורם הכל מעולה)`;
    } else {
      message = `${greeting}, רציתי לקבוע אצלכם ${actionLabel} ושמתי לב שאין לכם אתר מסודר בגוגל.
אני סטודנט להנדסה, והכנתי לכם דוגמא לאתר שיכול לעזור לעסק שלכם. מתאים? (אם פחות זורם הכל מעולה)`;
    }

    // Replace templates placeholders
    message = message
      .replace(/\[תחום\]/g, typeLabel)
      .replace(/\[עיר\]/g, cityLabel);

    approvals.push({
      id: `outreach-${lead.id}-${Date.now()}`,
      lead_id: lead.id,
      phone: lead.phone,
      title: lead.company,
      body: message,
      message: message, // Both message and body in approvals.json
      status: "drafted",
      urgency: "high",
      type: "message",
      agent: "Pen",
      timestamp: new Date().toISOString()
    });

    // Update lead status to drafted so we don't pick it up again
    lead.status = 'drafted';
    lead.demo_url = demoUrl;
    
    newDrafts++;
    quotaRemaining--;
  }

  if (newDrafts > 0) {
    fs.writeFileSync(APPROVALS_FILE, JSON.stringify(approvals, null, 2));
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
    console.log(`✅ Drafted ${newDrafts} new messages with pre-built demo links to approvals.json.`);
  } else {
    console.log("ℹ️ No new leads eligible for drafting.");
  }
}

run().catch(console.error);
