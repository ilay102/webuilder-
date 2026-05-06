import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mission Control — Chad',
  description: "Chad's B2B Sales Agent Dashboard",
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Allow client sites to be pinch-zoomable (accessibility), but prevent
  // browser auto-zoom on form inputs by keeping initial scale = 1
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // UserWay third-party widget removed — replaced by our own AccessibilityFooter
  // floating button + statement modal. Legal compliance (תקנות נגישות 2013) is
  // satisfied by the in-page button at bottom-left + WCAG AA build-in compliance.
  return (
    <html lang="en">
      <body className="bg-bg text-white font-mono">
        {children}
      </body>
    </html>
  )
}
