'use client'
import { useEffect, useState } from 'react'
import Shell from '@/app/shell'
import { fetchCalendar } from '@/lib/api'
import type { CronJob } from '@/lib/types'
import clsx from 'clsx'

function parseCron(expr: string): string {
  const parts = expr.split(' ')
  if (parts.length < 5) return expr
  const [min, hour, , , dow] = parts
  const days: Record<string, string> = { '1-5': 'Weekdays', '2,4': 'Tue & Thu', '*': 'Every day', '1': 'Monday' }
  if (min === '*/15') return 'Every 15 minutes'
  const dayStr = days[dow] ?? `dow ${dow}`
  return `${dayStr} at ${hour.padStart(2,'0')}:${min.padStart(2,'0')}`
}

function timeAgo(iso?: string): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function timeUntil(iso?: string): string {
  if (!iso) return '—'
  const ms = new Date(iso).getTime() - Date.now()
  if (ms < 0) return 'overdue'
  const m = Math.floor(ms / 60000)
  if (m < 60) return `in ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `in ${h}h`
  return `in ${Math.floor(h / 24)}d`
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  paused: 'bg-warn/10 text-warn border-warn/20',
  error:  'bg-danger/10 text-danger border-danger/20',
}

export default function CalendarPage() {
  const [jobs, setJobs] = useState<CronJob[]>([])

  useEffect(() => {
    const load = async () => setJobs(await fetchCalendar())
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [])

  const active = jobs.filter(j => j.status === 'active').length

  return (
    <Shell>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-bg2 flex-shrink-0">
          <span className="text-lg">📅</span>
          <h1 className="text-sm font-bold tracking-wider text-white uppercase">Calendar</h1>
          <span className="text-[10px] text-faint">{active} of {jobs.length} cron jobs active</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-3 max-w-3xl">
            {jobs.map(job => (
              <div key={job.id} className="bg-bg2 border border-border rounded-xl p-4 hover:border-border2 transition-all">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <div className={clsx('w-2.5 h-2.5 rounded-full', job.status === 'active' ? 'bg-success pulse-dot' : job.status === 'paused' ? 'bg-warn' : 'bg-danger')} />
                    <div className="w-px h-full bg-border" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-bold text-white">{job.name}</span>
                      <span className={clsx('text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase', STATUS_STYLE[job.status])}>
                        {job.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted mb-2">{job.description}</div>
                    <div className="flex items-center gap-4 text-[10px]">
                      <div className="flex items-center gap-1 text-faint">
                        <span>⏰</span>
                        <span className="font-mono">{job.schedule}</span>
                        <span className="text-muted ml-1">({parseCron(job.schedule)})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-faint">
                      <span>Last: <span className="text-muted">{timeAgo(job.last_run)}</span></span>
                      <span>Next: <span className={clsx(job.status === 'active' ? 'text-accent' : 'text-faint')}>{timeUntil(job.next_run)}</span></span>
                      <span className="ml-auto">🤖 {job.agent}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  )
}
