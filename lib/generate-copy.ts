/**
 * AI copy generator — produces unique H1/tagline/about/CTA copy per client.
 *
 * Runs at DEMO BUILD TIME (inside scripts/new-demo.ts), not at page render.
 * The result is baked into content.json so there's no runtime cost and
 * generated copy survives even if the API key is rotated later.
 *
 * The pack's `vibe` is fed in so written tone matches visual tone — a
 * "luxe midnight gold" pack gets aspirational copy; a "forest soft" pack
 * gets warm nurturing copy. This is the secret ingredient.
 */

export interface GeneratedCopy {
  h1:           string   // Main hero headline (4-8 words, unique)
  heroSubtitle: string   // Supporting subtitle (one sentence)
  tagline:      string   // Short brand tagline (≤ 8 words)
  about:        string   // 2-3 sentence about paragraph
  ctaMain:      string   // Primary CTA button (2-3 words)
  ctaSecondary: string   // Secondary CTA
  sectionLabel: string   // Section eyebrow label
}

// Varied fallback pool — picked deterministically by businessName hash
// so each demo gets a different H1 even without a Gemini API key.
const FALLBACK_POOL: GeneratedCopy[] = [
  {
    h1:           'טיפול שיניים שהופך חוויה',
    heroSubtitle: 'מרפאה מודרנית, צוות קשוב, תוצאות שמחייכות.',
    tagline:      'חיוך בריא. נפש רגועה.',
    about:        'אנחנו מאמינים שטיפולי שיניים לא חייבים להיות מלחיצים. הצוות שלנו משקיע זמן בלהכיר כל מטופל ולהתאים פתרון שמרגיש נכון. טכנולוגיה מתקדמת, תמיד עם הלב.',
    ctaMain:      'קבע תור',
    ctaSecondary: 'דבר איתנו',
    sectionLabel: 'המרפאה שלנו',
  },
  {
    h1:           'החיוך שמגיע לך, כאן',
    heroSubtitle: 'טכנולוגיה מתקדמת, גישה אישית — תוצאות שמדברות בעד עצמן.',
    tagline:      'מקצועיות שמרגישה כמו בית.',
    about:        'כל מטופל מגיע עם סיפור שונה. אנחנו מקשיבים, מתכננים בדיוק ומלווים לאורך כל הדרך. כי החיוך שלך לא צריך להיות פשרה.',
    ctaMain:      'קבע ייעוץ',
    ctaSecondary: 'הכירו אותנו',
    sectionLabel: 'השירותים שלנו',
  },
  {
    h1:           'שיניים יפות בידיים טובות',
    heroSubtitle: 'צוות מומחים שמטפל בך כמו בבית — עם דיוק של מרפאה מובילה.',
    tagline:      'דיוק. חמימות. תוצאות.',
    about:        'אנחנו משלבים ציוד מהדור האחרון עם גישה אנושית ואמיתית. כל תור מתוכנן להיות קצר, נוח ויעיל — כי הזמן שלך יקר.',
    ctaMain:      'קבע תור עכשיו',
    ctaSecondary: 'לכל השירותים',
    sectionLabel: 'מה אנחנו מציעים',
  },
  {
    h1:           'מהפך חיוך — תור אחד',
    heroSubtitle: 'מהבדיקה הראשונה ועד החיוך המושלם — אנחנו לידך בכל שלב.',
    tagline:      'כי חיוך טוב משנה הכל.',
    about:        'לא סתם עוד מרפאה. אנחנו בנינו מקום שבו מטופלים מרגישים בטוחים, שמועים ומטופלים בידיים של אנשי מקצוע שבאמת אכפת להם.',
    ctaMain:      'התחל היום',
    ctaSecondary: 'דבר איתנו',
    sectionLabel: 'הטיפולים שלנו',
  },
  {
    h1:           'פה בריא. חיים שמחים.',
    heroSubtitle: 'מרפאה שמכבדת את הזמן שלך ומביאה תוצאות שמרגישות טבעיות.',
    tagline:      'בריאות שמתחילה בחיוך.',
    about:        'אנחנו מאמינים שבריאות הפה היא חלק מאיכות החיים. לכן אנחנו לא רק מטפלים — אנחנו מלמדים, מלווים ובונים מערכת יחסים לטווח ארוך.',
    ctaMain:      'קבע בדיקה',
    ctaSecondary: 'אודות המרפאה',
    sectionLabel: 'הגישה שלנו',
  },
]

function hashIndex(seed: string, len: number): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  return h % len
}

function getFallback(businessName: string, city = ''): GeneratedCopy {
  return FALLBACK_POOL[hashIndex(businessName + city, FALLBACK_POOL.length)]
}

interface Args {
  businessName: string
  city:         string
  template:     'dental' | 'accountant' | 'lawyer'
  packVibe:     string  // from design-packs → DesignPack.vibe
  services?:    string[]
  language?:    'he' | 'en'
  apiKey?:      string  // defaults to process.env.GEMINI_API_KEY
}

export async function generateCopy(args: Args): Promise<GeneratedCopy> {
  const apiKey = args.apiKey ?? process.env.GEMINI_API_KEY
  if (!apiKey) {
    const fb = getFallback(args.businessName, args.city)
    console.warn(`[copy] GEMINI_API_KEY not set — fallback h1="${fb.h1}"`)
    return fb
  }

  const lang = args.language ?? 'he'
  const langLabel = lang === 'he' ? 'Hebrew' : 'English'

  const systemPrompt = `You are a senior brand copywriter generating UNIQUE, distinctive website copy for a small business.

CRITICAL RULES:
- Output ONLY valid JSON, no markdown, no explanation.
- Every field must be in ${langLabel}.
- The H1 MUST be unique and specific — NEVER use generic clichés like "החיוך שלך חשוב לנו" / "הצוות המקצועי שלנו" / "Your smile matters" / "Professional care you can trust".
- Avoid competitor templates. Be distinctive.
- Match the brand personality exactly — every word should reinforce the vibe.
- Be concise. Every word earns its place.`

  const userPrompt = `Generate distinctive website hero copy for:

Business: ${args.businessName}
City: ${args.city}
Industry: ${args.template}
Brand personality / vibe: ${args.packVibe}
${args.services?.length ? `Services: ${args.services.join(', ')}` : ''}

Return this exact JSON shape (all fields ${langLabel}):
{
  "h1":           "Distinctive main headline — 4 to 8 words, evocative, NOT generic",
  "heroSubtitle": "One supporting sentence (12-20 words) that expands on the H1 with a concrete benefit",
  "tagline":      "Short brand tagline, max 8 words, memorable, ${args.packVibe.split(',')[0]}-flavored",
  "about":        "2-3 sentences (50-80 words) — what makes this clinic different. Concrete, not generic.",
  "ctaMain":      "Primary CTA button — 2 to 3 words, action verb",
  "ctaSecondary": "Secondary CTA — 2 to 3 words",
  "sectionLabel": "Eyebrow label for main section, 2-3 words, e.g. 'המרפאה שלנו' / 'Our Practice'"
}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.85,        // higher temp = more variety across clients
            maxOutputTokens: 600,
            responseMimeType: 'application/json',
          },
        }),
      },
    )

    if (!res.ok) {
      console.warn('[copy] Gemini non-200:', res.status)
      return FALLBACK
    }

    const data = await res.json() as any
    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    // Strip markdown code fences if Gemini wraps JSON in ```json ... ```
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    // Extract first valid JSON object if there's surrounding text
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    raw = jsonMatch ? jsonMatch[0] : raw
    const parsed = JSON.parse(raw)

    // Validate all fields present; fall back per-field if missing
    return {
      h1:           (parsed.h1           || FALLBACK.h1).trim(),
      heroSubtitle: (parsed.heroSubtitle || FALLBACK.heroSubtitle).trim(),
      tagline:      (parsed.tagline      || FALLBACK.tagline).trim(),
      about:        (parsed.about        || FALLBACK.about).trim(),
      ctaMain:      (parsed.ctaMain      || FALLBACK.ctaMain).trim(),
      ctaSecondary: (parsed.ctaSecondary || FALLBACK.ctaSecondary).trim(),
      sectionLabel: (parsed.sectionLabel || FALLBACK.sectionLabel).trim(),
    }
  } catch (e: any) {
    console.warn('[copy] generation failed:', e.message)
    return getFallback(args.businessName, args.city)
  }
}
