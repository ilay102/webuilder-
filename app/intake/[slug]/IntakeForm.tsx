'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Brand ─────────────────────────────────────────────────────────── */
const C = {
  bg:         '#FAF8F4',
  white:      '#FFFFFF',
  forest:     '#2D6B55',
  forestDim:  '#3D8A6E',
  sageLight:  '#C8DDD0',
  charcoal:   '#2A2A2A',
  muted:      '#7A6F66',
  light:      '#B0A89E',
  border:     '#E0DAD1',
  errorBg:    '#FEF2F2',
  errorText:  '#C94040',
} as const;
const F = {
  serif: "'Plus Jakarta Sans', system-ui, sans-serif",
  body:  "'Manrope', system-ui, sans-serif",
  mono:  "'Manrope', monospace",
} as const;

/* ── Types ─────────────────────────────────────────────────────────── */
interface ServiceItem { icon: string; title: string; desc: string }
interface ServiceRow  extends ServiceItem { id: string; active: boolean }

interface FormState {
  name:        string;
  phone:       string;
  city:        string;
  hasAddress:  boolean | null;
  address:     string;
  email:       string;
  hours:       string;
  customHours: string;
  services:    ServiceRow[];
}

type StepId =
  | 'welcome'
  | 'name' | 'phone' | 'city'
  | 'address_yn' | 'address_text'
  | 'email'
  | 'hours'
  | 'services'
  | 'done';

export interface IntakeFormProps {
  slug:    string;
  initial: {
    biz: {
      name: string; tagline?: string; phone: string; city: string;
      address?: string; email?: string; hours: string;
      alertWhatsapp?: string;
    };
    services: ServiceItem[];
  };
}

/* ── Hours options ─────────────────────────────────────────────────── */
const HOURS_OPTIONS = [
  { label: "Sun–Thu  9:00–18:00",  value: "Sun–Thu 9:00–18:00"  },
  { label: "Sun–Thu  9:00–19:00",  value: "Sun–Thu 9:00–19:00"  },
  { label: "Sun–Thu  8:00–17:00",  value: "Sun–Thu 8:00–17:00"  },
  { label: "Sun–Thu  8:00–20:00",  value: "Sun–Thu 8:00–20:00"  },
  { label: "Sun–Fri  9:00–14:00 ✎", value: "Sun–Thu 9:00–18:00, Fri 9:00–14:00" },
  { label: "Custom…",              value: "__custom__"           },
];

const ICONS = ['✦','◈','◉','◇','○','◆','★','●','◎','✿','❋','✺'];

/* ── Tiny helpers ──────────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2, 8); }

function Btn({
  children, onClick, variant = 'primary', disabled = false, full = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  disabled?: boolean;
  full?: boolean;
}) {
  const base: React.CSSProperties = {
    fontFamily: F.mono, fontWeight: 700, fontSize: 15, border: 'none',
    borderRadius: 99, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    width: full ? '100%' : undefined, opacity: disabled ? 0.5 : 1,
  };
  const styles: Record<string, React.CSSProperties> = {
    primary: { ...base, background: C.forest,  color: '#fff',        padding: '14px 36px', boxShadow: '0 6px 20px rgba(45,107,85,.22)' },
    outline: { ...base, background: 'transparent', color: C.charcoal, padding: '13px 32px', border: `1.5px solid ${C.border}` },
    ghost:   { ...base, background: 'transparent', color: C.muted,    padding: '10px 20px', fontSize: 13 },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={styles[variant]}
      onMouseEnter={e => { if (!disabled && variant === 'primary') e.currentTarget.style.background = C.forestDim; }}
      onMouseLeave={e => { if (!disabled && variant === 'primary') e.currentTarget.style.background = C.forest;    }}
    >
      {children}
    </button>
  );
}

function TextInput({
  value, onChange, placeholder, type = 'text', autoFocus = false,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      autoFocus={autoFocus}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '16px 20px', borderRadius: 14,
        border: `2px solid ${focused ? C.forest : C.border}`,
        fontFamily: F.body, fontSize: 18, color: C.charcoal,
        background: C.white, outline: 'none', transition: 'border-color 0.2s',
        boxSizing: 'border-box',
      }}
    />
  );
}

/* ── Progress dots ─────────────────────────────────────────────────── */
const CONTENT_STEPS: StepId[] = ['name','phone','city','address_yn','email','hours','services'];

function ProgressBar({ step }: { step: StepId }) {
  const idx   = CONTENT_STEPS.indexOf(step);
  const total = CONTENT_STEPS.length;
  const pct   = idx < 0 ? (step === 'done' ? 100 : 0) : Math.round(((idx + 1) / total) * 100);
  return (
    <div style={{ width: '100%', height: 3, background: C.sageLight, borderRadius: 99, overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4 }}
        style={{ height: '100%', background: C.forest, borderRadius: 99 }}
      />
    </div>
  );
}

/* ── Step wrapper ──────────────────────────────────────────────────── */
function Step({
  num, total, question, hint, children, onBack,
}: {
  num?: number; total?: number; question: string; hint?: string;
  children: React.ReactNode; onBack?: () => void;
}) {
  return (
    <motion.div
      key={question}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ maxWidth: 620, margin: '0 auto', padding: '0 24px' }}
    >
      {num != null && (
        <div style={{ fontFamily: F.mono, fontSize: 12, color: C.light, marginBottom: 20, letterSpacing: '0.12em' }}>
          {num} / {total}
        </div>
      )}
      <h2 style={{
        fontFamily: F.serif, fontSize: 'clamp(26px, 4vw, 40px)',
        fontWeight: 800, color: C.charcoal, lineHeight: 1.15,
        letterSpacing: '-0.03em', marginBottom: hint ? 14 : 32,
      }}>
        {question}
      </h2>
      {hint && (
        <p style={{ fontFamily: F.body, fontSize: 15, color: C.muted, lineHeight: 1.7, marginBottom: 32 }}>
          {hint}
        </p>
      )}
      {children}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            marginTop: 28, background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: F.body, fontSize: 14, color: C.light,
            display: 'flex', alignItems: 'center', gap: 6, padding: 0,
          }}
        >
          ← Back
        </button>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export function IntakeForm({ slug, initial }: IntakeFormProps) {
  const waNumber = initial.biz.alertWhatsapp ?? '';

  const [step, setStep] = useState<StepId>('welcome');
  const [form, setForm] = useState<FormState>({
    name:        initial.biz.name,
    phone:       initial.biz.phone,
    city:        initial.biz.city,
    hasAddress:  initial.biz.address ? true : null,
    address:     initial.biz.address ?? '',
    email:       initial.biz.email ?? '',
    hours:       initial.biz.hours,
    customHours: '',
    services: initial.services.map(s => ({ ...s, id: uid(), active: true })),
  });

  const [addingService, setAddingService] = useState(false);
  const [newService, setNewService] = useState<{ icon: string; title: string; desc: string }>({ icon: '○', title: '', desc: '' });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const upForm = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  // Enter key to advance
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !['services', 'hours'].includes(step)) advance();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, form]);

  /* ── Navigation ───────────────────────────────────────────────── */
  function advance() {
    switch (step) {
      case 'welcome':      return setStep('name');
      case 'name':         return setStep('phone');
      case 'phone':        return setStep('city');
      case 'city':         return setStep('address_yn');
      case 'address_yn':
        return setStep(form.hasAddress ? 'address_text' : 'email');
      case 'address_text': return setStep('email');
      case 'email':        return setStep('hours');
      case 'hours':        return setStep('services');
      case 'services':     return handleSubmit();
    }
  }
  function back() {
    switch (step) {
      case 'name':         return setStep('welcome');
      case 'phone':        return setStep('name');
      case 'city':         return setStep('phone');
      case 'address_yn':   return setStep('city');
      case 'address_text': return setStep('address_yn');
      case 'email':        return setStep(form.hasAddress ? 'address_text' : 'address_yn');
      case 'hours':        return setStep('email');
      case 'services':     return setStep('hours');
    }
  }

  /* ── Submit ───────────────────────────────────────────────────── */
  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const hours = form.hours === '__custom__' ? form.customHours : form.hours;
      const biz = {
        name:    form.name,
        phone:   form.phone,
        city:    form.city,
        address: form.address,
        email:   form.email,
        hours,
      };
      const services = form.services
        .filter(s => s.active && s.title.trim())
        .map(({ icon, title, desc }) => ({ icon, title, desc }));

      const res = await fetch('/api/intake', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slug, biz, services }),
      });
      if (!res.ok) throw new Error((await res.text()) || `Error ${res.status}`);
      setStep('done');
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const stepNum = CONTENT_STEPS.indexOf(step) + 1;

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: F.body }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, button { font-family: inherit; }
        input::placeholder { color: #B0A89E; }
      `}} />

      {/* Top progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
        <ProgressBar step={step} />
      </div>

      {/* Centered content */}
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '80px 0 60px',
      }}>
        <AnimatePresence mode="wait">

          {/* ── WELCOME ─────────────────────────────────────────── */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.4 }}
              style={{ maxWidth: 560, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}
            >
              <div style={{ width: 64, height: 64, borderRadius: 99, background: C.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', fontSize: 28 }}>✦</div>
              <h1 style={{ fontFamily: F.serif, fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, color: C.charcoal, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 18 }}>
                Let's build your website 🎉
              </h1>
              <p style={{ fontFamily: F.body, fontSize: 16, color: C.muted, lineHeight: 1.8, marginBottom: 12 }}>
                Hi <strong style={{ color: C.charcoal }}>{initial.biz.name}</strong>! We just need a few quick details to personalize your site.
              </p>
              <p style={{ fontFamily: F.body, fontSize: 14, color: C.light, marginBottom: 40 }}>
                Takes about 2 minutes · Photos via WhatsApp
              </p>
              <Btn onClick={advance} full>Let's go →</Btn>
            </motion.div>
          )}

          {/* ── NAME ─────────────────────────────────────────────── */}
          {step === 'name' && (
            <Step key="name" num={1} total={7} question="What's your business called?" onBack={back}>
              <TextInput value={form.name} onChange={v => upForm('name', v)} placeholder="e.g. Cohen Dental" autoFocus />
              <div style={{ marginTop: 28 }}>
                <Btn onClick={advance} disabled={!form.name.trim()}>Continue →</Btn>
              </div>
            </Step>
          )}

          {/* ── PHONE ────────────────────────────────────────────── */}
          {step === 'phone' && (
            <Step key="phone" num={2} total={7} question="Phone number?" hint="This will be the clickable number on your site." onBack={back}>
              <TextInput value={form.phone} onChange={v => upForm('phone', v)} placeholder="050-000-0000" type="tel" autoFocus />
              <div style={{ marginTop: 28 }}>
                <Btn onClick={advance} disabled={!form.phone.trim()}>Continue →</Btn>
              </div>
            </Step>
          )}

          {/* ── CITY ─────────────────────────────────────────────── */}
          {step === 'city' && (
            <Step key="city" num={3} total={7} question="Which city are you in?" onBack={back}>
              <TextInput value={form.city} onChange={v => upForm('city', v)} placeholder="Tel Aviv" autoFocus />
              <div style={{ marginTop: 28 }}>
                <Btn onClick={advance} disabled={!form.city.trim()}>Continue →</Btn>
              </div>
            </Step>
          )}

          {/* ── ADDRESS YES/NO ────────────────────────────────────── */}
          {step === 'address_yn' && (
            <Step key="address_yn" num={4} total={7} question="Do you have a street address to show?" onBack={back}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { label: '✓  Yes', value: true  },
                  { label: '✗  No, skip', value: false },
                ].map(opt => (
                  <button key={String(opt.value)} onClick={() => { upForm('hasAddress', opt.value); setStep(opt.value ? 'address_text' : 'email'); }}
                    style={{
                      flex: 1, minWidth: 160, padding: '22px 28px', borderRadius: 16, cursor: 'pointer',
                      fontFamily: F.serif, fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em',
                      border: `2px solid ${form.hasAddress === opt.value ? C.forest : C.border}`,
                      background: form.hasAddress === opt.value ? C.sageLight : C.white,
                      color: form.hasAddress === opt.value ? C.forest : C.charcoal,
                      transition: 'all 0.2s',
                    }}
                  >{opt.label}</button>
                ))}
              </div>
            </Step>
          )}

          {/* ── ADDRESS TEXT ─────────────────────────────────────── */}
          {step === 'address_text' && (
            <Step key="address_text" num={4} total={7} question="Street address?" onBack={back}>
              <TextInput value={form.address} onChange={v => upForm('address', v)} placeholder="Rothschild Blvd 22, Tel Aviv" autoFocus />
              <div style={{ marginTop: 28 }}>
                <Btn onClick={advance}>Continue →</Btn>
              </div>
            </Step>
          )}

          {/* ── EMAIL ────────────────────────────────────────────── */}
          {step === 'email' && (
            <Step key="email" num={5} total={7} question="Email address?" hint="Optional — shown in the footer so clients can reach you." onBack={back}>
              <TextInput value={form.email} onChange={v => upForm('email', v)} placeholder="info@yourclinic.co.il" type="email" autoFocus />
              <div style={{ marginTop: 28, display: 'flex', gap: 14, alignItems: 'center' }}>
                <Btn onClick={advance}>Continue →</Btn>
                <Btn variant="ghost" onClick={() => { upForm('email', ''); advance(); }}>Skip</Btn>
              </div>
            </Step>
          )}

          {/* ── HOURS ────────────────────────────────────────────── */}
          {step === 'hours' && (
            <Step key="hours" num={6} total={7} question="Opening hours?" hint="Pick the option that fits, or type your own." onBack={back}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {HOURS_OPTIONS.map(opt => {
                  const selected = form.hours === opt.value;
                  return (
                    <button key={opt.value} onClick={() => upForm('hours', opt.value)}
                      style={{
                        padding: '18px 20px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                        fontFamily: F.body, fontSize: 15, fontWeight: selected ? 700 : 500,
                        border: `2px solid ${selected ? C.forest : C.border}`,
                        background: selected ? C.sageLight : C.white,
                        color: selected ? C.forest : C.charcoal, transition: 'all 0.2s',
                      }}
                    >
                      {selected && <span style={{ marginRight: 8 }}>✓</span>}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {form.hours === '__custom__' && (
                <div style={{ marginTop: 16 }}>
                  <TextInput value={form.customHours} onChange={v => upForm('customHours', v)} placeholder="e.g. Sun–Thu 9:00–19:00, Fri 9:00–13:00" autoFocus />
                </div>
              )}
              <div style={{ marginTop: 28 }}>
                <Btn
                  onClick={advance}
                  disabled={form.hours === '__custom__' && !form.customHours.trim()}
                >
                  Continue →
                </Btn>
              </div>
            </Step>
          )}

          {/* ── SERVICES ─────────────────────────────────────────── */}
          {step === 'services' && (
            <Step key="services" num={7} total={7}
              question="Which services do you offer?"
              hint="Toggle off any you don't offer. Add your own below."
              onBack={back}
            >
              {/* Service toggle cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {form.services.map(s => (
                  <div key={s.id}
                    onClick={() => setForm(f => ({
                      ...f,
                      services: f.services.map(x => x.id === s.id ? { ...x, active: !x.active } : x),
                    }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px',
                      borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                      border: `2px solid ${s.active ? C.forest : C.border}`,
                      background: s.active ? C.sageLight : C.white,
                      opacity: s.active ? 1 : 0.5,
                    }}
                  >
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: s.active ? C.forest : C.border,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, transition: 'all 0.2s',
                    }}>{s.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: F.serif, fontWeight: 700, fontSize: 16, color: C.charcoal }}>{s.title}</div>
                      {s.desc && <div style={{ fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.desc}</div>}
                    </div>
                    <div style={{
                      width: 24, height: 24, borderRadius: 99, flexShrink: 0, fontSize: 13,
                      background: s.active ? C.forest : 'transparent',
                      border: `2px solid ${s.active ? C.forest : C.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', transition: 'all 0.2s',
                    }}>
                      {s.active ? '✓' : ''}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add service inline form */}
              {addingService ? (
                <div style={{ padding: '22px 24px', borderRadius: 16, border: `2px dashed ${C.forest}`, background: '#F0F8F4', marginBottom: 12 }}>
                  {/* Icon picker */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {ICONS.map(icon => (
                      <button key={icon} onClick={() => setNewService(s => ({ ...s, icon }))}
                        style={{
                          width: 36, height: 36, borderRadius: 8, border: `1.5px solid`,
                          borderColor: newService.icon === icon ? C.forest : C.border,
                          background: newService.icon === icon ? C.sageLight : C.white,
                          fontSize: 16, cursor: 'pointer', transition: 'all 0.15s',
                        }}>{icon}</button>
                    ))}
                  </div>
                  <input
                    autoFocus
                    value={newService.title}
                    onChange={e => setNewService(s => ({ ...s, title: e.target.value }))}
                    placeholder="Service name (e.g. Root Canal)"
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10, marginBottom: 10,
                      border: `1.5px solid ${C.border}`, fontFamily: F.body, fontSize: 15,
                      outline: 'none', background: C.white,
                    }}
                  />
                  <input
                    value={newService.desc}
                    onChange={e => setNewService(s => ({ ...s, desc: e.target.value }))}
                    placeholder="Short description (optional)"
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10, marginBottom: 16,
                      border: `1.5px solid ${C.border}`, fontFamily: F.body, fontSize: 15,
                      outline: 'none', background: C.white,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Btn onClick={() => {
                      if (!newService.title.trim()) return;
                      setForm(f => ({ ...f, services: [...f.services, { ...newService, id: uid(), active: true }] }));
                      setNewService({ icon: '○', title: '', desc: '' });
                      setAddingService(false);
                    }} disabled={!newService.title.trim()}>Add service</Btn>
                    <Btn variant="ghost" onClick={() => setAddingService(false)}>Cancel</Btn>
                  </div>
                </div>
              ) : (
                form.services.length < 8 && (
                  <button onClick={() => setAddingService(true)}
                    style={{
                      width: '100%', padding: '14px', borderRadius: 12, cursor: 'pointer',
                      border: `2px dashed ${C.border}`, background: 'transparent',
                      fontFamily: F.body, fontSize: 14, color: C.muted, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.forest; e.currentTarget.style.color = C.forest; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border;  e.currentTarget.style.color = C.muted;   }}
                  >+ Add a service</button>
                )
              )}

              {submitError && (
                <div style={{ marginTop: 16, padding: '13px 18px', borderRadius: 10, background: C.errorBg }}>
                  <span style={{ fontFamily: F.body, fontSize: 14, color: C.errorText }}>⚠ {submitError}</span>
                </div>
              )}

              <div style={{ marginTop: 28 }}>
                <Btn
                  onClick={handleSubmit}
                  disabled={submitting || form.services.filter(s => s.active).length === 0}
                  full
                >
                  {submitting ? '⏳ Launching…' : 'Launch my website 🚀'}
                </Btn>
              </div>
            </Step>
          )}

          {/* ── DONE ─────────────────────────────────────────────── */}
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              style={{ maxWidth: 540, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
                style={{ fontSize: 72, marginBottom: 28 }}
              >🎉</motion.div>
              <h1 style={{ fontFamily: F.serif, fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800, color: C.charcoal, letterSpacing: '-0.03em', marginBottom: 16 }}>
                Your website is going live!
              </h1>
              <p style={{ fontFamily: F.body, fontSize: 16, color: C.muted, lineHeight: 1.8, marginBottom: 36 }}>
                It'll be ready in about 60 seconds. We'll send you the link on WhatsApp.
              </p>

              {/* WhatsApp photo CTA */}
              <div style={{ background: C.sageLight, borderRadius: 20, padding: '28px 32px', marginBottom: 28, textAlign: 'left' }}>
                <div style={{ fontFamily: F.mono, fontSize: 12, color: C.forest, letterSpacing: '0.12em', marginBottom: 10 }}>
                  📸  ONE LAST THING
                </div>
                <p style={{ fontFamily: F.body, fontSize: 15, color: C.charcoal, lineHeight: 1.75, marginBottom: 20 }}>
                  Send us photos of your clinic and team via WhatsApp — they'll appear on your site within 30 seconds.
                </p>
                {waNumber && (
                  <a
                    href={`https://wa.me/${waNumber}?text=${encodeURIComponent('שלום, מצרף תמונות לאתר שלי 📸')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 10,
                      background: '#25D366', color: '#fff',
                      fontFamily: F.mono, fontSize: 14, fontWeight: 700,
                      padding: '13px 28px', borderRadius: 99,
                      textDecoration: 'none', boxShadow: '0 4px 16px rgba(37,211,102,.25)',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>💬</span> Send photos on WhatsApp
                  </a>
                )}
              </div>

              <a
                href={`/${slug}`}
                style={{ fontFamily: F.body, fontSize: 14, color: C.muted, textDecoration: 'underline' }}
              >
                View your site →
              </a>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
