'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const NAV = [
  { href: '/tasks',     icon: '📋', label: 'Task Board' },
  { href: '/calendar',  icon: '📅', label: 'Calendar' },
  { href: '/memory',    icon: '🧠', label: 'Memory' },
  { href: '/docs',      icon: '📄', label: 'Docs' },
  { href: '/team',      icon: '🌐', label: 'Team' },
  { href: '/office',    icon: '🏢', label: 'Office' },
  { href: '/clients',   icon: '🏢', label: 'Clients' },
  { href: '/leads',     icon: '🎯', label: 'Leads' },
  { href: '/approvals', icon: '✅', label: 'Approvals' },
  { href: '/admin/pool-review', icon: '🖼️', label: 'Pool Review' },
]

export default function Sidebar({ pendingCount }: { pendingCount?: number }) {
  const path = usePathname()
  return (
    <aside className="w-[200px] flex-shrink-0 flex flex-col bg-bg2 border-r border-border">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-sm font-bold text-white">⚡</div>
          <div>
            <div className="text-[11px] font-bold tracking-widest text-white uppercase">Mission Control</div>
            <div className="text-[9px] text-faint tracking-wider">Chad's Dashboard</div>
          </div>
        </div>
      </div>

      {/* Agent status */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="text-lg">🤖</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-white">Chad</div>
            <div className="text-[9px] text-muted">B2B Sales Agent</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-success pulse-dot" />
        </div>
        <div className="mt-2 text-[9px] text-faint">
          <span className="text-success">●</span> openclaw · 204.168.207.116
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV.map(({ href, icon, label }) => {
          const active = path === href || path.startsWith(href + '/')
          const badge = href === '/approvals' && pendingCount ? pendingCount : null
          return (
            <Link key={href} href={href}
              className={clsx(
                'flex items-center gap-2.5 px-4 py-2 text-[12px] transition-all',
                active
                  ? 'bg-accent/10 text-white border-r-2 border-accent'
                  : 'text-muted hover:text-white hover:bg-bg3'
              )}
            >
              <span className="text-base w-5 text-center">{icon}</span>
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-[9px] bg-danger/20 text-danger border border-danger/30 rounded-full px-1.5 py-0 font-bold">
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border text-[9px] text-faint">
        <div>Server: 204.168.207.116</div>
        <div>Openclaw daemon active</div>
      </div>
    </aside>
  )
}
