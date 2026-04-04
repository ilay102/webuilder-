/**
 * Chad Mission Control — Backend API Server
 * Runs on the Hetzner VPS (204.168.207.116)
 * Reads from ~/.openclaw/workspace/ and serves JSON at :3000/api/
 * Auto-refreshes file cache every 10 seconds
 */

const express = require('express')
const cors    = require('cors')
const fs      = require('fs')
const path    = require('path')
const os      = require('os')

const app  = express()
const PORT = process.env.PORT || 3000
const WORKSPACE = process.env.WORKSPACE_PATH || path.join(os.homedir(), '.openclaw', 'workspace')

app.use(cors())
app.use(express.json())

// ── Cache ─────────────────────────────────────────────────────────────────────
const cache = {}
let lastRefresh = null

function readJSON(file, fallback = []) {
  try {
    const raw = fs.readFileSync(path.join(WORKSPACE, file), 'utf8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function readDir(dir, ext = '.md') {
  try {
    const dirPath = path.join(WORKSPACE, dir)
    if (!fs.existsSync(dirPath)) return []
    return fs.readdirSync(dirPath)
      .filter(f => f.endsWith(ext))
      .map(f => {
        const raw = fs.readFileSync(path.join(dirPath, f), 'utf8')
        return { id: f.replace(ext, ''), filename: f, content: raw }
      })
  } catch {
    return []
  }
}

function parseMemoryFiles(files) {
  return files.map(f => {
    // Parse markdown: first line is title, rest is content
    const lines = f.content.split('\n')
    const title = lines[0]?.replace(/^#\s*/, '').trim() || f.id
    const content = lines.slice(1).join('\n').trim()
    // Try to extract date from filename (YYYY-MM-DD.md)
    const dateMatch = f.id.match(/^\d{4}-\d{2}-\d{2}/)
    return {
      id: f.id,
      date: dateMatch ? dateMatch[0] : f.id,
      title,
      content,
      tags: [],
      agent: 'Chad',
    }
  }).sort((a, b) => b.date.localeCompare(a.date))
}

function parseDocFiles(files) {
  return files.map(f => {
    const lines = f.content.split('\n')
    const title = lines[0]?.replace(/^#\s*/, '').trim() || f.id
    return {
      id: f.id,
      title,
      type: 'other',
      content: f.content,
      created_at: new Date().toISOString(),
      agent: 'Chad',
      size: f.content.length,
    }
  })
}

// ── Normalizers (so Chad can use any natural word) ────────────────────────────
function normalizeTaskStatus(s = '') {
  const v = String(s).toLowerCase().replace(/[\s_-]+/g, '_')
  if (['todo','pending','not_started','open','new','backlog','to_do'].includes(v)) return 'backlog'
  if (['in_progress','wip','doing','active','started','working','in_work','progress'].includes(v)) return 'in_progress'
  if (['review','reviewing','in_review','waiting','checking','check','qa','needs_review'].includes(v)) return 'review'
  if (['done','completed','finished','closed','complete','solved','resolved'].includes(v)) return 'done'
  return 'backlog' // safe default
}

function normalizeLeadStatus(s = '') {
  const v = String(s).toLowerCase().replace(/[\s_-]+/g, '_')
  if (['new','fresh','found','discovered'].includes(v)) return 'new'
  if (['drafted','draft','pending_approval'].includes(v)) return 'drafted'
  if (['approved','ready','ready_to_send'].includes(v)) return 'approved'
  if (['contacted','sent','messaged','reached_out','outreach'].includes(v)) return 'contacted'
  if (['interested','responsive','warm','positive'].includes(v)) return 'interested'
  if (['meeting','scheduled','call_booked','appointment'].includes(v)) return 'meeting'
  if (['closed_won','won','deal','success','converted','closed'].includes(v)) return 'closed_won'
  if (['closed_lost','lost','no_response','rejected','not_interested'].includes(v)) return 'closed_lost'
  return s || 'new'
}

function normalizePriority(s = '') {
  const v = String(s).toLowerCase()
  if (['high','urgent','critical','asap','1','hot'].includes(v)) return 'high'
  if (['medium','normal','mid','moderate','2'].includes(v)) return 'medium'
  if (['low','minor','3','later'].includes(v)) return 'low'
  return 'medium'
}

function normalizeTask(t) {
  return { ...t, status: normalizeTaskStatus(t.status), priority: normalizePriority(t.priority) }
}

function normalizeLead(l) {
  return { ...l, status: normalizeLeadStatus(l.status), priority: normalizePriority(l.priority) }
}

function normalizeApproval(a) {
  return { ...a, priority: normalizePriority(a.priority) }
}

function refreshCache() {
  try {
    const rawTasks     = readJSON('tasks.json', [])
    const rawLeads     = readJSON('leads.json', [])
    const rawApprovals = readJSON('approvals.json', [])
    cache.tasks     = Array.isArray(rawTasks)     ? rawTasks.map(normalizeTask)       : []
    cache.leads     = Array.isArray(rawLeads)     ? rawLeads.map(normalizeLead)       : []
    cache.approvals = Array.isArray(rawApprovals) ? rawApprovals.map(normalizeApproval) : []
    cache.calendar  = readJSON('calendar.json', [])
    cache.memory    = parseMemoryFiles(readDir('memory', '.md'))
    cache.docs      = parseDocFiles(readDir('docs', '.md'))
    lastRefresh     = new Date().toISOString()
    console.log(`[${lastRefresh}] Cache refreshed from ${WORKSPACE}`)
  } catch (err) {
    console.error('Cache refresh error:', err.message)
  }
}

// Initial load + schedule every 10s
refreshCache()
setInterval(refreshCache, 10000)

// ── Status endpoint ────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  const uptime = process.uptime()
  const h = Math.floor(uptime / 3600)
  const m = Math.floor((uptime % 3600) / 60)
  const s = Math.floor(uptime % 60)
  res.json({
    daemon: 'active',
    agents_running: 1,
    uptime: `${h}h ${m}m ${s}s`,
    last_sync: lastRefresh,
    server_ip: '204.168.207.116',
    workspace: WORKSPACE,
  })
})

// ── Tasks ─────────────────────────────────────────────────────────────────────
app.get('/api/tasks', (req, res) => res.json(cache.tasks || []))

app.patch('/api/tasks/:id', (req, res) => {
  const { id } = req.params
  const { status } = req.body
  const filePath = path.join(WORKSPACE, 'tasks.json')
  try {
    const tasks = readJSON('tasks.json', [])
    const idx = tasks.findIndex(t => t.id === id)
    if (idx === -1) return res.status(404).json({ error: 'Task not found' })
    tasks[idx].status = status
    tasks[idx].updated_at = new Date().toISOString()
    fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2))
    cache.tasks = tasks
    res.json(tasks[idx])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Calendar ──────────────────────────────────────────────────────────────────
app.get('/api/calendar', (req, res) => res.json(cache.calendar || []))

// ── Memory ────────────────────────────────────────────────────────────────────
app.get('/api/memory', (req, res) => res.json(cache.memory || []))

// ── Docs ──────────────────────────────────────────────────────────────────────
app.get('/api/docs', (req, res) => res.json(cache.docs || []))

// ── Leads ─────────────────────────────────────────────────────────────────────
app.get('/api/leads', (req, res) => res.json(cache.leads || []))

// ── Approvals ─────────────────────────────────────────────────────────────────
app.get('/api/approvals', (req, res) => res.json(cache.approvals || []))

app.post('/api/approvals/:id/approve', (req, res) => {
  const { id } = req.params
  const filePath = path.join(WORKSPACE, 'approvals.json')
  try {
    const approvals = readJSON('approvals.json', [])
    const idx = approvals.findIndex(a => a.id === id)
    if (idx === -1) return res.status(404).json({ error: 'Not found' })

    // Log approval to a file
    const logPath = path.join(WORKSPACE, 'approval_log.json')
    const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : []
    log.push({ ...approvals[idx], decision: 'approved', decided_at: new Date().toISOString() })
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2))

    // Remove from pending queue
    approvals.splice(idx, 1)
    fs.writeFileSync(filePath, JSON.stringify(approvals, null, 2))
    cache.approvals = approvals
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/approvals/:id/reject', (req, res) => {
  const { id } = req.params
  const filePath = path.join(WORKSPACE, 'approvals.json')
  try {
    const approvals = readJSON('approvals.json', [])
    const idx = approvals.findIndex(a => a.id === id)
    if (idx === -1) return res.status(404).json({ error: 'Not found' })

    const logPath = path.join(WORKSPACE, 'approval_log.json')
    const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : []
    log.push({ ...approvals[idx], decision: 'rejected', decided_at: new Date().toISOString() })
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2))

    approvals.splice(idx, 1)
    fs.writeFileSync(filePath, JSON.stringify(approvals, null, 2))
    cache.approvals = approvals
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }))

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🤖 Chad Mission Control API`)
  console.log(`   Listening on http://0.0.0.0:${PORT}`)
  console.log(`   Workspace:   ${WORKSPACE}`)
  console.log(`   Auto-refresh: every 10s\n`)
})
