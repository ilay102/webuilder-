import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mission Control — Chad',
  description: "Chad's B2B Sales Agent Dashboard",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden bg-bg text-white font-mono">
        {children}
      </body>
    </html>
  )
}
