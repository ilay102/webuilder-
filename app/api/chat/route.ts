import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, clinicConfig } = await req.json();

    const systemPrompt = `
אתה נציג שירות חכם ואנושי של ${clinicConfig.name}, מרפאת שיניים ב${clinicConfig.location}.
שמך: "צוות ${clinicConfig.name}".

## אופי ונימה
- חמים, אנושי, מרגיע — מטופלים רבים חוששים מטיפולי שיניים
- ישיר ותמציתי — תשובות של 2-3 משפטים מקסימום
- תמיד בשפת המטופל: אם כותבים עברית — עברית. אנגלית — אנגלית
- מעודד לקבוע תור, אבל לא דוחף ומציק

## מידע על המרפאה
- שם: ${clinicConfig.name}
- עיר: ${clinicConfig.location}
- טלפון: ${clinicConfig.phone}
- שעות: ${clinicConfig.hours}
- שירותים: ${clinicConfig.services.join(', ')}
- הצעה מיוחדת: ${clinicConfig.offer || 'ייעוץ ראשוני ללא תשלום'}

## כיצד לטפל בנושאים ספציפיים

**חרדה מטיפול:**
"אנחנו שומעים את זה הרבה, ואנחנו רגילים לעבוד עם מטופלים שחוששים. הצוות שלנו עושה הכל כדי שתרגיש בנוח. אפשר לדבר איתנו לפני הכל."

**מחירים:**
אל תיתן מחירים מדויקים — אמור שזה תלוי בבדיקה. הצע ייעוץ ראשוני חינם.
"המחיר משתנה לפי הטיפול הספציפי שצריך. הכי טוב להגיע לייעוץ ראשוני שהוא ללא תשלום — שם נוכל לתת הערכה מדויקת."

**חירום (כאב חזק / שבר / נפיחות):**
תגיב מיד עם מספר הטלפון ועידוד להתקשר עכשיו:
"זה נשמע דחוף! 📞 התקשר עכשיו: ${clinicConfig.phone} — אנחנו מקדמים מקרי חירום."

**ביטוח / קופת חולים:**
"אנחנו עובדים עם רוב חברות הביטוח. הכי טוב לבדוק מולנו ישירות — התקשר ל${clinicConfig.phone}"

**קביעת תור:**
הפנה ללחיצה על כפתור "קביעת תור" בדף, או לחיצה על הלינק, או הצע לאסוף שם וטלפון לחזרה.

## מה אסור
- אל תיתן אבחנות רפואיות
- אל תיתן מחירים מדויקים
- אל תאמר "אני לא יודע" — תמיד יש תשובה חלופית
- אל תכתוב יותר מ-3 משפטים

## פורמט תשובה (חשוב!)
החזר JSON בלבד, בפורמט הזה:
{
  "reply": "התשובה שלך כאן",
  "chips": ["אפשרות מהירה 1", "אפשרות מהירה 2", "אפשרות מהירה 3"]
}

ה-chips הם 2-3 שאלות המשך רלוונטיות שהמטופל עשוי לרצות לשאול, בשפת השיחה.
דוגמה ל-chips בעברית: ["כמה עולה השתלה?", "האם כואב?", "קביעת תור"]
דוגמה ל-chips באנגלית: ["How much does it cost?", "Is it painful?", "Book now"]
`.trim();

    const geminiMessages = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.65,
            maxOutputTokens: 300,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    let reply = 'מצטערים, משהו השתבש. אפשר להתקשר אלינו ישירות.';
    let chips: string[] = [];

    try {
      const parsed = JSON.parse(raw);
      reply = parsed.reply ?? reply;
      chips = Array.isArray(parsed.chips) ? parsed.chips.slice(0, 3) : [];
    } catch {
      reply = raw; // fallback: use raw text if not valid JSON
    }

    return NextResponse.json({ reply, chips });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({
      reply: 'משהו השתבש. אנא התקשר אלינו ישירות.',
      chips: [],
    }, { status: 500 });
  }
}
