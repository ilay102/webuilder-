/**
 * Chad Mission Control — Backend API Server
 * Runs on the Hetzner VPS (204.168.207.116)
 * Reads from ~/.openclaw/workspace/ and serves JSON at :3000/api/
 * Auto-refreshes file cache every 10 seconds
 */

const express    = require('express')
const cors       = require('cors')
const fs         = require('fs')
const path       = require('path')
const os         = require('os')
const { execSync } = require('child_process')

const app  = express()
const PORT = process.env.PORT || 3000
const WORKSPACE    = process.env.WORKSPACE_PATH  || path.join(os.homedir(), '.openclaw', 'workspace')
const REPO_ROOT    = path.resolve(__dirname, '..')
const INTAKE_PORT  = process.env.INTAKE_PORT   || 3001
const INTAKE_SECRET = process.env.INTAKE_SECRET || ''
const SITE_BASE_URL = process.env.SITE_BASE_URL || 'https://webuilder-liart.vercel.app'
const CLIENTS_FILE         = path.join(REPO_ROOT, 'clients.json')
const POOL_STATE_PATH      = path.join(REPO_ROOT, 'pool-state.json')
const TEXT_POOL_STATE_PATH = path.join(REPO_ROOT, 'text-pool-state.json')

// ── Pool Manager (inline CJS — mirrors lib/pool-manager.ts) ──────────────────
function _readPool() {
  if (!fs.existsSync(POOL_STATE_PATH)) return { updatedAt: new Date().toISOString(), images: [] }
  try   { return JSON.parse(fs.readFileSync(POOL_STATE_PATH, 'utf-8')) }
  catch { return { updatedAt: new Date().toISOString(), images: [] } }
}
function _writePool(pool) {
  pool.updatedAt = new Date().toISOString()
  fs.writeFileSync(POOL_STATE_PATH, JSON.stringify(pool, null, 2) + '\n')
}
/** Free all in-use pool images for a slug. Called on client churn. */
function _freeImages(slug) {
  const pool  = _readPool()
  const freed = []
  for (const img of pool.images) {
    if (img.assignedTo === slug && img.status === 'in-use') {
      img.status     = 'available'
      img.assignedTo = null
      img.assignedAt = null
      freed.push(img.id)
    }
  }
  if (freed.length > 0) _writePool(pool)
  return freed
}
/** Permanently lock all in-use pool images for a slug. Called on confirmed payment. */
function _lockImages(slug) {
  const pool   = _readPool()
  const locked = []
  for (const img of pool.images) {
    if (img.assignedTo === slug && img.status === 'in-use') {
      img.status   = 'locked'
      img.lockedAt = new Date().toISOString()
      locked.push(img.id)
    }
  }
  if (locked.length > 0) _writePool(pool)
  return locked
}

// ── Text Pool Manager (inline CJS — mirrors lib/text-pool-manager.ts) ────────
function _readTextPool() {
  if (!fs.existsSync(TEXT_POOL_STATE_PATH)) return { updatedAt: new Date().toISOString(), packs: [] }
  try   { return JSON.parse(fs.readFileSync(TEXT_POOL_STATE_PATH, 'utf-8')) }
  catch { return { updatedAt: new Date().toISOString(), packs: [] } }
}
function _writeTextPool(state) {
  state.updatedAt = new Date().toISOString()
  fs.writeFileSync(TEXT_POOL_STATE_PATH, JSON.stringify(state, null, 2) + '\n')
}
/** Free in-use text pack(s) for a slug. Called on client churn. */
function _freeTextPack(slug) {
  const state = _readTextPool()
  const freed = []
  for (const p of state.packs) {
    if (p.assignedTo === slug && p.status === 'in-use') {
      p.status     = 'available'
      p.assignedTo = null
      p.assignedAt = null
      freed.push(p.id)
    }
  }
  if (freed.length > 0) _writeTextPool(state)
  return freed
}
/** Permanently lock in-use text pack(s) for a slug. Called on confirmed payment. */
function _lockTextPack(slug) {
  const state  = _readTextPool()
  const locked = []
  for (const p of state.packs) {
    if (p.assignedTo === slug && p.status === 'in-use') {
      p.status   = 'locked'
      p.lockedAt = new Date().toISOString()
      locked.push(p.id)
    }
  }
  if (locked.length > 0) _writeTextPool(state)
  return locked
}

app.use(cors())
app.use(express.json())

// Serve Mission Control dashboard at /
app.use(express.static(path.join(__dirname, 'public')))

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

// ── Intake form endpoint ──────────────────────────────────────────────────────
// POST /api/intake  { slug, biz: {...}, services: [...] }
// Called by Vercel's app/api/intake/route.ts after client submits intake form.
// Updates content.json + git push → Vercel rebuilds the client's site.

app.post('/api/intake', (req, res) => {
  // ── Auth ──────────────────────────────────────────────────
  if (INTAKE_SECRET && req.headers['x-intake-secret'] !== INTAKE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { slug, biz, services } = req.body
  if (!slug) return res.status(400).json({ error: 'slug is required' })

  const contentPath = path.join(REPO_ROOT, 'app', slug, 'content.json')
  if (!fs.existsSync(contentPath)) {
    return res.status(404).json({ error: `Client not found: ${slug}` })
  }

  try {
    // Merge fields into existing content.json
    const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'))

    if (biz) {
      // Only overwrite fields that were actually provided (non-empty)
      const filtered = Object.fromEntries(
        Object.entries(biz).filter(([, v]) => v !== '' && v != null)
      )
      content.biz = { ...content.biz, ...filtered }
    }
    if (Array.isArray(services) && services.length > 0) {
      content.services = services
    }

    fs.writeFileSync(contentPath, JSON.stringify(content, null, 2) + '\n', 'utf-8')
    console.log(`[intake] Updated ${slug}/content.json`)

    // Auto-register in clients.json
    upsertClient(slug, {
      name:    content.biz?.name    || slug,
      phone:   content.biz?.phone   || biz?.phone   || '',
      email:   content.biz?.email   || biz?.email   || '',
      whatsapp: content.biz?.alertWhatsapp || biz?.alertWhatsapp || '',
      template: content.biz?.template || 'dental',
      siteUrl:  `${SITE_BASE_URL}/${slug}`,
      status:  'active',
      intakeAt: new Date().toISOString(),
    })

    // Git add → commit → push
    const relPath = `app/${slug}/content.json`
    execSync(`git add "${relPath}"`, { cwd: REPO_ROOT, stdio: 'pipe' })

    // Skip commit if nothing staged (idempotent)
    try {
      execSync(`git commit -m "intake: ${slug}"`, { cwd: REPO_ROOT, stdio: 'pipe' })
    } catch {
      // Nothing to commit — already up to date
    }

    execSync('git push', { cwd: REPO_ROOT, stdio: 'pipe' })
    console.log(`[intake] Pushed — Vercel rebuilding ${slug}`)

    res.json({ ok: true, url: `${SITE_BASE_URL}/${slug}` })

  } catch (err) {
    console.error('[intake] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Photo upload endpoint ─────────────────────────────────────────────────────
// POST /api/photo  (raw binary body — the image buffer)
// Headers: x-intake-secret, x-phone (client's WA number), x-slot (hero|about|gallery|auto)
// Called by baileys-server.js when a client sends a photo via WhatsApp.

app.post('/api/photo', express.raw({ type: '*/*', limit: '25mb' }), (req, res) => {
  // ── Auth ──────────────────────────────────────────────────
  if (INTAKE_SECRET && req.headers['x-intake-secret'] !== INTAKE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const phone = String(req.headers['x-phone'] || '').replace(/\D/g, '')
  const slot  = String(req.headers['x-slot']  || 'auto')

  if (!phone) return res.status(400).json({ error: 'x-phone header required' })
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: 'Empty image body' })
  }

  // ── Find client by phone ───────────────────────────────────
  const appDir = path.join(REPO_ROOT, 'app')
  let clientSlug = null
  let content    = null

  for (const entry of fs.readdirSync(appDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const cp = path.join(appDir, entry.name, 'content.json')
    if (!fs.existsSync(cp)) continue
    const c = JSON.parse(fs.readFileSync(cp, 'utf-8'))
    if (String(c.biz?.alertWhatsapp || '').replace(/\D/g, '') === phone) {
      clientSlug = entry.name
      content    = c
      break
    }
  }

  if (!clientSlug) {
    return res.status(404).json({ error: `No client found for phone ${phone}` })
  }

  // ── Determine slot (auto = fill missing slots in order) ───
  const DEFAULT_PHOTOS = ['/dental-hero.png', '/dental-consult.png', '/dental-smile.png', '/dental-reception.png']
  let actualSlot = slot
  if (slot === 'auto') {
    const photos = content.photos || {}
    if (!photos.hero  || DEFAULT_PHOTOS.includes(photos.hero))  actualSlot = 'hero'
    else if (!photos.about  || DEFAULT_PHOTOS.includes(photos.about))  actualSlot = 'about'
    else if (!photos.results || DEFAULT_PHOTOS.includes(photos.results)) actualSlot = 'results'
    else actualSlot = 'gallery'
  }

  // ── Save image ─────────────────────────────────────────────
  const publicDir = path.join(REPO_ROOT, 'public', 'clients', clientSlug)
  fs.mkdirSync(publicDir, { recursive: true })

  let fileName, publicPath
  if (actualSlot === 'gallery') {
    const gallery = content.photos?.gallery || []
    fileName   = `gallery-${gallery.length + 1}.jpg`
    publicPath = `/clients/${clientSlug}/${fileName}`
    content.photos = { ...content.photos, gallery: [...gallery, publicPath] }
  } else {
    fileName   = `${actualSlot}.jpg`
    publicPath = `/clients/${clientSlug}/${fileName}`
    content.photos = { ...content.photos, [actualSlot]: publicPath }
  }

  fs.writeFileSync(path.join(publicDir, fileName), req.body)

  // ── Update content.json ────────────────────────────────────
  const contentPath = path.join(REPO_ROOT, 'app', clientSlug, 'content.json')
  fs.writeFileSync(contentPath, JSON.stringify(content, null, 2) + '\n', 'utf-8')
  console.log(`[photo] Saved ${publicPath} for ${clientSlug}`)

  // Auto-update client record
  upsertClient(clientSlug, { lastPhotoAt: new Date().toISOString(), lastPhotoSlot: actualSlot })

  // ── Git push ───────────────────────────────────────────────
  const relImg  = `public/clients/${clientSlug}/${fileName}`
  const relJson = `app/${clientSlug}/content.json`
  execSync(`git add "${relImg}" "${relJson}"`, { cwd: REPO_ROOT, stdio: 'pipe' })
  try {
    execSync(`git commit -m "photo: ${actualSlot} for ${clientSlug}"`, { cwd: REPO_ROOT, stdio: 'pipe' })
  } catch { /* nothing new to commit */ }
  execSync('git push', { cwd: REPO_ROOT, stdio: 'pipe' })
  console.log(`[photo] Pushed — Vercel rebuilding ${clientSlug}`)

  res.json({ ok: true, slot: actualSlot, path: publicPath, site: `${SITE_BASE_URL}/${clientSlug}` })
})

// ── Clients CRUD ──────────────────────────────────────────────────────────────

function readClients() {
  try {
    if (!fs.existsSync(CLIENTS_FILE)) return []
    return JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf-8'))
  } catch { return [] }
}

function writeClients(clients) {
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2) + '\n', 'utf-8')
}

/**
 * Upsert a client by slug. Creates if not exists, merges if exists.
 * Returns the updated client object.
 */
function upsertClient(slug, patch) {
  const clients = readClients()
  const idx = clients.findIndex(c => c.slug === slug)
  const now = new Date().toISOString()
  if (idx === -1) {
    const client = { slug, status: 'active', createdAt: now, updatedAt: now, ...patch }
    clients.push(client)
    writeClients(clients)
    return client
  } else {
    clients[idx] = { ...clients[idx], ...patch, updatedAt: now }
    writeClients(clients)
    return clients[idx]
  }
}

// GET /api/clients — list all clients (sorted newest first)
app.get('/api/clients', (req, res) => {
  const clients = readClients().sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  )
  res.json(clients)
})

// GET /api/clients/:slug
app.get('/api/clients/:slug', (req, res) => {
  const clients = readClients()
  const client = clients.find(c => c.slug === req.params.slug)
  if (!client) return res.status(404).json({ error: 'Not found' })
  res.json(client)
})

// POST /api/clients — create / update client (used by new-demo.ts or manual)
app.post('/api/clients', (req, res) => {
  const { slug, ...rest } = req.body
  if (!slug) return res.status(400).json({ error: 'slug required' })
  const client = upsertClient(slug, rest)
  res.json(client)
})

// PATCH /api/clients/:slug — partial update (status, notes, payment, etc.)
app.patch('/api/clients/:slug', (req, res) => {
  const client = upsertClient(req.params.slug, req.body)
  res.json(client)
})

// DELETE /api/clients/:slug — mark as churned + free pool images + free text pack
app.delete('/api/clients/:slug', (req, res) => {
  const clients = readClients()
  const idx = clients.findIndex(c => c.slug === req.params.slug)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  const slug = req.params.slug
  clients[idx].status    = 'churned'
  clients[idx].updatedAt = new Date().toISOString()
  writeClients(clients)
  const freedImages   = _freeImages(slug)
  const freedTextPack = _freeTextPack(slug)
  if (freedImages.length   > 0) console.log(`[pool] Churn ${slug} → freed images: ${freedImages.join(', ')}`)
  if (freedTextPack.length > 0) console.log(`[text-pool] Churn ${slug} → freed text packs: ${freedTextPack.join(', ')}`)
  res.json({ ok: true, freedImages, freedTextPack })
})

// POST /api/clients/:slug/lock — permanently lock pool images + text pack (client paid)
app.post('/api/clients/:slug/lock', (req, res) => {
  const slug           = req.params.slug
  const lockedImages   = _lockImages(slug)
  const lockedTextPack = _lockTextPack(slug)
  if (lockedImages.length   > 0) console.log(`[pool] Lock ${slug} → locked images: ${lockedImages.join(', ')}`)
  if (lockedTextPack.length > 0) console.log(`[text-pool] Lock ${slug} → locked text packs: ${lockedTextPack.join(', ')}`)
  res.json({ ok: true, lockedImages, lockedTextPack })
})

// ── Pool Review (Tinder-style approval of candidate images + text packs) ─────
const CANDIDATES_DIR       = path.join(REPO_ROOT, 'public', 'pool', 'dental', '_candidates')
const ARCHIVE_DIR          = path.join(REPO_ROOT, 'public', 'pool', 'dental', '_archive')
const HEROES_LIVE_DIR      = path.join(REPO_ROOT, 'public', 'pool', 'dental', 'heroes')
const PATIENTS_LIVE_DIR    = path.join(REPO_ROOT, 'public', 'pool', 'dental', 'patients')
const TEXT_CANDIDATES_PATH = path.join(REPO_ROOT, 'text-pack-candidates.json')

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|avif)$/i

function _listCandidateImages(subtype) {
  const dir = path.join(CANDIDATES_DIR, subtype)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => IMAGE_EXT_RE.test(f))
    .map(f => {
      const full = path.join(dir, f)
      const stat = fs.statSync(full)
      return {
        id:        f,
        subtype,
        url:       `/pool/dental/_candidates/${subtype}/${f}`,
        size:      stat.size,
        addedAt:   stat.mtime.toISOString(),
      }
    })
    .sort((a, b) => a.addedAt.localeCompare(b.addedAt))
}

function _readTextCandidates() {
  if (!fs.existsSync(TEXT_CANDIDATES_PATH)) return { updatedAt: new Date().toISOString(), candidates: [] }
  try   { return JSON.parse(fs.readFileSync(TEXT_CANDIDATES_PATH, 'utf-8')) }
  catch { return { updatedAt: new Date().toISOString(), candidates: [] } }
}

function _writeTextCandidates(state) {
  state.updatedAt = new Date().toISOString()
  fs.writeFileSync(TEXT_CANDIDATES_PATH, JSON.stringify(state, null, 2) + '\n')
}

/** Register an image id into the live pool state file (available). */
function _registerImage(id, subtype) {
  const pool = _readPool()
  const existing = pool.images.find(i => i.id === id)
  if (existing) return existing
  const rec = {
    id,
    subtype,
    url:        `/pool/dental/${subtype}/${id}`,
    status:     'available',
    assignedTo: null,
    assignedAt: null,
    lockedAt:   null,
    addedAt:    new Date().toISOString(),
  }
  pool.images.push(rec)
  _writePool(pool)
  return rec
}

/** Register a text pack id into the live text pool state (available). */
function _registerTextPack(id) {
  const state = _readTextPool()
  const existing = state.packs.find(p => p.id === id)
  if (existing) return existing
  const rec = {
    id,
    status:     'available',
    assignedTo: null,
    assignedAt: null,
    lockedAt:   null,
    addedAt:    new Date().toISOString(),
  }
  state.packs.push(rec)
  _writeTextPool(state)
  return rec
}

function _gitCommitPush(filesToAdd, message) {
  try {
    execSync('git pull --rebase --autostash', { cwd: REPO_ROOT, stdio: 'pipe' })
  } catch (e) {
    throw new Error(`git pull --rebase failed: ${e.message}`)
  }
  for (const f of filesToAdd) {
    try { execSync(`git add "${f}"`, { cwd: REPO_ROOT, stdio: 'pipe' }) } catch {}
  }
  try {
    execSync(`git commit -m "${message}"`, { cwd: REPO_ROOT, stdio: 'pipe' })
  } catch {
    // nothing staged
  }
  try {
    execSync('git push', { cwd: REPO_ROOT, stdio: 'pipe' })
  } catch (e) {
    throw new Error(`git push failed: ${e.message}`)
  }
}

// GET /api/pool-review/candidates → { images: { heroes, patients }, texts, stats }
app.get('/api/pool-review/candidates', (req, res) => {
  try {
    const heroes   = _listCandidateImages('heroes')
    const patients = _listCandidateImages('patients')
    const textState = _readTextCandidates()
    const pool      = _readPool()
    const textPool  = _readTextPool()
    res.json({
      images: { heroes, patients },
      texts:  textState.candidates || [],
      stats: {
        imagePool: {
          available: pool.images.filter(i => i.status === 'available').length,
          inUse:     pool.images.filter(i => i.status === 'in-use').length,
          locked:    pool.images.filter(i => i.status === 'locked').length,
          total:     pool.images.length,
        },
        textPool: {
          available: textPool.packs.filter(p => p.status === 'available').length,
          inUse:     textPool.packs.filter(p => p.status === 'in-use').length,
          locked:    textPool.packs.filter(p => p.status === 'locked').length,
          total:     textPool.packs.length,
        },
        pending: {
          heroes:   heroes.length,
          patients: patients.length,
          texts:    (textState.candidates || []).length,
        },
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/pool-review/approve  { type: 'image'|'text', id, subtype? }
app.post('/api/pool-review/approve', (req, res) => {
  const { type, id, subtype } = req.body || {}
  if (!type || !id) return res.status(400).json({ error: 'type and id are required' })

  try {
    if (type === 'image') {
      if (subtype !== 'heroes' && subtype !== 'patients') {
        return res.status(400).json({ error: "subtype must be 'heroes' or 'patients'" })
      }
      const src = path.join(CANDIDATES_DIR, subtype, id)
      if (!fs.existsSync(src)) return res.status(404).json({ error: 'Candidate not found' })
      const liveDir = subtype === 'heroes' ? HEROES_LIVE_DIR : PATIENTS_LIVE_DIR
      fs.mkdirSync(liveDir, { recursive: true })
      const dest = path.join(liveDir, id)
      fs.renameSync(src, dest)
      const record = _registerImage(id, subtype)
      _gitCommitPush(
        [
          `public/pool/dental/${subtype}/${id}`,
          `public/pool/dental/_candidates/${subtype}/${id}`,
          'pool-state.json',
        ],
        `pool-review: approve image ${subtype}/${id}`,
      )
      console.log(`[pool-review] Approved image ${subtype}/${id}`)
      return res.json({ ok: true, type, id, subtype, record })
    }

    if (type === 'text') {
      const state = _readTextCandidates()
      const idx   = (state.candidates || []).findIndex(c => c.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Text candidate not found' })
      const pack = state.candidates[idx]

      // Append pack definition into lib/text-packs.ts via a side-car JSON
      // (cannot safely patch the TS source from here — instead record it into
      // a supplemental file that lib/text-packs.ts can import or the admin
      // can hand-move).  For now: store approved pack into
      // `text-pack-approved.json` as a queue of accepted-but-not-yet-merged
      // definitions and also register the id in text-pool-state.json.
      const approvedPath = path.join(REPO_ROOT, 'text-pack-approved.json')
      let approved = { updatedAt: new Date().toISOString(), packs: [] }
      if (fs.existsSync(approvedPath)) {
        try { approved = JSON.parse(fs.readFileSync(approvedPath, 'utf-8')) } catch {}
      }
      if (!approved.packs.find(p => p.id === pack.id)) approved.packs.push(pack)
      approved.updatedAt = new Date().toISOString()
      fs.writeFileSync(approvedPath, JSON.stringify(approved, null, 2) + '\n')

      const record = _registerTextPack(pack.id)

      // Remove from candidates
      state.candidates.splice(idx, 1)
      _writeTextCandidates(state)

      _gitCommitPush(
        ['text-pack-candidates.json', 'text-pack-approved.json', 'text-pool-state.json'],
        `pool-review: approve text pack ${pack.id}`,
      )
      console.log(`[pool-review] Approved text pack ${pack.id}`)
      return res.json({ ok: true, type, id, record })
    }

    return res.status(400).json({ error: `Unknown type: ${type}` })
  } catch (err) {
    console.error('[pool-review] approve error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/pool-review/reject  { type: 'image'|'text', id, subtype? }
app.post('/api/pool-review/reject', (req, res) => {
  const { type, id, subtype } = req.body || {}
  if (!type || !id) return res.status(400).json({ error: 'type and id are required' })

  try {
    if (type === 'image') {
      if (subtype !== 'heroes' && subtype !== 'patients') {
        return res.status(400).json({ error: "subtype must be 'heroes' or 'patients'" })
      }
      const src = path.join(CANDIDATES_DIR, subtype, id)
      if (!fs.existsSync(src)) return res.status(404).json({ error: 'Candidate not found' })
      const archiveSub = path.join(ARCHIVE_DIR, subtype)
      fs.mkdirSync(archiveSub, { recursive: true })
      const dest = path.join(archiveSub, id)
      fs.renameSync(src, dest)
      _gitCommitPush(
        [
          `public/pool/dental/_archive/${subtype}/${id}`,
          `public/pool/dental/_candidates/${subtype}/${id}`,
        ],
        `pool-review: reject image ${subtype}/${id}`,
      )
      console.log(`[pool-review] Rejected image ${subtype}/${id}`)
      return res.json({ ok: true, type, id, subtype })
    }

    if (type === 'text') {
      const state = _readTextCandidates()
      const idx   = (state.candidates || []).findIndex(c => c.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Text candidate not found' })
      const pack = state.candidates[idx]

      // Archive into text-pack-archive.json (append) then remove from candidates
      const archivePath = path.join(ARCHIVE_DIR, 'texts', `${pack.id}-${Date.now()}.json`)
      fs.mkdirSync(path.dirname(archivePath), { recursive: true })
      fs.writeFileSync(archivePath, JSON.stringify(pack, null, 2) + '\n')

      state.candidates.splice(idx, 1)
      _writeTextCandidates(state)

      _gitCommitPush(
        ['text-pack-candidates.json', `public/pool/dental/_archive/texts/${path.basename(archivePath)}`],
        `pool-review: reject text pack ${pack.id}`,
      )
      console.log(`[pool-review] Rejected text pack ${pack.id}`)
      return res.json({ ok: true, type, id })
    }

    return res.status(400).json({ error: `Unknown type: ${type}` })
  } catch (err) {
    console.error('[pool-review] reject error:', err.message)
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
