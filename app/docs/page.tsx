'use client'
import { useEffect, useState } from 'react'
import Shell from '@/app/shell'
import { fetchDocs } from '@/lib/api'
import type { Doc } from '@/lib/types'
import clsx from 'clsx'

const TYPE_ICON: Record<string, string> = {
  report: '📊', proposal: '📝', email: '✉️', summary: '📋', other: '📄'
}
const TYPE_COLOR: Record<string, string> = {
  report: 'text-accent', proposal: 'text-purple', email: 'text-cyan', summary: 'text-success', other: 'text-muted'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}

function formatSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes}B`
  return `${(bytes / 1024).toFixed(1)}KB`
}

export default function DocsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [selected, setSelected] = useState<Doc | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const load = async () => {
      const data = await fetchDocs()
      setDocs(data)
      if (data.length > 0) setSelected(data[0])
    }
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [])

  const types = ['all', ...Array.from(new Set(docs.map(d => d.type)))]
  const filtered = filter === 'all' ? docs : docs.filter(d => d.type === filter)

  return (
    <Shell>
      <div className="flex h-full">
        {/* Doc list */}
        <div className="w-[240px] flex-shrink-0 border-r border-border flex flex-col bg-bg2">
          <div className="px-3 py-2.5 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">📄</span>
              <span className="text-[10px] font-bold tracking-widest text-muted uppercase">Docs</span>
              <span className="ml-auto text-[10px] text-faint">{docs.length}</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {types.map(t => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={clsx(
                    'text-[9px] px-2 py-0.5 rounded border transition-all capitalize',
                    filter === t ? 'bg-accent/10 text-accent border-accent/30' : 'text-faint border-border hover:border-border2'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {filtered.map(doc => (
              <button
                key={doc.id}
                onClick={() => setSelected(doc)}
                className={clsx(
                  'w-full text-left px-3 py-2.5 border-b border-border/50 transition-all',
                  selected?.id === doc.id ? 'bg-accent/10 border-l-2 border-l-accent' : 'hover:bg-bg3'
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className={clsx('text-sm', TYPE_COLOR[doc.type])}>{TYPE_ICON[doc.type]}</span>
                  <span className="text-[10px] font-semibold text-white truncate flex-1">{doc.title}</span>
                </div>
                <div className="text-[9px] text-faint mt-0.5 flex gap-2">
                  <span>{formatDate(doc.created_at)}</span>
                  {doc.size && <span>{formatSize(doc.size)}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Doc viewer */}
        <div className="flex-1 overflow-y-auto p-6">
          {selected ? (
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-1">
                <span className={clsx('text-xl', TYPE_COLOR[selected.type])}>{TYPE_ICON[selected.type]}</span>
                <div>
                  <h2 className="text-base font-bold text-white">{selected.title}</h2>
                  <div className="text-[10px] text-faint mt-0.5">
                    {formatDate(selected.created_at)} · {selected.type} · 🤖 {selected.agent}
                    {selected.size && ` · ${formatSize(selected.size)}`}
                  </div>
                </div>
                <button
                  className="ml-auto text-[10px] px-3 py-1.5 bg-bg2 border border-border rounded hover:border-border2 text-muted hover:text-white transition-all"
                  onClick={() => {
                    const el = document.createElement('a')
                    el.href = 'data:text/plain,' + encodeURIComponent(selected.content)
                    el.download = selected.title + '.txt'
                    el.click()
                  }}
                >
                  ↓ Export
                </button>
              </div>
              <div className="mt-4 bg-bg2 border border-border rounded-xl p-5">
                <pre className="text-[12px] text-muted whitespace-pre-wrap leading-relaxed font-mono">{selected.content}</pre>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-faint text-[11px]">Select a document</div>
          )}
        </div>
      </div>
    </Shell>
  )
}
