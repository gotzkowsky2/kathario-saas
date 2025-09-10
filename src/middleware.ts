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
    
    // ==== 역할 기반 접근 제어 (RBAC) ====
    const employeeCookie = request.cookies.get('employee_auth')?.value || ''
    const adminFlagCookie = request.cookies.get('admin_auth')?.value || ''
    const katharioCookie = request.cookies.get(process.env.NODE_ENV === 'production' ? '__Host-kathario_auth' : 'kathario_auth')?.value || ''

    // kathario_auth는 base64 JSON 페이로드를 담고 있음 → role 확인 시도
    let katharioRole: 'employee' | 'superadmin' | null = null
    try {
      if (katharioCookie) {
        const decoded = JSON.parse(globalThis.atob(katharioCookie))
        if (decoded && (decoded.role === 'employee' || decoded.role === 'superadmin')) {
          katharioRole = decoded.role
        }
      }
    } catch {}

    const isLoggedInAsEmployee = Boolean(employeeCookie || katharioCookie || adminFlagCookie)
    const isLoggedInAsAdmin = Boolean(
      adminFlagCookie || katharioRole === 'superadmin'
    )

    // /dashboard/* → 관리자만 접근 허용
    if (pathname.startsWith('/dashboard')) {
      if (!isLoggedInAsAdmin) {
        // 직원/비로그인: 직원 로그인 페이지로 이동
        return NextResponse.redirect(new URL('/employee/login', request.url))
      }
    }

    // /employee/* → 직원 또는 관리자 접근 허용, 비로그인은 직원 로그인으로
    if (pathname.startsWith('/employee')) {
      if (!isLoggedInAsEmployee) {
        return NextResponse.redirect(new URL('/employee/login', request.url))
      }
    }

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
