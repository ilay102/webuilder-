/**
 * /scope — public page describing what each tier includes and what's out of scope.
 * Linked from JJ pricing template + from the intake form. Sets honest expectations
 * BEFORE the client pays.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title:       'מה כלול בכל מסלול · ilay studio',
  description: 'תיאור מדויק של מה כלול בכל מסלול (בסיס, סטנדרט, פרימיום) ומה לא — לפני שאתם משלמים.',
};

const TIERS = [
  {
    id:    'basic',
    name:  'הבסיס',
    setup: '700',
    monthly: '70',
    headline: 'אתר תדמית מקצועי',
    includes: [
      'אתר מעוצב ומותאם בדיוק לעסק שלך',
      'תצוגה מושלמת בנייד וגם במחשב',
      'כפתור "התקשרו" ישיר על הטלפון',
      'הצהרת נגישות בהתאם לחוק הישראלי',
      'פורטל לעריכה עצמית — טקסטים, צבעים, לוגו, ביקורות',
      'אחסון, SSL, ושרתים — נכלל בתשלום החודשי',
    ],
    excludes: [
      'ללא יומן הזמנות אונליין',
      'ללא בוט AI',
    ],
  },
  {
    id:    'standard',
    name:  'הסטנדרט',
    setup: '1,200',
    monthly: '120',
    headline: 'אתר + יומן הזמנות אוטומטי',
    includes: [
      'הכל ממסלול הבסיס',
      'יומן הזמנות אונליין (Cal.com מובנה)',
      'תזכורות אוטומטיות בדוא"ל ללקוחות',
      'יומן ניתן לסנכרון לגוגל / iCloud',
    ],
    excludes: [
      'ללא בוט AI',
    ],
    highlight: true,
  },
  {
    id:    'premium',
    name:  'הפרימיום',
    setup: '1,900',
    monthly: '200',
    headline: 'מערכת מלאה עם בוט AI',
    includes: [
      'הכל ממסלול הסטנדרט',
      'בוט AI שעונה ללקוחות 24/7',
      'הבוט יודע לזהות לקוחות פוטנציאליים ולהפנות אותך',
      'ביקורות אמת מ-Google Maps (אוטומטי, אם יש לעסק פרופיל)',
    ],
    excludes: [],
  },
];

const NOT_INCLUDED = [
  'דומיין מותאם אישית (yourname.co.il) — תוספת ~100 ש״ח/שנה',
  'כתיבת תוכן שיווקי — אתם כותבים, אנחנו מטמיעים',
  'צילום מקצועי של העסק',
  'קמפיינים ופרסום ממומן (Google Ads, Facebook Ads)',
  'SEO מתקדם (קידום אורגני)',
  'עיצוב גרפי מותאם — לוגו חדש, פלייר, פוסט לרשתות',
];

const POST_LAUNCH = [
  'טקסטים, צבעים, לוגו, תמונות, ביקורות → הלקוח עורך לבד בפורטל, מיידי, ללא עלות',
  'הוספת סקציה חדשה / שינוי מבנה האתר → תוספת חד-פעמית 200 ש״ח',
  'שינוי קטגוריית עסק (למשל ממרפאת שיניים לאופנה) → לא אפשרי, הזמנה חדשה',
  'ביטול מנוי — בכל זמן, החזר יחסי בחודש הראשון בלבד',
];

export default function ScopePage() {
  return (
    <main style={{
      minHeight: '100vh',
      direction: 'rtl',
      background: '#FAF8F4',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      color: '#1A1A1A',
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <header style={{ marginBottom: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>שקיפות מלאה</div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>
            מה כלול בכל מסלול
          </h1>
          <p style={{ fontSize: 16, color: '#555', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            לפני התשלום — תקרא בדיוק מה אתה מקבל ומה לא. ככה אין הפתעות, ואני יכול לתת לך שירות מלא ומסודר.
          </p>
        </header>

        {/* Tier cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 48 }}>
          {TIERS.map(t => (
            <div key={t.id} style={{
              background: '#fff',
              borderRadius: 16,
              padding: 28,
              border: t.highlight ? '2px solid #2D6B55' : '1px solid #E5E5E5',
              position: 'relative',
              boxShadow: t.highlight ? '0 12px 40px rgba(45,107,85,0.12)' : '0 2px 12px rgba(0,0,0,0.04)',
            }}>
              {t.highlight && (
                <div style={{
                  position: 'absolute', top: -12, right: 20,
                  background: '#2D6B55', color: '#fff',
                  padding: '4px 14px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                }}>
                  הכי פופולרי
                </div>
              )}
              <div style={{ fontSize: 14, color: '#888', fontWeight: 600 }}>{t.headline}</div>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{t.name}</h2>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#2D6B55', margin: '12px 0' }}>
                {t.setup} <span style={{ fontSize: 14, color: '#888', fontWeight: 600 }}>₪ הקמה</span>
              </div>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
                + {t.monthly} ₪ לחודש (אחסון ושרתים)
              </div>
              <div style={{ borderTop: '1px solid #EEE', paddingTop: 16 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 1.8 }}>
                  {t.includes.map(i => <li key={i} style={{ fontSize: 14, color: '#1A1A1A' }}>✅ {i}</li>)}
                  {t.excludes.map(e => <li key={e} style={{ fontSize: 14, color: '#999' }}>❌ {e}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Out of scope */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #E5E5E5', marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>מה לא כלול בשום מסלול</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 2 }}>
            {NOT_INCLUDED.map(x => <li key={x} style={{ fontSize: 14, color: '#555' }}>• {x}</li>)}
          </ul>
        </div>

        {/* Post-launch */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #E5E5E5', marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>שינויים אחרי השקה</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 2 }}>
            {POST_LAUNCH.map(x => <li key={x} style={{ fontSize: 14, color: '#555' }}>• {x}</li>)}
          </ul>
        </div>

        {/* Footer note */}
        <div style={{ textAlign: 'center', color: '#888', fontSize: 13, marginTop: 32, paddingTop: 24, borderTop: '1px solid #E5E5E5' }}>
          שאלות? כתבו ב-WhatsApp לעילאי. הצוות עונה תוך 24 שעות.
        </div>
      </div>
    </main>
  );
}
