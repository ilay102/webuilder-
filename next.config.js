/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // afterFiles → local Next.js file routes (app/api/**) take precedence;
    // anything not handled locally falls through to the VPS Express server.
    // fallback runs LAST — only after both static AND dynamic routes have
    // had a chance to match. This guarantees /api/intake/[slug] etc. win.
    // Use a negative-lookahead source so local Next.js routes are never
    // proxied. fallback alone wasn't enough — the dynamic [slug] route
    // was still being shadowed on Vercel. Anything matching this pattern
    // (i.e. NOT one of our local route segments) goes to the VPS.
    const VPS = process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000'
    return [
      {
        // /api/demo is intentionally NOT excluded — pool state lives on VPS.
        source:      '/api/:path((?!polar/|polar$|intake/|intake$|ls/|ls$).*)',
        destination: `${VPS}/api/:path`,
      },
    ]
  },
}

module.exports = nextConfig
