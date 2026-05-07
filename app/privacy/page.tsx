/**
 * /privacy — מדיניות פרטיות
 * Compliant with: חוק הגנת הפרטיות, התשמ"א-1981
 */
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title:       'מדיניות פרטיות · ilay studio',
  description: 'מדיניות פרטיות בהתאם לחוק הגנת הפרטיות התשמ"א-1981.',
};

const UPDATED = '2026-05-07';
const OWNER_NAME  = 'עילאי לנקין';
const OWNER_EMAIL = 'ilay1bgu@gmail.com';
const OWNER_PHONE = '+972-53-463-8880';

export default function PrivacyPage() {
  return (
    <Doc title="מדיניות פרטיות">
      <P>עודכן לאחרונה: {UPDATED}</P>

      <H2>1. מי אנחנו</H2>
      <P>
        שירות זה מופעל על ידי <strong>{OWNER_NAME}</strong> (״הספק״, ״אנחנו״, ״השירות״),
        סטודנט להנדסה מכנית באוניברסיטת אריאל המקים אתרים לעסקים קטנים. ניתן ליצור עמנו קשר במייל <a href={`mailto:${OWNER_EMAIL}`}>{OWNER_EMAIL}</a> או בטלפון {OWNER_PHONE}.
      </P>

      <H2>2. איזה מידע אנחנו אוספים</H2>
      <P>במסגרת מתן השירות אנו אוספים מידע מסוגים אלה:</P>
      <Ul>
        <li><strong>פרטי קשר עסקיים:</strong> שם העסק, כתובת, טלפון, כתובת מייל, שעות פעילות, שם בעלים.</li>
        <li><strong>תוכן שיווקי:</strong> תמונות, לוגו, טקסטים, ביקורות שאתם מספקים לאתר.</li>
        <li><strong>נתוני תשלום:</strong> אנחנו <em>לא</em> שומרים פרטי כרטיס אשראי. התשלום מעובד דרך <strong>Polar.sh</strong> (ספק חיצוני בארה״ב — מדיניות הפרטיות שלהם: <a href="https://polar.sh/legal/privacy" target="_blank" rel="noreferrer">polar.sh/legal/privacy</a>).</li>
        <li><strong>תכתובת WhatsApp:</strong> ההיסטוריה של ההתכתבות עם הסוכן הדיגיטלי שלנו (״JJ״) נשמרת בשרת לטובת המשך השיחה. ניתן לבקש מחיקה בכל עת.</li>
        <li><strong>נתוני שימוש:</strong> כתובת IP ומידע טכני בסיסי המתקבל מהשרת בעת פתיחת האתר. לא משתמשים בעוגיות מעקב צד שלישי.</li>
      </Ul>

      <H2>3. למה אנחנו צריכים את המידע</H2>
      <Ul>
        <li>לבנות, להפעיל ולתחזק את האתר עבורכם.</li>
        <li>לעבד תשלומים ולנהל מנוי חודשי.</li>
        <li>לתקשר עמכם בנושאים תפעוליים (ב-WhatsApp או במייל).</li>
        <li>לעמוד בחובות חוקיות (חשבוניות, נתוני מס).</li>
      </Ul>

      <H2>4. למי אנחנו מעבירים מידע</H2>
      <Ul>
        <li><strong>Polar.sh</strong> — לעיבוד תשלומים בלבד.</li>
        <li><strong>Vercel</strong> (ארה״ב) — אירוח האתר בענן.</li>
        <li><strong>Cal.com</strong> — מערכת יומן (במסלול הפרימיום בלבד, אם רלוונטי).</li>
        <li><strong>Google Gemini API</strong> — מנוע ה-AI של הסוכן (אם בחרתם בחבילת הפרימיום עם בוט).</li>
        <li>איננו מוכרים, משכירים או חולקים את המידע שלכם עם גורם שלישי לצרכים שיווקיים.</li>
      </Ul>

      <H2>5. אבטחת מידע</H2>
      <P>
        המידע נשמר בשרתים מאובטחים. תקשורת מוצפנת ב-HTTPS / TLS. כל הסיסמאות והטוקנים נשמרים מוצפנים. גיבוי יומי אוטומטי של כל הנתונים. אנו פועלים על פי שיטות העבודה המומלצות בתעשייה — אך כידוע, אין אבטחה מושלמת ואיננו יכולים להבטיח 100% מפני פריצה.
      </P>

      <H2>6. הזכויות שלכם (חוק הגנת הפרטיות, התשמ״א-1981)</H2>
      <P>בהתאם לסעיף 13 לחוק, יש לכם זכות:</P>
      <Ul>
        <li>לעיין במידע שאנו מחזיקים אודותיכם.</li>
        <li>לדרוש תיקון של מידע שגוי.</li>
        <li>לבקש את מחיקת המידע (זכות להישכח), בכפוף לחובות חוקיות (כגון חשבוניות שיש לשמור 7 שנים).</li>
        <li>להתנגד לעיבוד המידע.</li>
        <li>לקבל עותק של המידע בפורמט נייד (זכות לניוד מידע).</li>
      </Ul>
      <P>
        להפעלת זכות מהזכויות לעיל — שלחו בקשה במייל ל-<a href={`mailto:${OWNER_EMAIL}`}>{OWNER_EMAIL}</a>.
        אנו נטפל בבקשה תוך <strong>30 יום</strong>.
      </P>

      <H2>7. שמירת נתונים</H2>
      <Ul>
        <li>היסטוריית WhatsApp: עד 12 חודשים מהשיחה האחרונה.</li>
        <li>נתוני תשלום (חשבוניות): 7 שנים, כנדרש בדין המס.</li>
        <li>תוכן האתר (טקסטים, תמונות): עד שנה לאחר ביטול המנוי, ואז נמחק לצמיתות.</li>
      </Ul>

      <H2>8. עוגיות (Cookies)</H2>
      <P>
        אנו משתמשים אך ורק בעוגיות הכרחיות למתן השירות (אבטחת התחברות לפורטל הניהול). אין שימוש בעוגיות מעקב, פרסום או צד שלישי.
      </P>

      <H2>9. קטינים</H2>
      <P>השירות מיועד לבעלי עסקים בלבד ואינו מיועד לשימוש של קטינים מתחת לגיל 18.</P>

      <H2>10. שינויים במדיניות</H2>
      <P>
        אנו עשויים לעדכן את המדיניות מעת לעת. שינויים מהותיים יישלחו אליכם ב-WhatsApp או במייל לפחות 14 יום מראש.
      </P>

      <H2>11. רשם מאגרי המידע</H2>
      <P>
        השירות פועל בהתאם לחוק. במידה ויש צורך ברישום מאגר מידע — נעשה זאת בהתאם להנחיות הרשות להגנת הפרטיות. תלונות ניתן להגיש ל
        <a href="https://www.gov.il/he/departments/the_privacy_protection_authority" target="_blank" rel="noreferrer"> רשות להגנת הפרטיות במשרד המשפטים</a>.
      </P>

      <H2>12. יצירת קשר בנושא פרטיות</H2>
      <P>
        לכל שאלה — <a href={`mailto:${OWNER_EMAIL}`}>{OWNER_EMAIL}</a> | טלפון: {OWNER_PHONE}
      </P>

      <Footer>
        <Link href="/terms">תנאי שימוש</Link> · <Link href="/scope">פירוט השירות</Link>
      </Footer>
    </Doc>
  );
}

/* ── Styled primitives ──────────────────────────────────────────────────── */
function Doc({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main style={{
      minHeight: '100vh', background: '#FAF8F4', color: '#1A1A1A', direction: 'rtl',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', padding: '40px 20px',
    }}>
      <article style={{ maxWidth: 760, margin: '0 auto', background: '#fff', padding: '40px 36px', borderRadius: 16, border: '1px solid #E5E5E5', lineHeight: 1.75 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24, letterSpacing: '-0.02em' }}>{title}</h1>
        {children}
      </article>
    </main>
  );
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 28, marginBottom: 10 }}>{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14, color: '#333', marginBottom: 12 }}>{children}</p>;
}
function Ul({ children }: { children: React.ReactNode }) {
  return <ul style={{ paddingRight: 22, marginBottom: 14, fontSize: 14, color: '#333' }}>{children}</ul>;
}
function Footer({ children }: { children: React.ReactNode }) {
  return <div style={{ borderTop: '1px solid #EEE', marginTop: 28, paddingTop: 16, fontSize: 13, color: '#888' }}>{children}</div>;
}
