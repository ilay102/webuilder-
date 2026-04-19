'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Shell from '@/app/shell'
import { fetchClients, saveClient, createClient, churnClient, createLSCheckout } from '@/lib/api'
import type { Client } from '@/lib/types'
import clsx from 'clsx'

const EMPTY: Partial<Client> & { slug: string } = {
  slug: '', name: '', phone: '', email: '', whatsapp: '',
  domain: '', template: 'dental', plan: 'trial', notes: '',
}

export default function ClientsPage() {
  const [clients, setClients]       = useState<Client[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [modal, setModal]           = useState(false)
  const [editing, setEditing]       = useState<(Partial<Client> & { slug: string }) | null>(null)
  const [saving, setSaving]         = useState(false)
  const [payingSlug, setPayingSlug] = useState<string | null>(null)
  const [toast, setToast]           = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const searchParams = useSearchParams()

  const showToast = useCallback((kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const load = useCallback(async () => {
    const data = await fetchClients()
    setClients(data)
    setLoading(false)
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [load])

  // Handle ?payment=success redirect back from Lemon Squeezy
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      const slug = searchParams.get('slug') || ''
      showToast('ok', `Payment received${slug ? ` for ${slug}` : ''} — assets locked 🎉`)
      // Clean URL without reload
      window.history.replaceState({}, '', '/clients')
    }
  }, [searchParams, showToast])

  const filtered = clients.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (c.name || '').toLowerCase().includes(q) ||
           (c.slug || '').toLowerCase().includes(q) ||
           (c.phone || '').includes(q) ||
           (c.email || '').toLowerCase().includes(q)
  })

  const active  = clients.filter(c => c.status === 'active').length
  const paid    = clients.filter(c => c.plan === 'paid').length
  const trial   = clients.filter(c => c.plan === 'trial').length
  const churned = clients.filter(c => c.status === 'churned').length

  const openAdd = () => { setEditing({ ...EMPTY }); setModal(true) }
  const openEdit = (c: Client) => { setEditing({ ...c }); setModal(true) }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSave = async () => {
    if (!editing?.slug) return
    setSaving(true)
    const isNew = !clients.find(c => c.slug === editing.slug)
    const result = isNew ? await createClient(editing) : await saveClient(editing)
    if (result) {
      setClients(prev => {
        const idx = prev.findIndex(c => c.slug === result.slug)
        if (idx === -1) return [result, ...prev]
        const next = [...prev]; next[idx] = result; return next
      })
      closeModal()
    }
    setSaving(false)
  }

  const handleChurn = async (slug: string) => {
    if (!confirm(`Mark "${slug}" as churned?`)) return
    await churnClient(slug)
    setClients(prev => prev.map(c => c.slug === slug ? { ...c, status: 'churned' as const } : c))
  }

  const handleCollect = async (c: Client) => {
    setPayingSlug(c.slug)
    const res = await createLSCheckout(c.slug, { email: c.email || '', name: c.name || '' })
    setPayingSlug(null)
    if (!res.ok || !res.url) {
      showToast('err', res.error || 'Failed to create checkout')
      return
    }
    // Open LS hosted checkout in new tab
    window.open(res.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Shell>
      <div className="flex flex-col h-full overflow-hidden relative">
        {/* Toast */}
        {toast && (
          <div className={clsx(
            'absolute top-4 right-5 z-50 px-4 py-2.5 rounded-lg border text-[12px] shadow-xl flex items-center gap-2',
            toast.kind === 'ok'
              ? 'bg-success/15 border-success/40 text-success'
              : 'bg-danger/15 border-danger/40 text-danger',
          )}>
            {toast.kind === 'ok' ? '✓' : '✕'} {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-bg2 flex-shrink-0">
          <span className="text-lg">🏢</span>
          <h1 className="text-sm font-bold tracking-wider text-white uppercase">Clients</h1>
          <span className="text-[10px] text-faint ml-1">{clients.length} total</span>
          <div className="ml-auto flex items-center gap-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-44 bg-bg3 border border-border rounded-lg px-3 py-1.5 text-[12px] text-white placeholder:text-faint outline-none focus:border-accent"
            />
            <button
              onClick={openAdd}
              className="bg-accent hover:bg-accent/80 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              ⊕ Add Client
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 px-5 py-3 border-b border-border bg-bg2 flex-shrink-0">
          {[
            { label: 'Active',   val: active,  color: 'text-success' },
            { label: 'Paid',     val: paid,    color: 'text-accent' },
            { label: 'Trial',    val: trial,   color: 'text-warn' },
            { label: 'Churned',  val: churned, color: 'text-danger' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 bg-bg3 border border-border rounded-lg px-4 py-2">
              <span className={clsx('text-xl font-black leading-none', s.color)}>{s.val}</span>
              <span className="text-[10px] text-faint font-semibold uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-faint text-sm">Loading…</div>
          ) : !filtered.length ? (
            <div className="flex items-center justify-center h-32 text-faint text-sm">No clients found</div>
          ) : (
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 z-10 bg-bg3 border-b border-border">
                <tr>
                  {['Client', 'Contact', 'Template', 'Status', 'Plan', 'Site', 'Last Photo', 'Added', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-faint whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.slug} className="border-b border-border hover:bg-bg2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{c.name || c.slug}</div>
                      <div className="text-faint text-[10px]">/{c.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-text">{c.phone || '—'}</div>
                      <div className="text-faint text-[10px]">{c.email || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-muted">{c.template || 'dental'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={c.plan} />
                    </td>
                    <td className="px-4 py-3">
                      {c.siteUrl
                        ? <a href={c.siteUrl} target="_blank" rel="noopener" className="text-accent hover:underline text-[11px]">Open ↗</a>
                        : <span className="text-faint">—</span>}
                    </td>
                    <td className="px-4 py-3 text-faint text-[11px]">
                      {c.lastPhotoAt ? new Date(c.lastPhotoAt).toLocaleDateString('he-IL') : '—'}
                    </td>
                    <td className="px-4 py-3 text-faint text-[11px] whitespace-nowrap">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('he-IL') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        <button onClick={() => openEdit(c)} className="text-[10px] px-2 py-1 rounded border border-border hover:border-accent hover:text-accent transition-colors">Edit</button>
                        {c.status !== 'churned' && c.plan !== 'paid' && (
                          <button
                            onClick={() => handleCollect(c)}
                            disabled={payingSlug === c.slug}
                            className="text-[10px] px-2 py-1 rounded border border-accent/40 text-accent hover:bg-accent/10 transition-colors disabled:opacity-50 disabled:cursor-wait whitespace-nowrap"
                          >
                            {payingSlug === c.slug ? '…' : '💳 Collect'}
                          </button>
                        )}
                        {c.plan === 'paid' && (
                          <span className="text-[10px] text-success">✓ paid</span>
                        )}
                        {c.status !== 'churned' && (
                          <button onClick={() => handleChurn(c.slug)} className="text-[10px] px-2 py-1 rounded border border-danger/30 text-danger hover:bg-danger/10 transition-colors">×</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && editing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg2 border border-bd2 rounded-xl w-[480px] max-w-full shadow-2xl">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <span className="text-base">🏢</span>
              <h2 className="text-sm font-bold text-white flex-1">
                {clients.find(c => c.slug === editing.slug) ? 'Edit Client' : 'Add Client'}
              </h2>
              <button onClick={closeModal} className="text-faint hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Business Name" value={editing.name || ''} onChange={v => setEditing(e => e && ({ ...e, name: v }))} placeholder="Dr. Cohen Dental" />
                <Field label="Route Slug" value={editing.slug} onChange={v => setEditing(e => e && ({ ...e, slug: v.toLowerCase().replace(/\s+/g,'-') }))} placeholder="cohen-dental" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone" value={editing.phone || ''} onChange={v => setEditing(e => e && ({ ...e, phone: v }))} placeholder="050-000-0000" />
                <Field label="Email" value={editing.email || ''} onChange={v => setEditing(e => e && ({ ...e, email: v }))} placeholder="client@gmail.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="WhatsApp" value={editing.whatsapp || ''} onChange={v => setEditing(e => e && ({ ...e, whatsapp: v }))} placeholder="972501234567" />
                <Field label="Custom Domain" value={editing.domain || ''} onChange={v => setEditing(e => e && ({ ...e, domain: v || null }))} placeholder="cohen-dental.co.il" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Template</label>
                  <select value={editing.template || 'dental'} onChange={e => setEditing(prev => prev && ({ ...prev, template: e.target.value }))}
                    className="bg-bg3 border border-border rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-accent">
                    <option value="dental">Dental</option>
                    <option value="accountant">Accountant</option>
                    <option value="lawyer">Lawyer</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Plan</label>
                  <select value={editing.plan || 'trial'} onChange={e => setEditing(prev => prev && ({ ...prev, plan: e.target.value as 'trial' | 'paid' }))}
                    className="bg-bg3 border border-border rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-accent">
                    <option value="trial">Trial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              <Field label="Notes" value={editing.notes || ''} onChange={v => setEditing(e => e && ({ ...e, notes: v }))} placeholder="Any notes…" />
            </div>
            <div className="flex gap-2 justify-end px-5 py-4 border-t border-border">
              <button onClick={closeModal} className="text-[12px] px-4 py-2 rounded-lg border border-border hover:border-bd2 text-muted hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !editing.slug}
                className="text-[12px] px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-white font-bold transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-muted uppercase tracking-wider">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="bg-bg3 border border-border rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-faint outline-none focus:border-accent" />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full border',
      status === 'active'  ? 'bg-success/10 text-success border-success/30' :
      status === 'churned' ? 'bg-faint/10 text-faint border-faint/20' : ''
    )}>{status}</span>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full border',
      plan === 'paid'  ? 'bg-accent/10 text-accent border-accent/30' :
      plan === 'trial' ? 'bg-warn/10 text-warn border-warn/20' : ''
    )}>{plan}</span>
  )
}
