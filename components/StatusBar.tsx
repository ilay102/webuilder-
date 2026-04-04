'use client'
import { useEffect, useState } from 'react'
import { fetchStatus } from '@/lib/api'
import type { SystemStatus } from '@/lib/types'

export default function StatusBar() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [lastSync, setLastSync] = useState<string>('—')

  useEffect(() => {
    const load = async () => {
      const s = await fetchStatus()
      setStatus(s)
      setLastSync(new Date().toLocaleTimeString())
    }
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="h-10 flex-shrink-0 flex items-center gap-4 px-4 bg-bg2 border-b border-border text-[10px] text-muted">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${status?.daemon === 'active' ? 'bg-success pulse-dot' : 'bg-danger'}`} />
        <span>Daemon {status?.daemon ?? '…'}</span>
      </div>
      <span className="text-border">|</span>
      <span>Uptime {status?.uptime ?? '…'}</span>
      <span className="text-border">|</span>
      <span>{status?.agents_running ?? '—'} agent{status?.agents_running !== 1 ? 's' : ''} running</span>
      <span className="ml-auto text-faint">Last sync: {lastSync}</span>
      <span className="text-faint">· auto-refresh 10s</span>
    </header>
  )
}
