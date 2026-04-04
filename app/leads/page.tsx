'use client'
import { useEffect, useState } from 'react'
import Shell from '@/app/shell'
import { fetchLeads } from '@/lib/api'
import type { Lead } from '@/lib/types'
import clsx from 'clsx'

const STATUS_STYLE: Record<string, { dot: string; badge: string; label: string }> = {
  new:       { dot: 'bg-cyan',    badge: 'bg-cyan/10 text-cyan border-cyan/20',        label: 'New' },
  contacted: { dot: 'bg-accent',  badge: 'bg-accent/10 text-accent border-accent/20',  label: 'Contacted' },
  replied:   { dot: 'bg-success', badge: 'bg-success/10 text-success border-success/20', label: 'Replied' },
  qualified: { dot: 'bg-purple',  badge: 'bg-purple/10 text-purple border-purple/20',  label: 'Qualified' },
  lost:      { dot: 'bg-faint',   badge: 'bg-faint/10 text-faint border-faint/20',     label: 'Lost' },
}

function ScoreBar({ score }: { score?: number }) {
  if (!score) return <span className="text-faint text-[10px]">—</span>
  const color = score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warn' : 'bg-danger'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-bg3 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] text-muted">{score}</span>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short' })
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Lead | null>(null)
  const [sort, setSort] = useState<'score' | 'date'>('score')

  useEffect(() => {
    const load = async () => {
      const data = await fetchLeads()
      setLeads(data)
    }
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [])

  const statuses = ['all', 'new', 'contacted', 'replied', 'qualified', 'lost']

  const filtered = leads
    .filter(l => filter === 'all' || l.status === filter)
    .filter(l => {
      if (!search) return true
      const q = search.toLowerCase()
      return l.company.toLowerCase().includes(q) || l.contact.toLowerCase().includes(q) || l.industry.toLowerCase().includes(q)
    })
    .sort((a, b) => sort === 'score' ? (b.score ?? 0) - (a.score ?? 0) : new Date(b.found_at).getTime() - new Date(a.found_at).getTime())

  return (
    <Shell>
      <div className="flex flex-col h-full">
        {/* Header + filters */}
        <div className="flex-shrink-0 border-b border-border bg-bg2">
          <div className="flex items-center gap-3 px-5 py-3">
            <span className="text-lg">🎯</span>
            <h1 className="text-sm font-bold tracking-wider text-white uppercase">Leads</h1>
            <span className="text-[10px] text-faint">{leads.length} total</span>

            {/* Summary chips */}
            {statuses.filter(s => s !== 'all').map(s => {
              const count = leads.filter(l => l.status === s).length
              if (!count) return null
              const st = STATUS_STYLE[s]
              return (
                <span key={s} className={clsx('text-[9px] px-2 py-0.5 rounded border font-semibold capitalize', st.badge)}>
                  {count} {st.label}
                </span>
              )
            })}

            {/* Search */}
            <input
              className="ml-auto bg-bg3 border border-border rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-accent w-48 placeholder:text-faint"
              placeholder="Search leads…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              onClick={() => setSort(s => s === 'score' ? 'date' : 'score')}
              className="text-[10px] px-3 py-1.5 bg-bg3 border border-border rounded hover:border-border2 text-muted hover:text-white transition-all"
            >
              Sort: {sort}
            </button>
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-0 border-t border-border px-4">
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={clsx(
                  'text-[10px] px-3 py-2 capitalize border-b-2 transition-all',
                  filter === s ? 'border-accent text-accent' : 'border-transparent text-faint hover:text-muted'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table + detail */}
        <div className="flex flex-1 min-h-0">
          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-bg2 border-b border-border z-10">
                <tr>
                  <th className="text-left px-4 py-2 text-[9px] text-faint font-semibold uppercase tracking-wider">Company</th>
                  <th className="text-left px-4 py-2 text-[9px] text-faint font-semibold uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-2 text-[9px] text-faint font-semibold uppercase tracking-wider">Industry</th>
                  <th className="text-left px-4 py-2 text-[9px] text-faint font-semibold uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-2 text-[9px] text-faint font-semibold uppercase tracking-wider">Score</th>
                  <th className="text-left px-4 py-2 text-[9px] text-faint font-semibold uppercase tracking-wider">Found</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => {
                  const st = STATUS_STYLE[lead.status]
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelected(selected?.id === lead.id ? null : lead)}
                      className={clsx(
                        'border-b border-border/50 cursor-pointer transition-all',
                        selected?.id === lead.id ? 'bg-accent/5' : 'hover:bg-bg2'
                      )}
                    >
                      <td className="px-4 py-2.5 font-semibold text-white">{lead.company}</td>
                      <td className="px-4 py-2.5 text-muted">{lead.phone || lead.contact || '—'}</td>
                      <td className="px-4 py-2.5 text-faint">{lead.industry}</td>
                      <td className="px-4 py-2.5">
                        <span className={clsx('flex items-center gap-1.5')}>
                          <span className={clsx('w-1.5 h-1.5 rounded-full', st.dot)} />
                          <span className={clsx('text-[9px] font-semibold capitalize', st.badge.split(' ').filter(c => c.startsWith('text-'))[0])}>{lead.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5"><ScoreBar score={lead.score} /></td>
                      <td className="px-4 py-2.5 text-faint">{formatDate(lead.found_at)}</td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-faint text-[11px]">No leads found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-[260px] flex-shrink-0 border-l border-border bg-bg2 overflow-y-auto p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1">
                  <div className="text-[12px] font-bold text-white">{selected.company}</div>
                  <div className="text-[10px] text-muted">{selected.contact}</div>
                </div>
                <button onClick={() => setSelected(null)} className="text-faint hover:text-white text-[12px]">✕</button>
              </div>

              <div className="space-y-3">
                {selected.email && (
                  <Row label="Email" value={selected.email} />
                )}
                {selected.linkedin && (
                  <Row label="LinkedIn" value={selected.linkedin} link />
                )}
                <Row label="Industry" value={selected.industry} />
                {selected.size && <Row label="Size" value={`~${selected.size} employees`} />}
                <Row label="Score" value={<ScoreBar score={selected.score} />} />
                <Row label="Found" value={formatDate(selected.found_at)} />
                <Row label="Agent" value={`🤖 ${selected.agent}`} />
              </div>

              {selected.notes && (
                <div className="mt-4 bg-bg3 border border-border rounded-lg p-3">
                  <div className="text-[9px] text-faint uppercase tracking-widest mb-1">Notes</div>
                  <p className="text-[10px] text-muted leading-relaxed">{selected.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}

function Row({ label, value, link }: { label: string; value: React.ReactNode; link?: boolean }) {
  return (
    <div>
      <div className="text-[9px] text-faint uppercase tracking-widest mb-0.5">{label}</div>
      <div className={clsx('text-[11px]', link ? 'text-accent' : 'text-muted')}>{value}</div>
    </div>
  )
}
