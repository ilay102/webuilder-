/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // afterFiles → local Next.js file routes (app/api/**) take precedence;
    // anything not handled locally falls through to the VPS Express server.
    // fallback runs LAST — only after both static AND dynamic routes have
    // had a chance to match. This guarantees /api/intake/[slug] etc. win.
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000'}/api/:path*`,
        },
      ],
    }
  },
}

module.exports = nextConfig
