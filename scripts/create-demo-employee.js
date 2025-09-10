const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDemoEmployee() {
  try {
    console.log('=== 데모 직원 계정 생성 ===');
    
    // 데모 테넌트 확인/생성
    let tenant = await prisma.tenant.findUnique({ where: { id: 'demo' } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          id: 'demo',
          name: '데모 매장',
          domain: 'demo'
        }
      });
      console.log('✅ 데모 테넌트 생성:', tenant.name);
    } else {
      console.log('✅ 데모 테넌트 존재:', tenant.name);
    }
    
    // 직원 계정 확인/생성
    let employee = await prisma.employee.findFirst({
      where: { employeeId: 'employee', tenantId: 'demo' }
    });
    
    if (!employee) {
      const hashedPassword = await bcrypt.hash('demo123', 10);
      employee = await prisma.employee.create({
        data: {
          employeeId: 'employee',
          password: hashedPassword,
          name: '김직원',
          email: 'employee@demo.com',
          department: '주방',
          position: '조리사',
          isSuperAdmin: false,
          isTempPassword: false,
          tenantId: 'demo'
        }
      });
      console.log('✅ 직원 계정 생성:', employee.name);
    } else {
      console.log('✅ 직원 계정 존재:', employee.name);
    }
    
    // 관리자 계정도 확인/생성
    let admin = await prisma.employee.findFirst({
      where: { employeeId: 'admin', tenantId: 'demo' }
    });
    
    if (!admin) {
      const hashedPassword = await bcrypt.hash('demo123', 10);
      admin = await prisma.employee.create({
        data: {
          employeeId: 'admin',
          password: hashedPassword,
          name: '관리자',
          email: 'admin@demo.com',
          department: '관리부',
          position: '매장관리자',
          isSuperAdmin: true,
          isTempPassword: false,
          tenantId: 'demo'
        }
      });
      console.log('✅ 관리자 계정 생성:', admin.name);
    } else {
      console.log('✅ 관리자 계정 존재:', admin.name);
    }
    
    console.log('\n=== 최종 확인 ===');
    console.log('테넌트:', tenant.name);
    console.log('직원:', employee.employeeId, '/', employee.name, '/', employee.department, '/', employee.position);
    console.log('관리자:', admin.employeeId, '/', admin.name, '/', admin.department, '/', admin.position);
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoEmployee();
