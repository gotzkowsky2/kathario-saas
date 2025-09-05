// Kathario SaaS - 테넌트 관리 유틸리티 함수들
// 도메인 기반 테넌트 식별 및 관리

import { NextRequest } from 'next/server'
import { prisma, setCurrentTenantId, clearCurrentTenantId } from '../lib/prisma'
import { Tenant, SubscriptionTier } from '../generated/prisma'

/**
 * 호스트명에서 테넌트 도메인 추출
 * 예: basak.kathario.com -> "basak"
 *     localhost:3000 -> "demo" (개발용)
 */
export function extractTenantDomain(hostname: string): string {
  // 개발 환경에서는 기본 테넌트 사용
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return process.env.DEFAULT_TENANT_DOMAIN || 'demo'
  }

  // 프로덕션에서는 서브도메인 추출
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    return parts[0] // 첫 번째 부분이 테넌트 도메인
  }

  // 기본값
  return process.env.DEFAULT_TENANT_DOMAIN || 'demo'
}

/**
 * 요청에서 테넌트 도메인 추출
 */
export function getTenantDomainFromRequest(request: NextRequest): string {
  const hostname = request.headers.get('host') || 'localhost:3000'
  return extractTenantDomain(hostname)
}

/**
 * 도메인으로 테넌트 조회
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  try {
    // 테넌트 조회시에는 미들웨어 우회 (직접 조회)
    clearCurrentTenantId()
    
    const tenant = await prisma.tenant.findUnique({
      where: { 
        domain: domain,
        isActive: true 
      }
    })

    return tenant
  } catch (error) {
    console.error('테넌트 조회 실패:', error)
    return null
  }
}

/**
 * 테넌트 ID로 테넌트 조회
 */
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  try {
    clearCurrentTenantId()
    
    const tenant = await prisma.tenant.findUnique({
      where: { 
        id: tenantId,
        isActive: true 
      }
    })

    return tenant
  } catch (error) {
    console.error('테넌트 조회 실패:', error)
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
  address?: string
  subscriptionTier?: SubscriptionTier
}): Promise<Tenant> {
  clearCurrentTenantId()
  
  // 도메인 중복 확인
  const existingTenant = await prisma.tenant.findUnique({
    where: { domain: data.domain }
  })

  if (existingTenant) {
    throw new Error(`도메인 '${data.domain}'은 이미 사용 중입니다.`)
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: data.name,
      domain: data.domain,
      ownerName: data.ownerName,
      ownerEmail: data.ownerEmail,
      ownerPhone: data.ownerPhone,
      address: data.address,
      subscriptionTier: data.subscriptionTier || SubscriptionTier.FREE,
      subscriptionStart: new Date(),
    }
  })

  return tenant
}

/**
 * 테넌트 컨텍스트 설정 (미들웨어에서 사용)
 */
export function setTenantContext(tenantId: string) {
  setCurrentTenantId(tenantId)
}

/**
 * 테넌트 컨텍스트 해제
 */
export function clearTenantContext() {
  clearCurrentTenantId()
}

/**
 * 구독 상태 확인
 */
export function isSubscriptionActive(tenant: Tenant): boolean {
  if (!tenant.isActive) return false
  
  // 무료 플랜은 항상 활성
  if (tenant.subscriptionTier === SubscriptionTier.FREE) return true
  
  // 유료 플랜은 만료일 확인
  if (tenant.subscriptionEnd) {
    return new Date() <= tenant.subscriptionEnd
  }
  
  return true
}

/**
 * 구독 플랜별 제한 확인
 */
export function getSubscriptionLimits(tier: SubscriptionTier) {
  switch (tier) {
    case SubscriptionTier.FREE:
      return {
        maxEmployees: 3,
        maxInventoryItems: 50,
        maxChecklistTemplates: 10,
        hasAdvancedReports: false,
        hasApiAccess: false,
      }
    case SubscriptionTier.PRO:
      return {
        maxEmployees: 20,
        maxInventoryItems: 500,
        maxChecklistTemplates: 100,
        hasAdvancedReports: true,
        hasApiAccess: true,
      }
    case SubscriptionTier.ENTERPRISE:
      return {
        maxEmployees: -1, // 무제한
        maxInventoryItems: -1,
        maxChecklistTemplates: -1,
        hasAdvancedReports: true,
        hasApiAccess: true,
      }
    default:
      return getSubscriptionLimits(SubscriptionTier.FREE)
  }
}

/**
 * 테넌트별 사용량 확인
 */
export async function getTenantUsage(tenantId: string) {
  setCurrentTenantId(tenantId)
  
  try {
    const [employeeCount, inventoryCount, templateCount] = await Promise.all([
      prisma.employee.count({ where: { isActive: true } }),
      prisma.inventoryItem.count({ where: { isActive: true } }),
      prisma.checklistTemplate.count({ where: { isActive: true } })
    ])

    return {
      employees: employeeCount,
      inventoryItems: inventoryCount,
      checklistTemplates: templateCount
    }
  } finally {
    clearCurrentTenantId()
  }
}

/**
 * 사용량 제한 확인
 */
export async function checkUsageLimits(tenantId: string, tenant: Tenant) {
  const limits = getSubscriptionLimits(tenant.subscriptionTier)
  const usage = await getTenantUsage(tenantId)
  
  return {
    employees: {
      current: usage.employees,
      limit: limits.maxEmployees,
      canAdd: limits.maxEmployees === -1 || usage.employees < limits.maxEmployees
    },
    inventoryItems: {
      current: usage.inventoryItems,
      limit: limits.maxInventoryItems,
      canAdd: limits.maxInventoryItems === -1 || usage.inventoryItems < limits.maxInventoryItems
    },
    checklistTemplates: {
      current: usage.checklistTemplates,
      limit: limits.maxChecklistTemplates,
      canAdd: limits.maxChecklistTemplates === -1 || usage.checklistTemplates < limits.maxChecklistTemplates
    }
  }
}
