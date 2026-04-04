'use client'
import { useEffect, useState } from 'react'
import Shell from '@/app/shell'
import { fetchApprovals, approve, reject } from '@/lib/api'
import type { Approval } from '@/lib/types'
import clsx from 'clsx'

const TYPE_ICON: Record<string, string> = {
  email:  '✉️',
  action: '⚙️',
  deploy: '🚀',
  message:'💬',
  post:   '📢',
}

const URGENCY_STYLE: Record<string, { badge: string; border: string }> = {
  high:   { badge: 'bg-danger/10 text-danger border-danger/20',  border: 'border-l-danger' },
  medium: { badge: 'bg-warn/10 text-warn border-warn/20',        border: 'border-l-warn' },
  low:    { badge: 'bg-faint/10 text-faint border-faint/20',     border: 'border-l-faint/30' },
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<Approval[]>([])
  const [selected, setSelected] = useState<Approval | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())

  const load = async () => {
    const data = await fetchApprovals()
    setItems(data)
    if (!selected && data.length > 0) setSelected(data[0])
  }

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t) }, [])

  const pending = items.filter(i => !done.has(i.id))

  const handleApprove = async (id: string) => {
    setDone(s => new Set([...s, id]))
    if (selected?.id === id) setSelected(pending.find(p => p.id !== id) ?? null)
    await approve(id)
  }

  const handleReject = async (id: string) => {
    setDone(s => new Set([...s, id]))
    if (selected?.id === id) setSelected(pending.find(p => p.id !== id) ?? null)
    await reject(id)
  }

  return (
    <Shell>
      <div className="flex h-full">
        {/* List */}
        <div className="w-[260px] flex-shrink-0 border-r border-border flex flex-col bg-bg2">
          <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
            <span className="text-base">✅</span>
            <span className="text-[10px] font-bold tracking-widest text-muted uppercase">Approvals</span>
            {pending.length > 0 && (
              <span className="ml-auto text-[9px] bg-danger/20 text-danger border border-danger/30 rounded-full px-1.5 font-bold">
                {pending.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {pending.length === 0 && (
              <div className="text-center py-12 text-faint text-[10px]">
                <div className="text-3xl mb-2">🎉</div>
                All clear! No pending approvals.
              </div>
            )}
            {pending.map(item => {
              const urgency = URGENCY_STYLE[item.urgency] || URGENCY_STYLE.low
              const typeIcon = TYPE_ICON[item.type] || '❓'
              return (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className={clsx(
                    'w-full text-left px-3 py-2.5 border-b border-border/50 border-l-2 transition-all',
                    selected?.id === item.id ? 'bg-accent/5 border-l-accent' : `${urgency.border} hover:bg-bg3`
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm">{typeIcon}</span>
                    <span className="text-[10px] font-semibold text-white truncate flex-1">{item.title || 'Untitled'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-faint">
                    <span className={clsx('px-1.5 py-0.5 rounded border font-semibold uppercase', urgency.badge)}>{item.urgency || 'low'}</span>
                    <span>{timeAgo(item.created_at || item.timestamp || new Date().toISOString())}</span>
                    <span className="ml-auto">🤖 {item.agent || 'Unknown'}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Detail / review pane */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selected && !done.has(selected.id) ? (
            <>
              {/* Approval header */}
              <div className="flex-shrink-0 border-b border-border bg-bg2 px-5 py-4">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl">{TYPE_ICON[selected.type] || '❓'}</span>
                  <div>
                    <h2 className="text-base font-bold text-white">{selected.title || 'Untitled'}</h2>
                    <div className="text-[10px] text-faint mt-0.5">
                      {selected.type || 'unknown'} · {timeAgo(selected.created_at || selected.timestamp || new Date().toISOString())} · 🤖 {selected.agent || 'Unknown'}
                    </div>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => handleReject(selected.id)}
                      className="px-4 py-2 text-[11px] font-semibold rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-all"
                    >
                      ✕ Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selected.id)}
                      className="px-4 py-2 text-[11px] font-semibold rounded-lg bg-success text-white hover:bg-success/80 transition-all"
                    >
                      ✓ Approve
                    </button>
                  </div>
                </div>

                {/* Metadata */}
                {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                  <div className="flex gap-3 mt-3 flex-wrap">
                    {Object.entries(selected.metadata).map(([k, v]) => (
                      <div key={k} className="bg-bg3 border border-border rounded px-2 py-1">
                        <span className="text-[9px] text-faint uppercase">{k}:</span>
                        <span className="text-[10px] text-muted ml-1">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Message body */}
              <div className="flex-1 overflow-y-auto p-5">
                <div className="max-w-2xl">
                  {/* Urgency banner */}
                  {selected.urgency === 'high' && (
                    <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-4 py-2.5 mb-4 text-[11px] text-danger">
                      <span>⚠️</span> High urgency — Chad is waiting on your approval to proceed.
                    </div>
                  )}

                  <div className="bg-bg2 border border-border rounded-xl p-5">
                    <pre className="text-[12px] text-muted whitespace-pre-wrap leading-relaxed font-mono">{selected.body || selected.message_draft || 'No content provided.'}</pre>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleApprove(selected.id)}
                      className="flex-1 py-3 text-[12px] font-bold rounded-xl bg-success text-white hover:bg-success/80 transition-all"
                    >
                      ✓ Approve — Send
                    </button>
                    <button
                      onClick={() => handleReject(selected.id)}
                      className="flex-1 py-3 text-[12px] font-bold rounded-xl border border-danger/30 text-danger hover:bg-danger/10 transition-all"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-faint text-[11px] flex-col gap-2">
              {pending.length === 0 ? (
                <>
                  <div className="text-4xl">✅</div>
                  <div>No pending approvals — inbox zero!</div>
                </>
              ) : (
                <div>Select an approval to review</div>
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
