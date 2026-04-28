/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // afterFiles → local Next.js file routes (app/api/**) take precedence;
    // anything not handled locally falls through to the VPS Express server.
    return {
      beforeFiles: [],
      afterFiles: [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000'}/api/:path*`,
        },
      ],
      fallback: [],
    }
  },
}

module.exports = nextConfig
