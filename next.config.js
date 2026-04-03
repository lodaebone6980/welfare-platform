/** @type {import('next').NextConfig} */
const nextConfig = {
  // WP → Next.js 이전 시 URL 301 리다이렉트 (SEO 손실 없음)
  async redirects() {
    return [
      // WP 카테고리 URL
      { source: '/category/:slug', destination: '/welfare/category/:slug', permanent: true },
      // WP 태그 URL
      { source: '/tag/:slug',      destination: '/welfare/tag/:slug',      permanent: true },
      // WP 페이지 URL (?p=ID 는 rewrites에서 처리)
      { source: '/archives/:slug', destination: '/welfare/:slug',          permanent: true },
    ]
  },

  async rewrites() {
    return [
      // WP ?p=ID → wp-redirect 핸들러
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

  // 이미지 허용 도메인
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.yourdomain.com' },
      { protocol: 'https', hostname: 'play-lh.googleusercontent.com' },
    ],
  },

  // 일부 패키지 서버 컴포넌트에서 번들 제외
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },

  // 빌드 시 TypeScript 타입 에러 무시
  typescript: {
    ignoreBuildErrors: true,
  },

  // 빌드 시 ESLint 에러 무시
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
