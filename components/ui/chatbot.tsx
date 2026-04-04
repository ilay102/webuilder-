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
  // Alert destinations — per client
  clientEmail?: string;
  clientWhatsapp?: string; // international format e.g. 972501234567
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function Chatbot({ config }: { config: ClinicConfig }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: config.greeting },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(true);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadSent, setLeadSent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Stop pulsing after 5s
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function submitLead() {
    if (!leadName.trim() || !leadPhone.trim()) return;
    setLeadSent(true);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Thanks ${leadName}! 🎉 We'll call you at ${leadPhone} very soon. Looking forward to meeting you!`,
    }]);
    setShowLeadForm(false);

    // Fire alerts
    try {
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadName,
          phone: leadPhone,
          clinicName: config.name,
          clientEmail: config.clientEmail,
          clientWhatsapp: config.clientWhatsapp,
        }),
      });
    } catch (e) {
      console.error('Lead submit error:', e);
    }
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          clinicConfig: config,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please call us!' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: 32, left: 32, zIndex: 998, fontFamily: "'Inter', sans-serif" }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute', bottom: 72, left: 0,
              width: 340, background: '#fff',
              borderRadius: 20,
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              background: config.brandColor,
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 99,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>💬</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{config.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: '#4ade80', display: 'inline-block' }} />
                  Online now
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
              >×</button>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: 10,
              maxHeight: 320, minHeight: 200,
            }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%',
                    background: m.role === 'user' ? config.brandColor : '#F3F4F6',
                    color: m.role === 'user' ? '#fff' : '#1a1a1a',
                    borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '10px 14px',
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: '#F3F4F6', borderRadius: '18px 18px 18px 4px', padding: '10px 16px', display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 6, height: 6, borderRadius: 99,
                        background: '#9CA3AF',
                        animation: 'bounce 1.2s infinite',
                        animationDelay: `${i * 0.2}s`,
                        display: 'inline-block',
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Lead Form */}
            {showLeadForm && !leadSent && (
              <div style={{ padding: '12px 16px', background: '#F9FAFB', borderTop: '1px solid #F3F4F6' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Leave your details — we'll call you back 👇</div>
                <input
                  value={leadName}
                  onChange={e => setLeadName(e.target.value)}
                  placeholder="Your name"
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 8, outline: 'none', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' as const }}
                />
                <input
                  value={leadPhone}
                  onChange={e => setLeadPhone(e.target.value)}
                  placeholder="Your phone number"
                  type="tel"
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 8, outline: 'none', color: '#1a1a1a', background: '#fff', boxSizing: 'border-box' as const }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={submitLead} style={{ flex: 1, background: config.brandColor, color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Send ✓
                  </button>
                  <button onClick={() => setShowLeadForm(false)} style={{ background: '#E5E7EB', color: '#666', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Quick action */}
            {!showLeadForm && !leadSent && messages.length >= 3 && (
              <div style={{ padding: '8px 16px', borderTop: '1px solid #F3F4F6' }}>
                <button
                  onClick={() => setShowLeadForm(true)}
                  style={{ width: '100%', background: '#F3F4F6', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, color: '#444', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  📞 Request a callback
                </button>
              </div>
            )}

            {/* Input */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #F3F4F6',
              display: 'flex', gap: 8,
            }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Type a message..."
                style={{
                  flex: 1, border: '1px solid #E5E7EB', borderRadius: 99,
                  padding: '10px 16px', fontSize: 14, outline: 'none',
                  fontFamily: 'inherit', color: '#1a1a1a', background: '#fff',
                }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                style={{
                  width: 40, height: 40, borderRadius: 99,
                  background: input.trim() ? config.brandColor : '#E5E7EB',
                  border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble button */}
      <motion.button
        onClick={() => { setOpen(o => !o); setPulse(false); }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        style={{
          width: 56, height: 56, borderRadius: 99,
          background: config.brandColor,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
          position: 'relative',
        }}
      >
        {/* Pulse ring */}
        {pulse && !open && (
          <span style={{
            position: 'absolute', inset: -4,
            borderRadius: 99,
            border: `2px solid ${config.brandColor}`,
            animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
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
        @keyframes ping { 75%, 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
      `}} />
    </div>
  );
}
