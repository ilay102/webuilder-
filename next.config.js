/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000'}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
