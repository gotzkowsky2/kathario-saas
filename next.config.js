/** @type {import('next').NextConfig} */
const nextConfig = {
  // CORS 및 개발환경 설정
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },
  
  // 외부 접속 허용 (Next.js 15에서는 이 옵션이 제거됨)
  // experimental: {
  //   allowedDevOrigins: ['91.99.75.135:3000'],
  // },
  
  // 출력 파일 추적 루트 설정 (경고 제거)
  output: 'standalone',
  outputFileTracingRoot: '/root/kathario-saas',
  eslint: {
    ignoreDuringBuilds: true,
  },
  compress: true,
};

module.exports = nextConfig;
