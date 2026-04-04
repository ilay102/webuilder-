'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { LocationMap } from '@/components/ui/expand-map';

/* ─── Design Tokens ─────────────────────────────────────────── */
const C = {
  bg:         '#131313',
  bgLow:      '#1c1b1b',
  bgLowest:   '#0e0e0e',
  bgContainer:'#201f1f',
  bgHigh:     '#2a2a2a',
  bgHighest:  '#353534',
  surface:    '#131313',
  gold:       '#e6c364',
  goldDim:    '#c9a84c',
  white:      '#e5e2e1',
  muted:      '#d0c5b2',
  outline:    '#4d4637',
  onPrimary:  '#241a00',
} as const;

const FONTS = {
  headline: "'Newsreader', Georgia, serif",
  body:     "'Inter', system-ui, sans-serif",
  label:    "'Space Grotesk', monospace",
} as const;

/* ─── Helpers ───────────────────────────────────────────────── */
function GoldLine() {
  return (
    <div style={{ height: 1, background: `rgba(201,168,76,0.10)`, width: '100%' }} />
  );
}

function OverLine({ children }: { children: string }) {
  return (
    <span style={{
      fontFamily: FONTS.label,
      fontSize: 10,
      letterSpacing: '0.25em',
      textTransform: 'uppercase' as const,
      color: C.gold,
      display: 'block',
      marginBottom: 16,
    }}>
      {children}
    </span>
  );
}

function GlassCard({ children, className = '', style = {}, hover = true }: any) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(53,53,52,0.40)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 4,
        border: hover && hovered
          ? '1px solid rgba(201,168,76,0.30)'
          : '1px solid rgba(201,168,76,0.06)',
        boxShadow: '0 32px 64px -12px rgba(201,168,76,0.06)',
        transition: 'border-color 0.4s ease',
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  );
}

function MaterialIcon({ name, size = 32, color = C.gold }: { name: string; size?: number; color?: string }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        color,
        fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
      }}
    >
      {name}
    </span>
  );
}

function AnimatedNumber({ value, suffix = '' }: { value: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ fontFamily: FONTS.headline, fontSize: 40, color: C.gold, fontWeight: 500, fontStyle: 'italic' }}
    >
      {value}{suffix}
    </motion.span>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function LawyerPage() {
  // Fix body overflow from root layout
  useEffect(() => {
    const prev = document.body.style.cssText;
    document.body.style.cssText = 'height:auto!important;overflow:auto!important;background:#131313;';
    return () => { document.body.style.cssText = prev; };
  }, []);

  return (
    <div style={{ fontFamily: FONTS.body, background: C.bg, color: C.white, minHeight: '100vh' }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 80,
        background: 'rgba(10,10,10,0.60)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        boxShadow: '0 8px 32px rgba(201,168,76,0.06)',
        display: 'flex',
        alignItems: 'center',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: FONTS.headline, fontSize: 22, fontStyle: 'italic', color: C.white }}>
            Avi Mizrahi Law
          </span>
          <div style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 48 }}>
              {['Practice Areas', 'About', 'Testimonials'].map(link => (
                <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`}
                  style={{ fontFamily: FONTS.headline, fontSize: 17, color: 'rgba(229,226,225,0.55)', textDecoration: 'none', letterSpacing: '0.03em', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.white)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(229,226,225,0.55)')}
                >
                  {link}
                </a>
              ))}
            </div>
            <button
              style={{
                background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDim} 100%)`,
                color: C.onPrimary,
                fontFamily: FONTS.label,
                fontWeight: 700,
                fontSize: 13,
                padding: '10px 24px',
                border: 'none',
                borderRadius: 2,
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              Contact Us
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <header style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        {/* Background photo */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: 'linear-gradient(135deg, #131313 0%, rgba(19,19,19,0.72) 50%, rgba(201,168,76,0.04) 100%)',
          }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lawyer-handshake.png"
            alt="Professional handshake in Tel Aviv law office"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1280, margin: '0 auto', padding: '0 32px', width: '100%', paddingTop: 40, paddingBottom: 64 }}>
          <div style={{ maxWidth: 720, marginTop: -24 }}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}>
              <OverLine>The Sovereign Architect</OverLine>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25 }}
              style={{
                fontFamily: FONTS.headline,
                fontSize: 'clamp(38px, 5.5vw, 68px)',
                lineHeight: 1.08,
                fontWeight: 300,
                fontStyle: 'italic',
                color: C.white,
                marginBottom: 32,
              }}
            >
              Redefining Justice<br />with Absolute{' '}
              <span style={{ color: C.gold }}>Precision</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              style={{ fontSize: 20, color: C.muted, maxWidth: 500, marginBottom: 48, lineHeight: 1.75 }}
            >
              High-end criminal defense and civil litigation for those who value excellence. We build ironclad strategies for complex legal landscapes.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              style={{ display: 'flex', gap: 24, flexWrap: 'wrap' as const }}
            >
              <button style={{
                background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDim} 100%)`,
                color: C.onPrimary,
                fontFamily: FONTS.label,
                fontWeight: 700,
                fontSize: 14,
                padding: '16px 40px',
                border: 'none',
                borderRadius: 2,
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}>
                Request a Free Consultation
              </button>
              <button style={{
                background: 'transparent',
                color: C.white,
                fontFamily: FONTS.label,
                fontWeight: 500,
                fontSize: 14,
                padding: '16px 40px',
                border: '1px solid rgba(77,70,55,0.35)',
                borderRadius: 2,
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}>
                View Success Stories
              </button>
            </motion.div>
          </div>
        </div>
      </header>

      {/* ── TRUST BAR ───────────────────────────────────────── */}
      <section style={{ background: C.bgLowest, padding: '64px 0', borderTop: '1px solid rgba(77,70,55,0.12)', borderBottom: '1px solid rgba(77,70,55,0.12)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48, textAlign: 'center' }}>
          {[
            { num: '20+', label: 'Years Experience' },
            { num: '500+', label: 'Cases Handled' },
            { num: '98%', label: 'Success Rate' },
          ].map(stat => (
            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <AnimatedNumber value={stat.num} />
              <span style={{ fontFamily: FONTS.label, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRACTICE AREAS ──────────────────────────────────── */}
      <section id="practice-areas" style={{ padding: '128px 0', background: C.surface }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 80, gap: 32, flexWrap: 'wrap' as const }}>
            <div style={{ maxWidth: 480 }}>
              <OverLine>Areas of Mastery</OverLine>
              <h2 style={{ fontFamily: FONTS.headline, fontSize: 'clamp(36px, 5vw, 52px)', color: C.white, fontStyle: 'italic', margin: 0 }}>
                Specialized Legal Architecture
              </h2>
            </div>
            <p style={{ color: C.muted, maxWidth: 360, lineHeight: 1.7, fontSize: 15 }}>
              We do not provide generic counsel. We offer hyper-specialized litigation and defense strategies.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { icon: 'gavel', title: 'Criminal Defense', desc: 'Elite defense for high-stakes white-collar and state-level allegations.', offset: false },
              { icon: 'balance', title: 'Civil Litigation', desc: 'Aggressive representation for complex torts and high-value disputes.', offset: true },
              { icon: 'corporate_fare', title: 'Business Law', desc: 'Strategic infrastructure for mergers, acquisitions, and private wealth.', offset: false },
              { icon: 'domain', title: 'Real Estate', desc: 'Securing commercial assets and luxury residential developments.', offset: true },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                style={{ marginTop: card.offset ? 48 : 0 }}
              >
                <GlassCard style={{ padding: '40px 36px', minHeight: 400, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <MaterialIcon name={card.icon} size={36} />
                  <div>
                    <h3 style={{ fontFamily: FONTS.headline, fontSize: 24, color: C.white, marginBottom: 16 }}>
                      {card.title}
                    </h3>
                    <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7 }}>
                      {card.desc}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT AVI ───────────────────────────────────────── */}
      <section id="about" style={{ padding: '128px 0', background: C.bgLow, overflow: 'hidden' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 64, alignItems: 'center' }}>

            {/* Portrait */}
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9 }}
              style={{ position: 'relative' }}
            >
              <div style={{ aspectRatio: '4/5', background: C.bgContainer, overflow: 'hidden', borderRadius: 4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/lawyer-portrait.png"
                  alt="Avi Mizrahi — Professional Portrait"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              {/* Quote card */}
              <div style={{
                position: 'absolute',
                bottom: -32,
                right: -32,
                background: 'rgba(53,53,52,0.55)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                padding: '28px 32px',
                borderRadius: 4,
                border: '1px solid rgba(201,168,76,0.22)',
                maxWidth: 280,
              }}>
                <p style={{ fontFamily: FONTS.headline, fontSize: 17, color: C.gold, fontStyle: 'italic', lineHeight: 1.55, margin: 0 }}>
                  "Justice is not accidental;<br />it is engineered."
                </p>
              </div>
            </motion.div>

            {/* Bio */}
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9 }}
            >
              <OverLine>The Principal</OverLine>
              <h2 style={{ fontFamily: FONTS.headline, fontSize: 'clamp(36px, 5vw, 52px)', color: C.white, marginBottom: 32 }}>
                Avi Mizrahi
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, color: C.muted, fontSize: 18, lineHeight: 1.8 }}>
                <p style={{ margin: 0 }}>
                  With over two decades of courtroom experience, Avi Mizrahi has established a reputation for unflinching precision and tactical brilliance. His approach treats the law as a high-stakes architectural project, where every detail must be structurally sound.
                </p>
                <p style={{ margin: 0 }}>
                  A graduate of top-tier legal institutions, he has successfully defended high-net-worth individuals and corporations across the globe. Avi's focus remains on high-complexity cases that demand more than just legal knowledge—they demand a mastery of strategy.
                </p>
              </div>

              <div style={{ marginTop: 48, paddingTop: 48, borderTop: '1px solid rgba(77,70,55,0.12)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                <div>
                  <OverLine>Accreditations</OverLine>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['Bar Association Premium Member', 'Global Litigation Institute Fellow'].map(item => (
                      <li key={item} style={{ fontSize: 14, color: C.muted }}>
                        <span style={{ color: C.gold, marginRight: 8 }}>›</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <OverLine>Focus</OverLine>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['International Arbitration', 'Premium Asset Protection'].map(item => (
                      <li key={item} style={{ fontSize: 14, color: C.muted }}>
                        <span style={{ color: C.gold, marginRight: 8 }}>›</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ───────────────────────────────────── */}
      <section style={{ padding: '128px 0', background: C.surface }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <OverLine>The Competitive Edge</OverLine>
            <h2 style={{ fontFamily: FONTS.headline, fontSize: 'clamp(36px, 5vw, 52px)', color: C.white, fontStyle: 'italic', margin: 0 }}>
              A Distinctive Standard
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {[
              { icon: 'star', title: 'Exclusivity', desc: 'We maintain a limited caseload to ensure each client receives the full weight of our strategic resources and personal attention.' },
              { icon: 'biotech', title: 'Strategic Precision', desc: 'Our methodology is data-driven and meticulously researched, leaving no variable unexamined in the pursuit of victory.' },
              { icon: 'public', title: 'Global Reach', desc: 'With a network of international consultants, we manage legal challenges across jurisdictions with local expertise and global vision.' },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
              >
                <GlassCard style={{ padding: '48px', borderRadius: 4, textAlign: 'center' }}>
                  <div style={{
                    width: 64, height: 64,
                    background: 'rgba(201,168,76,0.08)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 32px',
                    boxShadow: '0 0 30px rgba(201,168,76,0.10)',
                  }}>
                    <MaterialIcon name={card.icon} size={28} />
                  </div>
                  <h4 style={{ fontFamily: FONTS.label, fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.white, marginBottom: 16 }}>
                    {card.title}
                  </h4>
                  <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.75 }}>
                    {card.desc}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────── */}
      <section id="testimonials" style={{ padding: '128px 0', background: C.bgLowest }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 96, alignItems: 'center' }}>
            <div>
              <OverLine>Proven Outcomes</OverLine>
              <h2 style={{ fontFamily: FONTS.headline, fontSize: 'clamp(36px, 5vw, 52px)', color: C.white, lineHeight: 1.15, fontStyle: 'italic', margin: 0 }}>
                What Excellence<br />Looks Like
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
              {[
                {
                  quote: '"Avi Mizrahi\'s ability to dismantle a complex prosecution case was unlike anything I\'ve witnessed in 30 years of business."',
                  attr: '— CEO, Fortune 500 Tech Firm',
                },
                {
                  quote: '"Meticulous, quiet, and absolutely lethal in negotiations. He is the architect of our corporate peace of mind."',
                  attr: '— Managing Partner, Global Real Estate',
                },
              ].map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.2 }}
                  style={{ borderLeft: '2px solid rgba(201,168,76,0.30)', paddingLeft: 48 }}
                >
                  <p style={{ fontFamily: FONTS.headline, fontSize: 22, color: C.white, fontStyle: 'italic', marginBottom: 24, lineHeight: 1.6 }}>
                    {t.quote}
                  </p>
                  <span style={{ fontFamily: FONTS.label, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted }}>
                    {t.attr}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA + CONTACT FORM ──────────────────────────────── */}
      <section style={{ padding: '160px 0', position: 'relative', overflow: 'hidden', background: C.bg }}>
        {/* Background photo + overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(10,10,10,0.82)' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lawyer-handshake.png"
            alt=""
            aria-hidden
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.4) saturate(0.5)' }}
          />
        </div>

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '0 auto', padding: '0 32px', textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <h2 style={{ fontFamily: FONTS.headline, fontSize: 'clamp(36px, 6vw, 64px)', color: C.white, marginBottom: 24, lineHeight: 1.15 }}>
              Secure Your Future with{' '}
              <em style={{ color: C.white }}>Absolute Certainty</em>
            </h2>
            <p style={{ fontSize: 20, color: C.muted, marginBottom: 48, maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.75 }}>
              Legal superiority begins with a single conversation. Inquire today for a confidential assessment of your requirements.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <GlassCard style={{ padding: '48px', border: '1px solid rgba(201,168,76,0.12)', boxShadow: '0 32px 64px -12px rgba(201,168,76,0.08)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, textAlign: 'left' }}>
                <div>
                  <label style={{ fontFamily: FONTS.label, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: C.gold, display: 'block', marginBottom: 8 }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    style={{
                      width: '100%', background: C.bgLowest, border: 'none', borderBottom: `1px solid rgba(77,70,55,0.6)`,
                      color: C.white, padding: '12px 0', fontFamily: FONTS.body, fontSize: 15, outline: 'none', boxSizing: 'border-box' as const,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: FONTS.label, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: C.gold, display: 'block', marginBottom: 8 }}>
                    Inquiry Type
                  </label>
                  <select
                    style={{
                      width: '100%', background: C.bgLowest, border: 'none', borderBottom: `1px solid rgba(77,70,55,0.6)`,
                      color: C.white, padding: '12px 0', fontFamily: FONTS.body, fontSize: 15, outline: 'none', boxSizing: 'border-box' as const,
                    }}
                  >
                    <option>Criminal Defense</option>
                    <option>Civil Litigation</option>
                    <option>Private Counsel</option>
                    <option>Business Law</option>
                    <option>Real Estate</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2', marginTop: 16 }}>
                  <button style={{
                    width: '100%',
                    background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDim} 100%)`,
                    color: C.onPrimary,
                    fontFamily: FONTS.label,
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '20px',
                    border: 'none',
                    borderRadius: 2,
                    cursor: 'pointer',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase' as const,
                  }}>
                    Request Your Consultation
                  </button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ background: 'rgba(10,10,10,0.98)', padding: '64px 0 0', boxShadow: '0 -32px 64px -12px rgba(201,168,76,0.05)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, alignItems: 'start' }}>

          {/* Brand */}
          <div>
            <div style={{ fontFamily: FONTS.headline, fontSize: 20, color: C.white, marginBottom: 16, fontStyle: 'italic' }}>
              Avi Mizrahi Law
            </div>
            <p style={{ fontFamily: FONTS.body, color: C.muted, fontSize: 14, maxWidth: 300, lineHeight: 1.7 }}>
              High-end criminal defense and civil litigation services tailored for those who demand the pinnacle of legal professionality.
            </p>
          </div>

          {/* Directory */}
          <div>
            <h5 style={{ fontFamily: FONTS.label, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: C.gold, marginBottom: 24 }}>
              Directory
            </h5>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {['Contact', 'Address', 'Phone'].map(link => (
                <li key={link}>
                  <a href="#" style={{ fontFamily: FONTS.label, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: 'rgba(229,226,225,0.45)', textDecoration: 'none' }}>
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h5 style={{ fontFamily: FONTS.label, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: C.gold, marginBottom: 24 }}>
              Legal
            </h5>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {['Privacy Policy', 'Terms of Service'].map(link => (
                <li key={link}>
                  <a href="#" style={{ fontFamily: FONTS.label, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: 'rgba(229,226,225,0.45)', textDecoration: 'none' }}>
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Location Map */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h5 style={{ fontFamily: FONTS.label, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: C.gold, marginBottom: 8 }}>
              Location
            </h5>
            <LocationMap location="Tel Aviv, Israel" coordinates="32.0853° N, 34.7818° E" />
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ maxWidth: 1280, margin: '64px auto 0', padding: '24px 32px', borderTop: '1px solid rgba(77,70,55,0.12)', textAlign: 'center' }}>
          <p style={{ fontFamily: FONTS.label, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'rgba(229,226,225,0.35)' }}>
            © 2024 Avi Mizrahi Law. Private Wealth & Litigation.
          </p>
        </div>
      </footer>

    </div>
  );
}
