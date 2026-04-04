'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { CalBooking, CalFloatingButton } from '@/components/ui/cal-booking';

/* ─── Cal.com link — swap per client ───────────────────────── */
const CAL_LINK = 'ilay-lankin/15min';
const CAL_COLOR = '#C9A84C';          // matches gold

/* ─── Design Tokens ─────────────────────────────────────────── */
const C = {
  bg:       '#F5F0E8',
  bgAlt:    '#EDE8DF',
  bgDeep:   '#E4DDD1',
  white:    '#FDFBF7',
  charcoal: '#1A1A1A',
  dark:     '#2C2C2C',
  gold:     '#C9A84C',
  goldDim:  '#A8883A',
  muted:    '#8A7F72',
  light:    '#C4B9AC',
  outline:  'rgba(26,26,26,0.08)',
} as const;

const F = {
  serif: "'Cormorant Garamond', Georgia, serif",
  body:  "'Inter', system-ui, sans-serif",
  label: "'Space Grotesk', monospace",
} as const;

/* ─── Helpers ───────────────────────────────────────────────── */
function GoldLine() {
  return <div style={{ width: 40, height: 2, background: C.gold, borderRadius: 2, marginBottom: 20 }} />;
}

function OverLine({ children }: { children: string }) {
  return (
    <span style={{
      fontFamily: F.label, fontSize: 11, letterSpacing: '0.22em',
      textTransform: 'uppercase' as const, color: C.gold, display: 'block', marginBottom: 16,
    }}>{children}</span>
  );
}

/* ─── Service Row ───────────────────────────────────────────── */
function ServiceRow({ num, title, desc, delay }: { num: string; title: string; desc: string; delay: number }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -16 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid', gridTemplateColumns: '64px 1fr auto',
        alignItems: 'center', gap: 32,
        padding: '32px 0',
        borderBottom: `1px solid ${C.outline}`,
        cursor: 'default',
        transition: 'all 0.3s ease',
      }}
    >
      <span style={{ fontFamily: F.label, fontSize: 12, color: hovered ? C.gold : C.light, transition: 'color 0.3s', letterSpacing: '0.1em' }}>{num}</span>
      <div>
        <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: C.charcoal, marginBottom: 6, transition: 'color 0.3s' }}>{title}</div>
        <div style={{ fontFamily: F.body, fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{desc}</div>
      </div>
      <span style={{ fontSize: 18, color: hovered ? C.gold : C.light, transition: 'all 0.3s', transform: hovered ? 'translateX(4px)' : 'none' }}>→</span>
    </motion.div>
  );
}

/* ─── Stat Box ──────────────────────────────────────────────── */
function StatBox({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      style={{ textAlign: 'center' as const, padding: '40px 24px' }}
    >
      <div style={{ fontFamily: F.serif, fontSize: 52, fontWeight: 700, color: C.charcoal, lineHeight: 1, letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: 8, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>{label}</div>
    </motion.div>
  );
}

/* ─── Testimonial ───────────────────────────────────────────── */
function Testimonial({ quote, name, role, delay }: { quote: string; name: string; role: string; delay: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      style={{ background: C.white, borderRadius: 4, padding: '40px 36px', boxShadow: '0 2px 24px rgba(0,0,0,0.05)' }}
    >
      <div style={{ fontFamily: F.serif, fontSize: 48, color: C.gold, lineHeight: 0.8, marginBottom: 20 }}>"</div>
      <p style={{ fontFamily: F.body, fontSize: 15, color: C.dark, lineHeight: 1.8, marginBottom: 28, fontStyle: 'italic' }}>{quote}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 99, background: C.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.serif, fontWeight: 700, color: C.gold, fontSize: 16 }}>{name[0]}</div>
        <div>
          <div style={{ fontFamily: F.label, fontSize: 13, fontWeight: 600, color: C.charcoal }}>{name}</div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>{role}</div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function AccountantPage() {
  useEffect(() => {
    document.body.style.height = 'auto';
    document.body.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
    document.documentElement.style.overflow = 'auto';
  }, []);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const services = [
    { num: '01', title: 'Tax Planning & Filing', desc: 'Corporate and personal tax strategy — minimize liability, stay fully compliant.' },
    { num: '02', title: 'Financial Reporting', desc: 'Accurate, audit-ready financial statements and management accounts.' },
    { num: '03', title: 'Business Advisory', desc: 'Strategic guidance for growth, restructuring, and critical financial decisions.' },
    { num: '04', title: 'Payroll & Compliance', desc: 'End-to-end payroll management and full regulatory compliance in Israel.' },
    { num: '05', title: 'CFO-as-a-Service', desc: 'Senior financial leadership on demand — without the full-time cost.' },
    { num: '06', title: 'Startups & Investors', desc: 'Financial infrastructure for early-stage companies — from seed to Series A.' },
  ];

  const testimonials = [
    { quote: 'They restructured our entire tax position and saved us over ₪400K in the first year. Precise, proactive and genuinely invested in our success.', name: 'Yonatan Katz', role: 'CEO, TechScale Ltd.' },
    { quote: 'Finally an accountant who speaks business, not just numbers. They feel like a true financial partner, not a service provider.', name: 'Dana Mizrahi', role: 'Founder, Bloom Brands' },
    { quote: 'Our CFO-as-a-Service arrangement has been transformative. Board-level thinking at a fraction of the cost.', name: 'Oren Ben-David', role: 'Managing Director, Apex Capital' },
  ];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: F.body }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600&family=Inter:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
      `}} />

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(245,240,232,0.94)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.outline}` : 'none',
        transition: 'all 0.4s ease',
        padding: '0 64px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: F.serif, fontWeight: 700, fontSize: 22, color: C.charcoal, letterSpacing: '-0.02em', lineHeight: 1 }}>Cohen & Partners</div>
            <div style={{ fontFamily: F.label, fontSize: 9, letterSpacing: '0.2em', color: C.gold, textTransform: 'uppercase' as const, marginTop: 2 }}>Certified Accountants</div>
          </div>
          <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
            {['Services', 'About', 'Testimonials'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} style={{ fontFamily: F.body, fontSize: 14, color: C.dark, textDecoration: 'none', fontWeight: 500, opacity: 0.65, transition: 'opacity 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.65')}>
                {item}
              </a>
            ))}
            <button style={{
              background: C.charcoal, color: C.white,
              fontFamily: F.label, fontWeight: 600, fontSize: 13,
              padding: '11px 28px', borderRadius: 2, border: 'none', cursor: 'pointer',
              letterSpacing: '0.06em', transition: 'background 0.2s ease',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = C.gold)}
              onMouseLeave={e => (e.currentTarget.style.background = C.charcoal)}>
              Book a Meeting
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
        <img src="/acc-hero.png" alt="Premium accounting firm office" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(245,240,232,0.95) 42%, rgba(245,240,232,0.4) 70%, rgba(245,240,232,0.1) 100%)' }} />

        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 96px', maxWidth: 1300, margin: '0 auto', left: 0, right: 0 }}>
          <div style={{ maxWidth: 540 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <OverLine>Certified Public Accountants · Est. 2009</OverLine>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15 }}
              style={{
                fontFamily: F.serif, fontSize: 'clamp(48px, 6vw, 82px)',
                fontWeight: 600, fontStyle: 'italic', lineHeight: 1.05,
                color: C.charcoal, marginBottom: 28, letterSpacing: '-0.02em',
              }}
            >
              Your Numbers.<br />
              <span style={{ color: C.gold, fontStyle: 'normal', fontWeight: 300 }}>Our Expertise.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              style={{ fontFamily: F.body, fontSize: 17, color: C.muted, lineHeight: 1.8, marginBottom: 44, maxWidth: 420 }}
            >
              A boutique accounting firm serving Tel Aviv's most ambitious businesses. We bring precision, strategy and genuine partnership to every engagement.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const, alignItems: 'center' }}
            >
              <CalBooking calLink={CAL_LINK} brandColor={CAL_COLOR}>
                <button style={{
                  background: C.charcoal, color: C.white,
                  fontFamily: F.label, fontWeight: 600, fontSize: 14,
                  padding: '16px 40px', borderRadius: 2, border: 'none', cursor: 'pointer',
                  letterSpacing: '0.06em', transition: 'all 0.25s ease',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.gold; }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.charcoal; }}>
                  Schedule a Consultation
                </button>
              </CalBooking>
              <button style={{
                background: 'transparent', color: C.dark,
                fontFamily: F.label, fontWeight: 500, fontSize: 14,
                padding: '16px 32px', borderRadius: 2, border: `1px solid rgba(26,26,26,0.25)`, cursor: 'pointer',
                letterSpacing: '0.04em', transition: 'all 0.25s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(26,26,26,0.25)'; e.currentTarget.style.color = C.dark; }}>
                Our Services ↓
              </button>
            </motion.div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, background: `linear-gradient(to bottom, transparent, ${C.bg})` }} />
      </section>

      {/* ── STATS ── */}
      <section style={{ background: C.white, borderTop: `1px solid ${C.outline}`, borderBottom: `1px solid ${C.outline}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
          {[
            { value: '₪2.1B', label: 'Assets Managed' },
            { value: '420+', label: 'Active Clients' },
            { value: '15 Yrs', label: 'In Practice' },
            { value: '99%', label: 'Client Retention' },
          ].map(({ value, label }, i) => (
            <div key={label} style={{ borderRight: i < 3 ? `1px solid ${C.outline}` : 'none' }}>
              <StatBox value={value} label={label} delay={i * 0.1} />
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" style={{ padding: '120px 96px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 80 }}>
          {/* Left sticky label */}
          <div style={{ paddingTop: 8 }}>
            <OverLine>What We Do</OverLine>
            <h2 style={{ fontFamily: F.serif, fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 600, fontStyle: 'italic', color: C.charcoal, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 24 }}>
              Full-Spectrum<br />Financial<br />Services
            </h2>
            <p style={{ fontFamily: F.body, fontSize: 15, color: C.muted, lineHeight: 1.8 }}>
              From day-to-day compliance to boardroom strategy — we handle every dimension of your financial life.
            </p>
            <div style={{ marginTop: 40 }}>
              <img src="/acc-data.png" alt="Financial documents" style={{ width: '100%', borderRadius: 4, objectFit: 'cover', height: 220 }} />
            </div>
          </div>
          {/* Right services list */}
          <div style={{ borderTop: `1px solid ${C.outline}` }}>
            {services.map((s, i) => (
              <ServiceRow key={s.num} {...s} delay={i * 0.07} />
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" style={{ background: C.bgAlt, padding: '120px 96px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 96, alignItems: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <OverLine>About the Firm</OverLine>
            <h2 style={{ fontFamily: F.serif, fontSize: 'clamp(32px, 4vw, 50px)', fontWeight: 600, fontStyle: 'italic', color: C.charcoal, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 28 }}>
              15 Years of Trusted<br /><span style={{ color: C.gold, fontStyle: 'normal' }}>Financial Partnership</span>
            </h2>
            <p style={{ fontFamily: F.body, fontSize: 16, color: C.muted, lineHeight: 1.85, marginBottom: 20 }}>
              Cohen & Partners was founded on a simple belief: accounting should be proactive, not reactive. We don't just report on what happened — we help you shape what comes next.
            </p>
            <p style={{ fontFamily: F.body, fontSize: 16, color: C.muted, lineHeight: 1.85, marginBottom: 40 }}>
              Our team of senior CPAs has worked with everyone from high-growth startups to established family businesses, bringing the same level of care and precision to every engagement.
            </p>
            <div style={{ display: 'flex', gap: 48 }}>
              {[{ v: 'CPA', l: 'Certified' }, { v: 'Big 4', l: 'Alumni' }, { v: 'ISO', l: 'Certified' }].map(({ v, l }) => (
                <div key={l}>
                  <div style={{ fontFamily: F.serif, fontSize: 28, fontWeight: 700, color: C.charcoal }}>{v}</div>
                  <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 }}
            style={{ position: 'relative' }}
          >
            <img src="/acc-portrait.png" alt="Senior accountant" style={{ width: '100%', height: 520, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
            {/* Floating card */}
            <div style={{
              position: 'absolute', bottom: -24, right: -24,
              background: C.charcoal, borderRadius: 4,
              padding: '24px 28px', boxShadow: '0 24px 56px rgba(0,0,0,0.18)',
            }}>
              <div style={{ fontFamily: F.serif, fontSize: 36, fontWeight: 700, color: C.gold }}>₪400K+</div>
              <div style={{ fontFamily: F.body, fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Avg. tax savings per client/yr</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TEAM PHOTO ── */}
      <section style={{ position: 'relative', height: 480, overflow: 'hidden' }}>
        <img src="/acc-team.png" alt="Accounting team meeting" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(245,240,232,0.30)' }} />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{
            position: 'absolute', bottom: 48, left: 96,
            background: 'rgba(253,251,247,0.94)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 4, padding: '28px 36px', maxWidth: 420,
          }}
        >
          <div style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.2em', color: C.gold, textTransform: 'uppercase' as const, marginBottom: 10 }}>Our Team</div>
          <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: C.charcoal, lineHeight: 1.3 }}>
            Senior CPAs with Big 4 backgrounds — available to you directly.
          </div>
        </motion.div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" style={{ padding: '120px 96px', background: C.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <OverLine>Client Stories</OverLine>
          <h2 style={{ fontFamily: F.serif, fontSize: 'clamp(32px, 4vw, 50px)', fontWeight: 600, fontStyle: 'italic', color: C.charcoal, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 64 }}>
            What Our Clients Say
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {testimonials.map((t, i) => (
              <Testimonial key={t.name} {...t} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: C.charcoal, padding: '100px 96px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <OverLine>Get Started</OverLine>
            <h2 style={{ fontFamily: F.serif, fontSize: 'clamp(32px, 4vw, 54px)', fontWeight: 600, fontStyle: 'italic', color: C.white, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Let's Talk About<br /><span style={{ color: C.gold }}>Your Financial Future</span>
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <p style={{ fontFamily: F.body, fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, marginBottom: 40 }}>
              First consultation is complimentary. No commitment — just an honest conversation about where you are and where you want to be.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
              <CalBooking calLink={CAL_LINK} brandColor={CAL_COLOR}>
              <button style={{
                background: C.gold, color: C.charcoal,
                fontFamily: F.label, fontWeight: 700, fontSize: 14,
                padding: '16px 40px', borderRadius: 2, border: 'none', cursor: 'pointer',
                letterSpacing: '0.06em', transition: 'all 0.25s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = C.goldDim; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = C.charcoal; }}>
                Book Free Consultation
              </button>
              </CalBooking>
              <button style={{
                background: 'transparent', color: 'rgba(255,255,255,0.6)',
                fontFamily: F.label, fontWeight: 500, fontSize: 14,
                padding: '16px 32px', borderRadius: 2, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
                letterSpacing: '0.04em', transition: 'all 0.25s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}>
                03-000-0000
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#111', padding: '56px 96px 36px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
            <div>
              <div style={{ fontFamily: F.serif, fontWeight: 700, fontSize: 20, color: C.white, marginBottom: 6 }}>Cohen & Partners</div>
              <div style={{ fontFamily: F.label, fontSize: 9, letterSpacing: '0.2em', color: C.gold, textTransform: 'uppercase' as const, marginBottom: 20 }}>Certified Accountants</div>
              <p style={{ fontFamily: F.body, fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.8, maxWidth: 240 }}>
                Boutique accounting firm serving Tel Aviv's most ambitious businesses since 2009.
              </p>
            </div>
            {[
              { title: 'Services', links: ['Tax Planning', 'Financial Reporting', 'CFO-as-a-Service', 'Payroll'] },
              { title: 'Firm', links: ['About Us', 'Our Team', 'Careers', 'Blog'] },
              { title: 'Contact', links: ['03-000-0000', 'hello@cohen-cpa.co.il', 'Rothschild Blvd, TLV', 'Sun–Thu 9:00–18:00'] },
            ].map(({ title, links }) => (
              <div key={title}>
                <div style={{ fontFamily: F.label, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.40)', marginBottom: 20, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>{title}</div>
                {links.map(link => (
                  <div key={link} style={{ fontFamily: F.body, fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>{link}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>© 2026 Cohen & Partners CPA. All rights reserved.</span>
            <span style={{ fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Licensed by the Israeli Institute of Certified Public Accountants</span>
          </div>
        </div>
      </footer>

      {/* ── FLOATING BOOK BUTTON ── */}
      <CalFloatingButton
        calLink={CAL_LINK}
        brandColor={CAL_COLOR}
        label="Book Consultation"
        buttonStyle={{ borderRadius: 2 }}
      />
    </div>
  );
}
