'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Shell from '@/app/shell'
import {
  fetchPoolReview,
  approvePoolItem,
  rejectPoolItem,
  type PoolReviewData,
  type PoolReviewImage,
  type PoolReviewText,
} from '@/lib/api'
import clsx from 'clsx'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000'

type Tab = 'images' | 'texts'
type ImageSubtype = 'heroes' | 'patients'

const EMPTY_DATA: PoolReviewData = {
  images: { heroes: [], patients: [] },
  texts: [],
  stats: {
    imagePool: { available: 0, inUse: 0, locked: 0, total: 0 },
    textPool:  { available: 0, inUse: 0, locked: 0, total: 0 },
    pending:   { heroes: 0, patients: 0, texts: 0 },
  },
}

export default function PoolReviewPage() {
  const [data, setData]       = useState<PoolReviewData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<Tab>('images')
  const [subtype, setSubtype] = useState<ImageSubtype>('heroes')
  const [idx, setIdx]         = useState(0)
  const [busy, setBusy]       = useState(false)
  const [flash, setFlash]     = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const load = useCallback(async () => {
    const d = await fetchPoolReview()
    setData(d)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  // Reset index when switching tab / subtype
  useEffect(() => { setIdx(0) }, [tab, subtype])

  const imageList: PoolReviewImage[] = useMemo(
    () => data.images[subtype] || [],
    [data, subtype],
  )
  const textList: PoolReviewText[] = data.texts || []

  const currentImage = imageList[idx]
  const currentText  = textList[idx]

  const total = tab === 'images' ? imageList.length : textList.length

  const handleAct = useCallback(async (action: 'approve' | 'reject') => {
    if (busy) return
    if (tab === 'images') {
      if (!currentImage) return
      setBusy(true)
      const fn = action === 'approve' ? approvePoolItem : rejectPoolItem
      const res = await fn('image', currentImage.id, currentImage.subtype)
      if (res.ok) {
        setFlash({ kind: 'ok', msg: `${action === 'approve' ? 'Approved' : 'Rejected'} ${currentImage.id}` })
        // Refresh data (candidate list shrinks after approve/reject)
        await load()
        setIdx(i => Math.max(0, Math.min(i, (data.images[subtype]?.length || 1) - 2)))
      } else {
        setFlash({ kind: 'err', msg: res.error || 'Failed' })
      }
      setBusy(false)
    } else {
      if (!currentText) return
      setBusy(true)
      const fn = action === 'approve' ? approvePoolItem : rejectPoolItem
      const res = await fn('text', currentText.id)
      if (res.ok) {
        setFlash({ kind: 'ok', msg: `${action === 'approve' ? 'Approved' : 'Rejected'} ${currentText.id}` })
        await load()
        setIdx(i => Math.max(0, Math.min(i, (data.texts?.length || 1) - 2)))
      } else {
        setFlash({ kind: 'err', msg: res.error || 'Failed' })
      }
      setBusy(false)
    }
    setTimeout(() => setFlash(null), 2500)
  }, [busy, tab, currentImage, currentText, load, data, subtype])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (busy || loading) return
      if (e.key === 'ArrowRight') setIdx(i => Math.min(total - 1, i + 1))
      else if (e.key === 'ArrowLeft') setIdx(i => Math.max(0, i - 1))
      else if (e.key.toLowerCase() === 'a') handleAct('approve')
      else if (e.key.toLowerCase() === 'r') handleAct('reject')
      else if (e.key === '1') setTab('images')
      else if (e.key === '2') setTab('texts')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, loading, total, handleAct])

  const { stats } = data

  return (
    <Shell>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-bg2 flex-shrink-0">
          <span className="text-lg">🖼️</span>
          <h1 className="text-sm font-bold tracking-wider text-white uppercase">Pool Review</h1>
          <span className="text-[10px] text-faint ml-1">Tinder-style approval queue</span>

          {/* Tabs */}
          <div className="ml-6 flex items-center gap-1 rounded-md bg-bg3 border border-border p-0.5">
            <button
              onClick={() => setTab('images')}
              className={clsx(
                'px-3 py-1 text-[11px] rounded transition-all',
                tab === 'images' ? 'bg-accent text-white' : 'text-muted hover:text-white',
              )}
            >
              🖼️ Images
              {stats.pending.heroes + stats.pending.patients > 0 && (
                <span className="ml-1.5 text-[9px] bg-danger/30 text-danger rounded-full px-1.5 py-0 font-bold">
                  {stats.pending.heroes + stats.pending.patients}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('texts')}
              className={clsx(
                'px-3 py-1 text-[11px] rounded transition-all',
                tab === 'texts' ? 'bg-accent text-white' : 'text-muted hover:text-white',
              )}
            >
              📝 Texts
              {stats.pending.texts > 0 && (
                <span className="ml-1.5 text-[9px] bg-danger/30 text-danger rounded-full px-1.5 py-0 font-bold">
                  {stats.pending.texts}
                </span>
              )}
            </button>
          </div>

          {/* Subtype toggle (only for images) */}
          {tab === 'images' && (
            <div className="flex items-center gap-1 rounded-md bg-bg3 border border-border p-0.5">
              <button
                onClick={() => setSubtype('heroes')}
                className={clsx(
                  'px-2.5 py-1 text-[11px] rounded',
                  subtype === 'heroes' ? 'bg-accent2/60 text-white' : 'text-muted hover:text-white',
                )}
              >
                heroes ({stats.pending.heroes})
              </button>
              <button
                onClick={() => setSubtype('patients')}
                className={clsx(
                  'px-2.5 py-1 text-[11px] rounded',
                  subtype === 'patients' ? 'bg-accent2/60 text-white' : 'text-muted hover:text-white',
                )}
              >
                patients ({stats.pending.patients})
              </button>
            </div>
          )}

          {/* Live pool stats */}
          <div className="ml-auto flex items-center gap-4 text-[10px]">
            <StatPill label="Image pool" stats={stats.imagePool} />
            <StatPill label="Text pool"  stats={stats.textPool} />
            <button
              onClick={load}
              className="px-2 py-1 text-[10px] rounded border border-border text-muted hover:text-white hover:border-accent transition"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Flash toast */}
        {flash && (
          <div
            className={clsx(
              'absolute top-14 right-6 z-50 px-4 py-2 rounded-md border text-[12px] shadow-lg',
              flash.kind === 'ok'
                ? 'bg-success/15 border-success/40 text-success'
                : 'bg-danger/15 border-danger/40 text-danger',
            )}
          >
            {flash.msg}
          </div>
        )}

        {/* Main review area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center text-muted text-sm">
              Loading candidates…
            </div>
          ) : total === 0 ? (
            <EmptyState tab={tab} subtype={subtype} />
          ) : tab === 'images' ? (
            <ImageReview
              image={currentImage}
              idx={idx}
              total={total}
              onPrev={() => setIdx(i => Math.max(0, i - 1))}
              onNext={() => setIdx(i => Math.min(total - 1, i + 1))}
              onApprove={() => handleAct('approve')}
              onReject={() => handleAct('reject')}
              busy={busy}
            />
          ) : (
            <TextReview
              pack={currentText}
              idx={idx}
              total={total}
              onPrev={() => setIdx(i => Math.max(0, i - 1))}
              onNext={() => setIdx(i => Math.min(total - 1, i + 1))}
              onApprove={() => handleAct('approve')}
              onReject={() => handleAct('reject')}
              busy={busy}
            />
          )}
        </div>

        {/* Keyboard hint bar */}
        <div className="flex-shrink-0 border-t border-border bg-bg2 px-5 py-2 flex items-center gap-4 text-[10px] text-faint">
          <span><kbd className="px-1.5 py-0.5 rounded bg-bg3 border border-border text-muted">←/→</kbd> navigate</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-bg3 border border-border text-success">A</kbd> approve</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-bg3 border border-border text-danger">R</kbd> reject</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-bg3 border border-border text-muted">1</kbd> images · <kbd className="px-1.5 py-0.5 rounded bg-bg3 border border-border text-muted">2</kbd> texts</span>
          <span className="ml-auto">
            Approve moves to live pool + git push · Reject archives
          </span>
        </div>
      </div>
    </Shell>
  )
}

// ── Components ────────────────────────────────────────────────────────────────

function StatPill({ label, stats }: { label: string; stats: { available: number; inUse: number; locked: number; total: number } }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-faint">{label}:</span>
      <span className="text-success">{stats.available}</span>
      <span className="text-faint">/</span>
      <span className="text-accent2">{stats.inUse}</span>
      <span className="text-faint">/</span>
      <span className="text-muted">{stats.locked}</span>
      <span className="text-faint">· {stats.total}</span>
    </div>
  )
}

function EmptyState({ tab, subtype }: { tab: Tab; subtype: ImageSubtype }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-muted">
      <div className="text-5xl opacity-40">
        {tab === 'images' ? '🖼️' : '📝'}
      </div>
      <div className="text-sm font-semibold text-white">Queue empty</div>
      <div className="text-[11px] text-faint max-w-md text-center">
        {tab === 'images'
          ? <>No candidate images in <code className="px-1 rounded bg-bg3 border border-border">public/pool/dental/_candidates/{subtype}/</code>. Drop new files there to see them here.</>
          : <>No text pack candidates in <code className="px-1 rounded bg-bg3 border border-border">text-pack-candidates.json</code>. Append new packs there to review.</>
        }
      </div>
    </div>
  )
}

function ImageReview({
  image, idx, total, onPrev, onNext, onApprove, onReject, busy,
}: {
  image?: PoolReviewImage
  idx: number
  total: number
  onPrev: () => void
  onNext: () => void
  onApprove: () => void
  onReject: () => void
  busy: boolean
}) {
  if (!image) return null
  return (
    <div className="h-full flex flex-col">
      {/* Card area */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-6 relative">
        <button
          onClick={onPrev}
          disabled={idx === 0}
          className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-bg2 border border-border hover:border-accent text-white disabled:opacity-30 disabled:cursor-not-allowed z-10"
        >
          ←
        </button>
        <button
          onClick={onNext}
          disabled={idx >= total - 1}
          className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-bg2 border border-border hover:border-accent text-white disabled:opacity-30 disabled:cursor-not-allowed z-10"
        >
          →
        </button>

        <div className="w-full h-full max-w-5xl flex flex-col items-center">
          <div className="flex-1 min-h-0 w-full flex items-center justify-center bg-bg2 rounded-lg border border-border overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${BASE}${image.url}`}
              alt={image.id}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                // Fallback to next dev host / same origin
                (e.currentTarget as HTMLImageElement).src = image.url
              }}
            />
          </div>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-muted">
            <span className="text-white font-mono">{image.id}</span>
            <span>· {image.subtype}</span>
            <span>· {(image.size / 1024).toFixed(0)} KB</span>
            <span>· added {new Date(image.addedAt).toLocaleString()}</span>
            <span className="ml-auto">{idx + 1} / {total}</span>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex-shrink-0 px-6 pb-5 flex items-center justify-center gap-4">
        <button
          onClick={onReject}
          disabled={busy}
          className="w-36 py-3 rounded-lg bg-danger/15 border border-danger/40 text-danger font-semibold hover:bg-danger/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✕ Reject
        </button>
        <button
          onClick={onApprove}
          disabled={busy}
          className="w-36 py-3 rounded-lg bg-success/15 border border-success/40 text-success font-semibold hover:bg-success/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✓ Approve
        </button>
      </div>
    </div>
  )
}

function TextReview({
  pack, idx, total, onPrev, onNext, onApprove, onReject, busy,
}: {
  pack?: PoolReviewText
  idx: number
  total: number
  onPrev: () => void
  onNext: () => void
  onApprove: () => void
  onReject: () => void
  busy: boolean
}) {
  if (!pack) return null
  const copy = pack.copy || {}
  const copyEntries = Object.entries(copy)
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto p-6" dir="rtl">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border" dir="ltr">
            <button
              onClick={onPrev}
              disabled={idx === 0}
              className="w-9 h-9 rounded-full bg-bg2 border border-border hover:border-accent text-white disabled:opacity-30"
            >
              ←
            </button>
            <button
              onClick={onNext}
              disabled={idx >= total - 1}
              className="w-9 h-9 rounded-full bg-bg2 border border-border hover:border-accent text-white disabled:opacity-30"
            >
              →
            </button>
            <div className="flex-1">
              <div className="text-[18px] font-bold text-white font-mono">{pack.id}</div>
              {pack.vibe && <div className="text-[11px] text-accent2">{pack.vibe}</div>}
            </div>
            <div className="text-[11px] text-muted">{idx + 1} / {total}</div>
          </div>

          {/* Copy */}
          {copyEntries.length > 0 && (
            <Section title="Copy">
              <div className="grid gap-2">
                {copyEntries.map(([k, v]) => (
                  <div key={k} className="flex items-start gap-3 p-2 rounded bg-bg2 border border-border">
                    <div className="min-w-[120px] text-[10px] font-mono text-faint uppercase tracking-wider" dir="ltr">{k}</div>
                    <div className="flex-1 text-[13px] text-white leading-relaxed">{String(v)}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Services */}
          {pack.services && pack.services.length > 0 && (
            <Section title={`Services (${pack.services.length})`}>
              <div className="grid grid-cols-2 gap-2">
                {pack.services.map((s, i) => (
                  <div key={i} className="p-3 rounded bg-bg2 border border-border">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
                      {s.icon && <span>{s.icon}</span>}
                      {s.title}
                    </div>
                    {s.desc && <div className="mt-1 text-[11px] text-muted leading-relaxed">{s.desc}</div>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Testimonials */}
          {pack.testimonials && pack.testimonials.length > 0 && (
            <Section title={`Testimonials (${pack.testimonials.length})`}>
              <div className="grid gap-2">
                {pack.testimonials.map((t, i) => (
                  <div key={i} className="p-3 rounded bg-bg2 border border-border">
                    <div className="text-[13px] text-white leading-relaxed">"{t.quote}"</div>
                    <div className="mt-2 text-[11px] text-accent2">— {t.name}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Stats */}
          {pack.stats && pack.stats.length > 0 && (
            <Section title={`Stats (${pack.stats.length})`}>
              <div className="grid grid-cols-4 gap-2">
                {pack.stats.map((s, i) => (
                  <div key={i} className="p-3 rounded bg-bg2 border border-border text-center">
                    <div className="text-[20px] font-bold text-accent">{s.value}</div>
                    <div className="mt-1 text-[11px] text-muted">{s.label}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex-shrink-0 px-6 pb-5 pt-3 border-t border-border flex items-center justify-center gap-4">
        <button
          onClick={onReject}
          disabled={busy}
          className="w-36 py-3 rounded-lg bg-danger/15 border border-danger/40 text-danger font-semibold hover:bg-danger/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✕ Reject
        </button>
        <button
          onClick={onApprove}
          disabled={busy}
          className="w-36 py-3 rounded-lg bg-success/15 border border-success/40 text-success font-semibold hover:bg-success/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✓ Approve
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-bold tracking-widest uppercase text-faint mb-2" dir="ltr">
        {title}
      </div>
      {children}
    </div>
  )
}
