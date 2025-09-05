// Kathario SaaS - 시드 데이터 생성
// 테스트용 테넌트와 사용자 데이터 생성

import { PrismaClient, Category } from '../src/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 시드 데이터 생성 시작...')

  // 1. 테스트 테넌트 생성
  const testTenant = await prisma.tenant.upsert({
    where: { domain: 'demo' },
    update: {},
    create: {
      name: '데모 레스토랑',
      domain: 'demo',
      subscriptionTier: 'PRO',
      subscriptionStart: new Date(),
      ownerName: '김사장',
      ownerEmail: 'owner@demo.com',
      ownerPhone: '010-1234-5678',
      address: '서울시 강남구 테헤란로 123',
      isActive: true
    }
  })

  console.log('✅ 테스트 테넌트 생성:', testTenant.name)

  // 2. 관리자 계정 생성
  const adminPassword = await bcrypt.hash('demo123', 12)
  const adminUser = await prisma.employee.upsert({
    where: {
      tenantId_employeeId: {
        tenantId: testTenant.id,
        employeeId: 'admin'
      }
    },
    update: {},
    create: {
      tenantId: testTenant.id,
      employeeId: 'admin',
      password: adminPassword,
      name: '관리자',
      email: 'admin@demo.com',
      department: '관리',
      position: '사장',
      isSuperAdmin: true,
      isActive: true
    }
  })

  console.log('✅ 관리자 계정 생성:', adminUser.name)

  // 3. 일반 직원 계정 생성
  const employeePassword = await bcrypt.hash('demo123', 12)
  const employeeUser = await prisma.employee.upsert({
    where: {
      tenantId_employeeId: {
        tenantId: testTenant.id,
        employeeId: 'employee'
      }
    },
    update: {},
    create: {
      tenantId: testTenant.id,
      employeeId: 'employee',
      password: employeePassword,
      name: '김직원',
      email: 'employee@demo.com',
      department: '서빙',
      position: '직원',
      isSuperAdmin: false,
      isActive: true
    }
  })

  console.log('✅ 직원 계정 생성:', employeeUser.name)

  // 4. 샘플 재고 아이템 생성
  const inventoryItems = [
    {
      name: '치킨 (냉동)',
      category: Category.INGREDIENTS,
      currentStock: 50,
      minStock: 10,
      unit: 'kg',
      supplier: '치킨 공급업체'
    },
    {
      name: '감자튀김',
      category: Category.INGREDIENTS, 
      currentStock: 20,
      minStock: 5,
      unit: 'kg',
      supplier: '감자 공급업체'
    },
    {
      name: '일회용 컵',
      category: Category.SUPPLIES,
      currentStock: 500,
      minStock: 100,
      unit: '개',
      supplier: '포장재 업체'
    }
  ]

  for (const item of inventoryItems) {
    await prisma.inventoryItem.create({
      data: {
        tenantId: testTenant.id,
        ...item
      }
    })
  }

  console.log('✅ 샘플 재고 아이템 생성 완료')

  // 5. 샘플 체크리스트 템플릿 생성
  const existingTemplate = await prisma.checklistTemplate.findFirst({
    where: {
      tenantId: testTenant.id,
      name: '오픈 준비 체크리스트'
    }
  })

  const checklistTemplate = existingTemplate || await prisma.checklistTemplate.create({
    data: {
      tenantId: testTenant.id,
      name: '오픈 준비 체크리스트',
      content: '매장 오픈 전 필수 확인 사항',
      inputter: adminUser.name,
      workplace: 'COMMON',
      category: 'CHECKLIST',
      timeSlot: 'PREPARATION',
      autoGenerateEnabled: true,
      recurrenceDays: [1, 2, 3, 4, 5, 6, 7], // 매일
      generationTime: '08:00'
    }
  })

  console.log('✅ 샘플 체크리스트 템플릿 생성:', checklistTemplate.name)

  // 6. 체크리스트 아이템 생성
  const checklistItems = [
    {
      type: 'checkbox',
      content: '매장 청소 상태 확인',
      instructions: '바닥, 테이블, 의자 등 전체적인 청소 상태를 확인하세요.',
      order: 1
    },
    {
      type: 'checkbox', 
      content: '주방 위생 상태 확인',
      instructions: '조리대, 싱크대, 냉장고 등 주방 위생 상태를 점검하세요.',
      order: 2
    },
    {
      type: 'checkbox',
      content: '재고 확인',
      instructions: '주요 재료의 재고량을 확인하고 부족한 것이 있는지 점검하세요.',
      order: 3
    }
  ]

  for (const item of checklistItems) {
    await prisma.checklistItem.create({
      data: {
        templateId: checklistTemplate.id,
        ...item
      }
    })
  }

  console.log('✅ 체크리스트 아이템 생성 완료')

  console.log('🎉 시드 데이터 생성 완료!')
  console.log('')
  console.log('📋 생성된 계정 정보:')
  console.log('🔐 관리자: admin / demo123')
  console.log('👤 직원: employee / demo123')
  console.log('🌐 테넌트 도메인: demo.kathario.com')
}

main()
  .catch((e) => {
    console.error('❌ 시드 데이터 생성 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
