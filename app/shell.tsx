'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import StatusBar from '@/components/StatusBar'
import { fetchApprovals } from '@/lib/api'

export default function Shell({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState(0)

  useEffect(() => {
    const load = async () => {
      const a = await fetchApprovals()
      setPending(a.length)
    }
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <StatusBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar pendingCount={pending} />
        <main className="flex-1 overflow-hidden bg-bg">
          {children}
        </main>
      </div>
    </div>
  )
}
