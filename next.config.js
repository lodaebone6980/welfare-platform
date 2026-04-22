/** @type {import('next').NextConfig} */
const nextConfig = {
    staticPageGenerationTimeout: 600,
  async redirects() {
    return [
      // /admin → 어드민 대시보드
      { source: '/admin',        destination: '/dashboard',        permanent: false },
      // WP 레거시 URL
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
