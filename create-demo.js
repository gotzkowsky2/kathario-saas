const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

(async () => {
  try {
    // 테넌트 생성
    await prisma.tenant.upsert({
      where: { id: 'demo' },
      update: {},
      create: { id: 'demo', name: '데모 매장', domain: 'demo' }
    });
    
    // 직원 계정 생성
    const hashedPassword = await bcrypt.hash('demo123', 10);
    await prisma.employee.upsert({
      where: { employeeId_tenantId: { employeeId: 'employee', tenantId: 'demo' } },
      update: {},
      create: {
        employeeId: 'employee',
        password: hashedPassword,
        name: '김직원',
        email: 'employee@demo.com',
        department: '주방',
        position: '조리사',
        isSuperAdmin: false,
        tenantId: 'demo'
      }
    });
    
    console.log('✅ 데모 계정 생성 완료!');
  } catch (e) {
    console.error('❌ 오류:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();

