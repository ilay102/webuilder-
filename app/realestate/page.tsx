'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { LocationMap } from '@/components/ui/expand-map';
import { AnimatedBgLines } from '@/components/ui/animated-bg-lines';

/* ── Design Tokens ─────────────────────────────────────── */
const C = {
  bg:        '#121315',
  bgLow:     '#1b1c1e',
  bgLowest:  '#0d0e10',
  bgHigh:    '#292a2c',
  bgHighest: '#343537',
  gold:      '#e1c484',
  goldDim:   '#c4a96b',
  goldDeep:  '#a8894a',
  white:     '#e3e2e5',
  muted:     '#8a8d96',
  outline:   '#4c463a',
  onGold:    '#3e2e00',
} as const;

const F = {
  headline: "'Cormorant Garamond', Georgia, serif",
  body:     "'DM Sans', system-ui, sans-serif",
  label:    "'Space Grotesk', monospace",
} as const;

/* ── Sub-components ────────────────────────────────────── */

function OverLine({ children }: { children: string }) {
  return (
    <span style={{
      fontFamily: F.label, fontSize: 11, letterSpacing: '0.25em',
      textTransform: 'uppercase' as const, color: C.gold, display: 'block', marginBottom: 16,
    }}>
      {children}
    </span>
  );
}

function GoldBtn({ children, full = false, outline = false }: { children: string; full?: boolean; outline?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: full ? '100%' : 'auto',
        background: outline ? 'transparent' : `linear-gradient(135deg, ${C.goldDim} 0%, ${C.goldDeep} 100%)`,
        color: outline ? C.white : C.onGold,
        border: outline ? `1px solid rgba(76,70,58,0.4)` : 'none',
        fontFamily: F.label, fontWeight: 700, fontSize: 11,
        letterSpacing: '0.18em', textTransform: 'uppercase' as const,
        padding: '16px 40px', cursor: 'pointer',
        opacity: hov ? 0.85 : 1,
        boxShadow: hov && !outline ? `0 24px 48px rgba(196,169,107,0.18)` : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      {children}
    </button>
  );
}

function GlassCard({ children, style = {} }: any) {
  return (
    <div style={{
      background: 'rgba(30,30,40,0.45)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(76,70,58,0.15)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function StatNumber({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} style={{ textAlign: 'center' as const }}>
      <div style={{ fontFamily: F.headline, fontSize: 40, fontStyle: 'italic', color: C.gold, marginBottom: 8 }}>{value}</div>
      <div style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: C.muted }}>{label}</div>
    </motion.div>
  );
}

interface PropertyCardProps {
  img: string; tag: string; title: string; price: string;
  beds: string; baths: string; sqm: string; offset?: boolean; delay?: number;
  imgFilter?: string; imgTransform?: string;
}

function PropertyCard({ img, tag, title, price, beds, baths, sqm, offset, delay = 0, imgFilter = 'grayscale(20%)', imgTransform = 'scale(1)' }: PropertyCardProps) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ marginTop: offset ? -96 : 0, transition: 'transform 0.5s ease', transform: hov ? 'translateY(-12px)' : 'translateY(0)' }}
    >
      {/* Image */}
      <div style={{ aspectRatio: '4/5', overflow: 'hidden', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img} alt={title}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: hov ? 'grayscale(0%) brightness(1.05)' : imgFilter,
            transform: hov ? `${imgTransform} scale(1.06)` : imgTransform,
            transition: 'transform 0.7s ease, filter 0.7s ease',
          }}
        />
        {/* Neighborhood tag */}
        <div style={{
          position: 'absolute', top: 16, left: 16,
          background: 'rgba(30,30,40,0.6)', backdropFilter: 'blur(16px)',
          padding: '6px 14px',
        }}>
          <span style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: C.gold }}>{tag}</span>
        </div>
      </div>

      {/* Info */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ fontFamily: F.headline, fontSize: 24, fontStyle: 'italic', color: C.white, margin: 0 }}>{title}</h3>
          <span style={{ fontFamily: F.headline, fontSize: 20, color: C.gold, fontStyle: 'italic', whiteSpace: 'nowrap' as const, marginLeft: 16 }}>{price}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontFamily: F.label, fontSize: 10, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '0.14em', marginBottom: 16 }}>
          <span>{beds} Beds</span><span style={{ color: C.outline }}>/</span>
          <span>{baths} Baths</span><span style={{ color: C.outline }}>/</span>
          <span>{sqm}m²</span>
        </div>
        <a href="#" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontFamily: F.label, fontSize: 10, letterSpacing: '0.2em',
          textTransform: 'uppercase' as const, color: C.gold, textDecoration: 'none',
          transition: 'gap 0.3s ease',
        }}>
          View Property →
        </a>
      </div>
    </motion.div>
  );
}

/* ── Main Page ─────────────────────────────────────────── */
export default function RealEstatePage() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroY = useTransform(scrollY, [0, 500], [0, 80]);

  useEffect(() => {
    const prev = document.body.style.cssText;
    document.body.style.cssText = 'height:auto!important;overflow:auto!important;background:#121315;';
    return () => { document.body.style.cssText = prev; };
  }, []);

  return (
    <div style={{ fontFamily: F.body, background: C.bg, color: C.white, minHeight: '100vh' }}>

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 50,
        background: 'rgba(18,19,21,0.55)',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        boxShadow: '0 24px 48px rgba(196,169,107,0.07)',
      }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: F.headline, fontSize: 28, fontStyle: 'italic', letterSpacing: '0.12em', color: C.goldDim }}>
            MERIDIAN
          </div>
          <div style={{ display: 'flex', gap: 48 }}>
            {[['Listings', true], ['About', false], ['Contact', false]].map(([label, active]) => (
              <a key={label as string} href="#"
                style={{
                  fontFamily: F.label, fontSize: 11, letterSpacing: '0.16em',
                  textTransform: 'uppercase' as const, textDecoration: 'none',
                  color: active ? C.gold : C.white,
                  borderBottom: active ? `1px solid ${C.goldDim}` : 'none',
                  paddingBottom: 2,
                  transition: 'color 0.2s',
                }}
              >
                {label}
              </a>
            ))}
          </div>
          <GoldBtn>Book a Viewing</GoldBtn>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section ref={heroRef} style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {/* BG Photo */}
        <motion.div style={{ position: 'absolute', inset: 0, y: heroY }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/re-exterior.png" alt="Luxury villa Tel Aviv" style={{ width: '100%', height: '110%', objectFit: 'cover', objectPosition: 'center 30%' }} />
          {/* Left gradient for text readability */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #121315 0%, rgba(18,19,21,0.85) 42%, rgba(18,19,21,0.05) 100%)' }} />
          {/* Top gradient — always dark behind nav */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to bottom, #121315 10%, transparent 100%)' }} />
          {/* Bottom vignette into next section */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, background: 'linear-gradient(to top, #121315 0%, transparent 100%)' }} />
        </motion.div>

        {/* Content — centred with nav clearance */}
        <motion.div style={{ position: 'relative', zIndex: 2, maxWidth: 1600, margin: '0 auto', padding: '0 40px', paddingTop: 100, width: '100%', opacity: heroOpacity }}>
          <div style={{ maxWidth: 800 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}>
              <OverLine>Tel Aviv Prestige Properties</OverLine>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.25 }}
              style={{
                fontFamily: F.headline, fontStyle: 'italic', fontWeight: 300,
                fontSize: 'clamp(48px, 6.5vw, 88px)', lineHeight: 1.08,
                color: C.white, margin: '0 0 28px', letterSpacing: '-0.01em',
              }}
            >
              Where Architecture<br />Meets Legacy
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              style={{ fontSize: 18, color: C.muted, maxWidth: 520, marginBottom: 36, lineHeight: 1.7, fontWeight: 300 }}
            >
              Aspirational living in Tel Aviv's most coveted addresses, curated for the modern collector of spaces.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              style={{ display: 'flex', gap: 20 }}
            >
              <GoldBtn>View Listings</GoldBtn>
              <GoldBtn outline>Book Private Tour</GoldBtn>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 1 }}
          style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 1, height: 48, background: `linear-gradient(to bottom, ${C.goldDim}, transparent)` }}
          />
        </motion.div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────── */}
      <section style={{ background: C.bgLow, padding: '64px 0' }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 40px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
          <StatNumber value="350+" label="Properties" />
          <StatNumber value="12 Years" label="Experience" />
          <StatNumber value="₪2.8B" label="Volume Sold" />
          <StatNumber value="98%" label="Client Satisfaction" />
        </div>
      </section>

      {/* ── FEATURED LISTINGS ────────────────────────────── */}
      <section style={{ padding: '128px 0' }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 80 }}>
            <div>
              <OverLine>Current Curations</OverLine>
              <h2 style={{ fontFamily: F.headline, fontSize: 'clamp(36px,5vw,56px)', fontStyle: 'italic', color: C.white, margin: 0, fontWeight: 300 }}>
                The Collection
              </h2>
            </div>
            <a href="#" style={{ fontFamily: F.label, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.gold, textDecoration: 'none' }}>
              View All Listings →
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48, alignItems: 'start' }}>
            {/* Card 1 — exterior villa, dusk mood */}
            <PropertyCard
              img="/re-interior.png" tag="Old North"
              title="The Horizon Penthouse" price="₪12.5M"
              beds="4" baths="5" sqm="320" delay={0}
              imgFilter="grayscale(15%) brightness(0.88) saturate(1.1)"
            />
            {/* Card 2 — interior, elevated center card, full color */}
            <PropertyCard
              img="/re-exterior.png" tag="Herzliya Pituach"
              title="Villa Luminous" price="₪18.9M"
              beds="6" baths="7" sqm="650" offset delay={0.12}
              imgFilter="grayscale(0%) brightness(1.0) saturate(1.05)"
            />
            {/* Card 3 — Neve Tzedek Bauhaus boutique building */}
            <PropertyCard
              img="/re-loft.png" tag="Neve Tzedek"
              title="Artisan Loft" price="₪6.2M"
              beds="3" baths="3" sqm="180" delay={0.24}
              imgFilter="grayscale(8%) brightness(0.95) saturate(1.05)"
            />
          </div>
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────── */}
      <section style={{ padding: '128px 0', background: C.bgLowest }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 96, alignItems: 'start' }}>
          {/* Sticky left */}
          <div style={{ position: 'sticky', top: 120 }}>
            <h2 style={{ fontFamily: F.headline, fontSize: 'clamp(40px,6vw,72px)', fontStyle: 'italic', fontWeight: 300, color: C.white, lineHeight: 1.1, margin: '0 0 40px' }}>
              Full-Spectrum<br />Property Expertise
            </h2>
            <p style={{ color: C.muted, fontSize: 18, lineHeight: 1.8, maxWidth: 400, fontWeight: 300, marginBottom: 64 }}>
              From the initial acquisition to long-term portfolio growth, we provide the architectural lens and market precision required for Tel Aviv's high-stakes real estate landscape.
            </p>

            {/* ── Service stats ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px 32px', maxWidth: 380 }}>
              {[
                { value: '₪2.4B', label: 'Total Volume Closed' },
                { value: '340+', label: 'Properties Curated' },
                { value: '14 Yrs', label: 'Market Presence' },
                { value: '98%', label: 'Client Retention' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div style={{ fontFamily: F.headline, fontSize: 42, fontStyle: 'italic', fontWeight: 300, color: C.gold, lineHeight: 1, marginBottom: 8 }}>
                    {value}
                  </div>
                  <div style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: C.muted }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Decorative gold rule */}
            <div style={{ width: 48, height: 1, background: `linear-gradient(90deg, ${C.goldDim}, transparent)`, marginTop: 56 }} />
          </div>

          {/* Scrolling right */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0, paddingTop: 16 }}>
            {[
              {
                n: '01', title: 'Residential Sales',
                desc: "Securing the city's most exclusive estates through a private network of off-market opportunities.",
                tags: ['Penthouse', 'Sea-View Villas', 'Heritage Buildings'],
              },
              {
                n: '02', title: 'Commercial Leasing',
                desc: "Strategic placement for tech hubs and boutique headquarters in Tel Aviv's business districts.",
                tags: ['Office Floors', 'Retail Flagship', 'Co-Working Suites'],
              },
              {
                n: '03', title: 'Investment Advisory',
                desc: 'Data-driven analysis for institutional and private investors seeking sustainable yield.',
                tags: ['ROI Modeling', 'Portfolio Audits', 'Off-Plan Access'],
              },
              {
                n: '04', title: 'Property Management',
                desc: 'Concierge-level care for international owners, ensuring your asset remains in museum-grade condition.',
                tags: ['Tenant Relations', 'Maintenance', 'Remote Owners'],
              },
            ].map((s, i) => (
              <ServiceRow key={s.n} {...s} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* ── MEET THE PRINCIPAL ───────────────────────────── */}
      <section style={{ padding: '128px 0' }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 40px', display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 80, alignItems: 'center' }}>

          {/* Portrait */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            style={{ position: 'relative' }}
          >
            <AgentPortrait />
            {/* Floating quote */}
            <GlassCard style={{
              position: 'absolute', bottom: -32, right: -48,
              padding: '28px 32px', maxWidth: 300,
              boxShadow: '0 32px 64px rgba(196,169,107,0.08)',
            }}>
              <div style={{ fontFamily: F.label, fontSize: 28, color: C.gold, lineHeight: 1, marginBottom: 12 }}>"</div>
              <p style={{ fontFamily: F.headline, fontStyle: 'italic', fontSize: 17, color: C.white, lineHeight: 1.6, margin: 0 }}>
                Every property has a story. We find the right audience to finish it.
              </p>
            </GlassCard>
          </motion.div>

          {/* Bio */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <OverLine>The Visionary</OverLine>
            <h2 style={{ fontFamily: F.headline, fontSize: 'clamp(40px,5vw,64px)', fontStyle: 'italic', fontWeight: 300, color: C.white, margin: '0 0 8px' }}>
              Daniel Meridian
            </h2>
            <p style={{ fontFamily: F.label, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.gold, marginBottom: 32 }}>
              Founder & Principal Broker
            </p>
            <p style={{ fontSize: 18, color: C.muted, lineHeight: 1.85, maxWidth: 560, fontWeight: 300, marginBottom: 48 }}>
              With over a decade of navigating the complexities of Israel's high-end market, Daniel has established Meridian as the benchmark for luxury real estate. His approach combines an architect's eye for detail with a negotiator's instinct for value.
            </p>

            {/* Credentials */}
            <div style={{ display: 'flex', gap: 40 }}>
              {[
                { icon: '◈', label: 'IREF Elite' },
                { icon: '◆', label: 'Top 1% Broker' },
                { icon: '◉', label: 'Legacy Member' },
              ].map(c => (
                <div key={c.label} style={{ textAlign: 'center' as const }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    border: '1px solid rgba(76,70,58,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 8, fontSize: 20, color: C.gold,
                  }}>
                    {c.icon}
                  </div>
                  <span style={{ fontFamily: F.label, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted }}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────── */}
      <section style={{ padding: '128px 0', background: C.bgLow }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 40px' }}>
          <div style={{ textAlign: 'center' as const, marginBottom: 80 }}>
            <OverLine>Client Voices</OverLine>
            <h2 style={{ fontFamily: F.headline, fontSize: 'clamp(36px,5vw,52px)', fontStyle: 'italic', fontWeight: 300, color: C.white, margin: 0 }}>
              Trusted by Tel Aviv's Elite
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
            {[
              { quote: '"Meridian\'s discretion and market insight were unparalleled. They didn\'t just find us a house; they secured our family\'s piece of Tel Aviv history."', role: 'Executive Director', org: 'Global Tech Firm' },
              { quote: '"The architectural understanding the team brings is what sets them apart. They speak the language of design and investment fluently."', role: 'Private Collector', org: 'Luxury Real Estate Portfolio' },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i === 0 ? -24 : 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.15 }}
                style={{ borderLeft: `3px solid ${C.goldDim}`, paddingLeft: 48, paddingTop: 8, paddingBottom: 8 }}
              >
                <p style={{ fontFamily: F.headline, fontSize: 26, fontStyle: 'italic', fontWeight: 300, color: C.white, lineHeight: 1.6, marginBottom: 32 }}>
                  {t.quote}
                </p>
                <div>
                  <span style={{ fontFamily: F.label, fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: C.white, fontWeight: 600 }}>
                    {t.role}
                  </span>
                  <span style={{ display: 'block', fontFamily: F.label, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted, marginTop: 6 }}>
                    {t.org}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT CTA ──────────────────────────────────── */}
      <AnimatedBgLines
        accentColor="#c4a96b"
        gridOpacity={0.055}
        speed={0.6}
        style={{ background: C.bgLowest, padding: '160px 0' }}
      >
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 40px' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <GlassCard style={{ padding: '64px', boxShadow: '0 48px 96px rgba(196,169,107,0.07)' }}>
              <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
                <h2 style={{ fontFamily: F.headline, fontSize: 'clamp(36px,5vw,56px)', fontStyle: 'italic', fontWeight: 300, color: C.white, margin: '0 0 16px' }}>
                  Begin Your Search
                </h2>
                <p style={{ color: C.muted, fontWeight: 300 }}>Inquiry for private portfolio access or property consultation.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
                {[
                  { label: 'Full Name', placeholder: 'Johnathan Doe', type: 'text' },
                  { label: 'Budget Range', placeholder: '₪10M – ₪20M', type: 'text' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: C.muted, display: 'block', marginBottom: 12 }}>
                      {f.label}
                    </label>
                    <input type={f.type} placeholder={f.placeholder}
                      style={{
                        width: '100%', background: 'transparent', border: 'none',
                        borderBottom: `1px solid rgba(76,70,58,0.45)`, padding: '12px 0',
                        color: C.white, fontFamily: F.body, fontSize: 15, outline: 'none',
                        boxSizing: 'border-box' as const,
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 32 }}>
                <label style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: C.muted, display: 'block', marginBottom: 12 }}>
                  Property Type
                </label>
                <input placeholder="Penthouse, Villa, Commercial..."
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    borderBottom: `1px solid rgba(76,70,58,0.45)`, padding: '12px 0',
                    color: C.white, fontFamily: F.body, fontSize: 15, outline: 'none',
                    boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              <div style={{ marginBottom: 40 }}>
                <label style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: C.muted, display: 'block', marginBottom: 12 }}>
                  Message
                </label>
                <textarea placeholder="How can we assist in your architectural legacy?" rows={3}
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    borderBottom: `1px solid rgba(76,70,58,0.45)`, padding: '12px 0',
                    color: C.white, fontFamily: F.body, fontSize: 15, outline: 'none',
                    resize: 'none' as const, boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              <GoldBtn full>Submit Inquiry</GoldBtn>
            </GlassCard>
          </motion.div>
        </div>
      </AnimatedBgLines>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{ background: C.bgLowest, borderTop: '1px solid rgba(76,70,58,0.15)' }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '80px 40px 0', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr', gap: 48 }}>

          {/* Brand */}
          <div>
            <div style={{ fontFamily: F.headline, fontSize: 22, fontStyle: 'italic', color: C.goldDim, marginBottom: 20, letterSpacing: '0.1em' }}>MERIDIAN</div>
            <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.8, maxWidth: 280, fontWeight: 300 }}>
              Curating the finest real estate portfolio in Tel Aviv since 2012. Architecture, legacy, and discretion.
            </p>
          </div>

          {/* Discovery */}
          <div>
            <h5 style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.gold, marginBottom: 24 }}>Discovery</h5>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              {['The Collection', 'Curated Neighborhoods', 'New Developments'].map(l => (
                <li key={l}><a href="#" style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.muted, textDecoration: 'none' }}>{l}</a></li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h5 style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.gold, marginBottom: 24 }}>About Us</h5>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              {['Our Heritage', 'Private Office', 'Contact'].map(l => (
                <li key={l}><a href="#" style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.muted, textDecoration: 'none' }}>{l}</a></li>
              ))}
            </ul>
          </div>

          {/* Office */}
          <div>
            <h5 style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.gold, marginBottom: 24 }}>Office</h5>
            <p style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.muted, lineHeight: 1.9 }}>
              Rothschild Blvd 45<br />Tel Aviv-Yafo, Israel
            </p>
          </div>

          {/* Map */}
          <div>
            <h5 style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.gold, marginBottom: 24 }}>Location</h5>
            <LocationMap location="Tel Aviv, Rothschild Blvd" coordinates="32.0629° N, 34.7746° E" />
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '32px 40px', borderTop: '1px solid rgba(76,70,58,0.1)', marginTop: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'rgba(138,141,150,0.5)', margin: 0 }}>
            © 2024 Meridian Curated Real Estate. All Rights Reserved.
          </p>
          <div style={{ display: 'flex', gap: 32 }}>
            {['Legal', 'Privacy Policy'].map(l => (
              <a key={l} href="#" style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'rgba(138,141,150,0.5)', textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}

/* ── Service Row (hover effect) ────────────────────────── */
function ServiceRow({ n, title, desc, tags, delay }: { n: string; title: string; desc: string; tags: string[]; delay: number }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderBottom: `1px solid ${hov ? 'rgba(196,169,107,0.4)' : 'rgba(76,70,58,0.25)'}`,
        padding: '48px 0',
        transition: 'border-color 0.4s ease',
        cursor: 'default',
      }}
    >
      {/* Number + arrow row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontFamily: F.label, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: C.gold }}>{n}</span>
        <span style={{
          fontFamily: F.label, fontSize: 18, color: hov ? C.gold : 'rgba(138,141,150,0.3)',
          transition: 'color 0.4s ease, transform 0.4s ease',
          display: 'inline-block',
          transform: hov ? 'translateX(6px)' : 'translateX(0)',
        }}>→</span>
      </div>
      <h3 style={{
        fontFamily: F.headline, fontSize: 34, fontStyle: 'italic', fontWeight: 300,
        color: hov ? C.gold : C.white,
        margin: '0 0 16px',
        transition: 'color 0.4s ease',
      }}>
        {title}
      </h3>
      <p style={{ color: C.muted, lineHeight: 1.75, fontWeight: 300, margin: '0 0 28px' }}>{desc}</p>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
        {tags.map(tag => (
          <span key={tag} style={{
            fontFamily: F.label, fontSize: 9, letterSpacing: '0.16em',
            textTransform: 'uppercase' as const,
            color: hov ? C.goldDim : 'rgba(138,141,150,0.55)',
            padding: '5px 12px',
            background: hov ? 'rgba(196,169,107,0.08)' : 'rgba(255,255,255,0.03)',
            transition: 'all 0.4s ease',
          }}>
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Agent Portrait (grayscale → color) ────────────────── */
function AgentPortrait() {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ aspectRatio: '3/4', overflow: 'hidden', cursor: 'pointer' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/re-agent.png"
        alt="Daniel Meridian — Principal Broker"
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          filter: hov ? 'grayscale(0%)' : 'grayscale(70%)',
          transform: hov ? 'scale(1.03)' : 'scale(1)',
          transition: 'filter 1s ease, transform 1s ease',
        }}
      />
    </div>
  );
}
