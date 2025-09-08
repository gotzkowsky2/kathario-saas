// Kathario SaaS - Next.js 미들웨어
// 기본 라우팅 처리 (데이터베이스 접근 없음)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 도메인에서 테넌트 정보 추출 (Edge Runtime용)
 * 예: basak.kathario.com → "basak"
 *     localhost:3000 → null (개발환경)
 */
function getTenantDomainFromHostname(hostname: string): string | null {
  // 개발환경 처리 - localhost, 127.0.0.1, 또는 IP 주소인 경우 기본 테넌트 사용
  const isLocalHost = hostname.includes('localhost') || hostname.includes('127.0.0.1')
  const isIpAddress = /^\d+\.\d+\.\d+\.\d+/.test(hostname.split(':')[0])
  if (isLocalHost || isIpAddress) {
    return process.env.DEFAULT_TENANT_DOMAIN || 'demo'
  }
  
  // 서브도메인 추출
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    return parts[0] // 첫 번째 부분이 테넌트 도메인
  }
  
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 정적 파일과 API 라우트는 제외
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 테넌트 도메인 추출
  const hostname = request.headers.get('host') || ''
  const tenantDomain = getTenantDomainFromHostname(hostname)
  
  try {
    // 메인 도메인 (테넌트 없음) 처리
    if (!tenantDomain) {
      // 메인 랜딩페이지나 가입 페이지 등
      if (pathname === '/' || pathname.startsWith('/signup') || pathname.startsWith('/about') || pathname.startsWith('/login')) {
        return NextResponse.next()
      }
      
      // 테넌트가 필요한 페이지는 메인으로 리다이렉트
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 요청 헤더에 테넌트 도메인 정보 추가 (실제 검증은 API에서)
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-tenant-domain', tenantDomain)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    
  } catch (error) {
    console.error('미들웨어 에러:', error)
    
    // 에러 발생시 메인 페이지로 리다이렉트
    return NextResponse.redirect(new URL('/', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * 다음을 제외한 모든 요청에 매치:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
