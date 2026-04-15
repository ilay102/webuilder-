'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ClinicConfig {
  name: string;
  type: string;
  location: string;
  phone: string;
  hours: string;
  services: string[];
  offer?: string;
  brandColor: string;
  greeting: string;
  clientEmail?: string;
  clientWhatsapp?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  chips?: string[];
}

const INITIAL_CHIPS = [
  'קביעת תור 📅',
  'שאלה על מחיר 💰',
  'כואב לי עכשיו 🚨',
  'שעות פתיחה 🕐',
];

// Detect if message is likely Hebrew (for RTL alignment)
function isHebrew(text: string) {
  return /[\u0590-\u05FF]/.test(text);
}

// Detect emergency keywords
function isEmergency(text: string) {
  const keywords = ['כואב', 'כאב', 'שבר', 'נפיחות', 'urgent', 'emergency', 'pain', 'broken', 'swelling', 'bleeding', 'דם', 'חירום'];
  return keywords.some(k => text.toLowerCase().includes(k));
}

export function Chatbot({ config }: { config: ClinicConfig }) {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([
    {
      role: 'assistant',
      content: `שלום! 👋 אני הסייע הדיגיטלי של **${config.name}**.\nאיך אפשר לעזור לך היום?`,
      chips: INITIAL_CHIPS,
    },
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [pulse, setPulse]         = useState(true);
  const [showLead, setShowLead]   = useState(false);
  const [leadName, setLeadName]   = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadSent, setLeadSent]   = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => setPulse(false), 6000); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open, showLead]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 300); }, [open]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    // Emergency fast-path — no API call needed
    if (isEmergency(content)) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `🚨 זה נשמע דחוף!\n\nהתקשר עכשיו ישירות: **${config.phone}**\nאנחנו מקדמים מקרי חירום.`,
        chips: ['קביעת תור רגיל', 'שאלה על טיפול'],
      }]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated, clinicConfig: config }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply ?? 'מצטערים, משהו השתבש.',
        chips: data.chips ?? [],
      }]);

      // After 2 user messages — nudge to book
      const userCount = updated.filter(m => m.role === 'user').length;
      if (userCount === 2 && !leadSent) {
        setTimeout(() => setShowLead(true), 1200);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `מצטערים, משהו השתבש. אפשר להתקשר ישירות: ${config.phone}`,
        chips: [],
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function submitLead() {
    if (!leadName.trim() || !leadPhone.trim()) return;
    setLeadSent(true);
    setShowLead(false);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `תודה ${leadName}! 🎉 נחזור אליך בקרוב למספר **${leadPhone}**.\n\nאפשר גם לשלוח לנו הודעה ישירות בוואטסאפ 👇`,
      chips: config.clientWhatsapp ? [] : ['שאלה נוספת', 'קביעת תור'],
    }]);
    try {
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadName, phone: leadPhone,
          clinicName: config.name,
          clientEmail: config.clientEmail,
          clientWhatsapp: config.clientWhatsapp,
        }),
      });
    } catch { /* silent */ }
  }

  const C = config.brandColor;

  return (
    <div style={{ position: 'fixed', bottom: 28, left: 28, zIndex: 998, fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'absolute', bottom: 70, left: 0,
              width: 348, background: '#fff',
              borderRadius: 20,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              maxHeight: '80vh',
            }}
          >
            {/* ── Header ─────────────────────────────────────────── */}
            <div style={{ background: C, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 99,
                background: 'rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
              }}>🦷</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{config.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: '#4ade80', display: 'inline-block' }} />
                  זמין עכשיו · {config.hours.split(' ')[0]}
                </div>
              </div>
              <a
                href={`tel:${config.phone.replace(/[^0-9+]/g, '')}`}
                aria-label={`התקשר ל${config.name}`}
                style={{
                  background: 'rgba(255,255,255,0.18)', borderRadius: 99,
                  padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 600,
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                📞 {config.phone}
              </a>
              <button
                onClick={() => setOpen(false)}
                aria-label="סגור צ'אט"
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: '0 0 0 4px' }}
              >×</button>
            </div>

            {/* ── Messages ───────────────────────────────────────── */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '14px 14px 4px',
              display: 'flex', flexDirection: 'column', gap: 8,
              maxHeight: 340,
            }}>
              {messages.map((m, i) => {
                const isBot = m.role === 'assistant';
                const rtl   = isHebrew(m.content);
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isBot ? 'flex-start' : 'flex-end' }}>
                    <div style={{
                      maxWidth: '82%',
                      background: isBot ? '#F3F5F4' : C,
                      color: isBot ? '#1A1A1A' : '#fff',
                      borderRadius: isBot ? '4px 18px 18px 18px' : '18px 18px 4px 18px',
                      padding: '10px 14px',
                      fontSize: 14, lineHeight: 1.6,
                      direction: rtl ? 'rtl' : 'ltr',
                      textAlign: rtl ? 'right' : 'left',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {/* Bold markdown support */}
                      {m.content.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                        part.startsWith('**') && part.endsWith('**')
                          ? <strong key={j}>{part.slice(2, -2)}</strong>
                          : part
                      )}
                    </div>

                    {/* Quick-reply chips */}
                    {isBot && m.chips && m.chips.length > 0 && i === messages.length - 1 && !loading && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, justifyContent: 'flex-start' }}>
                        {m.chips.map((chip, ci) => (
                          <button
                            key={ci}
                            onClick={() => send(chip)}
                            style={{
                              background: '#fff',
                              border: `1.5px solid ${C}`,
                              color: C,
                              borderRadius: 99,
                              padding: '5px 12px',
                              fontSize: 12, fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              transition: 'all 0.15s',
                              direction: isHebrew(chip) ? 'rtl' : 'ltr',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = C; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = C; }}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Loading dots */}
              {loading && (
                <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: '#F3F5F4', borderRadius: '4px 18px 18px 18px', width: 'fit-content' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: 99, background: '#9CA3AF', display: 'inline-block',
                      animation: 'chatBounce 1.2s infinite', animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── Lead Capture ───────────────────────────────────── */}
            <AnimatePresence>
              {showLead && !leadSent && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ padding: '12px 14px', background: '#F9FAFB', borderTop: '1px solid #EAECEB' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 8, direction: 'rtl', textAlign: 'right' }}>
                      נחזור אליך תוך דקה — השאר פרטים 👇
                    </div>
                    <input
                      value={leadName}
                      onChange={e => setLeadName(e.target.value)}
                      placeholder="שם מלא"
                      dir="rtl"
                      style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 7, outline: 'none', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit', direction: 'rtl' }}
                    />
                    <input
                      value={leadPhone}
                      onChange={e => setLeadPhone(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submitLead()}
                      placeholder="מספר טלפון"
                      type="tel"
                      dir="ltr"
                      style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 8, outline: 'none', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button onClick={submitLead} style={{ flex: 1, background: C, color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        שלח ✓
                      </button>
                      <button onClick={() => setShowLead(false)} style={{ background: '#E5E7EB', color: '#666', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                        אחר כך
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── WhatsApp CTA (after lead sent) ─────────────────── */}
            {leadSent && config.clientWhatsapp && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid #EAECEB' }}>
                <a
                  href={`https://wa.me/${config.clientWhatsapp}?text=${encodeURIComponent(`שלום, פניתי דרך האתר ואני מעוניין לתאם תור`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: '#25D366', color: '#fff',
                    borderRadius: 8, padding: '10px',
                    fontSize: 13, fontWeight: 700, textDecoration: 'none',
                    fontFamily: 'inherit', direction: 'rtl',
                  }}
                >
                  <span style={{ fontSize: 16 }}>💬</span> המשך בוואטסאפ
                </a>
              </div>
            )}

            {/* ── Input ──────────────────────────────────────────── */}
            {!showLead && (
              <div style={{ padding: '10px 12px', borderTop: '1px solid #EAECEB', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="כתוב הודעה..."
                  dir="auto"
                  style={{
                    flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 99,
                    padding: '9px 16px', fontSize: 13, outline: 'none',
                    fontFamily: 'inherit', color: '#1a1a1a', background: '#fff',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = C}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  aria-label="שלח הודעה"
                  style={{
                    width: 38, height: 38, borderRadius: 99, flexShrink: 0,
                    background: input.trim() ? C : '#E5E7EB',
                    border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bubble ─────────────────────────────────────────────────── */}
      <motion.button
        onClick={() => { setOpen(o => !o); setPulse(false); }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="פתח צ'אט"
        style={{
          width: 56, height: 56, borderRadius: 99,
          background: C, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
          position: 'relative',
        }}
      >
        {pulse && !open && (
          <span style={{
            position: 'absolute', inset: -4, borderRadius: 99,
            border: `2px solid ${C}`,
            animation: 'chatPing 1.5s cubic-bezier(0,0,0.2,1) infinite',
          }} />
        )}
        {/* Unread dot */}
        {!open && (
          <span style={{
            position: 'absolute', top: 1, right: 1,
            width: 12, height: 12, borderRadius: 99,
            background: '#EF4444', border: '2px solid #fff',
          }} />
        )}
        <AnimatePresence mode="wait">
          {open
            ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }} style={{ color: '#fff', fontSize: 22, fontWeight: 300, lineHeight: 1 }}>×</motion.span>
            : <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white"/>
                </svg>
              </motion.span>
          }
        </AnimatePresence>
      </motion.button>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes chatPing { 75%, 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes chatBounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }
      `}} />
    </div>
  );
}
