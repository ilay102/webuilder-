'use client'
import { useEffect, useState } from 'react'
import Shell from '@/app/shell'
import { fetchStatus } from '@/lib/api'
import clsx from 'clsx'

interface Member {
  id: string
  name: string
  role: string
  emoji: string
  status: 'active' | 'idle' | 'offline'
  reportsTo?: string
  skills: string[]
  tasksToday: number
  description: string
}

const TEAM: Member[] = [
  {
    id: 'ilay',
    name: 'Ilay',
    role: 'Operator / CEO',
    emoji: '👑',
    status: 'active',
    skills: ['Strategy', 'Approvals', 'Product'],
    tasksToday: 0,
    description: 'Human-in-the-loop. Approves actions and sets direction.',
  },
  {
    id: 'chad',
    name: 'Chad',
    role: 'B2B Sales Agent',
    emoji: '🤖',
    status: 'active',
    reportsTo: 'ilay',
    skills: ['Lead Generation', 'Cold Outreach', 'LinkedIn', 'Email', 'CRM'],
    tasksToday: 4,
    description: 'Autonomous sales agent running on OpenClaw. Finds leads, writes emails, follows up, and reports to Ilay.',
  },
  {
    id: 'future1',
    name: 'Scout (soon)',
    role: 'Research Agent',
    emoji: '🔍',
    status: 'offline',
    reportsTo: 'chad',
    skills: ['Web Scraping', 'Data Enrichment', 'OSINT'],
    tasksToday: 0,
    description: 'Future agent: deep research and lead enrichment specialist.',
  },
  {
    id: 'future2',
    name: 'Pen (soon)',
    role: 'Copywriting Agent',
    emoji: '✍️',
    status: 'offline',
    reportsTo: 'chad',
    skills: ['Cold Email', 'LinkedIn Copy', 'A/B Testing'],
    tasksToday: 0,
    description: 'Future agent: generates and A/B tests outreach copy.',
  },
]

const STATUS_DOT: Record<string, string> = {
  active:  'bg-success pulse-dot',
  idle:    'bg-warn',
  offline: 'bg-faint/50',
}
const STATUS_LABEL: Record<string, string> = {
  active:  'text-success',
  idle:    'text-warn',
  offline: 'text-faint',
}

export default function TeamPage() {
  const [selected, setSelected] = useState<Member>(TEAM[1])

  return (
    <Shell>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-bg2 flex-shrink-0">
          <span className="text-lg">🌐</span>
          <h1 className="text-sm font-bold tracking-wider text-white uppercase">Team</h1>
          <span className="text-[10px] text-faint">{TEAM.filter(m => m.status === 'active').length} active</span>
        </div>

        <div className="flex-1 min-h-0 flex">
          {/* Org tree */}
          <div className="w-[280px] flex-shrink-0 border-r border-border p-4 overflow-y-auto bg-bg2">
            <div className="text-[9px] text-faint uppercase tracking-widest mb-3">Org Chart</div>
            {/* Root: Ilay */}
            {TEAM.filter(m => !m.reportsTo).map(m => (
              <div key={m.id}>
                <OrgCard member={m} selected={selected} onSelect={setSelected} />
                {/* L1: reports to Ilay */}
                {TEAM.filter(c => c.reportsTo === m.id).map(child => (
                  <div key={child.id} className="ml-6 relative">
                    <div className="absolute left-[-12px] top-[28px] w-3 h-px bg-border" />
                    <div className="absolute left-[-12px] top-0 bottom-0 w-px bg-border" />
                    <OrgCard member={child} selected={selected} onSelect={setSelected} />
                    {/* L2: reports to Chad */}
                    {TEAM.filter(gc => gc.reportsTo === child.id).map(gc => (
                      <div key={gc.id} className="ml-6 relative">
                        <div className="absolute left-[-12px] top-[28px] w-3 h-px bg-border" />
                        <div className="absolute left-[-12px] top-0 bottom-0 w-px bg-border" />
                        <OrgCard member={gc} selected={selected} onSelect={setSelected} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selected && (
              <div className="max-w-xl">
                <div className="flex items-start gap-4 mb-6">
                  <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center text-4xl bg-bg2 border',
                    selected.status === 'offline' ? 'border-border opacity-50' : 'border-border2'
                  )}>
                    {selected.emoji}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                    <div className="text-[12px] text-muted mt-0.5">{selected.role}</div>
                    <div className={clsx('flex items-center gap-1.5 mt-2 text-[10px]', STATUS_LABEL[selected.status])}>
                      <span className={clsx('w-2 h-2 rounded-full', STATUS_DOT[selected.status])} />
                      {selected.status}
                    </div>
                  </div>
                  {selected.tasksToday > 0 && (
                    <div className="ml-auto bg-accent/10 border border-accent/20 rounded-xl px-4 py-2 text-center">
                      <div className="text-2xl font-bold text-accent">{selected.tasksToday}</div>
                      <div className="text-[9px] text-muted">tasks today</div>
                    </div>
                  )}
                </div>

                <div className="bg-bg2 border border-border rounded-xl p-4 mb-4">
                  <div className="text-[10px] text-faint uppercase tracking-widest mb-2">About</div>
                  <p className="text-[12px] text-muted leading-relaxed">{selected.description}</p>
                </div>

                <div className="bg-bg2 border border-border rounded-xl p-4 mb-4">
                  <div className="text-[10px] text-faint uppercase tracking-widest mb-3">Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.skills.map(s => (
                      <span key={s} className="text-[10px] px-2.5 py-1 bg-bg3 border border-border rounded-lg text-muted">{s}</span>
                    ))}
                  </div>
                </div>

                {selected.reportsTo && (
                  <div className="bg-bg2 border border-border rounded-xl p-4">
                    <div className="text-[10px] text-faint uppercase tracking-widest mb-2">Reports To</div>
                    <div className="text-[12px] text-white">
                      {TEAM.find(m => m.id === selected.reportsTo)?.emoji} {TEAM.find(m => m.id === selected.reportsTo)?.name}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  )
}

function OrgCard({ member, selected, onSelect }: { member: Member; selected: Member; onSelect: (m: Member) => void }) {
  return (
    <div
      onClick={() => onSelect(member)}
      className={clsx(
        'flex items-center gap-2 p-2 rounded-lg cursor-pointer mb-1 transition-all border',
        selected.id === member.id ? 'bg-accent/10 border-accent/30' : 'border-transparent hover:bg-bg3 hover:border-border'
      )}
    >
      <span className={clsx('text-xl', member.status === 'offline' && 'opacity-40')}>{member.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-white truncate">{member.name}</div>
        <div className="text-[9px] text-faint truncate">{member.role}</div>
      </div>
      <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', {
        'bg-success pulse-dot': member.status === 'active',
        'bg-warn': member.status === 'idle',
        'bg-faint/40': member.status === 'offline',
      })} />
    </div>
  )
}
