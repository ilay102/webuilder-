const fs = require('fs');
const path = require('path');

const MAX_DAILY_OUTBOUND = 2;
const WORKSPACE = '/root/.openclaw/workspace';
const LEADS_FILE = path.join(WORKSPACE, 'leads.json');
const APPROVALS_FILE = path.join(WORKSPACE, 'approvals.json');

const TEMPLATE_1 = "היי [שם פרטי], נתקלתי בכם בחיפושים ל[תחום] ב[עיר]. קוראים לי עילאי, סטודנט להנדסה באריאל. שמתי לב שאין לכם עדיין אתר מסודר. אני בדיוק עובד על פרויקט לבניית תיק עבודות, והחלטתי לעצב סקיצה ראשונית של אתר בחינם לגמרי, כדי שיהיה לי מה להציג בפורטפוליו. האם תהיו מעוניינים לקבל ממני סקיצה כזו (בחינם לגמרי) שאשלח לכם לפה להתרשמות? (אם פחות זורם, הכל מעולה!)";

const TEMPLATE_2 = "היי [שם פרטי], נתקלתי בכם בחיפושים ל[תחום] ב[עיר]. קוראים לי עילאי, סטודנט להנדסה באריאל. שמתי לב שהנוכחות שלכם כרגע מתבססת בעיקר על רשתות חברתיות. אני בדיוק מריץ פרויקט לבניית פורטפוליו והחלטתי לעצב סקיצה ראשונית של אתר בחינם לגמרי, כדי שיהיה לי מה להציג בתיק העבודות שלי. האם תהיו מעוניינים שאעצב עבורכם קונספט ראשוני (בחינם לגמרי) ואשלח לכם להתרשמות? (אם פחות זורם, הכל מעולה!)";

const ALLOWED_INDUSTRIES = ['רופא שיניים', 'מרפאת שיניים', 'dental'];

function getTodayString() { return new Date().toISOString().split('T')[0]; }

async function run() {
    if (!fs.existsSync(LEADS_FILE)) return;
    const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    let approvals = fs.existsSync(APPROVALS_FILE) ? JSON.parse(fs.readFileSync(APPROVALS_FILE, 'utf8')) : [];

    const today = getTodayString();
    const todayCount = approvals.filter(a => a.timestamp && a.timestamp.startsWith(today)).length;
    console.log("Skipping limit for test...");

    let quotaRemaining = MAX_DAILY_OUTBOUND - todayCount;
    for (const lead of leads) {
        if (quotaRemaining <= 0) break;
        if (lead.status !== 'new' && lead.status !== 'fresh') continue;
        if (lead.manual_override || approvals.some(a => a.lead_id === lead.id)) continue;

        const leadType = (lead.type || "").toLowerCase();
        const isAllowed = ALLOWED_INDUSTRIES.some(ind => leadType.includes(ind.toLowerCase()) || (lead.company && lead.company.includes(ind)));
        if (!isAllowed) continue;

        let template = (lead.notes && (lead.notes.toLowerCase().includes('facebook') || lead.notes.toLowerCase().includes('instagram'))) ? TEMPLATE_2 : TEMPLATE_1;

        const name = lead.owner_name || lead.company || "יקר/ה";
        const message = template.replace(/\[שם פרטי\]/g, name).replace(/\[תחום\]/g, lead.type || "עסק").replace(/\[עיר\]/g, lead.city || "האזור");

        approvals.push({
            id: `outreach-${lead.id}-${Date.now()}`,
            lead_id: lead.id,
            phone: lead.phone,
            title: lead.company,
            body: message,
            status: "drafted",
            urgency: "high",
            type: "message",
            agent: "Pen",
            timestamp: new Date().toISOString()
        });
        lead.status = 'drafted';
        quotaRemaining--;
    }
    fs.writeFileSync(APPROVALS_FILE, JSON.stringify(approvals, null, 2));
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
    console.log('✅ VPS Script Updated!');
}
run();
