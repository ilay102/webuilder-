export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: 'low' | 'medium' | 'high'
  agent: string
  created_at: string
  updated_at: string
  tags?: string[]
}

export interface CronJob {
  id: string
  name: string
  schedule: string           // cron expression
  description: string
  last_run?: string
  next_run?: string
  status: 'active' | 'paused' | 'error'
  agent: string
}

export interface MemoryEntry {
  id: string
  date: string               // YYYY-MM-DD
  title: string
  content: string
  tags?: string[]
  agent: string
}

export interface Doc {
  id: string
  title: string
  type: 'report' | 'proposal' | 'email' | 'summary' | 'other'
  content: string
  created_at: string
  agent: string
  size?: number
}

export interface TeamMember {
  id: string
  name: string
  role: string
  emoji: string
  status: 'active' | 'idle' | 'offline'
  reports_to?: string
  skills: string[]
  tasks_today: number
}

export interface Lead {
  id: string
  company: string
  contact: string
  email?: string
  linkedin?: string
  industry: string
  size?: string
  status: 'new' | 'contacted' | 'replied' | 'qualified' | 'lost'
  notes?: string
  found_at: string
  agent: string
  score?: number
}

export interface Approval {
  id: string
  title: string
  body: string
  message_draft?: string
  type: 'message' | 'action' | 'deploy' | 'email' | 'post'
  agent: string
  created_at: string
  timestamp?: string
  urgency: 'low' | 'medium' | 'high'
  metadata?: Record<string, string>
}

export interface SystemStatus {
  daemon: 'active' | 'inactive' | 'error'
  agents_running: number
  uptime: string
  last_sync: string
  server_ip: string
}
