const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('=== 테넌트 정보 ===');
    const tenants = await prisma.tenant.findMany();
    console.log('테넌트 수:', tenants.length);
    tenants.forEach(t => console.log('- ', t.name, '(ID:', t.id + ')'));
    
    console.log('\n=== 직원 정보 ===');
    const employees = await prisma.employee.findMany();
    console.log('직원 수:', employees.length);
    employees.forEach(e => console.log('- ', e.name, '(ID:', e.employeeId, ', 테넌트:', e.tenantId + ')'));
    
    console.log('\n=== 체크리스트 템플릿 ===');
    const templates = await prisma.checklistTemplate.findMany();
    console.log('템플릿 수:', templates.length);
    templates.forEach(t => console.log('- ', t.name, '(활성:', t.isActive, ', 테넌트:', t.tenantId + ')'));
    
    console.log('\n=== 체크리스트 인스턴스 ===');
    const instances = await prisma.checklistInstance.findMany();
    console.log('인스턴스 수:', instances.length);
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
