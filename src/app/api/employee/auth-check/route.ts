import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// 직원 인증 확인 함수
async function verifyEmployeeAuth() {
  const cookieStore = await cookies();
  const employeeAuth = cookieStore.get('employee_auth');
  
  if (!employeeAuth) {
    throw new Error('직원 인증이 필요합니다.');
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeAuth.value
    }
  });

  if (!employee) {
    throw new Error('유효하지 않은 직원 세션입니다.');
  }

  return employee;
}

// GET: 직원 인증 상태 확인
export async function GET(request: NextRequest) {
  try {
    const employee = await verifyEmployeeAuth();
    
    return NextResponse.json({
      authenticated: true,
      employee: {
        id: employee.id,
        name: employee.name,
        department: employee.department,
        position: employee.position,
        isSuperAdmin: employee.isSuperAdmin
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        authenticated: false,
        error: error.message || '인증 확인 중 오류가 발생했습니다.' 
      },
      { status: 401 }
    );
  }
}

