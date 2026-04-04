'use client'
import { useEffect, useState } from 'react'
import Shell from '@/app/shell'

const SPEECH_BUBBLES = [
  'Scanning 50 new leads…',
  'Writing follow-up to DataStream…',
  'Lead score updated ✓',
  'Email open detected!',
  'Running cron job…',
  'Drafting proposal…',
  'Checking inbox…',
  'NovaPay replied! 🎉',
  'Analyzing ICP match…',
  'Report ready for Ilay',
  'Found 3 businesses without websites',
  'Drafting Hebrew message…',
  'Waiting for Ilay\'s approval…',
]

const IDLE_MESSAGES = ['Waiting…', 'Available', 'Soon™']

interface Bubble { text: string; visible: boolean }

function useIsraelTime() {
  const [time, setTime] = useState('')
  const [isWorkHour, setIsWorkHour] = useState(false)
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const il = new Intl.DateTimeFormat('he-IL', {
        timeZone: 'Asia/Jerusalem',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).format(now)
      setTime(il)
      const day = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jerusalem', weekday: 'short' }).format(now)
      const hour = parseInt(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jerusalem', hour: 'numeric', hour12: false }).format(now))
      const workDays = ['Sun', 'Mon', 'Tue', 'Wed']
      setIsWorkHour(workDays.includes(day) && hour >= 9 && hour < 18)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])
  return { time, isWorkHour }
}

export default function OfficePage() {
  const [chadBubble, setChadBubble] = useState<Bubble>({ text: '', visible: false })
  const [tick, setTick] = useState(0)
  const { time, isWorkHour } = useIsraelTime()

  useEffect(() => {
    let idx = 0
    const show = () => {
      setChadBubble({ text: SPEECH_BUBBLES[idx % SPEECH_BUBBLES.length], visible: true })
      idx++
      setTimeout(() => setChadBubble(b => ({ ...b, visible: false })), 2800)
    }
    show()
    const t = setInterval(show, 4000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 500)
    return () => clearInterval(t)
  }, [])

  return (
    <Shell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-bg2 flex-shrink-0">
          <span className="text-lg">🏢</span>
          <h1 className="text-sm font-bold tracking-wider text-white uppercase">Office</h1>
          <span className="text-[10px] text-faint">Chad & the team</span>
          <div className="ml-auto flex items-center gap-3">
            {/* Israel time */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-faint">🇮🇱 IL</span>
              <span className="text-white">{time}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isWorkHour ? 'bg-success/20 text-success' : 'bg-warn/20 text-warn'}`}>
                {isWorkHour ? '✓ WORK HOURS' : '✗ OFF HOURS'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col items-center justify-center gap-5">
          {/* Office room */}
          <div
            className="relative border border-border2 rounded-2xl overflow-hidden"
            style={{
              width: 820, minHeight: 460,
              boxShadow: '0 0 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* ── BEACH BACKGROUND IMAGE ── */}
            <img
              src="/office-bg.png"
              alt="Office background"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ zIndex: 0 }}
            />
            {/* Dark overlay so desks/text are readable */}
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)', zIndex: 1 }} />

            {/* ── WALL DECORATIONS ── */}
            <div className="absolute inset-0" style={{ zIndex: 2 }}>

            {/* Israeli flag */}
            <div className="absolute top-5 left-8 w-12 h-8 rounded-sm overflow-hidden border border-border2/40"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              <div className="w-full h-full flex flex-col">
                <div className="h-1.5 bg-blue-600" />
                <div className="flex-1 bg-white flex items-center justify-center">
                  <span className="text-blue-600 text-[10px]">✡</span>
                </div>
                <div className="h-1.5 bg-blue-600" />
              </div>
            </div>

            {/* Clock */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full border-2 border-border2 flex items-center justify-center"
                style={{ background: '#0a0c10', boxShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                <span className="text-[8px] font-mono text-cyan/70">{time.slice(0,5)}</span>
              </div>
              <div className="w-0.5 h-2 bg-border2" />
            </div>

            {/* Whiteboard */}
            <div className="absolute top-6 right-10 w-36 h-24 bg-slate-100/5 border border-border2/60 rounded-sm"
              style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)' }}>
              <div className="absolute inset-1 flex flex-col gap-1 p-1">
                <div className="text-[7px] text-cyan/60 font-mono border-b border-border2/30 pb-0.5">PIPELINE</div>
                <div className="text-[6px] text-success/60 font-mono">▸ Find leads</div>
                <div className="text-[6px] text-warn/60 font-mono">▸ Draft message</div>
                <div className="text-[6px] text-blue-400/60 font-mono">▸ Get approval</div>
                <div className="text-[6px] text-faint/40 font-mono">▸ Send & follow up</div>
              </div>
              {/* Marker tray */}
              <div className="absolute -bottom-1.5 left-2 right-2 h-1.5 bg-border2/40 rounded-sm flex gap-1 items-center px-1">
                <div className="w-2 h-1 bg-red-400/40 rounded-sm" />
                <div className="w-2 h-1 bg-blue-400/40 rounded-sm" />
                <div className="w-2 h-1 bg-green-400/40 rounded-sm" />
              </div>
            </div>

            {/* Shelf left */}
            <div className="absolute left-6 top-[80px] w-20 h-1.5 bg-border2/60 rounded"
              style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }} />
            <div className="absolute left-8 top-[50px] flex gap-1.5 items-end">
              <div className="w-3 h-10 rounded-sm border border-accent/20" style={{ background: 'rgba(59,130,246,0.15)' }} />
              <div className="w-2.5 h-8 rounded-sm border border-purple/20" style={{ background: 'rgba(168,85,247,0.12)' }} />
              <div className="w-2 h-12 rounded-sm border border-success/20" style={{ background: 'rgba(16,185,129,0.12)' }} />
              <div className="w-3.5 h-7 rounded-sm border border-warn/20" style={{ background: 'rgba(245,158,11,0.12)' }} />
              <div className="w-2 h-9 rounded-sm border border-border2/30" style={{ background: 'rgba(100,116,139,0.15)' }} />
            </div>

            {/* Plant corner */}
            <div className="absolute bottom-[155px] right-6 text-2xl" style={{ filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.2))' }}>🪴</div>

            {/* ── CEILING LIGHTS ── */}
            {[160, 410, 660].map((lx, i) => (
              <div key={i} className="absolute" style={{ left: lx, top: 0 }}>
                <div className="w-0.5 h-5 bg-border2/40 mx-auto" />
                <div className="w-6 h-2 bg-border2/60 rounded-full -ml-2.5" />
                <div
                  className="absolute"
                  style={{
                    left: -60, top: 8, width: 120, height: 100,
                    background: i === 0
                      ? 'radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, transparent 70%)'
                      : 'radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)',
                  }} />
              </div>
            ))}

            {/* ── DESKS ── */}
            <Desk
              x={80} y={140}
              name="Chad"
              emoji="🤖"
              role="B2B Sales Agent"
              status="active"
              bubble={chadBubble}
              monitorText={`> reading SOUL.md...\n> scanning leads...\n> 8 new found\n> drafting message...\n> waiting approval ▋`}
              tick={tick}
              color="blue"
            />

            <Desk
              x={320} y={140}
              name="Scout"
              emoji="🔍"
              role="Research Agent"
              status="offline"
              bubble={{ text: IDLE_MESSAGES[tick % 3], visible: tick % 10 === 0 }}
              monitorText={`> agent offline\n> coming soon…`}
              tick={tick}
              color="faint"
              dim
            />

            <Desk
              x={560} y={140}
              name="Pen"
              emoji="✍️"
              role="Copywriter Agent"
              status="offline"
              bubble={{ text: IDLE_MESSAGES[(tick + 1) % 3], visible: tick % 14 === 0 }}
              monitorText={`> agent offline\n> coming soon…`}
              tick={tick}
              color="faint"
              dim
            />

            {/* Server rack (right wall) */}
            <div className="absolute right-5 top-[100px] w-7 h-28 border border-border2/50 rounded-sm flex flex-col gap-0.5 p-0.5"
              style={{ background: '#0a0c10', boxShadow: '0 0 12px rgba(0,0,0,0.5)' }}>
              <div className="text-[6px] text-faint/40 text-center font-mono">SRV</div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-3 border border-border2/30 rounded-sm flex items-center gap-0.5 px-0.5">
                  <div className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-success' : i === 1 ? 'bg-blue-400' : 'bg-faint/20'}`}
                    style={i <= 1 ? { boxShadow: i === 0 ? '0 0 3px #10b981' : '0 0 3px #60a5fa' } : {}} />
                  <div className="flex-1 h-0.5 bg-border2/20 rounded" />
                </div>
              ))}
            </div>

            {/* Floor label */}
            <div className="absolute bottom-2 left-0 right-0 text-center text-[8px] text-white/40 font-mono tracking-widest">
              CHAD'S OFFICE · VPS 204.168.207.116 · OPENCLAW DAEMON
            </div>
            </div> {/* end z-index wrapper */}
          </div>

          {/* Legend */}
          <div className="flex gap-6 text-[10px] text-faint">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success pulse-dot" /> Active agent
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-faint/40" /> Offline (future)
            </div>
            <div className="flex items-center gap-1.5">
              <span>💬</span> Live action bubble
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isWorkHour ? 'bg-success' : 'bg-warn'}`} />
              {isWorkHour ? 'Outreach allowed' : 'Outside work hours'}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}

function Desk({ x, y, name, emoji, role, status, bubble, monitorText, tick, color, dim }: {
  x: number; y: number; name: string; emoji: string; role: string
  status: string; bubble: Bubble; monitorText: string; tick: number; color: string; dim?: boolean
}) {
  const opacity = dim ? 'opacity-35' : 'opacity-100'
  const glowMap: Record<string, string> = { blue: '#3b82f6', faint: '#475569' }
  const glow = glowMap[color] ?? '#3b82f6'
  const isActive = status === 'active'

  return (
    <div className={`absolute ${opacity} transition-opacity`} style={{ left: x, top: y }}>

      {/* Speech bubble */}
      {bubble.visible && (
        <div
          className="absolute z-20 rounded-xl px-3 py-2 text-[9px] text-white whitespace-nowrap shadow-2xl"
          style={{
            bottom: 210, left: -10, maxWidth: 200,
            background: isActive ? 'rgba(15,23,42,0.95)' : 'rgba(15,23,42,0.8)',
            border: `1px solid ${glow}40`,
            boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 12px ${glow}15`,
            animation: 'fadeIn 0.3s ease'
          }}
        >
          {bubble.text}
          <div className="absolute bottom-[-6px] left-5 w-3 h-3 rotate-45 border-r border-b"
            style={{ background: 'rgba(15,23,42,0.95)', borderColor: `${glow}40` }} />
        </div>
      )}

      {/* Monitor */}
      <div
        className="relative rounded-lg border overflow-hidden"
        style={{
          width: 170, height: 100,
          borderColor: glow + '50',
          background: '#060810',
          boxShadow: isActive
            ? `0 0 0 1px ${glow}15, 0 0 30px ${glow}20, inset 0 0 30px rgba(0,0,0,0.5)`
            : 'inset 0 0 20px rgba(0,0,0,0.5)',
        }}
      >
        {/* Scanlines overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          }} />

        {/* Screen glow */}
        {isActive && (
          <div className="absolute inset-0 rounded-lg opacity-50"
            style={{ background: `radial-gradient(ellipse at center, ${glow}08 0%, transparent 70%)` }} />
        )}

        {/* Screen content */}
        <div className="relative flex-1 p-2 overflow-hidden h-full">
          <pre className="text-[7px] font-mono leading-[1.5]"
            style={{ color: isActive ? '#10b981' : '#334155' }}>
            {monitorText.replace('▋', isActive && tick % 2 === 0 ? '█' : ' ')}
          </pre>
        </div>
      </div>

      {/* Monitor chin */}
      <div className="flex justify-center">
        <div className="h-1.5 flex items-center justify-center rounded-b"
          style={{ width: 170, background: `${glow}15`, borderBottom: `1px solid ${glow}20` }}>
          <div className="w-8 h-0.5 rounded-full" style={{ background: glow + '30' }} />
        </div>
      </div>

      {/* Monitor stand */}
      <div className="flex flex-col items-center">
        <div className="w-2.5 h-5 rounded-sm" style={{ background: '#1e293b' }} />
        <div className="w-14 h-1.5 rounded" style={{ background: '#1e293b' }} />
      </div>

      {/* Desk surface */}
      <div
        className="relative rounded-sm mt-0.5"
        style={{
          width: 200, height: 14, marginLeft: -15,
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        {/* Keyboard */}
        <div className="absolute right-3 top-1 w-14 h-2 rounded-sm border"
          style={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.08)' }} />
        {/* Mouse */}
        <div className="absolute right-20 top-1 w-3.5 h-2.5 rounded border"
          style={{ background: '#0a0f1a', borderColor: 'rgba(255,255,255,0.08)' }} />
        {/* Coffee */}
        <div className="absolute left-3 -top-4 text-[11px]" title="☕">☕</div>
        {/* Paper */}
        {isActive && (
          <div className="absolute left-12 -top-3 w-6 h-4 rounded-sm border border-border2/30"
            style={{ background: 'rgba(255,255,255,0.03)', transform: 'rotate(-3deg)' }} />
        )}
      </div>

      {/* Agent avatar */}
      <div className="flex flex-col items-center mt-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-2xl border-2 transition-all"
          style={{
            borderColor: isActive ? glow + '60' : 'rgba(71,85,105,0.3)',
            boxShadow: isActive ? `0 0 0 3px ${glow}15, 0 0 20px ${glow}30` : 'none',
            background: isActive ? `radial-gradient(circle, ${glow}10 0%, transparent 70%)` : 'transparent'
          }}
        >
          {emoji}
        </div>

        {/* Chair back */}
        <div className="w-14 h-2 rounded-t-lg mt-0.5" style={{ background: isActive ? '#1e3a5f' : '#1e293b' }} />
        <div className="w-16 h-1.5 rounded-full" style={{ background: '#0f172a' }} />

        {/* Name tag */}
        <div className="mt-2.5 text-center">
          <div className="text-[11px] font-bold text-white tracking-wide">{name}</div>
          <div className="text-[8px] text-faint/70 mt-0.5">{role}</div>
          <div className={`flex items-center justify-center gap-1 mt-1 text-[8px] font-mono
            ${isActive ? 'text-success' : 'text-faint/40'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-success pulse-dot' : 'bg-faint/30'}`} />
            {status}
          </div>
        </div>
      </div>
    </div>
  )
}
