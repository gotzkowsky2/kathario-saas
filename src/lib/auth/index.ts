// Kathario SaaS - 인증 유틸리티
// 멀티테넌트 환경에서의 사용자 인증 관리

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import prisma, { setCurrentTenantId, clearCurrentTenantId } from '../prisma'
import { getTenantByDomain, getTenantDomainFromHostname } from '../tenant'
import { AuthUser, AuthCookie, LoginCredentials } from '../../types/auth'

const COOKIE_NAME = '__Host-kathario_auth'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7일

/**
 * 비밀번호 해시화
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * 비밀번호 검증
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * 인증 쿠키 생성
 */
export function createAuthCookie(userId: string, tenantId: string, role: 'employee' | 'superadmin'): string {
  const payload: AuthCookie = {
    userId,
    tenantId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE
  }
  
  // 실제 환경에서는 JWT나 암호화된 토큰 사용
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

/**
 * 인증 쿠키 파싱
 */
export function parseAuthCookie(cookieValue: string): AuthCookie | null {
  try {
    const payload = JSON.parse(Buffer.from(cookieValue, 'base64').toString())
    
    // 만료 시간 확인
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    
    return payload as AuthCookie
  } catch (error) {
    return null
  }
}

/**
 * 사용자 로그인
 */
export async function loginUser(credentials: LoginCredentials, tenantId: string): Promise<AuthUser | null> {
  try {
    // 테넌트 컨텍스트 설정
    setCurrentTenantId(tenantId)
    
    const employee = await prisma.employee.findUnique({
      where: {
        tenantId_employeeId: {
          tenantId: tenantId,
          employeeId: credentials.employeeId
        }
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true,
            subscriptionTier: true
          }
        }
      }
    })
    
    if (!employee || !employee.isActive) {
      return null
    }
    
    // 비밀번호 검증
    const isPasswordValid = await verifyPassword(credentials.password, employee.password)
    if (!isPasswordValid) {
      return null
    }
    
    return {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email || undefined,
      department: employee.department,
      position: employee.position,
      isSuperAdmin: employee.isSuperAdmin,
      tenantId: employee.tenantId,
      tenant: employee.tenant
    }
  } catch (error) {
    console.error('로그인 오류:', error)
    return null
  } finally {
    clearCurrentTenantId()
  }
}

/**
 * 현재 사용자 정보 조회
 */
export async function getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get(COOKIE_NAME)
    
    if (!authCookie) {
      return null
    }
    
    const payload = parseAuthCookie(authCookie.value)
    if (!payload) {
      return null
    }
    
    // 테넌트 컨텍스트 설정
    setCurrentTenantId(payload.tenantId)
    
    const employee = await prisma.employee.findUnique({
      where: {
        id: payload.userId
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true,
            subscriptionTier: true
          }
        }
      }
    })
    
    if (!employee || !employee.isActive) {
      return null
    }
    
    return {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email || undefined,
      department: employee.department,
      position: employee.position,
      isSuperAdmin: employee.isSuperAdmin,
      tenantId: employee.tenantId,
      tenant: employee.tenant
    }
  } catch (error) {
    console.error('현재 사용자 조회 오류:', error)
    return null
  } finally {
    clearCurrentTenantId()
  }
}

/**
 * 로그인 응답 생성
 */
export function createLoginResponse(user: AuthUser, redirectTo?: string): NextResponse {
  const role = user.isSuperAdmin ? 'superadmin' : 'employee'
  const cookieValue = createAuthCookie(user.id, user.tenantId, role)
  
  // 동적 베이스 URL 생성 (포트 자동 감지)
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const response = NextResponse.redirect(new URL(redirectTo || '/dashboard', baseUrl))
  
  response.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  })
  
  return response
}

/**
 * 로그아웃 응답 생성
 */
export function createLogoutResponse(redirectTo?: string): NextResponse {
  // 동적 베이스 URL 생성 (포트 자동 감지)
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const response = NextResponse.redirect(new URL(redirectTo || '/login', baseUrl))
  
  response.cookies.delete(COOKIE_NAME)
  
  return response
}

/**
 * 인증 미들웨어
 */
export async function authMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  
  // 공개 경로
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/api/auth/login',
    '/api/auth/signup'
  ]
  
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return null // 미들웨어 통과
  }
  
  // 인증 확인
  const user = await getCurrentUser(request)
  
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // 관리자 전용 경로 확인
  if (pathname.startsWith('/admin') && !user.isSuperAdmin) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  return null // 미들웨어 통과
}

/**
 * API 라우트용 인증 확인
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getCurrentUser(request)
  
  if (!user) {
    throw new Error('인증이 필요합니다')
  }
  
  return user
}

/**
 * 관리자 권한 확인
 */
export function requireAdmin(user: AuthUser): void {
  if (!user.isSuperAdmin) {
    throw new Error('관리자 권한이 필요합니다')
  }
}
