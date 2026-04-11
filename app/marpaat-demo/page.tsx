'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { CalBooking, CalFloatingButton } from '@/components/ui/cal-booking';
import { Chatbot } from '@/components/ui/chatbot';

/* ══════════════════════════════════════════════════════════════
   TIER 1 — BRAND  (colors, fonts — same for all dental clients)
══════════════════════════════════════════════════════════════ */
const C = {
  bg:        '#FAF8F4',
  bgAlt:     '#F2EFE9',
  white:     '#FFFFFF',
  forest:    '#2D6B55',
  forestDim: '#3D8A6E',
  sage:      '#5A8A6A',
  sageMid:   '#7AAD8A',
  sageLight: '#C8DDD0',
  oak:       '#C9956A',
  oakLight:  '#E8D5C0',
  charcoal:  '#2A2A2A',
  muted:     '#7A6F66',
  light:     '#B0A89E',
} as const;

const F = {
  serif: "'Plus Jakarta Sans', system-ui, sans-serif",
  body:  "'Manrope', system-ui, sans-serif",
  label: "'Manrope', monospace",
} as const;

/* ══════════════════════════════════════════════════════════════
   TIER 2 — BUSINESS  (swap this block per client — nothing else)
══════════════════════════════════════════════════════════════ */
const BIZ = {
  name:          'מרפאת בדיקה חדשה',
  tagline:       'Professional dental care in תל אביב',
  city:          'תל אביב',
  address:       'תל אביב',
  phone:         '972534638880',
  email:         'ilay1bgu@gmail.com',
  hours:         'Sun-Thu 9:00-18:00',
  calLink:       'ilay-lankin/15min',
  alertEmail:    'ilay1bgu@gmail.com',
  alertWhatsapp: '972534638880',
} as const;

/* ─── Helpers ───────────────────────────────────────────────── */
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: F.label, fontSize: 11, letterSpacing: '0.18em',
      textTransform: 'uppercase' as const, color: C.forest,
      background: C.sageLight, padding: '4px 12px', borderRadius: 99, display: 'inline-block',
    }}>{children}</span>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div style={{ width: 28, height: 2, background: C.forest, borderRadius: 2 }} />
      <span style={{ fontFamily: F.label, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.forest }}>{children}</span>
    </div>
  );
}

function ServiceCard({ icon, title, desc, delay }: { icon: string; title: string; desc: string; delay: number }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.white : C.bg, borderRadius: 20, padding: '36px 32px',
        transition: 'all 0.3s ease',
        boxShadow: hovered ? '0 20px 48px rgba(45,107,85,0.10)' : '0 2px 12px rgba(0,0,0,0.04)',
        cursor: 'default',
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: hovered ? C.forest : C.sageLight,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, marginBottom: 20, transition: 'all 0.3s ease',
      }}>{icon}</div>
      <h3 style={{ fontFamily: F.serif, fontSize: 19, fontWeight: 600, color: C.charcoal, marginBottom: 10 }}>{title}</h3>
      <p style={{ fontFamily: F.body, fontSize: 15, color: C.muted, lineHeight: 1.7, margin: 0 }}>{desc}</p>
    </motion.div>
  );
}

function Testimonial({ quote, name, detail, delay }: { quote: string; name: string; detail: string; delay: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      style={{ background: C.white, borderRadius: 20, padding: '36px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}
    >
      <div style={{ fontSize: 36, color: C.sageLight, lineHeight: 1, marginBottom: 16, fontFamily: 'Georgia' }}>"</div>
      <p style={{ fontFamily: F.body, fontSize: 16, color: C.charcoal, lineHeight: 1.75, marginBottom: 24 }}>{quote}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 99, background: C.sageLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.serif, fontWeight: 700, color: C.forest, fontSize: 16 }}>
          {name[0]}
        </div>
        <div>
          <div style={{ fontFamily: F.serif, fontWeight: 600, fontSize: 15, color: C.charcoal }}>{name}</div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.muted }}>{detail}</div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function DentalPage() {
  useEffect(() => {
    document.body.style.height = 'auto';
    document.body.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
    document.documentElement.style.overflow = 'auto';
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const services = [
    { icon: '✦', title: 'Aesthetic Dentistry', desc: 'Veneers, whitening, and smile design crafted to complement your natural beauty.' },
    { icon: '◈', title: 'Dental Implants',     desc: 'Titanium implants that feel and look completely natural. Lifetime results.' },
    { icon: '◉', title: 'Orthodontics',         desc: 'Invisible aligners and clear braces — straighten your smile discreetly.' },
    { icon: '◇', title: 'Preventive Care',      desc: 'Routine cleanings, digital X-rays and gum health — your long-term foundation.' },
    { icon: '○', title: 'Root Canal',            desc: 'Painless, precise endodontic treatment with full digital guidance.' },
    { icon: '◆', title: "Children's Dentistry", desc: 'A calm, warm environment designed to make young patients feel at ease.' },
  ];

  const testimonials = [
    { quote: "I've never felt so comfortable at a dentist. The clinic feels like a spa — the team is warm, professional and incredibly skilled.", name: 'Noa Levi',     detail: 'Smile Design Patient' },
    { quote: "My implants look completely natural. Six months later I still can't believe how painless the whole process was.",                  name: 'Avi Cohen',    detail: 'Implant Patient' },
    { quote: 'My kids actually look forward to their appointments here. That says everything you need to know.',                                name: 'Miri Shapiro', detail: 'Family Patient' },
  ];

  const stats = [
    { value: '3,200+', label: 'Happy Patients' },
    { value: '14 Yrs',  label: 'Experience' },
    { value: '98%',     label: 'Satisfaction Rate' },
    { value: '12',      label: 'Specialists' },
  ];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: F.body }}>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Manrope:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .nav-book  { display: none !important; }
          .nav-name  { font-size: 14px !important; }
          .hero-grad { background: linear-gradient(to bottom, rgba(250,248,244,0.1) 0%, rgba(250,248,244,0.85) 40%, rgba(250,248,244,0.97) 100%) !important; }
          .hero-inner { padding: 0 24px !important; align-items: flex-end !important; padding-bottom: 80px !important; }
          .hero-content { max-width: 100% !important; }
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; padding: 40px 24px !important; gap: 24px !important; }
          .services-wrap { padding: 60px 24px !important; }
          .services-grid { grid-template-columns: 1fr !important; }
          .about-section { padding: 60px 24px !important; }
          .about-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .results-section { grid-template-columns: 1fr !important; padding: 60px 24px !important; gap: 40px !important; }
          .results-mini { grid-template-columns: 1fr 1fr !important; }
          .testimonials-wrap { padding: 60px 24px !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
          .cta-section { height: auto !important; padding: 80px 0 !important; }
          .cta-inner { padding: 0 24px !important; }
          .cta-content { max-width: 100% !important; }
          .hero-btns { flex-direction: column !important; align-items: flex-start !important; }
          .hero-btns button { width: 100% !important; text-align: center !important; }
          .footer-outer { padding: 48px 24px 32px !important; }
          .footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .sec-pad { padding: 60px 24px !important; }
          .hide-mobile { display: none !important; }
        }
      `}} />

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(250,248,244,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        transition: 'all 0.4s ease', padding: '0 48px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 99, background: C.forest, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16 }}>✦</span>
            </div>
            <span style={{ fontFamily: F.serif, fontWeight: 700, fontSize: 18, color: C.charcoal, letterSpacing: '-0.02em' }}>
              {BIZ.name}
            </span>
          </div>
          <div className="nav-links" style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
            {['Services', 'About', 'Testimonials'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} style={{ fontFamily: F.body, fontSize: 15, color: C.charcoal, textDecoration: 'none', fontWeight: 500, opacity: 0.75, transition: 'opacity 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.75')}>
                {item}
              </a>
            ))}
            <button className="nav-book" style={{
              background: C.forest, color: '#fff', fontFamily: F.label, fontWeight: 600, fontSize: 14,
              padding: '10px 24px', borderRadius: 99, border: 'none', cursor: 'pointer', transition: 'background 0.2s ease',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = C.forestDim)}
              onMouseLeave={e => (e.currentTarget.style.background = C.forest)}>
              Book Now
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
        <img src="/dental-hero.png" alt="Dental clinic treatment room" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
        <div className="hero-grad" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(250,248,244,0.92) 38%, rgba(250,248,244,0.2) 70%, transparent 100%)' }} />
        <div className="hero-inner" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 80px', maxWidth: 1200, margin: '0 auto', left: 0, right: 0 }}>
          <div className="hero-content" style={{ maxWidth: 560 }}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <Tag>Premium Dental Care · {BIZ.city}</Tag>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.15 }}
              style={{ fontFamily: F.serif, fontSize: 'clamp(40px, 5.5vw, 72px)', fontWeight: 700, lineHeight: 1.08, color: C.charcoal, marginTop: 24, marginBottom: 24, letterSpacing: '-0.03em' }}
            >
              Your Smile,<br /><span style={{ color: C.forest }}>Our Passion</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
              style={{ fontSize: 18, color: C.muted, lineHeight: 1.75, marginBottom: 40, maxWidth: 420 }}
            >
              {BIZ.tagline}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45 }}
              className="hero-btns"
              style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}
            >
              <CalBooking calLink={BIZ.calLink} brandColor={C.forest}>
                <button style={{
                  background: C.forest, color: '#fff', fontFamily: F.label, fontWeight: 700, fontSize: 15,
                  padding: '16px 36px', borderRadius: 99, border: 'none', cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(45,107,85,0.30)', transition: 'all 0.2s ease',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.forestDim; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.forest; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  Book a Free Consultation
                </button>
              </CalBooking>
              <button style={{
                background: 'transparent', color: C.charcoal, fontFamily: F.label, fontWeight: 600, fontSize: 15,
                padding: '16px 36px', borderRadius: 99, border: `1.5px solid rgba(42,42,42,0.20)`, cursor: 'pointer', transition: 'all 0.2s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.forest; e.currentTarget.style.color = C.forest; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(42,42,42,0.20)'; e.currentTarget.style.color = C.charcoal; }}>
                View Our Services
              </button>
            </motion.div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: `linear-gradient(to bottom, transparent, ${C.bg})` }} />
      </section>

      {/* ── STATS ── */}
      <section style={{ background: C.forest }}>
        <div className="stats-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, padding: '48px 80px' }}>
          {stats.map(({ value, label }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} style={{ textAlign: 'center' as const }}>
              <div style={{ fontFamily: F.serif, fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{value}</div>
              <div style={{ fontFamily: F.body, fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="services-wrap" style={{ padding: '120px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <SectionLabel>What We Offer</SectionLabel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 64, gap: 32 }}>
          <h2 style={{ fontFamily: F.serif, fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, color: C.charcoal, letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: 480 }}>
            Complete Care,<br /><span style={{ color: C.forest }}>One Trusted Place</span>
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 16, color: C.muted, lineHeight: 1.75, maxWidth: 340 }}>
            From your first check-up to full smile transformations — every treatment is performed by specialists who genuinely care.
          </p>
        </div>
        <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {services.map((s, i) => <ServiceCard key={s.title} {...s} delay={i * 0.08} />)}
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="about-section" style={{ background: C.bgAlt, padding: '120px 80px' }}>
        <div className="about-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} style={{ position: 'relative' }}>
            <img src="/dental-consult.png" alt="Dentist consulting with patient" style={{ width: '100%', height: 480, objectFit: 'cover', borderRadius: 24, display: 'block' }} />
            <div className="hide-mobile" style={{ position: 'absolute', bottom: 28, left: -28, background: C.white, borderRadius: 16, padding: '20px 24px', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: C.sageLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏆</div>
              <div>
                <div style={{ fontFamily: F.serif, fontWeight: 700, fontSize: 15, color: C.charcoal }}>Top Rated Clinic</div>
                <div style={{ fontFamily: F.body, fontSize: 13, color: C.muted }}>{BIZ.city} · 2024</div>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15 }}>
            <SectionLabel>About Us</SectionLabel>
            <h2 style={{ fontFamily: F.serif, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 700, color: C.charcoal, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 24 }}>
              Dentistry That Feels Like a <span style={{ color: C.forest }}>Sanctuary</span>
            </h2>
            <p style={{ fontFamily: F.body, fontSize: 16, color: C.muted, lineHeight: 1.8, marginBottom: 20 }}>
              We built {BIZ.name} because we believed dental visits shouldn&apos;t feel clinical or stressful. Our clinic is designed from the ground up to be calm, beautiful and reassuring — without compromising on precision.
            </p>
            <p style={{ fontFamily: F.body, fontSize: 16, color: C.muted, lineHeight: 1.8, marginBottom: 40 }}>
              Every detail — from the oak cabinetry to the large garden-facing windows — is intentional. Our team of specialists brings warmth and expertise together, every single appointment.
            </p>
            <button style={{ background: C.forest, color: '#fff', fontFamily: F.label, fontWeight: 700, fontSize: 14, padding: '14px 32px', borderRadius: 99, border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.forestDim; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.forest; }}>
              Meet Our Team →
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── RESULTS ── */}
      <section className="results-section" style={{ padding: '120px 80px', maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
          <SectionLabel>Results</SectionLabel>
          <h2 style={{ fontFamily: F.serif, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 700, color: C.charcoal, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 24 }}>
            Real Smiles,<br /><span style={{ color: C.forest }}>Real Confidence</span>
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 16, color: C.muted, lineHeight: 1.8, marginBottom: 40 }}>
            Every smile we transform is a story. Whether it&apos;s whitening, veneers, or a complete smile makeover — we work with your natural features to create results that feel authentically you.
          </p>
          <div className="results-mini" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {[{ value: '1,200+', label: 'Smile Makeovers' }, { value: '4.9★', label: 'Average Rating' }].map(({ value, label }) => (
              <div key={label} style={{ background: C.sageLight, borderRadius: 16, padding: '24px 20px' }}>
                <div style={{ fontFamily: F.serif, fontSize: 28, fontWeight: 800, color: C.forest }}>{value}</div>
                <div style={{ fontFamily: F.body, fontSize: 13, color: C.sage, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1 }} style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 80px rgba(45,107,85,0.15)' }}>
          <img src="/dental-smile.png" alt="Happy patient smile" style={{ width: '100%', height: 520, objectFit: 'cover', display: 'block' }} />
        </motion.div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="testimonials-wrap" style={{ background: C.bgAlt, padding: '120px 80px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionLabel>Testimonials</SectionLabel>
          <h2 style={{ fontFamily: F.serif, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 700, color: C.charcoal, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 64 }}>
            What Our Patients Say
          </h2>
          <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {testimonials.map((t, i) => <Testimonial key={t.name} {...t} delay={i * 0.1} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section" style={{ position: 'relative', height: 560, overflow: 'hidden' }}>
        <img src="/dental-reception.png" alt="Clinic reception" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(45,107,85,0.75)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', textAlign: 'center' as const, padding: '0 40px' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <Tag>Ready to Start?</Tag>
            <h2 style={{ fontFamily: F.serif, fontSize: 'clamp(32px, 4.5vw, 56px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '24px 0', maxWidth: 640 }}>
              Your Perfect Smile is One Appointment Away
            </h2>
            <p style={{ fontFamily: F.body, fontSize: 17, color: 'rgba(255,255,255,0.80)', marginBottom: 40, maxWidth: 440 }}>
              First consultation is free. No pressure, no commitment — just a friendly conversation about your smile goals.
            </p>
            <CalBooking calLink={BIZ.calLink} brandColor={C.forest}>
              <button style={{
                background: '#fff', color: C.forest, fontFamily: F.label, fontWeight: 700, fontSize: 16,
                padding: '18px 48px', borderRadius: 99, border: 'none', cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(0,0,0,0.20)', transition: 'all 0.2s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.20)'; }}>
                Book Free Consultation
              </button>
            </CalBooking>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer-outer" style={{ background: C.charcoal, padding: '64px 80px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 56 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: 99, background: C.forest, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 16 }}>✦</span>
                </div>
                <span style={{ fontFamily: F.serif, fontWeight: 700, fontSize: 18, color: '#fff' }}>{BIZ.name}</span>
              </div>
              <p style={{ fontFamily: F.body, fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, maxWidth: 260 }}>
                Premium dental care in the heart of {BIZ.city}. Where your comfort and confidence come first.
              </p>
            </div>
            {[
              { title: 'Services', links: ['Aesthetic Dentistry', 'Implants', 'Orthodontics', 'Preventive Care'] },
              { title: 'Clinic',   links: ['About Us', 'Our Team', 'Gallery', 'Blog'] },
              { title: 'Contact',  links: [BIZ.phone, BIZ.email, BIZ.address, BIZ.hours] },
            ].map(({ title, links }) => (
              <div key={title}>
                <div style={{ fontFamily: F.serif, fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 20, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>{title}</div>
                {links.map(link => (
                  <div key={link} style={{ fontFamily: F.body, fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 12, cursor: 'pointer' }}>{link}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: F.body, fontSize: 13, color: 'rgba(255,255,255,0.30)' }}>© 2026 {BIZ.name}. All rights reserved.</span>
            <span style={{ fontFamily: F.body, fontSize: 13, color: 'rgba(255,255,255,0.30)' }}>Built with care ✦</span>
          </div>
        </div>
      </footer>

      {/* ── CHATBOT ── */}
      <Chatbot config={{
        name:          BIZ.name,
        type:          'dental clinic',
        location:      BIZ.city,
        phone:         BIZ.phone,
        hours:         BIZ.hours,
        services:      ['Aesthetic Dentistry', 'Implants', 'Orthodontics', 'Preventive Care', 'Root Canal', "Children's Dentistry"],
        offer:         'Free first consultation',
        brandColor:    C.forest,
        greeting:      `Hi! 👋 I'm the ${BIZ.name} assistant. How can I help you today?`,
        clientEmail:   BIZ.alertEmail,
        clientWhatsapp: BIZ.alertWhatsapp,
      }} />

      {/* ── FLOATING BOOK BUTTON ── */}
      <CalFloatingButton calLink={BIZ.calLink} brandColor={C.forest} label="Book Appointment" buttonStyle={{ borderRadius: 99 }} />

    </div>
  );
}
