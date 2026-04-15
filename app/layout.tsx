import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mission Control — Chad',
  description: "Chad's B2B Sales Agent Dashboard",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const userwayId = process.env.NEXT_PUBLIC_USERWAY_ACCOUNT_ID

  return (
    <html lang="en">
      <body className="h-screen overflow-hidden bg-bg text-white font-mono">
        {children}

        {/* ── Accessibility Widget (UserWay) ─────────────────────────
            Required for IS 5568 / WCAG 2.1 AA compliance (Israel).
            Get free account ID at https://userway.org
            Add NEXT_PUBLIC_USERWAY_ACCOUNT_ID to Vercel env vars.     */}
        {userwayId && (
          <Script
            src="https://cdn.userway.org/widget.js"
            data-account={userwayId}
            strategy="lazyOnload"
          />
        )}
      </body>
    </html>
  )
}
