// Kathario SaaS - 로그인 API 라우트

import { NextRequest, NextResponse } from 'next/server'
import { loginUser, createLoginResponse } from '../../../../lib/auth'
import { getTenantDomainFromHostname, getTenantByDomain } from '../../../../lib/tenant'
import { LoginCredentials } from '../../../../types/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as LoginCredentials
    const { employeeId, password } = body
    
    if (!employeeId || !password) {
      return NextResponse.json(
        { error: '직원 ID와 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }
    
    // 테넌트 도메인 추출
    const hostname = request.headers.get('host') || ''
    const tenantDomain = getTenantDomainFromHostname(hostname)
    
    if (!tenantDomain) {
      return NextResponse.json(
        { error: '유효하지 않은 도메인입니다.' },
        { status: 400 }
      )
    }
    
    // 테넌트 확인
    const tenant = await getTenantByDomain(tenantDomain)
    if (!tenant) {
      return NextResponse.json(
        { error: '존재하지 않는 테넌트입니다.' },
        { status: 404 }
      )
    }
    
    // 사용자 로그인 시도
    const user = await loginUser({ employeeId, password }, tenant.id)
    
    if (!user) {
      return NextResponse.json(
        { error: '직원 ID 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }
    
    // 역할 기반 리다이렉트: 직원은 /employee, 슈퍼관리자는 /dashboard
    const redirectPath = user.isSuperAdmin ? '/dashboard' : '/employee'
    return createLoginResponse(user, redirectPath, request)
    
  } catch (error) {
    console.error('로그인 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
