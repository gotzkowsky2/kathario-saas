import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const employeeAuth = request.cookies.get('employee_auth')?.value;
    const adminAuth = request.cookies.get('admin_auth')?.value;
    const katharioCookieName = process.env.NODE_ENV === 'production' ? '__Host-kathario_auth' : 'kathario_auth'
    const katharioAuth = request.cookies.get(katharioCookieName)?.value

    let userId: string | null = employeeAuth || adminAuth || null

    if (!userId && katharioAuth) {
      try {
        const payload = JSON.parse(Buffer.from(katharioAuth, 'base64').toString())
        if (payload?.userId) userId = payload.userId as string
      } catch {}
    }

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 1) 직원 세션 우선
    if (userId) {
      const employee = await prisma.employee.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          name: true, 
          email: true, 
          isSuperAdmin: true, 
          department: true, 
          position: true,
          tenantId: true
        }
      });
      if (employee) return NextResponse.json(employee);
    }

    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
  } catch (error: any) {
    console.error('사용자 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '사용자 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

