/** @type {import('next').NextConfig} */
const nextConfig = {
  staticPageGenerationTimeout: 600,

  // gzip/br 응답 압축 (Vercel은 자동이지만 명시)
  compress: true,

  // 프로덕션 빌드에서 소스맵 끔 (번들 전송량 감소)
  productionBrowserSourceMaps: false,

  // 브라우저 콘솔 로그 제거 (에러/경고는 유지)
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },

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

  // 정적/이미지 에셋은 CDN 장기 캐시 (버저닝된 경로라 안전)
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff2?)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ]
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.yourdomain.com' },
      { protocol: 'https', hostname: 'play-lh.googleusercontent.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7일
  },

  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
    // 큰 라이브러리 트리셰이킹 강화
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts',
    ],
  },

  // 번들 크기 축소 — 트랜지스틀 청크 비활성, 모듈러 import
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      skipDefaultConversion: true,
    },
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
