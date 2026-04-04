'use client'
import { useEffect, useState } from 'react'
import Shell from '@/app/shell'
import { fetchMemory } from '@/lib/api'
import type { MemoryEntry } from '@/lib/types'
import clsx from 'clsx'

export default function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>([])
  const [selected, setSelected] = useState<MemoryEntry | null>(null)

  useEffect(() => {
    const load = async () => {
      const data = await fetchMemory()
      setEntries(data)
      if (data.length > 0) setSelected(data[0])
    }
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [])

  return (
    <Shell>
      <div className="flex h-full">
        {/* Sidebar list */}
        <div className="w-[220px] flex-shrink-0 border-r border-border flex flex-col bg-bg2">
          <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
            <span className="text-base">🧠</span>
            <span className="text-[10px] font-bold tracking-widest text-muted uppercase">Memory</span>
            <span className="ml-auto text-[10px] text-faint">{entries.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {entries.map(e => (
              <button
                key={e.id}
                onClick={() => setSelected(e)}
                className={clsx(
                  'w-full text-left px-3 py-2.5 border-b border-border/50 transition-all',
                  selected?.id === e.id ? 'bg-accent/10 border-l-2 border-l-accent' : 'hover:bg-bg3'
                )}
              >
                <div className="text-[10px] font-semibold text-white truncate">{e.title}</div>
                <div className="text-[9px] text-faint mt-0.5">{e.date}</div>
                {e.tags && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {e.tags.map(tag => (
                      <span key={tag} className="text-[8px] px-1 bg-bg border border-border rounded text-faint">{tag}</span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Entry content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selected ? (
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] text-faint font-mono bg-bg2 border border-border px-2 py-1 rounded">{selected.date}</span>
                {selected.tags?.map(tag => (
                  <span key={tag} className="text-[9px] px-2 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded">{tag}</span>
                ))}
                <span className="ml-auto text-[10px] text-faint">🤖 {selected.agent}</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-4">{selected.title}</h2>
              <div className="bg-bg2 border border-border rounded-xl p-5">
                <pre className="text-[12px] text-muted whitespace-pre-wrap leading-relaxed font-mono">{selected.content}</pre>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-faint text-[11px]">
              Select an entry
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
