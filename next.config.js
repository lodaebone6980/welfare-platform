/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/category/:slug', destination: '/welfare/category/:slug', permanent: true },
      { source: '/tag/:slug',      destination: '/welfare/tag/:slug',      permanent: true },
      { source: '/archives/:slug', destination: '/welfare/:slug',          permanent: true },
    ]
  },

  async rewrites() {
    return [
      {
        source:      '/',
        has:         [{ type: 'query', key: 'p', value: '(?<id>.+)' }],
        destination: '/wp-redirect/:id',
      },
      {
        source:      '/',
        has:         [{ type: 'query', key: 'page_id', value: '(?<id>.+)' }],
        destination: '/wp-redirect/:id',
      },
    ]
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.yourdomain.com' },
      { protocol: 'https', hostname: 'play-lh.googleusercontent.com' },
    ],
  },

  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
