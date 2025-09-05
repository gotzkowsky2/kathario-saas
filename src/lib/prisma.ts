// Kathario SaaS - Prisma 클라이언트 설정
// 멀티테넌트 데이터 격리를 위한 설정

import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma: PrismaClient | undefined
}

// 싱글톤 패턴으로 Prisma 클라이언트 생성
export const prisma = globalThis.__prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

// 멀티테넌트 데이터 격리를 위한 모델 목록
export const TENANT_MODELS = [
  'Employee',
  'InventoryItem', 
  'ChecklistTemplate',
  'ChecklistInstance',
  'Tag',
  'Manual',
  'Precaution',
  'PurchaseRequest',
  'Notice',
  'Favorite',
  'PosReport'
] as const

export type TenantModel = typeof TENANT_MODELS[number]

// 현재 요청의 테넌트 ID를 저장하기 위한 컨텍스트
let currentTenantId: string | null = null

export function setCurrentTenantId(tenantId: string) {
  currentTenantId = tenantId
}

export function getCurrentTenantId(): string | null {
  return currentTenantId
}

export function clearCurrentTenantId() {
  currentTenantId = null
}

// 테넌트 격리 미들웨어 설정
prisma.$use(async (params, next) => {
  const tenantId = getCurrentTenantId()
  
  // 테넌트 모델이 아닌 경우 그대로 진행
  if (!TENANT_MODELS.includes(params.model as TenantModel)) {
    return next(params)
  }

  // 테넌트 ID가 없는 경우 에러
  if (!tenantId) {
    throw new Error(`테넌트 ID가 설정되지 않았습니다. 모델: ${params.model}`)
  }

  // 조회 작업에 tenantId 필터 자동 추가
  if (params.action === 'findMany' || params.action === 'findFirst' || params.action === 'findUnique') {
    if (!params.args) {
      params.args = {}
    }
    if (!params.args.where) {
      params.args.where = {}
    }
    
    // 이미 tenantId가 설정되어 있으면 검증
    if (params.args.where.tenantId && params.args.where.tenantId !== tenantId) {
      throw new Error(`잘못된 테넌트 접근 시도. 요청: ${params.args.where.tenantId}, 현재: ${tenantId}`)
    }
    
    params.args.where.tenantId = tenantId
  }

  // 생성/수정 작업에 tenantId 자동 추가
  if (params.action === 'create') {
    if (!params.args) {
      params.args = {}
    }
    if (!params.args.data) {
      params.args.data = {}
    }
    
    // 이미 tenantId가 설정되어 있으면 검증
    if (params.args.data.tenantId && params.args.data.tenantId !== tenantId) {
      throw new Error(`잘못된 테넌트 생성 시도. 요청: ${params.args.data.tenantId}, 현재: ${tenantId}`)
    }
    
    params.args.data.tenantId = tenantId
  }

  if (params.action === 'update' || params.action === 'updateMany') {
    if (!params.args) {
      params.args = {}
    }
    if (!params.args.where) {
      params.args.where = {}
    }
    
    // 업데이트 조건에 tenantId 필터 추가
    params.args.where.tenantId = tenantId
  }

  if (params.action === 'delete' || params.action === 'deleteMany') {
    if (!params.args) {
      params.args = {}
    }
    if (!params.args.where) {
      params.args.where = {}
    }
    
    // 삭제 조건에 tenantId 필터 추가
    params.args.where.tenantId = tenantId
  }

  return next(params)
})

export default prisma