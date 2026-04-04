'use client'
import { useEffect, useState, useRef } from 'react'
import Shell from '@/app/shell'
import { fetchTasks, updateTaskStatus } from '@/lib/api'
import type { Task, TaskStatus } from '@/lib/types'
import clsx from 'clsx'

const COLS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog',     label: 'Backlog',     color: 'text-faint border-faint/30' },
  { id: 'in_progress', label: 'In Progress', color: 'text-accent border-accent/30' },
  { id: 'review',      label: 'Review',      color: 'text-warn border-warn/30' },
  { id: 'done',        label: 'Done',        color: 'text-success border-success/30' },
]

const PRIORITY_COLOR: Record<string, string> = {
  high:   'bg-danger/10 text-danger border-danger/20',
  medium: 'bg-warn/10 text-warn border-warn/20',
  low:    'bg-faint/10 text-faint border-faint/20',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const dragging = useRef<string | null>(null)

  const load = async () => {
    const t = await fetchTasks()
    setTasks(t)
    setLoading(false)
  }

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t) }, [])

  const byStatus = (s: TaskStatus) => tasks.filter(t => t.status === s)

  const onDragStart = (id: string) => { dragging.current = id }

  const onDrop = async (status: TaskStatus, e: React.DragEvent) => {
    e.preventDefault()
    const id = dragging.current
    if (!id) return
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    await updateTaskStatus(id, status)
    dragging.current = null
  }

  const onDragOver = (e: React.DragEvent) => { e.preventDefault() }

  return (
    <Shell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-bg2 flex-shrink-0">
          <span className="text-lg">📋</span>
          <h1 className="text-sm font-bold tracking-wider text-white uppercase">Task Board</h1>
          <span className="text-[10px] text-faint ml-1">{tasks.length} tasks</span>
          <div className="ml-auto text-[10px] text-faint">drag cards to move between columns</div>
        </div>

        {/* Kanban columns */}
        <div className="flex-1 min-h-0 flex gap-0 overflow-x-auto p-4 gap-3">
          {COLS.map(col => (
            <div
              key={col.id}
              className="flex flex-col w-[260px] flex-shrink-0 bg-bg2 border border-border rounded-xl overflow-hidden transition-all"
              onDrop={e => onDrop(col.id, e)}
              onDragOver={onDragOver}
            >
              {/* Column header */}
              <div className={clsx('flex items-center gap-2 px-3 py-2.5 border-b border-border', col.color)}>
                <span className="text-[10px] font-bold tracking-widest uppercase">{col.label}</span>
                <span className="ml-auto text-[10px] opacity-60">{byStatus(col.id).length}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 min-h-[200px]">
                {loading && col.id === 'in_progress' && (
                  <div className="text-center text-faint text-[10px] mt-8">Loading…</div>
                )}
                {byStatus(col.id).map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => onDragStart(task.id)}
                    className="bg-bg3 border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-border2 transition-all group"
                  >
                    <div className="text-[11px] font-semibold text-white leading-tight mb-1.5">{task.title}</div>
                    {task.description && (
                      <div className="text-[10px] text-muted mb-2 leading-relaxed line-clamp-2">{task.description}</div>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={clsx('text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase', PRIORITY_COLOR[task.priority])}>
                        {task.priority}
                      </span>
                      {task.tags?.map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-bg border border-border text-faint">{tag}</span>
                      ))}
                      <span className="ml-auto text-[9px] text-faint">🤖 {task.agent}</span>
                    </div>
                  </div>
                ))}
                {!loading && byStatus(col.id).length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-[10px] text-faint/50 text-center border-2 border-dashed border-border/30 rounded-lg m-1 min-h-[80px]">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}
