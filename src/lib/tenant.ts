import { NextRequest } from 'next/server'
import prisma, { setCurrentTenantId, clearCurrentTenantId } from './prisma'

/**
 * 도메인에서 테넌트 정보 추출
 * 예: basak.kathario.com → "basak"
 *     localhost:3003 → null (개발환경)
 */
export function getTenantDomainFromHostname(hostname: string): string | null {
  // 개발환경 처리
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return null
  }
  
  // 서브도메인 추출
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    return parts[0] // 첫 번째 부분이 테넌트 도메인
  }
  
  return null
}

/**
 * 도메인으로 테넌트 조회
 */
export async function getTenantByDomain(domain: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { 
        domain: domain,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        domain: true,
        subscriptionTier: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        isActive: true
      }
    })
    
    return tenant
  } catch (error) {
    console.error('테넌트 조회 오류:', error)
    return null
  }
}

/**
 * 테넌트 ID로 테넌트 조회
 */
export async function getTenantById(tenantId: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { 
        id: tenantId,
        isActive: true 
      }
    })
    
    return tenant
  } catch (error) {
    console.error('테넌트 조회 오류:', error)
    return null
  }
}

/**
 * 새 테넌트 생성
 */
export async function createTenant(data: {
  name: string
  domain: string
  ownerName?: string
  ownerEmail?: string
  ownerPhone?: string
  subscriptionTier?: 'FREE' | 'PRO' | 'ENTERPRISE'
}) {
  try {
    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        domain: data.domain,
        ownerName: data.ownerName,
        ownerEmail: data.ownerEmail,
        ownerPhone: data.ownerPhone,
        subscriptionTier: data.subscriptionTier || 'FREE',
        subscriptionStart: new Date()
      }
    })
    
    return tenant
  } catch (error) {
    console.error('테넌트 생성 오류:', error)
    throw error
  }
}

/**
 * 테넌트 구독 상태 확인
 */
export function isSubscriptionActive(tenant: {
  subscriptionEnd: Date | null
  subscriptionTier: string
}): boolean {
  // FREE 티어는 항상 활성
  if (tenant.subscriptionTier === 'FREE') {
    return true
  }
  
  // 구독 종료일이 없으면 활성 (무제한)
  if (!tenant.subscriptionEnd) {
    return true
  }
  
  // 구독 종료일이 현재보다 미래면 활성
  return tenant.subscriptionEnd > new Date()
}

/**
 * 요청에서 테넌트 컨텍스트 설정
 * 미들웨어나 API 라우트에서 사용
 */
export async function withTenantContext<T>(
  request: NextRequest,
  callback: (tenant: any) => Promise<T>
): Promise<T> {
  const hostname = request.headers.get('host') || ''
  const tenantDomain = getTenantDomainFromHostname(hostname)
  
  if (!tenantDomain) {
    // 개발환경이나 메인 도메인인 경우 테넌트 없이 실행
    clearCurrentTenantId()
    return callback(null)
  }
  
  const tenant = await getTenantByDomain(tenantDomain)
  
  if (!tenant) {
    throw new Error(`테넌트를 찾을 수 없습니다: ${tenantDomain}`)
  }
  
  if (!isSubscriptionActive(tenant)) {
    throw new Error('구독이 만료되었습니다')
  }
  
  // 테넌트 컨텍스트 설정
  setCurrentTenantId(tenant.id)
  
  try {
    const result = await callback(tenant)
    return result
  } finally {
    // 컨텍스트 정리
    clearCurrentTenantId()
  }
}

/**
 * 테넌트별 기본 관리자 생성
 */
export async function createTenantAdmin(tenantId: string, data: {
  name: string
  email: string
  employeeId: string
  password: string
}) {
  try {
    // 기존 테넌트 컨텍스트 설정
    setCurrentTenantId(tenantId)
    
    const admin = await prisma.employee.create({
      data: {
        tenantId: tenantId,
        employeeId: data.employeeId,
        name: data.name,
        email: data.email,
        password: data.password, // 실제로는 해시화 필요
        department: '관리',
        position: '사장',
        isSuperAdmin: true,
        isActive: true
      }
    })
    
    return admin
  } catch (error) {
    console.error('테넌트 관리자 생성 오류:', error)
    throw error
  } finally {
    clearCurrentTenantId()
  }
}

/**
 * 테넌트 도메인 유효성 검사
 */
export function validateTenantDomain(domain: string): boolean {
  // 영문자, 숫자, 하이픈만 허용, 3-20자
  const domainRegex = /^[a-z0-9-]{3,20}$/
  return domainRegex.test(domain)
}

/**
 * 테넌트 도메인 중복 확인
 */
export async function isDomainAvailable(domain: string): Promise<boolean> {
  try {
    const existingTenant = await prisma.tenant.findUnique({
      where: { domain }
    })
    
    return !existingTenant
  } catch (error) {
    console.error('도메인 중복 확인 오류:', error)
    return false
  }
}
