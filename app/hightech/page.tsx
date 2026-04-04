'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { SplineScene } from '@/components/ui/splite'
import { Spotlight } from '@/components/ui/spotlight'

/* ── Design Tokens ─────────────────────────────────────── */
const C = {
  bg:        '#0e0e0e',
  surface:   '#131313',
  surfaceLow:'#1c1b1b',
  surfaceHi: '#2a2a2a',
  cyan:      '#00dddd',
  cyanBright:'#00fbfb',
  pink:      '#ffabf3',
  white:     '#e5e2e1',
  muted:     '#b9cac9',
  outline:   '#3a4a49',
}
const F = {
  grotesk: "'Space Grotesk', sans-serif",
  mono:    "'JetBrains Mono', monospace",
}

/* ── HUD corner bracket (CSS injected once) ────────────── */
const HUD_CSS = `
.hud::before,.hud::after{content:'';position:absolute;width:10px;height:10px;border-color:${C.cyanBright};z-index:10;}
.hud::before{top:0;left:0;border-top:2px solid ${C.cyanBright};border-left:2px solid ${C.cyanBright};}
.hud::after{bottom:0;right:0;border-bottom:2px solid ${C.cyanBright};border-right:2px solid ${C.cyanBright};}
.scanlines{background:repeating-linear-gradient(0deg,rgba(0,0,0,0.03) 0px,rgba(0,0,0,0.03) 1px,transparent 1px,transparent 2px);}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes gradBorder{0%{background-position:0% 50%}100%{background-position:100% 50%}}
`

/* ── Reusable components ───────────────────────────────── */
function HudCard({ children, style, className = '' }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      className={`hud ${className}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        background: C.surface,
        border: `1px solid rgba(58,74,73,${hov ? 0.5 : 0.2})`,
        boxShadow: hov ? `0 0 24px rgba(0,221,221,0.12)` : 'none',
        transition: 'all 150ms linear',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function OverLine({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: F.mono, fontSize: 10, letterSpacing: '0.3em',
      color: C.cyanBright, textTransform: 'uppercase', marginBottom: 24,
    }}>
      {children}
    </p>
  )
}

/* ── Main Page ─────────────────────────────────────────── */
export default function HightechPage() {
  useEffect(() => {
    document.body.style.height = 'auto'
    document.body.style.overflow = 'visible'
    return () => {
      document.body.style.height = ''
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div style={{ background: C.bg, color: C.white, fontFamily: F.grotesk, minHeight: '100vh', overflowX: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: HUD_CSS }} />

      {/* Scanline overlay — fixed, full viewport */}
      <div className="scanlines" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999,
      }} />

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 50,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 40px',
        background: 'rgba(19,19,19,0.5)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid rgba(0,255,255,0.08)`,
      }}>
        <div style={{ fontFamily: F.grotesk, fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', color: C.white }}>
          NOVA
        </div>
        <div style={{ display: 'flex', gap: 40 }}>
          {['Systems', 'Modules', 'Telemetry', 'Logs'].map((item, i) => (
            <a key={item} href="#" style={{
              fontFamily: F.mono, fontSize: 11, letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: i === 0 ? C.cyanBright : C.muted,
              borderBottom: i === 0 ? `2px solid ${C.cyanBright}` : 'none',
              paddingBottom: i === 0 ? 4 : 0,
              textDecoration: 'none',
              transition: 'color 150ms linear',
            }}>
              {item}
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="material-symbols-outlined" style={{ color: C.cyanBright, fontSize: 20, cursor: 'pointer' }}>terminal</span>
          {/* gradient-border CTA */}
          <div style={{ position: 'relative', padding: 1, background: `linear-gradient(90deg, #ffffff, ${C.cyan})` }}>
            <button style={{
              background: C.bg, fontFamily: F.mono, fontSize: 10,
              fontWeight: 700, letterSpacing: '0.15em', color: C.white,
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              textTransform: 'uppercase',
            }}>
              INITIALIZE_SESSION
            </button>
          </div>
        </div>
      </nav>

      <main style={{ paddingTop: 80 }}>

        {/* ── HERO ────────────────────────────────────────── */}
        <section style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          padding: '0 40px 0 80px', position: 'relative', overflow: 'hidden',
        }}>
          <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill={C.cyan} />

          {/* Left */}
          <div style={{ flex: 1, zIndex: 10, paddingRight: 40, paddingTop: 16 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <OverLine>SYSTEM_ONLINE //</OverLine>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              style={{
                fontFamily: F.grotesk, fontSize: 'clamp(52px, 6.5vw, 88px)',
                fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.03em',
                color: C.white, marginBottom: 32,
              }}
            >
              See Further.<br />
              <span style={{ background: `linear-gradient(90deg, #ffffff, ${C.cyan})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Move Faster.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{ fontFamily: F.grotesk, fontSize: 18, color: C.muted, lineHeight: 1.7, maxWidth: 480, marginBottom: 40 }}
            >
              The AI intelligence layer your enterprise has been missing. Real-time data synthesis, predictive modeling, and actionable directives — unified.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{ display: 'flex', gap: 16, marginBottom: 64 }}
            >
              <button style={{
                background: `linear-gradient(90deg, #ffffff, ${C.cyan})`,
                color: '#003737', fontFamily: F.mono, fontSize: 11,
                fontWeight: 700, letterSpacing: '0.15em', padding: '16px 32px',
                border: 'none', cursor: 'pointer', textTransform: 'uppercase',
                transition: 'box-shadow 150ms linear',
              }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 20px rgba(0,221,221,0.4)`)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                _ &gt; LAUNCH_CORE
              </button>
              <button style={{
                background: 'transparent',
                border: `1px solid rgba(255,171,243,0.5)`,
                color: C.pink, fontFamily: F.mono, fontSize: 11,
                fontWeight: 700, letterSpacing: '0.15em', padding: '16px 32px',
                cursor: 'pointer', textTransform: 'uppercase',
                transition: 'background 150ms linear',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = `rgba(255,171,243,0.08)`)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                _ &gt; VIEW_DOCS
              </button>
            </motion.div>

            {/* Stats bar */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="hud"
              style={{
                position: 'relative',
                display: 'inline-flex', gap: 48,
                background: 'rgba(19,19,19,0.92)',
                borderLeft: `4px solid ${C.cyan}`,
                padding: '24px 32px',
                border: `1px solid rgba(0,221,221,0.12)`,
              }}
            >
              {[
                { label: 'ACTIVE_NODES', value: '2,400+' },
                { label: 'UPTIME_STABILITY', value: '99.98%' },
                { label: 'LATENCY_AVG', value: '12ms' },
              ].map(s => (
                <div key={s.label}>
                  <p style={{ fontFamily: F.mono, fontSize: 9, color: C.muted, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</p>
                  <p style={{ fontFamily: F.grotesk, fontSize: 22, fontWeight: 700, color: C.white }}>{s.value}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — Spline 3D */}
          <div style={{ flex: 1, height: '100vh', position: 'relative', minHeight: 500, willChange: 'transform' }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at center, rgba(0,221,221,0.05) 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
            <div style={{
              position: 'absolute', top: 16, right: 16,
              fontFamily: F.mono, fontSize: 9, color: C.cyan,
              letterSpacing: '0.15em', animation: 'blink 2s ease infinite',
            }}>
              RENDER_ENGINE: ACTIVE
            </div>
          </div>
        </section>

        {/* ── TRUST BAR ───────────────────────────────────── */}
        <section style={{
          padding: '64px 0',
          borderTop: `1px solid rgba(58,74,73,0.15)`,
          borderBottom: `1px solid rgba(58,74,73,0.15)`,
        }}>
          <p style={{
            fontFamily: F.mono, textAlign: 'center', fontSize: 10,
            letterSpacing: '0.25em', color: C.muted, textTransform: 'uppercase',
            marginBottom: 40,
          }}>
            TRUSTED BY LEADING TEAMS
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 64, flexWrap: 'wrap', padding: '0 40px', opacity: 0.4 }}>
            {['SYNECHRON', 'AETHEL_AI', 'CYBERDYNE', 'SPECTRA', 'ORBITAL', 'NEXUS_LTD'].map(co => (
              <div key={co} style={{
                fontFamily: F.mono, fontSize: 18, fontWeight: 700,
                color: C.muted, letterSpacing: '0.05em', cursor: 'default',
                filter: 'grayscale(1)',
                transition: 'filter 150ms linear, color 150ms linear',
              }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'grayscale(0)'; e.currentTarget.style.color = C.white }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'grayscale(1)'; e.currentTarget.style.color = C.muted }}
              >
                {co}
              </div>
            ))}
          </div>
        </section>

        {/* ── PRODUCT SHOWCASE ────────────────────────────── */}
        <section style={{ padding: '128px 80px', background: C.bg }}>
          <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
            <HudCard style={{ padding: 8 }}>
              {/* Floating title tag */}
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)',
                background: C.surface, padding: '6px 20px',
                border: `1px solid rgba(58,74,73,0.3)`,
                fontFamily: F.mono, fontSize: 9, color: C.cyan, letterSpacing: '0.15em',
              }}>
                MAINFRAME_V2.0
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ht-dashboard.png"
                alt="NOVA AI Dashboard"
                style={{ width: '100%', height: 'auto', aspectRatio: '16/9', objectFit: 'cover', opacity: 0.9 }}
              />

              {/* Floating metric cards */}
              {[
                { label: 'REVENUE_DELTA', value: '+24%', pos: { left: -64, top: '25%' } },
                { label: 'CHURN_RATE',    value: '-18%', pos: { right: -40, bottom: '25%' } },
                { label: 'SYSTEM_NPS',   value: '94',   pos: { right: '20%', bottom: -32 } },
              ].map(m => (
                <div
                  key={m.label}
                  className="hud"
                  style={{
                    position: 'absolute', ...m.pos,
                    background: 'rgba(19,19,19,0.95)',
                    borderLeft: `4px solid ${C.cyanBright}`,
                    border: `1px solid rgba(0,221,221,0.2)`,
                    padding: '20px 24px', width: 180,
                  }}
                >
                  <p style={{ fontFamily: F.mono, fontSize: 9, color: C.muted, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>{m.label}</p>
                  <p style={{ fontFamily: F.grotesk, fontSize: 28, fontWeight: 700, color: C.cyan }}>{m.value}</p>
                </div>
              ))}
            </HudCard>
          </div>
        </section>

        {/* ── FEATURES BENTO ──────────────────────────────── */}
        <section style={{ padding: '128px 80px' }}>
          <h2 style={{
            fontFamily: F.mono, fontSize: 36, fontWeight: 700,
            letterSpacing: '-0.02em', marginBottom: 64, color: C.white,
          }}>
            _CORE_CAPABILITIES
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
            {/* Large card */}
            <HudCard style={{ padding: 40 }}>
              <span className="material-symbols-outlined" style={{ color: C.cyan, fontSize: 36, marginBottom: 24, display: 'block' }}>hub</span>
              <h3 style={{ fontFamily: F.grotesk, fontSize: 24, fontWeight: 700, textTransform: 'uppercase', marginBottom: 16 }}>Neural Data Synapse</h3>
              <p style={{ color: C.muted, lineHeight: 1.7, maxWidth: 420 }}>
                Connect disparate data sources into a unified cognitive graph. Real-time mapping of business dependencies with sub-millisecond precision.
              </p>
            </HudCard>

            {/* Stacked small cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {[
                { icon: 'query_stats', title: 'Predictive Flow', desc: 'Forecast market shifts with 94.2% accuracy.' },
                { icon: 'security',    title: 'AES-256 Shield', desc: 'Quantum-resistant encryption on every byte.' },
              ].map(f => (
                <HudCard key={f.title} style={{ padding: 32, flex: 1 }}>
                  <span className="material-symbols-outlined" style={{ color: C.cyan, fontSize: 24, marginBottom: 16, display: 'block' }}>{f.icon}</span>
                  <h3 style={{ fontFamily: F.grotesk, fontSize: 16, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>{f.desc}</p>
                </HudCard>
              ))}
            </div>
          </div>

          {/* Bottom 3 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            {[
              { icon: 'auto_awesome', title: 'AI Synthesis',  desc: 'Automated executive summaries generated every 60 minutes.' },
              { icon: 'api',          title: 'Omni-API',      desc: 'Seamless integration with over 400+ enterprise stacks.' },
              { icon: 'speed',        title: 'Edge Compute',  desc: 'Latency-free reporting powered by global CDN distribution.' },
            ].map(f => (
              <HudCard key={f.title} style={{ padding: 32 }}>
                <span className="material-symbols-outlined" style={{ color: C.cyan, fontSize: 24, marginBottom: 16, display: 'block' }}>{f.icon}</span>
                <h3 style={{ fontFamily: F.grotesk, fontSize: 16, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>{f.desc}</p>
              </HudCard>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────── */}
        <section style={{ padding: '128px 80px', background: C.surfaceLow }}>
          <h2 style={{
            fontFamily: F.mono, fontSize: 36, fontWeight: 700,
            letterSpacing: '-0.02em', marginBottom: 80, textAlign: 'center', color: C.white,
          }}>
            _PROTOCOL_EXECUTION
          </h2>

          <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
            {/* Dotted vertical line */}
            <div style={{
              position: 'absolute', left: 39, top: 16, bottom: 16, width: 1,
              backgroundImage: `linear-gradient(to bottom, ${C.cyan} 50%, transparent 50%)`,
              backgroundSize: '1px 12px', backgroundRepeat: 'repeat-y',
              opacity: 0.3,
            }} />

            {[
              { n: '01', title: 'Ingest & Parse',    desc: "Connect your data silos via our secure gateway. NOVA's neural engine automatically sanitizes and categorizes messy datasets in real-time." },
              { n: '02', title: 'Neural Processing',  desc: "Our 'Ghost' AI identifies patterns, anomalies, and opportunities invisible to the human eye, creating a multi-dimensional strategy map." },
              { n: '03', title: 'Actionable Intel',   desc: 'Receive high-fidelity directives that drive ROI. Monitor execution via the global HUD with automated drift alerts.' },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                style={{ display: 'flex', gap: 48, marginBottom: i < 2 ? 80 : 0, position: 'relative' }}
              >
                <div style={{
                  width: 80, height: 80, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: C.bg,
                  border: `2px solid ${C.cyanBright}`,
                  fontFamily: F.mono, fontSize: 28, fontWeight: 700, color: C.cyan,
                  zIndex: 10,
                }}>
                  {step.n}
                </div>
                <div style={{ paddingTop: 8 }}>
                  <h3 style={{ fontFamily: F.grotesk, fontSize: 22, fontWeight: 700, textTransform: 'uppercase', marginBottom: 16 }}>{step.title}</h3>
                  <p style={{ color: C.muted, fontSize: 17, lineHeight: 1.7 }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── TEAM PHOTO SECTION ──────────────────────────── */}
        <section style={{ padding: '128px 80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <HudCard style={{ overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/ht-team.png"
                  alt="NOVA Engineering Team"
                  style={{ width: '100%', height: 420, objectFit: 'cover', filter: 'saturate(0.7) brightness(0.85)', display: 'block' }}
                />
              </HudCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <OverLine>THE ARCHITECTS</OverLine>
              <h2 style={{ fontFamily: F.grotesk, fontSize: 'clamp(36px,4vw,52px)', fontWeight: 700, color: C.white, marginBottom: 24, lineHeight: 1.1 }}>
                Built by engineers.<br />
                <span style={{ color: C.cyan }}>Trusted by leaders.</span>
              </h2>
              <p style={{ color: C.muted, fontSize: 17, lineHeight: 1.75, marginBottom: 40, maxWidth: 480 }}>
                Our team of 80+ AI researchers, data engineers, and security architects has spent 6 years building the intelligence layer the enterprise world demanded.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {[
                  { v: '80+', l: 'Engineers' },
                  { v: '6 Yrs', l: 'Deep R&D' },
                  { v: '3 PBs', l: 'Data Processed' },
                  { v: '47', l: 'Patents Filed' },
                ].map(({ v, l }) => (
                  <div key={l}>
                    <div style={{ fontFamily: F.grotesk, fontSize: 36, fontWeight: 700, color: C.cyan, lineHeight: 1, marginBottom: 6 }}>{v}</div>
                    <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted }}>{l}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── TESTIMONIALS ────────────────────────────────── */}
        <section style={{ padding: '0 80px 128px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, maxWidth: 1200, margin: '0 auto' }}>
            {[
              {
                quote: '"NOVA transformed our data chaos into a surgical instrument. We\'ve reduced operational overhead by 42% in the first quarter alone."',
                name: 'MARCUS_VANCE', role: 'CTO // AETHEL_AI',
              },
              {
                quote: '"The interface feels like it\'s from the future, but the results are very much present. It\'s the only tool our board actually cares about."',
                name: 'ELARA_KIM', role: 'HEAD OF STRATEGY // SPECTRA',
              },
            ].map(t => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <HudCard style={{ padding: 48, position: 'relative' }}>
                  <span style={{
                    fontFamily: F.mono, fontSize: 64, color: C.pink,
                    position: 'absolute', top: 24, right: 40, opacity: 0.4, lineHeight: 1,
                  }}>"</span>
                  <p style={{ fontSize: 18, lineHeight: 1.75, color: C.white, marginBottom: 40, fontStyle: 'italic' }}>{t.quote}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, background: C.outline, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: C.white }}>{t.name}</p>
                      <p style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, marginTop: 4 }}>{t.role}</p>
                    </div>
                  </div>
                </HudCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── CTA BAND ────────────────────────────────────── */}
        <section style={{ padding: '0 80px 128px' }}>
          <div style={{
            maxWidth: 1200, margin: '0 auto',
            background: `linear-gradient(135deg, #ffffff 0%, ${C.cyan} 100%)`,
            padding: '80px 64px', textAlign: 'center',
          }}>
            <h2 style={{
              fontFamily: F.grotesk, fontSize: 'clamp(36px,5vw,56px)',
              fontWeight: 900, color: '#003737', letterSpacing: '-0.03em',
              textTransform: 'uppercase', marginBottom: 24,
            }}>
              READY_TO_INTERFACE?
            </h2>
            <p style={{ color: 'rgba(0,55,55,0.75)', maxWidth: 520, margin: '0 auto 40px', fontSize: 17, fontWeight: 500 }}>
              Join the next evolution of business intelligence. Deployment takes less than 24 hours.
            </p>
            <button style={{
              background: C.bg, color: C.white,
              fontFamily: F.mono, fontSize: 12, fontWeight: 700,
              letterSpacing: '0.2em', padding: '20px 48px', border: 'none',
              cursor: 'pointer', textTransform: 'uppercase',
              transition: 'transform 150ms linear',
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              _BOOK_A_DEMO →
            </button>
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer style={{ background: C.bg, borderTop: `1px solid rgba(58,74,73,0.2)` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 80px 48px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 48 }}>
          {[
            { title: '_MODULES',   items: ['TERMINAL_ACCESS', 'NEURAL_GRAPH', 'PREDICTIVE_FLOW', 'API_BRIDGE'] },
            { title: '_COMPANY',   items: ['ABOUT_MANIFESTO', 'SYSTEM_STATUS', 'SECURITY_LOGS', 'CAREERS_OPS'] },
            { title: '_RESOURCES', items: ['DOCUMENTATION', 'OPEN_SOURCE', 'GLITCH_REPORTS', 'WHITE_PAPERS'] },
            { title: '_CONNECT',   items: ['X_STATION', 'DISCORD_CORE', 'GITHUB_REPOS', 'LINKEDIN_PROF'] },
          ].map(col => (
            <div key={col.title}>
              <p style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 700, color: C.cyan, letterSpacing: '0.15em', marginBottom: 24 }}>{col.title}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {col.items.map(item => (
                  <li key={item}>
                    <a href="#" style={{
                      fontFamily: F.mono, fontSize: 9, letterSpacing: '0.1em',
                      color: 'rgba(185,202,201,0.5)', textDecoration: 'none',
                      transition: 'color 150ms linear',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.color = C.cyan)}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(185,202,201,0.5)')}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{
          maxWidth: 1280, margin: '0 auto',
          padding: '24px 80px',
          borderTop: `1px solid rgba(58,74,73,0.12)`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontFamily: F.grotesk, fontSize: 18, fontWeight: 900, color: C.muted }}>NOVA</div>
          <div style={{ display: 'flex', gap: 32 }}>
            {['TERMINAL_ACCESS', 'DATA_PRIVACY', 'ENCRYPTION_PROTOCOLS'].map(l => (
              <a key={l} href="#" style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: '0.12em', color: 'rgba(185,202,201,0.4)', textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.cyan, fontWeight: 700 }}>© 2024 NOVA // SYSTEM v2.4.1</div>
        </div>
      </footer>

    </div>
  )
}
