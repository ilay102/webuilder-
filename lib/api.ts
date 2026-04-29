import type { Task, CronJob, MemoryEntry, Doc, Lead, Approval, SystemStatus, Client } from './types'

// Browser on HTTPS (Vercel) → relative URLs so Next.js rewrite proxies to VPS
//   server-side — avoids mixed-content blocking (HTTPS page → HTTP fetch).
// Browser on HTTP (local dev) → hit VPS directly, same as before; no proxy hop.
// Server (SSR) → always use absolute VPS URL.
const VPS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000'
const BASE =
  typeof window !== 'undefined'
    ? (location.protocol === 'https:' ? '' : VPS_URL)
    : VPS_URL

async function get<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${BASE}/api${path}`, { cache: 'no-store' })
    if (!res.ok) return fallback
    return res.json() as Promise<T>
  } catch {
    return fallback
  }
}

export async function approve(id: string): Promise<void> {
  await fetch(`${BASE}/api/approvals/${id}/approve`, { method: 'POST' }).catch(() => {})
}

export async function reject(id: string): Promise<void> {
  await fetch(`${BASE}/api/approvals/${id}/reject`, { method: 'POST' }).catch(() => {})
}

export async function updateTaskStatus(id: string, status: string): Promise<void> {
  await fetch(`${BASE}/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }).catch(() => {})
}

// ── Fetchers with mock fallbacks ──────────────────────────────────────────────

export const fetchTasks     = () => get<Task[]>('/tasks', MOCK_TASKS)
export const fetchCalendar  = () => get<CronJob[]>('/calendar', MOCK_CRONS)
export const fetchMemory    = () => get<MemoryEntry[]>('/memory', MOCK_MEMORY)
export const fetchDocs      = () => get<Doc[]>('/docs', MOCK_DOCS)
export const fetchLeads     = () => get<Lead[]>('/leads', MOCK_LEADS)
export const fetchApprovals = () => get<Approval[]>('/approvals', MOCK_APPROVALS)
export const fetchStatus    = () => get<SystemStatus>('/status', MOCK_STATUS)
export const fetchClients   = () => get<Client[]>('/clients', [])

export async function saveClient(payload: Partial<Client> & { slug: string }): Promise<Client | null> {
  try {
    const res = await fetch(`${BASE}/api/clients/${payload.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error()
    return res.json()
  } catch { return null }
}

export async function createClient(payload: Partial<Client> & { slug: string }): Promise<Client | null> {
  try {
    const res = await fetch(`${BASE}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error()
    return res.json()
  } catch { return null }
}

export async function churnClient(slug: string): Promise<void> {
  await fetch(`${BASE}/api/clients/${slug}`, { method: 'DELETE' }).catch(() => {})
}

export async function lockClient(slug: string): Promise<void> {
  await fetch(`${BASE}/api/clients/${slug}/lock`, { method: 'POST' }).catch(() => {})
}

// ── Demo factory ──────────────────────────────────────────────────────────────

export interface CreateDemoInput {
  template?:    'dental' | 'accountant' | 'lawyer';
  slug:         string;
  businessName: string;
  city?:        string;
  phone?:       string;
  email?:       string;
  whatsapp?:    string;
  domain?:      string | null;
  hours?:       string;
}

export async function createDemo(
  input: CreateDemoInput,
): Promise<{ ok: boolean; url?: string; intakeUrl?: string; slug?: string; error?: string }> {
  try {
    const res = await fetch('/api/demo/create', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` };
    return { ok: true, url: data.url, intakeUrl: data.intakeUrl, slug: data.slug };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Network error' };
  }
}

// ── Polar.sh (replaces Lemon Squeezy) ────────────────────────────────────────

export async function createPolarCheckout(
  slug:    string,
  opts:    { email?: string; name?: string; product?: 'site' | 'maintenance' } = {},
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const res = await fetch('/api/polar/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, product: opts.product ?? 'site', ...opts }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` }
    return { ok: true, url: data.url }
  } catch (e: any) {
    return { ok: false, error: e.message || 'Network error' }
  }
}

/** @deprecated — use createPolarCheckout */
export const createLSCheckout = createPolarCheckout

// ── Pool Review ───────────────────────────────────────────────────────────────

export type PoolReviewImage = {
  id: string
  subtype: 'heroes' | 'patients'
  url: string
  size: number
  addedAt: string
}

export type PoolReviewText = {
  id: string
  vibe?: string
  copy?: Record<string, string>
  services?: Array<{ title: string; desc?: string; icon?: string }>
  testimonials?: Array<{ name: string; quote: string }>
  stats?: Array<{ label: string; value: string }>
  addedAt?: string
}

export type PoolReviewData = {
  images: { heroes: PoolReviewImage[]; patients: PoolReviewImage[] }
  texts: PoolReviewText[]
  stats: {
    imagePool: { available: number; inUse: number; locked: number; total: number }
    textPool:  { available: number; inUse: number; locked: number; total: number }
    pending:   { heroes: number; patients: number; texts: number }
  }
}

const POOL_REVIEW_FALLBACK: PoolReviewData = {
  images: { heroes: [], patients: [] },
  texts: [],
  stats: {
    imagePool: { available: 0, inUse: 0, locked: 0, total: 0 },
    textPool:  { available: 0, inUse: 0, locked: 0, total: 0 },
    pending:   { heroes: 0, patients: 0, texts: 0 },
  },
}

export const fetchPoolReview = () =>
  get<PoolReviewData>('/pool-review/candidates', POOL_REVIEW_FALLBACK)

export async function approvePoolItem(
  type: 'image' | 'text',
  id: string,
  subtype?: 'heroes' | 'patients',
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE}/api/pool-review/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, subtype }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message || 'Network error' }
  }
}

export async function rejectPoolItem(
  type: 'image' | 'text',
  id: string,
  subtype?: 'heroes' | 'patients',
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE}/api/pool-review/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, subtype }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message || 'Network error' }
  }
}

// ── Mock data (shown when server is unreachable) ──────────────────────────────

const MOCK_TASKS: Task[] = [
  { id:'t1', title:'מצא עסקים ללא אתר — אזור תל אביב', description:'Google Maps — מסעדות, קוסמטיקאיות, חנויות ללא אתר אינטרנט. מטרה: 30 עסקים', status:'done', priority:'high', agent:'Chad', created_at:'2026-03-24T09:00:00Z', updated_at:'2026-03-24T11:30:00Z', tags:['leads','google-maps'] },
  { id:'t2', title:'כתוב הודעות WhatsApp לקבוצה ראשונה', description:'10 הודעות מותאמות אישית בעברית לעסקים שנמצאו אתמול', status:'done', priority:'high', agent:'Chad', created_at:'2026-03-25T08:00:00Z', updated_at:'2026-03-25T10:00:00Z', tags:['whatsapp','outreach'] },
  { id:'t3', title:'מעקב אחרי "מספרת אלגנס" — ראשון לציון', description:'פתחו הודעה פעמיים, לא ענו. שלח הודעת מעקב עדינה', status:'in_progress', priority:'high', agent:'Chad', created_at:'2026-03-26T08:00:00Z', updated_at:'2026-03-26T09:15:00Z', tags:['followup','whatsapp'] },
  { id:'t4', title:'סרוק Google Maps — אזור חיפה', description:'קטגוריות: מסגריות, מוסכים, מכבסות — עסקים בלי אתר', status:'in_progress', priority:'medium', agent:'Chad', created_at:'2026-03-26T09:00:00Z', updated_at:'2026-03-26T09:00:00Z', tags:['research','google-maps'] },
  { id:'t5', title:'עדכן ניקוד לידים לפי תגובות', description:'התאם משקלות על בסיס שיעורי תגובה מ-2 שבועות אחרונים', status:'review', priority:'medium', agent:'Chad', created_at:'2026-03-25T14:00:00Z', updated_at:'2026-03-26T08:30:00Z', tags:['analytics'] },
  { id:'t6', title:'כתוב 3 וריאנטים של הודעת פתיחה', description:'גישות שונות: ישירה, סקרנות, הצגה עצמית', status:'backlog', priority:'low', agent:'Chad', created_at:'2026-03-26T07:00:00Z', updated_at:'2026-03-26T07:00:00Z', tags:['templates','copy'] },
  { id:'t7', title:'מחקר מחירי מתחרים', description:'אתרי מחירים של 10 חברות בניית אתרים בישראל', status:'backlog', priority:'low', agent:'Chad', created_at:'2026-03-26T07:00:00Z', updated_at:'2026-03-26T07:00:00Z', tags:['research','competitive'] },
]

const MOCK_CRONS: CronJob[] = [
  { id:'c1', name:'סריקת לידים יומית — Google Maps', schedule:'0 9 * * 0-3', description:'סרוק 30 עסקים ללא אתר ב-Google Maps — ראשון עד רביעי בשעה 9:00', last_run:'2026-03-26T07:00:00Z', next_run:'2026-03-29T07:00:00Z', status:'active', agent:'Chad' },
  { id:'c2', name:'בדיקת תגובות — WhatsApp + אימייל', schedule:'*/15 7-20 * * 0-4', description:'בדוק הודעות נכנסות כל 15 דקות בשעות עבודה', last_run:'2026-03-26T09:45:00Z', next_run:'2026-03-26T10:00:00Z', status:'active', agent:'Chad' },
  { id:'c3', name:'דוח שבועי לאילאי', schedule:'0 8 * * 0', description:'צור דוח ביצועים שבועי: הודעות שנשלחו, תגובות, לידים מוסמכים', last_run:'2026-03-22T06:00:00Z', next_run:'2026-03-29T06:00:00Z', status:'active', agent:'Chad' },
  { id:'c4', name:'עדכון ניקוד לידים', schedule:'0 20 * * 0-3', description:'חשב מחדש ניקוד לידים על בסיס פעילות — בסוף יום עסקים', last_run:'2026-03-25T18:00:00Z', next_run:'2026-03-26T18:00:00Z', status:'active', agent:'Chad' },
  { id:'c5', name:'מעקב הודעות — שליחה אוטומטית', schedule:'0 10 * * 0-3', description:'שלח הודעות מעקב לעסקים שלא ענו תוך 48 שעות (מקסימום 2 ביום)', last_run:'2026-03-26T08:00:00Z', next_run:'2026-03-27T08:00:00Z', status:'active', agent:'Chad' },
  { id:'c6', name:'שמירת שבת — חסימת שליחה', schedule:'0 17 * * 5', description:'חסום שליחת הודעות מהשקיעה בשישי עד שבת בלילה', last_run:'2026-03-20T15:00:00Z', next_run:'2026-03-27T15:00:00Z', status:'active', agent:'Chad' },
]

const MOCK_MEMORY: MemoryEntry[] = [
  { id:'m1', date:'2026-03-26', title:'תוכנית יום — יום רביעי', content:`בוקר טוב. היום אני מתמקד ב:
1. מעקב אחרי "מספרת אלגנס" — פתחו הודעה פעמיים
2. סריקת 30 לידים חדשים מ-Google Maps, אזור חיפה
3. עדכון ניקוד לידים

אילאי אישר את קבוצת ההודעות מאתמול. 3 תגובות הגיעו בלילה:
- "פיצה מאמא" — מעוניינים, שאלו מחיר
- "קליניקת יופי שיר" — לא עכשיו
- "מוסך בן-דוד" — ללא מענה, נשלח מעקב

שולחים היום: WhatsApp × 2 (מקסימום יומי)`, tags:['plan','daily'], agent:'Chad' },
  { id:'m2', date:'2026-03-25', title:'סיכום יום — שלישי', content:`שלחתי 2 הודעות WhatsApp + 15 אימיילים.

תגובות WhatsApp (2/2 נפתחו):
- "ספא ורד" — תגובה חיובית! עברה ל"מוסמכים"
- "חנות פרחים מרים" — "לא מעוניינת בינתיים"

תגובות אימייל (שיעור פתיחה: 40%):
- 2 תגובות חיוביות
- 1 הסרה מרשימה

לידים חדשים שנמצאו: 18 (Google Maps, נצרת עילית)`, tags:['eod','summary'], agent:'Chad' },
  { id:'m3', date:'2026-03-24', title:'מחקר — עסקים ללא אתר', content:`מיפיתי את אזור תל אביב-יפו. ממצאים:
- מסעדות: ~40% ללא אתר מסודר
- קוסמטיקאיות: ~60% ללא אתר, רק פייסבוק
- מכוניות + מוסכים: ~70% ללא אתר

פרופיל לקוח אידיאלי:
- עסק מקומי 1-10 עובדים
- פעיל בפייסבוק/אינסטגרם אבל ללא אתר
- קהל לקוחות ישראלי

נטענו 28 לידים לתוך workspace/leads.json`, tags:['research','icp'], agent:'Chad' },
]

const MOCK_DOCS: Doc[] = [
  { id:'d1', title:'דוח שבועי — שבוע 12, 2026', type:'report', content:'הודעות שנשלחו: 32 (WhatsApp: 10, אימייל: 22)\nשיעור פתיחה: 55%\nשיעור תגובה: 22%\nלידים מוסמכים: 4\nפגישות שנקבעו: 1\n\nהודעה הכי אפקטיבית:\n"שלום [שם], שמתי לב שלעסק שלך אין אתר — אני בונה אתרים לעסקים קטנים ב-[עיר], רוצה לשמוע?"\n\nיום הכי טוב לשלוח: ראשון 9-11 בבוקר', created_at:'2026-03-24T07:05:00Z', agent:'Chad', size:1800 },
  { id:'d2', title:'ספא ורד — פרופיל ליד מוסמך', type:'report', content:'עסק: ספא ורד\nאיש קשר: ורד כהן, בעלים\nטלפון: 052-XXXXXXX\nאינסטגרם: @spa_vered_tlv\nגודל: עסק 1 אדם\nמיקום: תל אביב\n\nכאב: "לקוחות לא מוצאים אותי בגוגל"\nגישת מכירה מומלצת: הראה דוגמאות דומות, הדגש SEO מקומי\nסטטוס: אישר פגישת זום ביום ראשון', created_at:'2026-03-25T09:00:00Z', agent:'Chad', size:1200 },
  { id:'d3', title:'תבנית הודעת פתיחה v3 — WhatsApp', type:'email', content:'שלום [שם],\n\nשמתי לב של[שם העסק] אין עדיין אתר אינטרנט.\n\nאני בונה אתרים לעסקים קטנים ב[עיר] — מחיר סביר, תוצאה מקצועית.\n\nרוצה שאשלח לך דוגמאות? 🙂', created_at:'2026-03-23T12:00:00Z', agent:'Chad', size:480 },
  { id:'d4', title:'הגדרת לקוח אידיאלי — ICP', type:'summary', content:'לקוח אידיאלי:\n- סוג עסק: מקומי קטן (מסעדה, ספא, קוסמטיקה, מוסך, פרחים)\n- אזור: כל הארץ (עדיפות מרכז)\n- גודל: 1-10 עובדים\n- מאפיין: פעיל בפייסבוק/אינסטגרם אבל ללא אתר\n- כאב: "לא נמצאים בגוגל", "לקוחות לא מוצאים אותנו"\n- תקציב משוער: 2,000-8,000 ₪', created_at:'2026-03-22T10:00:00Z', agent:'Chad', size:720 },
]

const MOCK_LEADS: Lead[] = [
  { id:'l1', company:'ספא ורד', contact:'ורד כהן', linkedin:'@spa_vered_tlv', industry:'ספא וקוסמטיקה', size:'1', status:'qualified', notes:'ענתה בחיוביות. כאב: "לא נמצאת בגוגל". פגישת זום ביום ראשון.', found_at:'2026-03-24T09:30:00Z', agent:'Chad', score:94 },
  { id:'l2', company:'מספרת אלגנס', contact:'אלי ברכה', industry:'מספרה', size:'2', status:'contacted', notes:'פתחה הודעה פעמיים. לא ענתה. מעקב קבוע.', found_at:'2026-03-24T10:00:00Z', agent:'Chad', score:76 },
  { id:'l3', company:'פיצה מאמא', contact:'דוד לוי', industry:'מסעדה', size:'5', status:'replied', notes:'שאלו על מחיר. שלח הצעת מחיר עם דוגמאות.', found_at:'2026-03-26T08:15:00Z', agent:'Chad', score:82 },
  { id:'l4', company:'קליניקת יופי שיר', contact:'שיר מזרחי', industry:'קוסמטיקה', size:'1', status:'lost', notes:'ענתה: "לא עכשיו". נרשם לחזור עוד 3 חודשים.', found_at:'2026-03-23T11:00:00Z', agent:'Chad', score:48 },
  { id:'l5', company:'מוסך בן-דוד', contact:'יוסי בן-דוד', industry:'מוסך', size:'3', status:'new', notes:'נמצא ב-Google Maps. אין אתר, יש פייסבוק עם 400 עוקבים.', found_at:'2026-03-26T08:30:00Z', agent:'Chad', score:71 },
  { id:'l6', company:'חנות פרחים נופר', contact:'נופר אברהם', industry:'פרחים', size:'2', status:'contacted', notes:'נשלחה הודעה ראשונה. לא נפתחה עדיין.', found_at:'2026-03-25T09:00:00Z', agent:'Chad', score:63 },
  { id:'l7', company:'גן ילדים שמש', contact:'רחל שמש', industry:'חינוך', size:'4', status:'new', notes:'אתר ישן מ-2015. קהל הורים פעיל בוואטסאפ.', found_at:'2026-03-26T09:00:00Z', agent:'Chad', score:68 },
  { id:'l8', company:'סטודיו פילאטיס אור', contact:'אור גולן', industry:'כושר', size:'2', status:'new', notes:'רק אינסטגרם. 1,200 עוקבים. אין אתר.', found_at:'2026-03-26T09:15:00Z', agent:'Chad', score:79 },
]

const MOCK_APPROVALS: Approval[] = [
  { id:'a1', title:'שלח מעקב ל"מספרת אלגנס"', body:'שלום אלי,\n\nהתקשרתי פעם לפני כמה ימים לגבי בניית אתר למספרה שלך.\n\nאם זה לא הזמן הנכון — אין בעיה בכלל! רק רציתי לוודא שהגיע 🙂\n\nיש לי כמה דוגמאות של אתרים שבניתי למספרות באזורך — אשמח לשלוח אם מעניין.\n\nבברכה,\nChad', type:'message', agent:'Chad', created_at:'2026-03-26T09:00:00Z', urgency:'high', metadata:{ to:'+972-XXX-XXXXX', platform:'WhatsApp', company:'מספרת אלגנס' } },
  { id:'a2', title:'שלח הצעת מחיר ל"פיצה מאמא"', body:'שלום דוד,\n\nשמחתי לשמוע! הנה הצעה ראשונית:\n\n• אתר מקצועי 5 עמודים: 3,500 ₪\n• עיצוב מותאם, ניהול קל\n• כולל: תפריט, גלריה, יצירת קשר, Google Maps\n• אחריות 3 חודשים\n\nאוכל לשלוח כמה דוגמאות של אתרים למסעדות?', type:'message', agent:'Chad', created_at:'2026-03-26T09:30:00Z', urgency:'high', metadata:{ to:'+972-XXX-XXXXX', platform:'WhatsApp', company:'פיצה מאמא' } },
  { id:'a3', title:'שלח הודעת פתיחה ל"מוסך בן-דוד"', body:'שלום יוסי,\n\nשמתי לב שלמוסך שלך אין עדיין אתר אינטרנט.\n\nאני בונה אתרים לעסקים קטנים ב-[עיר] — מחיר סביר, תוצאה מקצועית.\n\nרוצה שאשלח לך דוגמאות? 🙂', type:'message', agent:'Chad', created_at:'2026-03-26T10:00:00Z', urgency:'medium', metadata:{ to:'+972-XXX-XXXXX', platform:'WhatsApp', company:'מוסך בן-דוד' } },
]

const MOCK_STATUS: SystemStatus = {
  daemon: 'active',
  agents_running: 1,
  uptime: '7d 4h 12m',
  last_sync: new Date().toISOString(),
  server_ip: '204.168.207.116',
}
