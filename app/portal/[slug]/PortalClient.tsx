'use client';

/**
 * PortalClient — interactive editor.
 *
 * Tabs:
 *   - טקסטים    edit hero/about/CTA texts
 *   - צבעים     pick 1 of 12 curated design packs
 *   - לוגו      paste a URL (drag-drop will land in v2 once a public uploader is wired)
 *   - ביקורות   add/edit/delete testimonials
 *   - תמונות    instructions — photos are uploaded via WhatsApp (Carti wired)
 *   - מנוי       subscription status + manage link
 */

import { useState, useTransition } from 'react';

type Tier = 'basic' | 'standard' | 'premium'; // 'standard' kept for back-compat with old records

interface SiteContent {
  tier?: Tier;
  biz: { name: string; phone: string; city?: string; address?: string; email?: string;
         hours?: string; tagline?: string; calLink?: string; logo?: string | null; };
  copy?: { h1?: string; heroSubtitle?: string; about?: string; ctaMain?: string;
           ctaSecondary?: string; sectionLabel?: string; tagline?: string };
  design?: { packId?: string };
  testimonials?: Array<{ quote: string; name: string; detail: string }>;
  photos?: { hero?: string; about?: string; results?: string; cta?: string; gallery?: string[] };
}

const PACKS: Array<{ id: string; label: string; primary: string; secondary: string }> = [
  { id: 'forest-serif-soft',         label: 'יער · עדין',           primary: '#2D6B55', secondary: '#1F4D3C' },
  { id: 'navy-sans-sharp',           label: 'נייבי · חד',            primary: '#1B3A5C', secondary: '#0F2540' },
  { id: 'coral-warm-friendly',       label: 'קוראל · חמים',          primary: '#E76F51', secondary: '#C0553B' },
  { id: 'charcoal-mono-tech',        label: 'פחם · טכנולוגי',        primary: '#1A1A1A', secondary: '#000000' },
  { id: 'teal-modern-airy',          label: 'טורקיז · אוורירי',     primary: '#0D9488', secondary: '#115E59' },
  { id: 'ivory-editorial-classic',   label: 'שנהב · קלאסי',          primary: '#7D2D3D', secondary: '#5C1F2B' },
  { id: 'midnight-luxe-gold',        label: 'חצות · יוקרה זהב',      primary: '#D4AF37', secondary: '#B89028' },
  { id: 'sand-minimal-zen',          label: 'חול · מינימליסטי',     primary: '#B05B3B', secondary: '#8B4226' },
  { id: 'rose-gentle-feminine',      label: 'ורד · עדין',            primary: '#B03A5B', secondary: '#8B2647' },
  { id: 'emerald-pro-trust',         label: 'אזמרגד · מקצועי',      primary: '#047857', secondary: '#064E3B' },
  { id: 'amber-friendly-family',     label: 'ענבר · משפחתי',         primary: '#D97706', secondary: '#92400E' },
  { id: 'slate-tech-clean',          label: 'אבן · טכנולוגי נקי',   primary: '#0891B2', secondary: '#155E75' },
];

const TIER_LABEL: Record<Tier, string> = {
  basic:    'בסיס (700 ₪ + 70 ₪/חודש)',
  standard: 'פרימיום (1,600 ₪ + 140 ₪/חודש)', // legacy records
  premium:  'פרימיום (1,600 ₪ + 140 ₪/חודש)',
};

interface Props {
  slug:  string;
  token: string;
  initial: {
    siteContent:  SiteContent | null;
    subscription: any;
    tier:         Tier;
    paidAt:       string | null;
  };
}

const TABS = ['טקסטים', 'צבעים', 'לוגו', 'ביקורות', 'תמונות', 'מנוי'] as const;
type Tab = typeof TABS[number];

export default function PortalClient({ slug, token, initial }: Props) {
  const [tab, setTab] = useState<Tab>('טקסטים');
  const [content, setContent] = useState<SiteContent>(initial.siteContent || ({ biz: { name: '', phone: '' } } as SiteContent));
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function patch(partial: Partial<SiteContent>) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/portal/${slug}?t=${encodeURIComponent(token)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(partial),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || `שגיאה ${res.status}`);
        if (j.siteContent) setContent(j.siteContent);
        setSavedAt(new Date().toLocaleTimeString('he-IL'));
      } catch (e: any) {
        setError(e.message || 'שגיאה לא ידועה');
      }
    });
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#F7F7F5', color: '#1A1A1A',
      direction: 'rtl', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    }}>
      {/* Header */}
      <header style={{
        background: '#1A1A1A', color: '#fff', padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>פורטל ניהול · {content.biz?.name || slug}</div>
          <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>{TIER_LABEL[initial.tier]}</div>
        </div>
        <a
          href={`/${slug}`}
          target="_blank"
          rel="noreferrer"
          style={{ background: '#2D6B55', color: '#fff', padding: '10px 18px', borderRadius: 99, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
        >
          צפייה באתר ↗
        </a>
      </header>

      {/* Tabs */}
      <nav style={{
        display: 'flex', gap: 6, padding: '14px 24px', background: '#fff',
        borderBottom: '1px solid #E5E5E5', overflowX: 'auto', whiteSpace: 'nowrap',
      }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px', borderRadius: 99, border: '1px solid',
              borderColor: tab === t ? '#2D6B55' : '#E5E5E5',
              background:  tab === t ? '#2D6B55' : '#fff',
              color:       tab === t ? '#fff' : '#1A1A1A',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* Status bar */}
      <div style={{ padding: '8px 24px', fontSize: 13, color: '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span>{pending ? '⏳ שומר...' : savedAt ? `✅ נשמר ב-${savedAt}` : 'שינויים נשמרים אוטומטית'}</span>
        {error && <span style={{ color: '#B91C1C' }}>{error}</span>}
      </div>

      <section style={{ padding: '20px 24px 80px', maxWidth: 880, margin: '0 auto' }}>
        {tab === 'טקסטים'  && <TextsTab    content={content} onPatch={patch} />}
        {tab === 'צבעים'   && <ColorsTab   content={content} onPatch={patch} />}
        {tab === 'לוגו'    && <LogoTab     content={content} onPatch={patch} />}
        {tab === 'ביקורות' && <ReviewsTab  content={content} onPatch={patch} />}
        {tab === 'תמונות'  && <PhotosTab   content={content} />}
        {tab === 'מנוי'    && <SubTab      subscription={initial.subscription} tier={initial.tier} paidAt={initial.paidAt} />}
      </section>
    </main>
  );
}

/* ── Tabs ────────────────────────────────────────────────────────────── */

function Field({ label, value, onChange, multiline = false, hint }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; hint?: string;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{hint}</div>}
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={4}
          style={{ width: '100%', padding: 12, border: '1.5px solid #E5E5E5', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', direction: 'rtl' }}
        />
      ) : (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: 12, border: '1.5px solid #E5E5E5', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', direction: 'rtl' }}
        />
      )}
    </label>
  );
}

function TextsTab({ content, onPatch }: { content: SiteContent; onPatch: (p: Partial<SiteContent>) => void }) {
  const [local, setLocal] = useState({
    name:        content.biz?.name || '',
    phone:       content.biz?.phone || '',
    h1:          content.copy?.h1 || '',
    heroSub:     content.copy?.heroSubtitle || '',
    about:       content.copy?.about || '',
    ctaMain:     content.copy?.ctaMain || '',
  });

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>טקסטים</h2>
      <Field label="שם העסק"               value={local.name}    onChange={v => setLocal({ ...local, name: v })} />
      <Field label="טלפון"                  value={local.phone}   onChange={v => setLocal({ ...local, phone: v })} hint="המספר שאליו ילחצו לקוחות מהאתר" />
      <Field label="כותרת ראשית"            value={local.h1}      onChange={v => setLocal({ ...local, h1: v })} />
      <Field label="תת-כותרת"               value={local.heroSub} onChange={v => setLocal({ ...local, heroSub: v })} multiline />
      <Field label="טקסט 'אודות'"           value={local.about}   onChange={v => setLocal({ ...local, about: v })} multiline />
      <Field label="כפתור ראשי (קריאה לפעולה)" value={local.ctaMain} onChange={v => setLocal({ ...local, ctaMain: v })} />
      <button
        onClick={() => onPatch({
          biz:  { ...(content.biz || { name: '', phone: '' }), name: local.name, phone: local.phone },
          copy: { ...(content.copy || {}), h1: local.h1, heroSubtitle: local.heroSub, about: local.about, ctaMain: local.ctaMain },
        })}
        style={{ background: '#2D6B55', color: '#fff', padding: '12px 32px', borderRadius: 99, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
      >
        שמור שינויים
      </button>
    </div>
  );
}

function ColorsTab({ content, onPatch }: { content: SiteContent; onPatch: (p: Partial<SiteContent>) => void }) {
  const current = content.design?.packId || 'forest-serif-soft';
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>פלטת צבעים</h2>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
        בחר אחת מ-12 פלטות מקצועיות. הפלטה מחליפה צבעים, פונטים ואווירת האתר. שינוי מיידי.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {PACKS.map(p => (
          <button
            key={p.id}
            onClick={() => onPatch({ design: { ...(content.design || {}), packId: p.id } })}
            style={{
              border: current === p.id ? `3px solid ${p.primary}` : '1.5px solid #E5E5E5',
              borderRadius: 14, padding: 14, background: '#fff', cursor: 'pointer',
              textAlign: 'right' as const, fontFamily: 'inherit',
            }}
          >
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: p.primary }} />
              <span style={{ width: 28, height: 28, borderRadius: 8, background: p.secondary }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{p.label}</div>
            {current === p.id && <div style={{ fontSize: 12, color: p.primary, marginTop: 4 }}>✓ פעיל</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function LogoTab({ content, onPatch }: { content: SiteContent; onPatch: (p: Partial<SiteContent>) => void }) {
  const [url, setUrl] = useState(content.biz?.logo || '');
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>לוגו</h2>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
        העלה את הלוגו שלך לשרת תמונות חינמי (למשל imgur.com), העתק את הקישור הציבורי ולהדבק כאן.
        בעתיד נתמוך בהעלאה ישירות. בינתיים — שלח לנו את הלוגו ב-WhatsApp עם הכיתוב <code>logo</code> ואנחנו נוסיף אותו אוטומטית.
      </p>
      <Field label="כתובת תמונת הלוגו (URL)" value={url} onChange={setUrl} hint="לדוגמה: https://i.imgur.com/abc123.png" />
      {url && (
        <div style={{ marginBottom: 16, padding: 16, background: '#fff', border: '1.5px solid #E5E5E5', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>תצוגה מקדימה:</div>
          <img src={url} alt="logo preview" style={{ maxWidth: 200, maxHeight: 100, display: 'block' }} />
        </div>
      )}
      <button
        onClick={() => onPatch({ biz: { ...(content.biz || { name: '', phone: '' }), logo: url || null } })}
        style={{ background: '#2D6B55', color: '#fff', padding: '12px 32px', borderRadius: 99, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
      >
        שמור לוגו
      </button>
      {content.biz?.logo && (
        <button
          onClick={() => { setUrl(''); onPatch({ biz: { ...(content.biz || { name: '', phone: '' }), logo: null } }); }}
          style={{ background: 'transparent', color: '#B91C1C', padding: '12px 16px', border: 'none', cursor: 'pointer', fontSize: 13, marginRight: 8 }}
        >
          מחק לוגו
        </button>
      )}
    </div>
  );
}

function ReviewsTab({ content, onPatch }: { content: SiteContent; onPatch: (p: Partial<SiteContent>) => void }) {
  const [items, setItems] = useState(content.testimonials || []);
  const update = (idx: number, k: 'quote' | 'name' | 'detail', v: string) => {
    const next = items.slice();
    next[idx] = { ...next[idx], [k]: v };
    setItems(next);
  };
  const remove = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const add    = () => setItems([...items, { quote: '', name: '', detail: '' }]);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>ביקורות</h2>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
        ערוך / מחק / הוסף ביקורות אמיתיות. אם לא נשארו ביקורות, החלק כולו מוסתר באתר.
      </p>
      {items.map((it, i) => (
        <div key={i} style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #E5E5E5', marginBottom: 12 }}>
          <Field label="ציטוט"     value={it.quote}  onChange={v => update(i, 'quote', v)} multiline />
          <Field label="שם"        value={it.name}   onChange={v => update(i, 'name', v)} />
          <Field label="פרט (גיל / טיפול / עיר)" value={it.detail} onChange={v => update(i, 'detail', v)} />
          <button
            onClick={() => remove(i)}
            style={{ background: 'transparent', color: '#B91C1C', border: 'none', cursor: 'pointer', fontSize: 13 }}
          >
            🗑️ מחק ביקורת
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          onClick={add}
          style={{ background: '#fff', color: '#2D6B55', padding: '10px 22px', borderRadius: 99, border: '1.5px solid #2D6B55', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          + הוסף ביקורת
        </button>
        <button
          onClick={() => onPatch({ testimonials: items })}
          style={{ background: '#2D6B55', color: '#fff', padding: '10px 22px', borderRadius: 99, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          שמור הכל
        </button>
      </div>
    </div>
  );
}

function PhotosTab({ content }: { content: SiteContent }) {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>תמונות</h2>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
        תמונות עולות אוטומטית דרך WhatsApp. שלח כל תמונה ישירות ב-WhatsApp לעילאי, היא תעלה תוך 30 שניות.
      </p>
      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #E5E5E5', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>איך לשלוח לאזור ספציפי?</h3>
        <p style={{ fontSize: 14, color: '#444', lineHeight: 1.8, margin: 0 }}>
          רשום בכיתוב של התמונה אחת מהמילים: <code>מסך פתיחה</code> · <code>אודות</code> · <code>תוצאות</code> · <code>גלריה</code> · <code>logo</code>.
          ללא כיתוב, התמונה תמלא אוטומטית את המקום הפנוי הבא.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {(['hero','about','results','cta'] as const).map(slot => {
          const url = content.photos?.[slot];
          const labels: Record<string, string> = { hero: 'מסך פתיחה', about: 'אודות', results: 'תוצאות', cta: 'CTA' };
          return (
            <div key={slot} style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E5E5', overflow: 'hidden' }}>
              {url ? (
                <img src={url} alt={slot} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F3F3', color: '#999' }}>
                  ריק
                </div>
              )}
              <div style={{ padding: 8, fontSize: 12, fontWeight: 600 }}>{labels[slot]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubTab({ subscription, tier, paidAt }: { subscription: any; tier: Tier; paidAt: string | null }) {
  const status = subscription?.status || (paidAt ? 'no-subscription' : 'unpaid');
  const polarPortal = 'https://polar.sh/dashboard';
  const colorMap: Record<string, string> = { active: '#047857', canceled: '#B91C1C', past_due: '#D97706' };
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>מנוי חודשי</h2>
      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #E5E5E5', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: '#666' }}>מסלול</span>
          <strong>{TIER_LABEL[tier]}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: '#666' }}>סטטוס</span>
          <span style={{ background: colorMap[status] || '#666', color: '#fff', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
            {status === 'active'    ? 'פעיל'              :
             status === 'canceled'  ? 'בוטל'              :
             status === 'past_due'  ? 'באיחור בתשלום'    :
             status === 'no-subscription' ? 'אין מנוי פעיל' :
             'לא שולם'}
          </span>
        </div>
        {subscription?.currentPeriodEnd && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, color: '#666' }}>חיוב הבא</span>
            <strong>{new Date(subscription.currentPeriodEnd).toLocaleDateString('he-IL')}</strong>
          </div>
        )}
      </div>
      <a
        href={polarPortal}
        target="_blank"
        rel="noreferrer"
        style={{ display: 'inline-block', background: '#2D6B55', color: '#fff', padding: '12px 26px', borderRadius: 99, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}
      >
        ניהול תשלומים ב-Polar ↗
      </a>
      <p style={{ color: '#888', fontSize: 12, marginTop: 14 }}>
        ביטול המנוי מבוצע ישירות במערכת התשלומים. ההחזר היחסי בחודש הראשון בלבד.
      </p>
    </div>
  );
}
