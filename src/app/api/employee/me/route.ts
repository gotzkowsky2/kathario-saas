import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseAuthCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.NODE_ENV === 'production' ? '__Host-kathario_auth' : 'kathario_auth';
    const katharioAuth = request.cookies.get(cookieName)?.value || '';

    let userId: string | null = null;

    // 1) kathario_auth 우선
    if (katharioAuth) {
      const payload = parseAuthCookie(katharioAuth);
      if (payload?.userId) userId = payload.userId;
    }

    // 2) 레거시 폴백
    if (!userId) {
      const employeeAuth = request.cookies.get('employee_auth')?.value;
      const adminAuth = request.cookies.get('admin_auth')?.value;
      userId = employeeAuth || adminAuth || null;
    }

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        department: true,
        position: true,
        tenantId: true,
        tenant: {
          select: { id: true, name: true, domain: true, subscriptionTier: true }
        }
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 401 }
      );
    }

    return NextResponse.json(employee);
  } catch (error: any) {
    console.error('사용자 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '사용자 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

