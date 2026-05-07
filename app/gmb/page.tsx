/**
 * /gmb — מדריך הוספת העסק לגוגל מפות (Google Business Profile).
 * נשלח ללקוח אחרי שהאתר עולה לאוויר. זה הדבר שבאמת קובע אם הוא יופיע בחיפושים.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title:       'מדריך גוגל מפות · ilay studio',
  description: 'איך להוסיף את העסק שלך לגוגל מפות תוך 10 דקות, ולקבל לקוחות מהחיפושים המקומיים.',
};

export default function GmbPage() {
  return (
    <main style={{
      minHeight: '100vh', background: '#FAF8F4', color: '#1A1A1A', direction: 'rtl',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', padding: '40px 20px',
    }}>
      <article style={{ maxWidth: 760, margin: '0 auto', background: '#fff', padding: '40px 36px', borderRadius: 16, border: '1px solid #E5E5E5', lineHeight: 1.8 }}>

        <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
          השלב הכי חשוב אחרי השקת האתר
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>
          איך להופיע ראשונים בגוגל מפות 📍
        </h1>
        <p style={{ fontSize: 15, color: '#555', marginBottom: 24 }}>
          לקוחות מחפשים בגוגל ״מרפאת שיניים [העיר שלך]״ ורואים 3 עסקים בראש העמוד עם דירוג כוכבים.
          <strong> זה הדבר היחיד שבאמת מביא לקוחות.</strong> האתר שבנינו לכם הוא ההמשך הטבעי — אבל בלי גוגל מפות, אף אחד לא ימצא אתכם.
        </p>

        <Box>
          <BoxTitle>למה זה קריטי?</BoxTitle>
          <P>70% מהקליקים בחיפוש מקומי נופלים על 3 התוצאות בכרטיס המפה — לפני התוצאות הרגילות. אם אתם לא שם, אתם לא בעסק (דיגיטלית).</P>
        </Box>

        <H2>שלב 1 · רישום (10 דקות, חד-פעמי)</H2>
        <Steps>
          <li>פתחו את <a href="https://business.google.com" target="_blank" rel="noreferrer" style={LINK}>business.google.com</a> במחשב.</li>
          <li>התחברו עם חשבון Gmail של העסק (לא אישי).</li>
          <li>חפשו את שם העסק שלכם — אם הוא כבר קיים שם, לחצו ״תבעו את הבעלות״ (Claim).</li>
          <li>אם הוא לא קיים — לחצו ״הוסף את העסק שלך״.</li>
          <li>מלאו את הפרטים: שם, קטגוריה (״רופא שיניים״), כתובת, טלפון.</li>
          <li>
            בשדה <strong>״אתר אינטרנט״</strong> — הכניסו את הכתובת החדשה שלכם (האתר שאנחנו בנינו לכם).
            זו הקפיצה הכי חשובה: גוגל מקשר ביניכם והדירוג עולה.
          </li>
          <li>אישור הבעלות — גוגל ישלח אליכם <strong>גלויה</strong> עם קוד תוך 5-10 ימי עסקים. הזינו את הקוד באתר. (לחלק מהקטגוריות יש אישור בטלפון — מהיר יותר.)</li>
        </Steps>

        <H2>שלב 2 · מילוי כל הפרטים (20 דקות)</H2>
        <P>פרופיל מלא מקבל פי 5 יותר חשיפה מפרופיל חלקי. אל תדלגו על שדות.</P>
        <Steps>
          <li><strong>שעות פעילות</strong> — כולל ימים חריגים (ערב חג, חג, חופש שנתי).</li>
          <li><strong>קטגוריות נוספות</strong> — אפשר לבחור עד 9. הוסיפו ״הלבנת שיניים״, ״שיקום הפה״, ״אורתודונט״ — כל מה שרלוונטי.</li>
          <li><strong>תיאור עסקי</strong> — 750 תווים. כתבו מה אתם עושים, באיזה עיר, ומה ייחודי בכם.</li>
          <li><strong>שירותים</strong> — הוסיפו רשימה עם מחירים אם אתם רוצים. שקיפות = אמון.</li>
          <li><strong>תמונות</strong> — לפחות 20 תמונות: חזית, חדרי טיפול, צוות, ציוד, לפני/אחרי. זה מה שמשפיע יותר מהכל.</li>
          <li><strong>וואטסאפ</strong> — תוכלו להפעיל כפתור צ׳אט שמוביל ישירות לוואטסאפ שלכם.</li>
        </Steps>

        <H2>שלב 3 · ביקורות (הדבר החשוב ביותר)</H2>
        <Box>
          <BoxTitle>מספר הביקורות הוא מספר אחד בדירוג</BoxTitle>
          <P>
            עסק עם 4.8 כוכבים ו-150 ביקורות ידחק תמיד עסק עם 5.0 כוכבים ו-3 ביקורות.
            כמות (במגבלה איכותית) עוקפת ציון מושלם.
          </P>
        </Box>
        <Steps>
          <li><strong>בקשו ביקורת מכל לקוח מרוצה</strong> — בסוף הטיפול, ב-WhatsApp.</li>
          <li>שלחו להם <strong>קישור ישיר</strong> לכתיבת ביקורת. בגוגל מפות → ״שתף״ → ״כתבו ביקורת״ — תקבלו URL ייעודי.</li>
          <li><strong>ענו על כל ביקורת</strong> תוך 24 שעות — חיובית או שלילית. גוגל מתגמל עסקים שמגיבים.</li>
          <li>על ביקורת רעה — תגיבו במקצועיות, אל תתנצחו. הצעת פתרון = לקוחות חדשים שרואים שאתם אכפתיים.</li>
          <li><strong>אל תקנו ביקורות מזויפות.</strong> גוגל מזהה את זה ומסיר את העסק לצמיתות.</li>
        </Steps>

        <H2>שלב 4 · פעילות שוטפת (5 דקות בשבוע)</H2>
        <Steps>
          <li>פוסט חדש פעם בשבוע — מבצע, חופש, שירות חדש, תמונות מהמרפאה.</li>
          <li>תמונות חדשות פעם בחודש.</li>
          <li>בדיקת Q&A (אנשים שואלים, גם אתם יכולים לכתוב שאלות נפוצות + תשובות).</li>
          <li>עדכון שעות פני חגים / סופ״ש מיוחד / חופשה.</li>
        </Steps>

        <Box style={{ background: '#E6F4EA', borderColor: '#34A853' }}>
          <BoxTitle style={{ color: '#137333' }}>צ׳קליסט מהיר — סיימו תוך שבוע</BoxTitle>
          <ul style={{ paddingRight: 22, margin: 0 }}>
            <li>☐ נרשמתי ב-business.google.com</li>
            <li>☐ אישרתי בעלות (גלויה / טלפון)</li>
            <li>☐ מילאתי שם, קטגוריה, כתובת, טלפון, שעות</li>
            <li>☐ הכנסתי את כתובת האתר שלי בשדה ״אתר אינטרנט״</li>
            <li>☐ העליתי לפחות 20 תמונות</li>
            <li>☐ ביקשתי ביקורת מ-5 לקוחות מרוצים</li>
            <li>☐ עניתי על כל ביקורת קיימת</li>
            <li>☐ פרסמתי פוסט ראשון</li>
          </ul>
        </Box>

        <H2>צריכים עזרה?</H2>
        <P>
          בכל שאלה — שלחו וואטסאפ ל-עילאי. אנחנו לא מנהלים לכם את הפרופיל (זה לא חלק מהשירות),
          אבל נשמח לכוון אם משהו לא ברור. <Link href="/scope" style={LINK}>פירוט מלא של מה כלול</Link>.
        </P>

        <div style={{ borderTop: '1px solid #EEE', marginTop: 28, paddingTop: 16, fontSize: 13, color: '#888', display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
          <Link href="/scope" style={LINK}>פירוט השירות</Link>
          <Link href="/terms" style={LINK}>תנאי שימוש</Link>
          <Link href="/privacy" style={LINK}>מדיניות פרטיות</Link>
        </div>
      </article>
    </main>
  );
}

const LINK: React.CSSProperties = { color: '#2D6B55', fontWeight: 700 };

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 32, marginBottom: 10 }}>{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14, color: '#333', marginBottom: 12, margin: 0 }}>{children}</p>;
}
function Steps({ children }: { children: React.ReactNode }) {
  return <ol style={{ paddingRight: 22, fontSize: 14, color: '#333', marginBottom: 14 }}>{children}</ol>;
}
function Box({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#FFF8E6', border: '1px solid #F4D778', borderRadius: 12, padding: '14px 18px', marginTop: 16, marginBottom: 16, ...style }}>
      {children}
    </div>
  );
}
function BoxTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6, color: '#5C4A0E', ...style }}>{children}</div>;
}
